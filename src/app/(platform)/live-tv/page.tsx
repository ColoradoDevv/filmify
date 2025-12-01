import { fetchAllChannels, getCategories, getCountries } from '@/services/liveTV';
import LiveTVClient from './LiveTVClient';

export const metadata = {
    title: 'TV en Vivo - FilmiFy',
    description: 'Mira canales de TV en vivo gratis de todo el mundo'
};

export default async function LiveTVPage() {
    // Fetch channels on server
    const channels = await fetchAllChannels();
    const categories = getCategories(channels);
    const countries = getCountries(channels);

    return (
        <div className="min-h-screen bg-background">
            <LiveTVClient
                initialChannels={channels}
                categories={categories}
                countries={countries}
            />
        </div>
    );
}
