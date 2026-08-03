// ── Cloudflare Workers compatibility ──────────────────────────────────────────
// The original implementation used fs.readFileSync(process.cwd() + '/SECURITY.md')
// at request time. That fails in Workers: the filesystem does not exist at
// runtime (only at build time), and even nodejs_compat does not polyfill it.
//
// Fix: the content now lives in src/content/security-policy.ts — a plain TS
// module that Next.js bundles at build time. No fs, no path, no runtime I/O.
// If you update SECURITY.md, keep src/content/security-policy.ts in sync.
import { securityPolicyContent } from '@/content/security-policy';
import Markdown from 'react-markdown';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AdSlot } from '@/components/ads';

export default function SecurityPage() {
    return (
        <main className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <div className="flex-grow max-w-4xl mx-auto px-4 py-24 w-full">
                <div className="prose prose-invert max-w-none">
                    <Markdown>{securityPolicyContent}</Markdown>
                </div>

                {/* 📢 Banner publicitario */}
                <AdSlot />
            </div>
            <Footer />
        </main>
    );
}
