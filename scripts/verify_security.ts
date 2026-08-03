import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!PROJECT_URL || !ANON_KEY || !SERVICE_KEY) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabaseAnon = createClient(PROJECT_URL, ANON_KEY);
const supabaseService = createClient(PROJECT_URL, SERVICE_KEY);

async function runTests() {
    console.log('🛡️ Starting Security Verification Suite...\n');

    // 0. Setup: Get a real user ID to test against
    const { data: users, error: userError } = await supabaseService.auth.admin.listUsers();
    if (userError || !users.users.length) {
        console.error('❌ Failed to fetch users for testing:', userError?.message);
        return;
    }
    const victimUser = users.users[0];
    const attackerUser = users.users[1] || users.users[0]; // Use same if only 1 exists, but ideally need 2

    console.log(`🎯 Target User ID: ${victimUser.id}`);
    console.log(`🦹 Attacker User ID: ${attackerUser.id}\n`);

    // SEC-017: never hardcode credentials in source code.
    // Provide test credentials via environment variables so they are never
    // committed to the repository or exposed in CI/CD logs.
    const testEmail    = process.env.SECURITY_TEST_EMAIL;
    const testPassword = process.env.SECURITY_TEST_PASSWORD;

    if (!testEmail || !testPassword) {
        console.warn('⚠️  Skipping authenticated test: set SECURITY_TEST_EMAIL and SECURITY_TEST_PASSWORD env vars.');
    } else {
        const { data: { session }, error: loginError } = await supabaseAnon.auth.signInWithPassword({
            email:    testEmail,
            password: testPassword,
        });
        if (loginError) {
            console.warn('⚠️  Could not sign in with test credentials:', loginError.message);
        }
    }

    const { error: massAssignmentError } = await supabaseAnon
        .from('profiles')
        .update({ role: 'admin' } as any)
        .eq('id', attackerUser.id);

    if (massAssignmentError) {
        console.log('✅ PASS: Mass assignment blocked.', massAssignmentError.message);
    } else {
        // Double check if it actually changed
        const { data: profile } = await supabaseService.from('profiles').select('role').eq('id', attackerUser.id).single();
        if (profile?.role === 'admin') {
            console.error('❌ FAIL: Mass assignment SUCCEEDED! User is now admin.');
        } else {
            console.log('✅ PASS: Update appeared to succeed but role was NOT changed (likely ignored or trigger blocked).');
        }
    }

    // 2. Service Role Update (Should SUCCEED)
    console.log('\n2️⃣  Test: Service Role Update (Admin Override)');
    const { error: serviceUpdateError } = await supabaseService
        .from('profiles')
        .update({ role: 'admin' } as any)
        .eq('id', attackerUser.id);

    if (serviceUpdateError) {
        console.error('❌ FAIL: Service role update failed:', serviceUpdateError.message);
    } else {
        const { data: profile } = await supabaseService.from('profiles').select('role').eq('id', attackerUser.id).single();
        if (profile?.role === 'admin') {
            console.log('✅ PASS: Service role successfully updated profile.');
            // Revert
            await supabaseService.from('profiles').update({ role: 'user' } as any).eq('id', attackerUser.id);
        } else {
            console.error('❌ FAIL: Service role update reported success but data did not change.');
        }
    }

    // 3. IDOR / Horizontal Access (Should FAIL)
    console.log('\n3️⃣  Test: IDOR - Updating another user profile');
    const { error: idorError } = await supabaseAnon
        .from('profiles')
        .update({ full_name: 'HACKED' })
        .eq('id', victimUser.id); // Trying to update victim

    if (idorError) {
        console.log('✅ PASS: IDOR blocked.', idorError.message);
    } else {
        // Double check
        const { data: profile } = await supabaseService.from('profiles').select('full_name').eq('id', victimUser.id).single();
        if (profile?.full_name === 'HACKED') {
            console.error('❌ FAIL: IDOR SUCCEEDED! Victim profile changed.');
            // Revert
            // await supabaseService.from('profiles').update({ full_name: 'Original Name' }).eq('id', victimUser.id);
        } else {
            console.log('✅ PASS: IDOR update appeared to succeed but data did not change (RLS filtered rows).');
        }
    }

    console.log('\n🏁 Verification Complete.');
}

runTests().catch(console.error);
