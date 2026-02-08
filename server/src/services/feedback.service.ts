import { interviewService } from './interview.service';
import { sarvamService } from './sarvam.service';
import { Logger } from '../utils/logger';

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

            // Parse AI response as JSON
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as FeedbackResult;
                // Update interview with AI-generated score
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
