import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/services/supabase';

export type PresenceStatus = 'online' | 'away' | 'offline';

export function usePresence(userId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const setStatus = async (status: PresenceStatus) => {
      await supabase.from('user_presence').upsert({
        user_id: userId,
        status,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };

    // Set online immediately
    setStatus('online');

    // Heartbeat every 30s
    intervalRef.current = setInterval(() => setStatus('online'), 30000);

    // Set offline on cleanup
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setStatus('offline');
    };
  }, [userId]);
}

export function useUserPresence(targetUserId: string | undefined): PresenceStatus {
  const [status, setStatus] = useState<PresenceStatus>('offline');

  useEffect(() => {
    if (!targetUserId) return;

    // Initial fetch
    supabase
      .from('user_presence')
      .select('status, last_seen')
      .eq('user_id', targetUserId)
      .single()
      .then(({ data }) => {
        if (data) {
          const lastSeen = new Date(data.last_seen).getTime();
          const diffMins = (Date.now() - lastSeen) / 60000;
          if (data.status === 'online' && diffMins < 2) setStatus('online');
          else if (diffMins < 10) setStatus('away');
          else setStatus('offline');
        }
      });

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`presence:${targetUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${targetUserId}`,
      }, (payload) => {
        const data = payload.new as { status: string; last_seen: string };
        if (data) setStatus(data.status as PresenceStatus);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [targetUserId]);

  return status;
}
