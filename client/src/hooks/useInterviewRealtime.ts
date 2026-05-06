import { useEffect, useRef } from 'react';
import { getRealtimeClient } from '../lib/supabaseRealtime';

export const useInterviewRealtime = (
  interviewId: string | undefined,
  onTranscriptUpdate: () => void,
  enabled = true,
) => {
  const updateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!interviewId || !enabled) return;
    let active = true;
    const channelName = `transcript-messages-${interviewId}-${Date.now()}`;

    const run = async () => {
      try {
        const client = await getRealtimeClient();
        const channel = client
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transcript_messages',
              filter: `interview_id=eq.${interviewId}`,
            },
            () => {
              if (!active) return;
              if (updateTimeoutRef.current !== null) {
                window.clearTimeout(updateTimeoutRef.current);
              }
              // Debounce rapid transcript updates to prevent fetch storms.
              updateTimeoutRef.current = window.setTimeout(() => {
                if (active) onTranscriptUpdate();
              }, 300);
            },
          )
          .subscribe();

        if (!active) {
          client.removeChannel(channel);
        }
      } catch {
        // Silent fallback: app still works without realtime.
      }
    };

    void run();

    return () => {
      active = false;
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      getRealtimeClient()
        .then((client) => {
          client.getChannels()
            .filter((c) => c.topic.includes(channelName))
            .forEach((c) => {
              client.removeChannel(c);
            });
        })
        .catch(() => undefined);
    };
  }, [enabled, interviewId, onTranscriptUpdate]);
};
