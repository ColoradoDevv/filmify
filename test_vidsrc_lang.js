
const fetch = require('node-fetch');

async function check(imdbId, lang) {
    const url = `https://vidsrc.me/embed/movie/${imdbId}?lang=${lang}`;
    console.log(`Checking ${url}...`);
    try {
        const res = await fetch(url, { method: 'HEAD' });
        console.log(`Lang: ${lang}, Status: ${res.status}, Content-Length: ${res.headers.get('content-length')}`);
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

async function run() {
    // Fight Club (usually has both)
    await check('tt0137523', 'es');
    await check('tt0137523', 'en');

    // Some obscure movie or just testing invalid lang
    await check('tt0137523', 'xx'); // Invalid lang
}

run();
