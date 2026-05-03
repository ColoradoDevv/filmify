import type { Metadata } from 'next';
import WatchPartyLobby from './WatchPartyLobby';

export const metadata: Metadata = {
    title: 'Watch Party — FilmiFy',
    description: 'Crea o únete a una sala para ver películas y series con amigos en tiempo real.',
};

export default function WatchPartyPage() {
    return <WatchPartyLobby />;
}
