import ComingSoon from '@/components/features/ComingSoon';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'TV en Vivo | FilmiFy',
    robots: { index: false, follow: false },
};

// Temporarily disabled — the channel source this page depended on stopped
// working reliably. The implementation (LiveTVClient, ChannelCard,
// LiveTVGrid/Player, src/services/liveTV.ts) is left in place for when it's
// fixed; this route just stops sending users into a broken player until then.
export default function LiveTVPage() {
    return (
        <ComingSoon
            title="TV en Vivo"
            description="Estamos resolviendo un problema con esta sección. Vuelve pronto."
        />
    );
}
