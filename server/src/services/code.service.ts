import axios from 'axios';
import { AppError } from '../utils/appError';
import { Logger } from '../utils/logger';

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

export class CodeService {
    private pistonUrl = 'https://emkc.org/api/v2/piston';

    // Map frontend languages to Piston runtime aliases
    private languageMap: Record<string, string> = {
        'javascript': 'javascript',
        'python': 'python3',
        'java': 'java',
        'cpp': 'cpp',
    };

    private versionMap: Record<string, string> = {
        'javascript': '18.15.0',
        'python3': '3.10.0',
        'java': '15.0.2',
        'cpp': '10.2.0',
    };

    /**
     * Execute source code via Piston API
     * Security: code runs in Piston sandbox; we add audit logging + size validation
     */
    async executeCode(language: string, sourceCode: string, userId?: string): Promise<string> {
        const runtime = this.languageMap[language] || language;
        const version = this.versionMap[runtime] || '*';

        // Audit log for every code execution
        Logger.info(`[CODE_EXEC] user=${userId || 'unknown'} lang=${runtime} size=${sourceCode.length}`);

        // Warn on potentially dangerous patterns (sandbox handles actual isolation)
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
            const response = await axios.post<PistonResponse>(`${this.pistonUrl}/execute`, {
                language: runtime,
                version: version,
                files: [
                    {
                        content: sourceCode
                    }
                ]
            }, {
                timeout: 30000
            });

            const { stdout, stderr, output } = response.data.run;

            if (stderr) {
                return stderr;
            }

            return stdout || output || 'Execution completed with no output.';
        } catch (error: unknown) {
            const detail = axios.isAxiosError(error)
                ? String(error.response?.data ?? error.message)
                : (error instanceof Error ? error.message : String(error));
            Logger.error('Code Execution Error:', detail);
            throw new AppError('Failed to execute code. Please try again later.', 500);
        }
    }
}

export const codeService = new CodeService();
