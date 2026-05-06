import { useState } from 'react';

interface FeedbackTextarea21Props {
  minLength?: number;
}

export default function FeedbackTextarea21({ minLength = 10 }: FeedbackTextarea21Props) {
  const [feedback, setFeedback] = useState('Awesome product!');
  const isInvalid = feedback.length > 0 && feedback.length < minLength;

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor="profile-feedback" className="text-sm font-medium text-zinc-300">
        UI feedback
      </label>
      <textarea
        id="profile-feedback"
        aria-invalid={isInvalid}
        className="min-h-[96px] w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Share your feedback here"
      />
      {isInvalid ? (
        <p className="text-xs text-red-300" role="alert">
          Feedback must be at least {minLength} characters.
        </p>
      ) : feedback.length >= minLength ? (
        <p className="text-xs text-emerald-300">Looks good.</p>
      ) : null}
    </div>
  );
}
