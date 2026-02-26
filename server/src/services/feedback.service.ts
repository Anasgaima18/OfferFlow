import { interviewService } from './interview.service';
import { sarvamService } from './sarvam.service';
import { Logger } from '../utils/logger';
import { z } from 'zod';

export interface FeedbackResult {
    overallScore: number;
    categories: Array<{
        name: string;
        score: number;
        feedback: string;
    }>;
    strengths: string[];
    improvements: string[];
    summary: string;
}

export class FeedbackService {

    async generateFeedback(interviewId: string): Promise<FeedbackResult> {
        // Fetch transcript from database
        const transcript = await interviewService.getTranscript(interviewId);

        if (!transcript || transcript.length === 0) {
            Logger.warn(`No transcript found for interview ${interviewId}, returning default feedback`);
            return this.getDefaultFeedback();
        }

        // Build conversation text for analysis
        const conversationText = transcript
            .map(msg => `${msg.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${msg.content}`)
            .join('\n');

        try {
            const analysisPrompt = [
                { role: 'system', content: `You are an expert interview evaluator. Analyze the following interview transcript and provide structured feedback. Respond ONLY with valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "categories": [
    {"name": "Problem Solving", "score": <number 0-100>, "feedback": "<1 sentence>"},
    {"name": "Communication", "score": <number 0-100>, "feedback": "<1 sentence>"},
    {"name": "Code Quality", "score": <number 0-100>, "feedback": "<1 sentence>"},
    {"name": "Technical Knowledge", "score": <number 0-100>, "feedback": "<1 sentence>"}
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "summary": "<2-3 sentence summary>"
}` },
                { role: 'user', content: `Analyze this interview transcript:\n\n${conversationText}` }
            ];

            const aiResponse = await sarvamService.generateResponse(analysisPrompt);

            // Parse AI response as JSON — try direct parse first, then regex fallback
            const parsed = this.parseAIFeedback(aiResponse);
            if (parsed) {
                await interviewService.updateInterview(interviewId, {
                    score: parsed.overallScore,
                    feedback: parsed.summary,
                    status: 'completed'
                });
                return parsed;
            }
        } catch (err) {
            Logger.error('Failed to generate AI feedback, using default', err);
        }

        // Return default feedback but do NOT save fake scores to the database
        return this.getDefaultFeedback();
    }

    private readonly FeedbackSchema = z.object({
        overallScore: z.number().min(0).max(100),
        categories: z.array(z.object({
            name: z.string(),
            score: z.number().min(0).max(100),
            feedback: z.string(),
        })),
        strengths: z.array(z.string()),
        improvements: z.array(z.string()),
        summary: z.string(),
    });

    /**
     * Parse and validate AI feedback response.
     * Strategy: try JSON.parse() first, then regex extraction as fallback.
     * Validates with Zod to ensure the LLM returned the correct structure.
     */
    private parseAIFeedback(aiResponse: string): FeedbackResult | null {
        // Step 1: Try direct JSON.parse
        try {
            const direct = JSON.parse(aiResponse);
            const validated = this.FeedbackSchema.parse(direct);
            return validated;
        } catch {
            // Not valid JSON directly — try regex extraction
        }

        // Step 2: Regex fallback — find the last complete JSON object
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[0]);
                const validated = this.FeedbackSchema.parse(extracted);
                return validated;
            }
        } catch (err) {
            Logger.warn('Failed to parse AI feedback JSON', err);
        }

        return null;
    }

    private getDefaultFeedback(): FeedbackResult {
        return {
            overallScore: 0,
            categories: [
                { name: 'Problem Solving', score: 0, feedback: 'Unable to evaluate — AI feedback generation failed.' },
                { name: 'Communication', score: 0, feedback: 'Unable to evaluate — AI feedback generation failed.' },
                { name: 'Code Quality', score: 0, feedback: 'Unable to evaluate — AI feedback generation failed.' },
                { name: 'Technical Knowledge', score: 0, feedback: 'Unable to evaluate — AI feedback generation failed.' },
            ],
            strengths: [
                'Completed the interview session'
            ],
            improvements: [
                'Feedback could not be generated automatically — please try again'
            ],
            summary: 'Automated feedback generation was unavailable. Please request feedback again or contact support.'
        };
    }
}

export const feedbackService = new FeedbackService();
