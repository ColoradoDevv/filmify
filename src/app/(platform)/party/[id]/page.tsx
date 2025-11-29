import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PartyRoom } from '@/components/watch-party/PartyRoom';

interface PartyPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PartyPage({ params }: PartyPageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user profile for name/avatar
    // Assuming there is a profiles table or metadata. 
    // For now, using metadata or fallback.
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

    const currentUser = {
        id: user.id,
        name: profile?.username || user.email?.split('@')[0] || 'User',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
    };

    return <PartyRoom partyId={id} currentUser={currentUser} />;
}
