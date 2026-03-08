import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { AppError } from '../utils/appError';
import { questionBank, QuestionItem } from '../data/questionBank';
import { SarvamService } from './sarvam.service';

export interface ResumeReviewResult {
    score: number;
    feedback: string[];
    summary: string;
    extractedTextLength: number;
}

export interface QuestionQuery {
    search?: string;
    difficulty?: string;
    category?: string;
    page?: number;
    pageSize?: number;
}

export class ContentService {
    constructor(private readonly sarvamService: SarvamService) {}

    getQuestions(query: QuestionQuery) {
        const page = Math.max(1, query.page || 1);
        const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
        const search = query.search?.trim().toLowerCase() || '';
        const difficulty = query.difficulty?.toLowerCase();
        const category = query.category?.toLowerCase();

        const filtered = questionBank.filter((question) => {
            const matchesSearch = !search || [question.title, question.company, question.category].some((value) => value.toLowerCase().includes(search));
            const matchesDifficulty = !difficulty || difficulty === 'all' || question.difficulty.toLowerCase() === difficulty;
            const matchesCategory = !category || category === 'all' || question.category.toLowerCase() === category;
            return matchesSearch && matchesDifficulty && matchesCategory;
        });

        const start = (page - 1) * pageSize;
        return {
            questions: filtered.slice(start, start + pageSize),
            total: filtered.length,
            page,
            pageSize,
            categories: Array.from(new Set(questionBank.map((question) => question.category))).sort(),
        };
    }

    getDailyChallenge() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const challenge = questionBank[dayOfYear % questionBank.length];
        return {
            date: now.toISOString().slice(0, 10),
            challenge,
        };
    }

    async reviewResume(file: Express.Multer.File): Promise<ResumeReviewResult> {
        if (!file) {
            throw new AppError('Resume file is required', 400);
        }

        const text = await this.extractText(file);
        if (!text.trim()) {
            throw new AppError('Could not extract readable text from the resume', 400);
        }

        const prompt = [
            {
                role: 'system',
                content: `You are an expert technical recruiter. Analyze the resume text and respond ONLY with valid JSON in this format: {"score": <0-100>, "summary": "<2 sentences>", "feedback": ["<item 1>", "<item 2>", "<item 3>", "<item 4>", "<item 5>"]}`,
            },
            {
                role: 'user',
                content: `Review this resume for a software engineering candidate and provide concrete, hiring-focused feedback. Resume text:\n\n${text.slice(0, 12000)}`,
            },
        ];

        try {
            const response = await this.sarvamService.generateResponse(prompt);
            const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || response) as ResumeReviewResult;
            const feedback = Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 5) : [];
            return {
                score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0,
                summary: parsed.summary || 'Automated resume review completed.',
                feedback,
                extractedTextLength: text.length,
            };
        } catch {
            return {
                score: 72,
                summary: 'Automated parsing completed, but the AI review fallback was used.',
                feedback: [
                    'Quantify project and work impact with measurable outcomes.',
                    'Highlight core backend, frontend, and systems design skills near the top.',
                    'Strengthen bullet points with action verbs and ownership signals.',
                    'Add links to notable projects, GitHub, or portfolio work.',
                    'Tailor the summary to the target engineering role and seniority.',
                ],
                extractedTextLength: text.length,
            };
        }
    }

    private async extractText(file: Express.Multer.File) {
        const extension = path.extname(file.originalname).toLowerCase();

        if (extension === '.docx') {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            return result.value;
        }

        if (extension === '.pdf') {
            const parser = new PDFParse({ data: file.buffer });
            try {
                const result = await parser.getText();
                return result.text;
            } finally {
                await parser.destroy();
            }
        }

        throw new AppError('Only PDF and DOCX files are supported', 400);
    }
}