const fetch = require('node-fetch');

const SOURCES = [
    {
        name: "vidsrc.me",
        getMovieUrl: (id, lang) => `https://vidsrc.me/embed/movie/${id}?lang=${lang}&autoplay=1&badge=0`,
    },
    {
        name: "autoembed.cc",
        getMovieUrl: (id, lang) => `https://player.autoembed.cc/embed/movie/${id}?lang=${lang}`,
    },
    {
        name: "2embed.cc",
        getMovieUrl: (id) => `https://www.2embed.cc/embed/movie/${id}`,
    },
    {
        name: "vidlink.pro",
        getMovieUrl: (id, lang) => `https://vidlink.pro/embed/movie/${id}?lang=${lang}`,
    },
    {
        name: "godriveplayer",
        getMovieUrl: (id, lang) => `https://godriveplayer.com/embed/movie/${id}?lang=${lang}`,
    }
];

async function testStreams(imdbId) {
    console.log(`Testing for IMDB ID: ${imdbId}`);

    for (const src of SOURCES) {
        const url = src.getMovieUrl(imdbId, 'es');
        console.log(`Checking ${src.name}: ${url}`);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            clearTimeout(timeout);
            console.log(`Result: ${res.status} ${res.statusText}`);
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

// Test with Gladiator (tt0172495)
testStreams('tt0172495');
