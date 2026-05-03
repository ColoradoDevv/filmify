import WatchPartyRoom from './WatchPartyRoom';

interface Props {
    params: Promise<{ code: string }>;
}

export default async function WatchPartyRoomPage({ params }: Props) {
    const { code } = await params;
    return <WatchPartyRoom code={code} />;
}
