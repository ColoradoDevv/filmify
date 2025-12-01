'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function BroadcastListener() {
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase.channel('system_broadcasts')
            .on(
                'broadcast',
                { event: 'system_alert' },
                (payload) => {
                    console.log('Broadcast received:', payload);
                    const { title, message, type } = payload.payload;

                    // Show toast
                    toast(title || 'Alerta del Sistema', {
                        description: message,
                        duration: 10000, // 10 seconds
                        action: {
                            label: 'Entendido',
                            onClick: () => console.log('Dismissed'),
                        },
                        // You can style it based on type if needed
                        style: {
                            background: '#1e293b',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    return null;
}
