import axios from 'axios';
import { AppError } from '../utils/appError';

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
     */
    async executeCode(language: string, sourceCode: string): Promise<string> {
        const runtime = this.languageMap[language] || language;
        const version = this.versionMap[runtime] || '*';

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
        } catch (error: any) {
            console.error('Code Execution Error:', error?.response?.data || error.message);
            throw new AppError('Failed to execute code. Please try again later.', 500);
        }
    }
}

export const codeService = new CodeService();
