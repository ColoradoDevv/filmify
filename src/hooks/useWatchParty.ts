import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Party, PartyMember, ChatMessage, PartyStatus } from '@/types/watch-party';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseWatchPartyProps {
    partyId: string;
    currentUser: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
}

export const useWatchParty = ({ partyId, currentUser }: UseWatchPartyProps) => {
    const [party, setParty] = useState<Party | null>(null);
    const [members, setMembers] = useState<PartyMember[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastControlAction, setLastControlAction] = useState<{
        action: 'play' | 'pause' | 'seek';
        value?: number;
        timestamp: number;
    } | null>(null);

    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabase = createClient();

    // Initial fetch
    useEffect(() => {
        const fetchParty = async () => {
            const { data, error } = await supabase
                .from('parties')
                .select('*')
                .eq('id', partyId)
                .single();

            if (error) {
                console.error('Error loading party', error);
                return;
            }
            setParty(data as Party);
            setIsLoading(false);
        };

        fetchParty();
    }, [partyId]);

    // Realtime subscription
    useEffect(() => {
        if (!partyId || !currentUser) return;

        const channel = supabase.channel(`party:${partyId}`, {
            config: {
                presence: {
                    key: currentUser.id,
                },
            },
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const activeMembers: PartyMember[] = [];

                Object.values(newState).forEach((presences: any) => {
                    presences.forEach((presence: any) => {
                        activeMembers.push({
                            user_id: presence.user_id,
                            username: presence.username,
                            avatar_url: presence.avatar_url,
                            is_host: presence.is_host,
                            is_ready: presence.is_ready,
                            online_at: presence.online_at,
                        });
                    });
                });

                setMembers(activeMembers);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                const newMember = newPresences[0];
                console.log(`${newMember.username} joined the party!`);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                const leftMember = leftPresences[0];
                console.log(`${leftMember.username} left.`);
            })
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                setMessages((prev) => [...prev, payload as ChatMessage]);
            })
            .on('broadcast', { event: 'control' }, ({ payload }) => {
                console.log('Received control event:', payload);
                setLastControlAction({
                    action: payload.action,
                    value: payload.value,
                    timestamp: Date.now(),
                });
            })
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'parties',
                    filter: `id=eq.${partyId}`,
                },
                (payload) => {
                    setParty((prev) => (prev ? { ...prev, ...payload.new } : null) as Party);
                }
            )
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: currentUser.id,
                        username: currentUser.name,
                        avatar_url: currentUser.avatar_url,
                        is_host: false, // Will be updated if they are host
                        is_ready: false,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [partyId, currentUser.id]);

    // Actions
    const sendMessage = useCallback(async (text: string) => {
        if (!channelRef.current) return;

        const message: ChatMessage = {
            id: crypto.randomUUID(),
            user_id: currentUser.id,
            username: currentUser.name,
            avatar_url: currentUser.avatar_url,
            text,
            timestamp: new Date().toISOString(),
        };

        // Optimistic update
        setMessages((prev) => [...prev, message]);

        await channelRef.current.send({
            type: 'broadcast',
            event: 'chat',
            payload: message,
        });
    }, [currentUser]);

    const toggleReady = useCallback(async (isReady: boolean) => {
        if (!channelRef.current) return;

        // We need to re-track with all current info + new status
        await channelRef.current.track({
            user_id: currentUser.id,
            username: currentUser.name,
            avatar_url: currentUser.avatar_url,
            is_host: party?.host_id === currentUser.id,
            is_ready: isReady,
            online_at: new Date().toISOString(),
        });
    }, [currentUser, party]);

    const startParty = useCallback(async () => {
        if (!party) return;

        const { error } = await supabase
            .from('parties')
            .update({ status: 'counting' })
            .eq('id', party.id);

        if (error) {
            console.error('Failed to start party');
        }
    }, [party]);

    const endParty = useCallback(async () => {
        if (!party) return;

        const { error } = await supabase
            .from('parties')
            .update({ status: 'finished' })
            .eq('id', party.id);

        if (error) {
            console.error('Failed to end party', error);
        }
    }, [party]);

    const sendControl = useCallback(async (action: 'play' | 'pause' | 'seek', value?: number) => {
        if (!channelRef.current) return;

        // Optimistic update for the sender (host)
        setLastControlAction({
            action,
            value,
            timestamp: Date.now(),
        });

        await channelRef.current.send({
            type: 'broadcast',
            event: 'control',
            payload: { action, value, user_id: currentUser.id },
        });
    }, [currentUser]);

    return {
        party,
        members,
        messages,
        isLoading,
        sendMessage,
        toggleReady,
        startParty,
        endParty,
        sendControl,
        lastControlAction,
    };
};
