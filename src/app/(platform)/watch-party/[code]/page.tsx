// src/app/(platform)/watch-party/[code]/page.tsx
import WatchPartyRoom from './WatchPartyRoom';
import { AdSlot } from '@/components/ads';

interface Props {
    params: Promise<{ code: string }>;
}

export default async function WatchPartyRoomPage({ params }: Props) {
    const { code } = await params;
    return (
        <>
            {/* 📢 Banner publicitario */}
            <div className="px-4 sm:px-6 lg:px-8 pt-4">
                <AdSlot className="my-0" />
            </div>
            <WatchPartyRoom code={code} />
        </>
    );
}
