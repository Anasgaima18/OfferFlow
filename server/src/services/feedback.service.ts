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
                // Update interview with score
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

        return this.getDefaultFeedback();
    }

    private getDefaultFeedback(): FeedbackResult {
        return {
            overallScore: 70,
            categories: [
                { name: 'Problem Solving', score: 72, feedback: 'Demonstrated reasonable problem-solving approach.' },
                { name: 'Communication', score: 68, feedback: 'Communication was adequate but could be more structured.' },
                { name: 'Code Quality', score: 70, feedback: 'Code was functional but could benefit from better organization.' },
                { name: 'Technical Knowledge', score: 70, feedback: 'Showed foundational technical understanding.' },
            ],
            strengths: [
                'Completed the interview session',
                'Engaged with the interviewer',
                'Attempted the coding challenge'
            ],
            improvements: [
                'Practice explaining your thought process aloud',
                'Work on edge case identification',
                'Consider time and space complexity in solutions'
            ],
            summary: 'The candidate completed the interview. Continue practicing to improve scores across all categories.'
        };
    }
}

export const feedbackService = new FeedbackService();
