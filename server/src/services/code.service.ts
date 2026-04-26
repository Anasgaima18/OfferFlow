import axios, { AxiosError } from 'axios';
import { AppError } from '../utils/appError';
import { Logger } from '../utils/logger';
import { makeBreaker } from '../utils/circuitBreaker';
import { externalApiDuration, externalApiErrors } from '../observability/metrics';

interface PistonResponse {
    run: {
        stdout: string;
        stderr: string;
        code: number;
        signal: string;
        output: string;
    };
    language: string;
    version: string;
}

/**
 * F12: Code execution hardening.
 *
 * Previous implementation:
 *   - 30s timeout (an Express worker is held hostage for 30s on a hang)
 *   - no retry, no breaker; one Piston blip = every code run fails
 *   - single endpoint pointed at the public emkc.org Piston (rate-limited
 *     to ~5 rps server-wide for everyone using it).
 *
 * Fix:
 *   - 8s timeout per attempt (real submissions complete in 100-2500ms)
 *   - circuit breaker with fast-fail when Piston is down or rate-limiting us
 *   - allow self-hosted Piston via PISTON_URL (recommended for production —
 *     spin up the Docker container and point us at it)
 *   - explicit AbortController + cancel token so a client disconnect
 *     unblocks the worker immediately
 */

const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston';
const PISTON_TIMEOUT_MS = Number(process.env.PISTON_TIMEOUT_MS || 8_000);
const MAX_SOURCE_BYTES = Number(process.env.PISTON_MAX_SOURCE || 100_000);

interface PistonExecuteArgs {
    runtime: string;
    version: string;
    sourceCode: string;
    signal?: AbortSignal;
}

async function callPiston({ runtime, version, sourceCode, signal }: PistonExecuteArgs): Promise<PistonResponse> {
    const start = Date.now();
    try {
        const response = await axios.post<PistonResponse>(
            `${PISTON_URL}/execute`,
            {
                language: runtime,
                version,
                files: [{ content: sourceCode }],
            },
            {
                timeout: PISTON_TIMEOUT_MS,
                signal,
            }
        );
        return response.data;
    } catch (err) {
        const ax = err as AxiosError;
        const status = ax.response?.status ?? 0;
        const kind = status === 429 ? 'rate_limit' : ax.code === 'ECONNABORTED' ? 'timeout' : 'error';
        externalApiErrors.inc({ service: 'piston', op: 'execute', kind });
        throw err;
    } finally {
        externalApiDuration.observe({ service: 'piston', op: 'execute' }, Date.now() - start);
    }
}

const pistonBreaker = makeBreaker('piston', callPiston, {
    timeout: PISTON_TIMEOUT_MS + 1_000,
    errorThresholdPercentage: 50,
    resetTimeout: 15_000,
    volumeThreshold: 5,
});

export class CodeService {
    private languageMap: Record<string, string> = {
        javascript: 'javascript',
        python: 'python3',
        java: 'java',
        cpp: 'cpp',
    };

    private versionMap: Record<string, string> = {
        javascript: '18.15.0',
        python3: '3.10.0',
        java: '15.0.2',
        cpp: '10.2.0',
    };

    async executeCode(
        language: string,
        sourceCode: string,
        userId?: string,
        signal?: AbortSignal,
    ): Promise<string> {
        if (sourceCode.length > MAX_SOURCE_BYTES) {
            throw new AppError(`Source code too large (max ${MAX_SOURCE_BYTES} bytes)`, 413);
        }

        const runtime = this.languageMap[language] || language;
        const version = this.versionMap[runtime] || '*';

        Logger.info(`[CODE_EXEC] user=${userId || 'unknown'} lang=${runtime} size=${sourceCode.length}`);

        const dangerousPatterns = [
            /child_process/i, /require\s*\(\s*['"]os['"]\s*\)/i,
            /import\s+os/i, /subprocess/i, /\bexec\s*\(/i,
            /Runtime\.getRuntime/i, /ProcessBuilder/i, /system\s*\(/i,
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sourceCode)) {
                Logger.warn(`[CODE_EXEC] Suspicious pattern detected: ${pattern} user=${userId || 'unknown'}`);
                break;
            }
        }

        try {
            const data = await pistonBreaker.fire({ runtime, version, sourceCode, signal });
            const { stdout, stderr, output } = data.run;
            if (stderr) return stderr;
            return stdout || output || 'Execution completed with no output.';
        } catch (error: unknown) {
            if ((error as { code?: string }).code === 'EOPENBREAKER') {
                throw new AppError('Code execution service is temporarily unavailable. Please retry shortly.', 503);
            }
            const ax = error as AxiosError;
            if (ax?.response?.status === 429) {
                throw new AppError('Code execution is being rate-limited upstream. Please try again in a moment.', 429);
            }
            if (axios.isCancel(error) || (error as { name?: string }).name === 'AbortError') {
                throw new AppError('Code execution was cancelled.', 499);
            }
            const detail = axios.isAxiosError(error)
                ? String(error.response?.data ?? error.message)
                : (error instanceof Error ? error.message : String(error));
            Logger.error('Code Execution Error:', detail);
            throw new AppError('Failed to execute code. Please try again later.', 502);
        }
    }
}

export const codeService = new CodeService();
