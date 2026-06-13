import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Delete all related public data via the RPC function
        const { error: rpcError } = await supabase.rpc('delete_user_and_related', {
            user_id: user.id,
        });
        if (rpcError) throw rpcError;

        // Delete the auth user (requires service role)
        const admin = createAdminClient();
        const { error: adminError } = await admin.auth.admin.deleteUser(user.id);
        if (adminError) throw adminError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
