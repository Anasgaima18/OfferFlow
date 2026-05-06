import { useEffect } from 'react';
import { getRealtimeClient } from '../lib/supabaseRealtime';

export const useInterviewRealtime = (
  interviewId: string | undefined,
  onTranscriptUpdate: () => void,
  enabled = true,
) => {
  useEffect(() => {
    if (!interviewId || !enabled) return;
    let active = true;
    let channelName = `transcript-messages-${interviewId}-${Date.now()}`;

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
              if (active) onTranscriptUpdate();
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
