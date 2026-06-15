// World Cup 2026 service — combina TRES fuentes gratuitas (sin API key de pago)
// para ofrecer el calendario completo + estado/marcador en vivo + embeds de
// transmisión, reconciliadas por nombre de equipo + fecha:
//
//   1. openfootball/worldcup.json  → calendario canónico de 104 partidos
//      (equipos, grupo, sede, fecha/hora). Fuente de verdad. ~1 actualización/día.
//   2. TheSportsDB (key pública "3") → estado real (NS/1H/2H/HT/FT), marcador y
//      escudos de los equipos. Capa "en vivo".
//   3. SportSRC (sin key, CORS) → id del partido para resolver los embeds de video.
//
// Filosofía: FALLA OPEN. Si una fuente secundaria cae, se devuelve igual el
// calendario de openfootball — la página nunca queda en blanco.

const OPENFOOTBALL_URL =
    'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const SPORTSRC_BASE = 'https://api.sportsrc.org';
// API-Football (api-sports.io) — única fuente con el MINUTO REAL en vivo
// (status.elapsed, descontando el descanso correctamente). Requiere API key
// gratuita (API_FOOTBALL_KEY). Si falta, esta capa se omite y se usa la
// estimación por ventana horaria.
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

const FETCH_TIMEOUT_MS = 8_000;
// El status/marcador deben refrescarse seguido; el calendario casi nunca cambia.
const LIVE_REVALIDATE_S = 60;
const SCHEDULE_REVALIDATE_S = 21_600; // 6h

// Duración típica de un partido (90' + descanso + añadido) para la heurística de
// ventana horaria cuando TheSportsDB aún no reporta el estado.
const MATCH_WINDOW_MIN = 130;

// ── Tipos públicos ──────────────────────────────────────────────────────────

export type MatchStatus = 'LIVE' | 'SCHEDULED' | 'FINISHED';

export interface WorldCupMatch {
    /** Id estable derivado de fecha + equipos (NO depende de ninguna API). */
    id: string;
    homeTeam: string;
    awayTeam: string;
    /** Escudo de TheSportsDB; si falta, se usa una bandera de flagcdn como respaldo. */
    homeBadge: string;
    awayBadge: string;
    group: string;          // "Grupo A" | "Octavos de Final" | …
    stadium: string;
    kickoff: string;        // ISO 8601 UTC
    time: string;           // hora pre-formateada (Bogotá) — fallback SSR; el cliente reformatea a la zona local
    status: MatchStatus;
    homeScore: number | null;
    awayScore: number | null;
    minute: number | null;  // minuto REAL de API-Football en vivo; si falta su key, estimado por hora
    /** Id de SportSRC para resolver los servidores de embed; null si no hay match. */
    sportsrcId: string | null;
}

export interface StreamSource {
    id: string;
    label: string;          // "Español · HD" | "English - FS1" …
    embedUrl: string;
    hd: boolean;
    language: string;
    viewers: number;
}

// ── Tipos de la información del partido (preview / resultado) ────────────────

export interface TeamInfo {
    name: string;           // traducido (display)
    idTeam: string | null;  // id de TheSportsDB (para jugadores/forma)
    badge: string;
    nickname: string;       // apodo ("La Furia Roja")
    foundedYear: string;
    stadium: string;
    description: string;    // descripción en español
    website: string;
}

export interface PlayerInfo {
    name: string;
    position: string;
}

/** Un partido del historial reciente, desde la óptica del equipo consultado. */
export interface FormMatch {
    opponent: string;
    date: string;           // ISO o YYYY-MM-DD
    homeScore: number | null;
    awayScore: number | null;
    result: 'W' | 'D' | 'L' | null;  // resultado para el equipo consultado
    wasHome: boolean;
}

export interface StatRow {
    label: string;          // "Tiros a puerta"
    home: number;
    away: number;
}

/** Una fila de la tabla del grupo (calculada desde openfootball). */
export interface StandingRow {
    team: string;           // traducido
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
}

/** Paquete informativo completo de un partido (para preview/resultado). */
export interface MatchInfo {
    home: TeamInfo;
    away: TeamInfo;
    homePlayers: PlayerInfo[];
    awayPlayers: PlayerInfo[];
    homeForm: FormMatch[];
    awayForm: FormMatch[];
    standings: StandingRow[];  // tabla del grupo (vacío en eliminatorias)
    stats: StatRow[];          // estadísticas del partido (solo FINISHED, si hay)
}

// ── Fetch helper genérico (timeout + JSON seguro) ───────────────────────────

async function fetchJson<T>(
    url: string,
    revalidate: number,
    retriesOn429 = 0,
): Promise<T | null> {
    try {
        const res = await fetch(url, {
            headers: { Accept: 'application/json', 'User-Agent': 'FilmiFy/1.0' },
            next: { revalidate },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        // TheSportsDB free limita peticiones → reintento corto con backoff.
        if (res.status === 429 && retriesOn429 > 0) {
            await new Promise((r) => setTimeout(r, 1200));
            return fetchJson<T>(url, revalidate, retriesOn429 - 1);
        }
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

// ── Normalización de nombres de equipo (pegamento entre las 3 fuentes) ──────

// Alias entre las distintas convenciones de nombre. La clave y el valor se
// comparan ya normalizados (minúsculas, sin acentos).
const TEAM_ALIASES: Record<string, string> = {
    'united states': 'usa',
    'us': 'usa',
    'korea republic': 'south korea',
    'korea dpr': 'north korea',
    'ir iran': 'iran',
    'iran islamic republic': 'iran',
    "cote d'ivoire": 'ivory coast',
    'côte d’ivoire': 'ivory coast',
    'czechia': 'czech republic',
    'china pr': 'china',
    'cabo verde': 'cape verde',
    'turkiye': 'turkey',
    'türkiye': 'turkey',
    'congo dr': 'dr congo',
    'democratic republic of the congo': 'dr congo',
    'dr congo': 'dr congo',
    'ir iran islamic republic of': 'iran',
};

export function normalizeTeam(name: string): string {
    if (!name) return '';
    const base = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // quita diacríticos combinantes
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return TEAM_ALIASES[base] ?? base;
}

// ── Traducción a español (solo para mostrar) ────────────────────────────────
// IMPORTANTE: el nombre en inglés sigue siendo la CLAVE de cruce entre las 3
// fuentes (normalizeTeam/matchKey). Estos mapas solo cambian lo que VE el
// usuario; se buscan por el nombre normalizado en inglés y caen al original si
// no están. Así no se rompe el emparejamiento con TheSportsDB/SportSRC.

const TEAM_ES: Record<string, string> = {
    'ivory coast': 'Costa de Marfil', 'south korea': 'Corea del Sur',
    'north korea': 'Corea del Norte', 'south africa': 'Sudáfrica',
    'saudi arabia': 'Arabia Saudita', 'new zealand': 'Nueva Zelanda',
    'cape verde': 'Cabo Verde', 'dr congo': 'R.D. del Congo',
    'czech republic': 'República Checa', 'germany': 'Alemania',
    'spain': 'España', 'france': 'Francia', 'england': 'Inglaterra',
    'brazil': 'Brasil', 'belgium': 'Bélgica', 'croatia': 'Croacia',
    'egypt': 'Egipto', 'morocco': 'Marruecos', 'tunisia': 'Túnez',
    'sweden': 'Suecia', 'switzerland': 'Suiza', 'norway': 'Noruega',
    'austria': 'Austria', 'jordan': 'Jordania', 'iran': 'Irán',
    'iraq': 'Irak', 'japan': 'Japón', 'turkey': 'Turquía',
    'netherlands': 'Países Bajos', 'scotland': 'Escocia',
    'wales': 'Gales', 'qatar': 'Catar', 'haiti': 'Haití',
    'panama': 'Panamá', 'algeria': 'Argelia', 'senegal': 'Senegal',
    'ghana': 'Ghana', 'uruguay': 'Uruguay', 'paraguay': 'Paraguay',
    'colombia': 'Colombia', 'mexico': 'México', 'canada': 'Canadá',
    'usa': 'Estados Unidos', 'australia': 'Australia', 'curacao': 'Curazao',
    'bosnia herzegovina': 'Bosnia y Herzegovina',
    'bosnia and herzegovina': 'Bosnia y Herzegovina',
    'jamaica': 'Jamaica', 'uzbekistan': 'Uzbekistán',
    'new caledonia': 'Nueva Caledonia', 'cameroon': 'Camerún',
    'nigeria': 'Nigeria', 'argentina': 'Argentina', 'portugal': 'Portugal',
    'italy': 'Italia', 'denmark': 'Dinamarca', 'poland': 'Polonia',
    'ecuador': 'Ecuador', 'china': 'China',
};

// Ciudades sede del Mundial 2026 (openfootball usa el formato "City (Suburb)").
// Las claves se escriben en texto normal y se normalizan en el lookup, así que
// "New York/New Jersey" (con barra) se compara ya sin la barra.
const CITY_ES_RAW: Record<string, string> = {
    'Mexico City': 'Ciudad de México', 'Guadalajara': 'Guadalajara',
    'Monterrey': 'Monterrey', 'Toronto': 'Toronto', 'Vancouver': 'Vancouver',
    'New York': 'Nueva York', 'New York/New Jersey': 'Nueva York / Nueva Jersey',
    'Los Angeles': 'Los Ángeles', 'San Francisco Bay Area': 'Área de la Bahía de San Francisco',
    'Seattle': 'Seattle', 'Kansas City': 'Kansas City', 'Dallas': 'Dallas',
    'Houston': 'Houston', 'Atlanta': 'Atlanta', 'Miami': 'Miami',
    'Boston': 'Boston', 'Philadelphia': 'Filadelfia',
};
// Mapa con claves normalizadas (mismo proceso que el lookup) → coincidencia fiable.
const CITY_ES: Record<string, string> = Object.fromEntries(
    Object.entries(CITY_ES_RAW).map(([k, v]) => [normalizeTeam(k), v]),
);

export function translateTeam(name: string): string {
    return TEAM_ES[normalizeTeam(name)] ?? name;
}

/** Traduce la ciudad principal del nombre de la sede, conservando el sufijo. */
export function translateVenue(venue: string): string {
    if (!venue) return venue;
    // openfootball: "New York/New Jersey (East Rutherford)" → traducir la parte
    // antes del paréntesis si la conocemos; el sufijo entre paréntesis se deja.
    const m = venue.match(/^([^(]+?)\s*(\(.*\))?$/);
    const city = (m?.[1] ?? venue).trim();
    const suffix = m?.[2] ? ` ${m[2]}` : '';
    const key = normalizeTeam(city);
    const translated = CITY_ES[key];
    return translated ? `${translated}${suffix}` : venue;
}

/** Clave de cruce por partido: equipos ordenados alfabéticamente + fecha. */
function matchKey(teamA: string, teamB: string, dateISO: string): string {
    const [a, b] = [normalizeTeam(teamA), normalizeTeam(teamB)].sort();
    return `${dateISO}|${a}|${b}`;
}

function slug(s: string): string {
    return normalizeTeam(s).replace(/\s+/g, '-');
}

// ── openfootball: calendario base ───────────────────────────────────────────

interface OpenFootballMatch {
    round: string;
    date: string;            // "2026-06-14"
    time: string;            // "12:00 UTC-5"
    team1: string;
    team2: string;
    group?: string;          // "Group A"
    ground?: string;
    score?: { ft?: [number, number]; ht?: [number, number] };
}
interface OpenFootballFile { name: string; matches: OpenFootballMatch[]; }

/** Convierte "2026-06-14" + "12:00 UTC-5" → Date UTC exacta. */
function parseKickoff(date: string, time: string): Date | null {
    const m = time?.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})?/i);
    if (!m) return null;
    const [, hh, mm, off] = m;
    const offset = off ? parseInt(off, 10) : 0;
    // Hora local = UTC + offset  ⇒  UTC = hora local − offset.
    const utcHour = parseInt(hh, 10) - offset;
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCHours(utcHour, parseInt(mm, 10), 0, 0);
    return d;
}

const SPANISH_ROUND: Record<string, string> = {
    'Round of 32': 'Dieciseisavos',
    'Round of 16': 'Octavos de Final',
    'Quarter-finals': 'Cuartos de Final',
    'Quarterfinals': 'Cuartos de Final',
    'Semi-finals': 'Semifinal',
    'Semifinals': 'Semifinal',
    'Match for third place': 'Tercer Puesto',
    'Final': 'Final',
};

function groupLabel(m: OpenFootballMatch): string {
    if (m.group) return m.group.replace(/^Group/i, 'Grupo');
    if (SPANISH_ROUND[m.round]) return SPANISH_ROUND[m.round];
    // Fallback: "Matchday 3" → "Jornada 3" por si algún partido de grupos no
    // trae el campo `group`.
    const md = m.round.match(/^Matchday\s+(\d+)/i);
    if (md) return `Jornada ${md[1]}`;
    return m.round;
}

/** Equipos placeholder de eliminatorias aún sin definir (ej. "W74", "1A"). */
function isPlaceholderTeam(name: string): boolean {
    return /^([WL]\d{1,3}|\d[A-L]|[A-L]\d|Winner|Loser)/i.test(name.trim());
}

// ── TheSportsDB: estado + marcador + escudos ────────────────────────────────

interface SportsDbEvent {
    idEvent?: string;
    strLeague?: string;
    strHomeTeam?: string;
    strAwayTeam?: string;
    intHomeScore?: string | null;
    intAwayScore?: string | null;
    strStatus?: string | null;
    strTimestamp?: string | null;   // UTC
    dateEvent?: string;
    strHomeTeamBadge?: string | null;
    strAwayTeamBadge?: string | null;
}
interface SportsDbResponse { events?: SportsDbEvent[] | null; }

interface LiveInfo {
    status: MatchStatus;
    homeScore: number | null;
    awayScore: number | null;
    homeBadge: string | null;
    awayBadge: string | null;
}

function statusFromSportsDb(raw: string | null | undefined): MatchStatus | null {
    if (!raw) return null;
    const s = raw.toUpperCase();
    if (['NS', 'NOT STARTED', 'TBD', 'PST', 'POSTPONED'].includes(s)) return 'SCHEDULED';
    if (['FT', 'AET', 'PEN', 'MATCH FINISHED', 'AWARDED'].includes(s)) return 'FINISHED';
    // 1H, 2H, HT, ET, LIVE, P, BT… → en juego
    if (/\b(1H|2H|HT|ET|BT|P|LIVE|PLAYING)\b/.test(s)) return 'LIVE';
    return null;
}

function toScore(v: string | null | undefined): number | null {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/** Descarga TheSportsDB para [ayer, hoy, mañana] y arma un mapa por matchKey. */
async function fetchLiveInfoMap(): Promise<Map<string, LiveInfo>> {
    const map = new Map<string, LiveInfo>();
    const today = new Date();
    const days = [-1, 0, 1].map((delta) => {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() + delta);
        return d.toISOString().slice(0, 10);
    });

    const responses = await Promise.all(
        days.map((day) =>
            fetchJson<SportsDbResponse>(
                `${THESPORTSDB_BASE}/eventsday.php?d=${day}&s=Soccer`,
                LIVE_REVALIDATE_S,
            ),
        ),
    );

    for (const resp of responses) {
        for (const ev of resp?.events ?? []) {
            if ((ev.strLeague ?? '').toLowerCase() !== 'fifa world cup') continue;
            if (!ev.strHomeTeam || !ev.strAwayTeam || !ev.dateEvent) continue;
            const key = matchKey(ev.strHomeTeam, ev.strAwayTeam, ev.dateEvent);
            map.set(key, {
                status: statusFromSportsDb(ev.strStatus) ?? 'SCHEDULED',
                homeScore: toScore(ev.intHomeScore),
                awayScore: toScore(ev.intAwayScore),
                homeBadge: ev.strHomeTeamBadge || null,
                awayBadge: ev.strAwayTeamBadge || null,
            });
        }
    }
    return map;
}

// ── API-Football: minuto/estado/marcador REAL en vivo ───────────────────────
// Es la única fuente que entrega el minuto verdadero (status.elapsed), que
// respeta el descanso. Tiene prioridad sobre TheSportsDB para los partidos en
// vivo. Requiere API_FOOTBALL_KEY; sin ella, se omite (falla open).

interface ApiFootballFixture {
    fixture?: {
        date?: string; // ISO con zona
        status?: { short?: string | null; elapsed?: number | null };
    };
    teams?: {
        home?: { name?: string };
        away?: { name?: string };
    };
    goals?: { home?: number | null; away?: number | null };
}
interface ApiFootballResponse { response?: ApiFootballFixture[] | null }

/** Mapea el código de estado de API-Football a nuestro MatchStatus. */
function statusFromApiFootball(short: string | null | undefined): MatchStatus | null {
    if (!short) return null;
    const s = short.toUpperCase();
    if (['NS', 'TBD', 'PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(s)) return 'SCHEDULED';
    if (['FT', 'AET', 'PEN'].includes(s)) return 'FINISHED';
    // 1H, HT, 2H, ET, BT, P, LIVE, INT, SUSP → en juego
    if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP'].includes(s)) return 'LIVE';
    return null;
}

interface LiveMinuteInfo {
    status: MatchStatus;
    homeScore: number | null;
    awayScore: number | null;
    /** Minuto real de juego; en HT (descanso) es null. */
    minute: number | null;
}

/**
 * Descarga los partidos EN VIVO de API-Football (?live=all, filtrando World Cup)
 * y arma un mapa por matchKey con el minuto real. Vacío si no hay key o falla.
 */
async function fetchApiFootballLiveMap(): Promise<Map<string, LiveMinuteInfo>> {
    const map = new Map<string, LiveMinuteInfo>();
    const key = process.env.API_FOOTBALL_KEY;
    if (!key) return map; // sin clave → se omite esta capa

    try {
        const res = await fetch(`${API_FOOTBALL_BASE}/fixtures?live=all`, {
            headers: { 'x-apisports-key': key },
            next: { revalidate: LIVE_REVALIDATE_S },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return map;
        const data = (await res.json()) as ApiFootballResponse;

        for (const fx of data.response ?? []) {
            const home = fx.teams?.home?.name;
            const away = fx.teams?.away?.name;
            const dateISO = fx.fixture?.date?.slice(0, 10);
            if (!home || !away || !dateISO) continue;
            const status = statusFromApiFootball(fx.fixture?.status?.short);
            if (!status) continue;
            map.set(matchKey(home, away, dateISO), {
                status,
                homeScore: fx.goals?.home ?? null,
                awayScore: fx.goals?.away ?? null,
                // elapsed solo es fiable en vivo; en HT viene como 45 pero el
                // estado HT ya lo refleja, así que respetamos el número crudo.
                minute: typeof fx.fixture?.status?.elapsed === 'number'
                    ? fx.fixture.status.elapsed
                    : null,
            });
        }
    } catch {
        return map; // falla open
    }
    return map;
}

// ── SportSRC: id del partido para los embeds ────────────────────────────────

interface SportSrcMatch {
    id: string;
    title?: string;
    date?: number; // ms (kickoff)
    teams?: { home?: { name?: string }; away?: { name?: string } };
}
// La API responde con sobre: { success, data: [...] }. Algunas variantes
// devuelven el array directo; soportamos ambas.
interface SportSrcEnvelope { success?: boolean; data?: SportSrcMatch[] }

interface SportSrcDetail {
    // detail también puede venir envuelto en { data: { sources } } o plano.
    data?: { sources?: SportSrcSource[] };
    sources?: SportSrcSource[];
}
interface SportSrcSource {
    id?: string;
    streamNo?: number;
    language?: string;
    hd?: boolean;
    embedUrl?: string;
    viewers?: number;
}

/** Entrada candidata de SportSRC para emparejar por equipos + cercanía horaria. */
interface SrcCandidate { id: string; ts: number }

// Ventana de tolerancia para el cruce horario: la fecha de SportSRC (kickoff en
// ms → día UTC) puede caer en otro día calendario que openfootball (hora local).
// Emparejamos por par de equipos y elegimos el candidato más cercano dentro de
// ±18h, evitando confundir el partido de ida/vuelta o repeticiones.
const SRC_TIME_TOLERANCE_MS = 18 * 60 * 60 * 1000;

/**
 * Mapa "par de equipos normalizado" → lista de candidatos {id, ts}.
 * El emparejamiento final por hora se hace en el merge (date-tolerant).
 */
async function fetchSportSrcCandidates(): Promise<Map<string, SrcCandidate[]>> {
    const map = new Map<string, SrcCandidate[]>();
    const raw = await fetchJson<SportSrcEnvelope | SportSrcMatch[]>(
        `${SPORTSRC_BASE}/?data=matches&category=football`,
        LIVE_REVALIDATE_S,
    );
    const list: SportSrcMatch[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
    if (list.length === 0) return map;

    for (const m of list) {
        const home = m.teams?.home?.name;
        const away = m.teams?.away?.name;
        if (!home || !away || !m.id || !m.date) continue;
        const key = teamPairKey(home, away);
        const arr = map.get(key) ?? [];
        arr.push({ id: m.id, ts: m.date });
        map.set(key, arr);
    }
    return map;
}

/** Clave por par de equipos (sin fecha), ordenada para ser simétrica. */
function teamPairKey(teamA: string, teamB: string): string {
    return [normalizeTeam(teamA), normalizeTeam(teamB)].sort().join('|');
}

/** Elige el id de SportSRC cuyo kickoff esté más cerca del de openfootball. */
function resolveSportSrcId(
    candidates: Map<string, SrcCandidate[]>,
    home: string,
    away: string,
    kickoff: Date,
): string | null {
    const arr = candidates.get(teamPairKey(home, away));
    if (!arr || arr.length === 0) return null;
    const target = kickoff.getTime();
    let best: SrcCandidate | null = null;
    let bestDelta = Infinity;
    for (const c of arr) {
        const delta = Math.abs(c.ts - target);
        if (delta < bestDelta) { bestDelta = delta; best = c; }
    }
    return best && bestDelta <= SRC_TIME_TOLERANCE_MS ? best.id : null;
}

// ── Heurística de estado por ventana horaria (respaldo si no hay live data) ─

function statusByWindow(kickoff: Date, now: Date): MatchStatus {
    const diffMin = (now.getTime() - kickoff.getTime()) / 60_000;
    if (diffMin < 0) return 'SCHEDULED';
    if (diffMin <= MATCH_WINDOW_MIN) return 'LIVE';
    return 'FINISHED';
}

// Duración del medio tiempo (descanso) en minutos — se descuenta del reloj de
// pared para no inflar el minuto estimado.
const HALFTIME_MIN = 15;

/**
 * Minuto estimado de juego a partir del reloj de pared. Solo es un respaldo
 * cuando no hay minuto real de API-Football. Descuenta el descanso: a los ~60'
 * de pared ya empezó el 2º tiempo (45' jugados + 15' descanso), así que el
 * minuto jugado es ~45, no ~60. Sin este ajuste mostraba 90' cuando iban 60'.
 */
function estimateMinute(kickoff: Date, now: Date): number | null {
    const wallMin = Math.floor((now.getTime() - kickoff.getTime()) / 60_000);
    if (wallMin < 0 || wallMin > MATCH_WINDOW_MIN) return null;
    // 1er tiempo (0–45' de pared): el minuto jugado == minuto de pared.
    if (wallMin <= 45) return wallMin;
    // Ventana de descanso (45'–60' de pared): se mantiene en 45'.
    if (wallMin <= 45 + HALFTIME_MIN) return 45;
    // 2º tiempo: minuto jugado = pared − descanso, capado a 90'.
    return Math.min(wallMin - HALFTIME_MIN, 90);
}

function fmtLocalTime(d: Date): string {
    return d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
    });
}

// ── Escudos de federación (crests) ──────────────────────────────────────────
// El usuario quiere escudos reales de federación, NO banderas ni iconos.
// Fuente: TheSportsDB `searchteams.php?t=<equipo>` devuelve el strBadge oficial
// (logo de la federación). Es independiente de que haya partido hoy. Los crests
// no cambian → caché de 30 días. Como último recurso (si la búsqueda fallara),
// una bandera por código ISO-2 REAL (mapa fijo, no las 2 primeras letras).

const CREST_REVALIDATE_S = 2_592_000; // 30 días

interface SearchTeamsResponse {
    teams?: Array<{
        idTeam?: string;
        strTeam?: string;
        strSport?: string;
        strLeague?: string;
        strBadge?: string | null;
        strGender?: string | null;
        intFormedYear?: string | null;
        strStadium?: string | null;
        strKeywords?: string | null;
        strDescriptionES?: string | null;
        strDescriptionEN?: string | null;
        strWebsite?: string | null;
    }> | null;
}

// Código ISO-2 por selección (para la bandera de ÚLTIMO recurso). Clave = nombre
// normalizado en inglés.
const TEAM_ISO: Record<string, string> = {
    'mexico': 'mx', 'south africa': 'za', 'usa': 'us', 'paraguay': 'py',
    'canada': 'ca', 'bosnia herzegovina': 'ba', 'south korea': 'kr',
    'czech republic': 'cz', 'qatar': 'qa', 'switzerland': 'ch', 'brazil': 'br',
    'morocco': 'ma', 'haiti': 'ht', 'scotland': 'gb-sct', 'australia': 'au',
    'turkey': 'tr', 'germany': 'de', 'curacao': 'cw', 'spain': 'es',
    'cape verde': 'cv', 'belgium': 'be', 'egypt': 'eg', 'saudi arabia': 'sa',
    'uruguay': 'uy', 'iran': 'ir', 'new zealand': 'nz', 'ivory coast': 'ci',
    'ecuador': 'ec', 'sweden': 'se', 'tunisia': 'tn', 'france': 'fr',
    'senegal': 'sn', 'iraq': 'iq', 'norway': 'no', 'argentina': 'ar',
    'algeria': 'dz', 'austria': 'at', 'jordan': 'jo', 'portugal': 'pt',
    'dr congo': 'cd', 'england': 'gb-eng', 'croatia': 'hr', 'ghana': 'gh',
    'panama': 'pa', 'netherlands': 'nl', 'japan': 'jp', 'colombia': 'co',
    'uzbekistan': 'uz', 'wales': 'gb-wls', 'jamaica': 'jm', 'cameroon': 'cm',
    'nigeria': 'ng', 'new caledonia': 'nc', 'italy': 'it', 'denmark': 'dk',
    'poland': 'pl', 'china': 'cn', 'north korea': 'kp',
};

function fallbackFlag(team: string): string {
    const iso = TEAM_ISO[normalizeTeam(team)];
    // flagcdn en w160 (nítido en las tarjetas). Si no hay ISO, placeholder vacío
    // 1x1 transparente → el cliente lo oculta con onError sin imagen rota.
    return iso
        ? `https://flagcdn.com/w160/${iso}.png`
        : 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
}

/**
 * Devuelve la URL del escudo de federación de una selección desde TheSportsDB.
 * Cacheada 30 días (los crests no cambian). Si no se encuentra, '' → el caller
 * usa la bandera ISO como respaldo final.
 */
async function getTeamCrest(englishName: string): Promise<string> {
    const data = await fetchJson<SearchTeamsResponse>(
        `${THESPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(englishName)}`,
        CREST_REVALIDATE_S,
        2, // reintentos ante 429 (rate-limit del free tier)
    );
    const teams = data?.teams ?? [];
    if (teams.length === 0) return '';

    const target = normalizeTeam(englishName);
    // Preferimos: deporte Soccer + nombre exacto + (selección: liga World Cup o
    // género definido). Evita clubes homónimos.
    const isSoccer = (t: { strSport?: string }) =>
        (t.strSport ?? '').toLowerCase() === 'soccer';
    const exact = teams.find(
        (t) => isSoccer(t) && normalizeTeam(t.strTeam ?? '') === target && t.strBadge,
    );
    const soccerAny = teams.find((t) => isSoccer(t) && t.strBadge);
    return (exact?.strBadge || soccerAny?.strBadge || '') ?? '';
}

// TheSportsDB (key pública "3") aplica rate-limit agresivo: ~48 búsquedas en
// paralelo devuelven HTTP 429 y los equipos caen a la bandera. Resolvemos los
// crests con CONCURRENCIA LIMITADA. Como se cachean 30 días, esta lentitud solo
// ocurre una vez por ventana de caché.
const CREST_CONCURRENCY = 3;

/** Resuelve crests para una lista de nombres (en inglés), con concurrencia baja. */
async function buildCrestMap(names: string[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(names.map(normalizeTeam)));
    const result = new Map<string, string>();
    let cursor = 0;

    async function worker() {
        while (cursor < unique.length) {
            const norm = unique[cursor++];
            // Usamos el nombre normalizado como término de búsqueda; TheSportsDB
            // tolera mayúsculas/minúsculas y la mayoría de variantes.
            result.set(norm, await getTeamCrest(norm));
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(CREST_CONCURRENCY, unique.length) }, worker),
    );
    return result;
}

// ── API pública ─────────────────────────────────────────────────────────────

export async function getWorldCupMatches(): Promise<WorldCupMatch[]> {
    const file = await fetchJson<OpenFootballFile>(
        OPENFOOTBALL_URL,
        SCHEDULE_REVALIDATE_S,
    );
    if (!file?.matches?.length) return [];

    const playable = file.matches
        // Ocultamos partidos de eliminatorias cuyos equipos aún no se conocen.
        .filter((m) => !isPlaceholderTeam(m.team1) && !isPlaceholderTeam(m.team2));

    // Nombres únicos para resolver sus escudos de federación.
    const teamNames = playable.flatMap((m) => [m.team1, m.team2]);

    // Fuentes secundarias en paralelo; si fallan, devuelven mapas vacíos.
    // apiFootballMap tiene el minuto REAL en vivo (prioritario sobre liveMap).
    const [liveMap, apiFootballMap, srcCandidates, crestMap] = await Promise.all([
        fetchLiveInfoMap(),
        fetchApiFootballLiveMap(),
        fetchSportSrcCandidates(),
        buildCrestMap(teamNames),
    ]);

    const now = new Date();

    // Escudo final por equipo: crest por-partido de TheSportsDB (si el partido
    // matcheó) → crest de federación del mapa → bandera ISO de respaldo.
    const badgeFor = (englishName: string, perMatch: string | null): string =>
        perMatch || crestMap.get(normalizeTeam(englishName)) || fallbackFlag(englishName);

    const matches = playable
        .map((m): WorldCupMatch => {
            const dateISO = m.date;
            const kickoff = parseKickoff(m.date, m.time) ?? new Date(`${m.date}T18:00:00Z`);
            const key = matchKey(m.team1, m.team2, dateISO);
            const live = liveMap.get(key);
            const apiFb = apiFootballMap.get(key); // minuto/estado real (si hay key)

            // Estado: API-Football manda (es la fuente en vivo más fiable) →
            // TheSportsDB → estimación por ventana horaria.
            const status = apiFb?.status ?? live?.status ?? statusByWindow(kickoff, now);

            // Marcador: API-Football → TheSportsDB → openfootball (partidos pasados).
            const ftHome = m.score?.ft?.[0] ?? null;
            const ftAway = m.score?.ft?.[1] ?? null;
            let homeScore = apiFb?.homeScore ?? live?.homeScore ?? ftHome;
            let awayScore = apiFb?.awayScore ?? live?.awayScore ?? ftAway;

            // Un partido EN VIVO siempre tiene marcador (mínimo 0-0). Si ninguna
            // fuente lo cruzó (status estimado por ventana horaria), mostramos 0-0
            // en lugar de "vs" para no dar la impresión de que aún no empezó.
            if (status === 'LIVE') {
                homeScore = homeScore ?? 0;
                awayScore = awayScore ?? 0;
            }

            // Minuto: el REAL de API-Football si existe; si no, la estimación
            // (ya corregida para descontar el descanso).
            const minute =
                status === 'LIVE'
                    ? (apiFb?.minute ?? estimateMinute(kickoff, now))
                    : null;

            return {
                // El id usa el nombre en inglés normalizado → URLs estables y
                // lookup por id consistente. Solo los campos visibles se traducen.
                id: `${dateISO}-${slug(m.team1)}-vs-${slug(m.team2)}`,
                homeTeam: translateTeam(m.team1),
                awayTeam: translateTeam(m.team2),
                homeBadge: badgeFor(m.team1, live?.homeBadge ?? null),
                awayBadge: badgeFor(m.team2, live?.awayBadge ?? null),
                group: groupLabel(m),
                stadium: m.ground ? translateVenue(m.ground) : 'Estadio',
                kickoff: kickoff.toISOString(),
                time: fmtLocalTime(kickoff),
                status,
                homeScore: status === 'SCHEDULED' ? null : homeScore,
                awayScore: status === 'SCHEDULED' ? null : awayScore,
                minute,
                sportsrcId: resolveSportSrcId(srcCandidates, m.team1, m.team2, kickoff),
            };
        });

    // Orden: en vivo primero, luego próximos por hora, finalizados al final.
    const rank: Record<MatchStatus, number> = { LIVE: 0, SCHEDULED: 1, FINISHED: 2 };
    return matches.sort((a, b) => {
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return a.kickoff.localeCompare(b.kickoff);
    });
}

export async function getWorldCupMatchById(
    id: string,
): Promise<WorldCupMatch | null> {
    const matches = await getWorldCupMatches();
    return matches.find((m) => m.id === id) ?? null;
}

// ── Información del partido (preview / resultado) ────────────────────────────
// Toda la data informativa sale de TheSportsDB free. Se cachea LARGO (la info de
// equipos/jugadores casi no cambia) para no chocar con el rate limit.

const INFO_REVALIDATE_S = 86_400;      // 24h (info equipos/jugadores)
const FORM_REVALIDATE_S = 3_600;       // 1h (forma reciente)
const STATS_REVALIDATE_S = 600;        // 10min (stats de partido)

interface PlayersResponse {
    player?: Array<{ strPlayer?: string; strPosition?: string }> | null;
}
interface EventsResponse {
    results?: Array<Record<string, string | null>> | null;
}
interface EventStatsResponse {
    eventstats?: Array<{ strStat?: string; intHome?: string; intAway?: string }> | null;
}

/** Info de un equipo (descripción, apodo, estadio, idTeam) por nombre en inglés. */
async function getTeamInfo(englishName: string, displayName: string): Promise<TeamInfo> {
    const data = await fetchJson<SearchTeamsResponse>(
        `${THESPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(englishName)}`,
        INFO_REVALIDATE_S,
        2,
    );
    const target = normalizeTeam(englishName);
    const teams = data?.teams ?? [];
    const t =
        teams.find(
            (x) => (x.strSport ?? '').toLowerCase() === 'soccer' &&
                normalizeTeam(x.strTeam ?? '') === target,
        ) ?? teams.find((x) => (x.strSport ?? '').toLowerCase() === 'soccer');
    return {
        name: displayName,
        idTeam: t?.idTeam ?? null,
        badge: t?.strBadge || fallbackFlag(englishName),
        nickname: (t?.strKeywords ?? '').split(',')[0]?.trim() ?? '',
        foundedYear: t?.intFormedYear ?? '',
        stadium: t?.strStadium ?? '',
        description: (t?.strDescriptionES || t?.strDescriptionEN || '').slice(0, 600),
        website: t?.strWebsite ?? '',
    };
}

/** Plantilla de jugadores (nombre + posición) por idTeam. */
async function getTeamPlayers(idTeam: string | null): Promise<PlayerInfo[]> {
    if (!idTeam) return [];
    const data = await fetchJson<PlayersResponse>(
        `${THESPORTSDB_BASE}/lookup_all_players.php?id=${idTeam}`,
        INFO_REVALIDATE_S,
        2,
    );
    return (data?.player ?? [])
        .map((p) => ({ name: p.strPlayer ?? '', position: p.strPosition ?? '' }))
        .filter((p) => p.name);
}

/** Forma reciente (últimos partidos) de un equipo, desde su perspectiva. */
async function getTeamRecentForm(idTeam: string | null): Promise<FormMatch[]> {
    if (!idTeam) return [];
    const data = await fetchJson<EventsResponse>(
        `${THESPORTSDB_BASE}/eventslast.php?id=${idTeam}`,
        FORM_REVALIDATE_S,
        2,
    );
    const out: FormMatch[] = [];
    for (const e of data?.results ?? []) {
        const wasHome = e.idHomeTeam === idTeam;
        const hs = toScore(e.intHomeScore);
        const as = toScore(e.intAwayScore);
        let result: FormMatch['result'] = null;
        if (hs != null && as != null) {
            const my = wasHome ? hs : as;
            const their = wasHome ? as : hs;
            result = my > their ? 'W' : my < their ? 'L' : 'D';
        }
        out.push({
            opponent: translateTeam((wasHome ? e.strAwayTeam : e.strHomeTeam) ?? ''),
            date: e.dateEvent ?? '',
            homeScore: hs,
            awayScore: as,
            result,
            wasHome,
        });
    }
    return out.slice(0, 5);
}

/** Estadísticas reales de un partido jugado, cruzando por equipos+fecha. */
async function getEventStats(
    homeEnglish: string,
    awayEnglish: string,
    dateISO: string,
): Promise<StatRow[]> {
    // Buscamos el idEvent del día en TheSportsDB (mismo endpoint que el live map).
    const resp = await fetchJson<SportsDbResponse>(
        `${THESPORTSDB_BASE}/eventsday.php?d=${dateISO}&s=Soccer`,
        STATS_REVALIDATE_S,
        2,
    );
    const h = normalizeTeam(homeEnglish);
    const a = normalizeTeam(awayEnglish);
    const ev = (resp?.events ?? []).find(
        (e) =>
            normalizeTeam(e.strHomeTeam ?? '') === h &&
            normalizeTeam(e.strAwayTeam ?? '') === a,
    );
    if (!ev?.idEvent) return [];
    const data = await fetchJson<EventStatsResponse>(
        `${THESPORTSDB_BASE}/lookupeventstats.php?id=${ev.idEvent}`,
        STATS_REVALIDATE_S,
        2,
    );
    const ES_LABELS: Record<string, string> = {
        'Shots on Goal': 'Tiros a puerta',
        'Shots off Goal': 'Tiros fuera',
        'Total Shots': 'Tiros totales',
        'Blocked Shots': 'Tiros bloqueados',
        'Shots insidebox': 'Tiros dentro del área',
        'Shots outsidebox': 'Tiros fuera del área',
        'Fouls': 'Faltas',
        'Corner Kicks': 'Tiros de esquina',
        'Offsides': 'Fueras de juego',
        'Ball Possession': 'Posesión',
        'Yellow Cards': 'Tarjetas amarillas',
        'Red Cards': 'Tarjetas rojas',
        'Goalkeeper Saves': 'Atajadas',
        'Total passes': 'Pases totales',
        'Passes accurate': 'Pases completados',
    };
    return (data?.eventstats ?? [])
        .map((s) => ({
            label: ES_LABELS[s.strStat ?? ''] ?? s.strStat ?? '',
            home: toScore(s.intHome) ?? 0,
            away: toScore(s.intAway) ?? 0,
        }))
        .filter((s) => s.label);
}

/** Tabla del grupo, calculada desde los partidos jugados de openfootball. */
async function getGroupStanding(groupLabelEs: string): Promise<StandingRow[]> {
    // Solo para fase de grupos ("Grupo X"); en eliminatorias no hay tabla.
    if (!/^Grupo /.test(groupLabelEs)) return [];
    const file = await fetchJson<OpenFootballFile>(OPENFOOTBALL_URL, SCHEDULE_REVALIDATE_S);
    if (!file?.matches) return [];

    const rows = new Map<string, StandingRow>();
    const ensure = (team: string): StandingRow => {
        const key = translateTeam(team);
        if (!rows.has(key)) {
            rows.set(key, {
                team: key, played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, points: 0,
            });
        }
        return rows.get(key)!;
    };

    for (const m of file.matches) {
        if (groupLabel(m) !== groupLabelEs) continue;
        if (isPlaceholderTeam(m.team1) || isPlaceholderTeam(m.team2)) continue;
        const hs = m.score?.ft?.[0];
        const as = m.score?.ft?.[1];
        if (hs == null || as == null) continue; // sin jugar → no cuenta
        const home = ensure(m.team1);
        const away = ensure(m.team2);
        home.played++; away.played++;
        home.goalsFor += hs; home.goalsAgainst += as;
        away.goalsFor += as; away.goalsAgainst += hs;
        if (hs > as) { home.won++; home.points += 3; away.lost++; }
        else if (hs < as) { away.won++; away.points += 3; home.lost++; }
        else { home.drawn++; away.drawn++; home.points++; away.points++; }
    }

    return Array.from(rows.values()).sort(
        (a, b) =>
            b.points - a.points ||
            (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
            b.goalsFor - a.goalsFor,
    );
}

/**
 * Paquete informativo completo de un partido. Resuelve equipos, jugadores,
 * forma y tabla en paralelo (con concurrencia ya limitada por el caché). Las
 * estadísticas solo se piden si el partido terminó.
 */
export async function getMatchInfo(match: WorldCupMatch): Promise<MatchInfo> {
    // Recuperamos los nombres en inglés desde el id estable (date-home-vs-away).
    const { homeEnglish, awayEnglish, dateISO } = parseMatchId(match.id);

    const [home, away] = await Promise.all([
        getTeamInfo(homeEnglish, match.homeTeam),
        getTeamInfo(awayEnglish, match.awayTeam),
    ]);

    const [homePlayers, awayPlayers, homeForm, awayForm, standings, stats] =
        await Promise.all([
            getTeamPlayers(home.idTeam),
            getTeamPlayers(away.idTeam),
            getTeamRecentForm(home.idTeam),
            getTeamRecentForm(away.idTeam),
            getGroupStanding(match.group),
            match.status === 'FINISHED'
                ? getEventStats(homeEnglish, awayEnglish, dateISO)
                : Promise.resolve([] as StatRow[]),
        ]);

    return { home, away, homePlayers, awayPlayers, homeForm, awayForm, standings, stats };
}

/** Extrae nombres en inglés y fecha desde el id estable del partido. */
function parseMatchId(id: string): { homeEnglish: string; awayEnglish: string; dateISO: string } {
    // Formato: YYYY-MM-DD-<home-slug>-vs-<away-slug>
    const m = id.match(/^(\d{4}-\d{2}-\d{2})-(.+)-vs-(.+)$/);
    if (!m) return { homeEnglish: '', awayEnglish: '', dateISO: '' };
    const unslug = (s: string) => s.replace(/-/g, ' ');
    return { dateISO: m[1], homeEnglish: unslug(m[2]), awayEnglish: unslug(m[3]) };
}

/** Resuelve los servidores de embed de un partido (bajo demanda). */
export async function getMatchStreams(
    sportsrcId: string,
): Promise<StreamSource[]> {
    if (!sportsrcId) return [];
    const detail = await fetchJson<SportSrcDetail>(
        `${SPORTSRC_BASE}/?data=detail&category=football&id=${encodeURIComponent(sportsrcId)}`,
        LIVE_REVALIDATE_S,
    );
    const sources = detail?.data?.sources ?? detail?.sources ?? [];

    const seenIds = new Set<string>();
    const mapped = sources
        .filter((s) => !!s.embedUrl)
        .map((s, i): StreamSource => {
            const lang = s.language?.trim() || `Servidor ${i + 1}`;
            const hd = !!s.hd;
            const baseId = s.id ?? `src-${i}`;
            let id = baseId;
            let suffix = 1;
            while (seenIds.has(id)) id = `${baseId}-${suffix++}`;
            seenIds.add(id);
            return {
                id,
                label: hd ? `${lang} · HD` : lang,
                embedUrl: s.embedUrl!,
                hd,
                language: lang,
                viewers: typeof s.viewers === 'number' ? s.viewers : 0,
            };
        });

    // Prioridad "Español HD estricto": primero los que son español Y HD a la vez,
    // luego cualquier español, luego HD, y por último por audiencia (más viewers =
    // más estable). Así sources[0] es español-HD cuando existe → es el que el
    // reproductor autoselecciona.
    const isEs = (l: string) => /espa|spanish|latino|castellano/i.test(l);
    return mapped.sort((a, b) => {
        const aEsHd = isEs(a.language) && a.hd ? 0 : 1;
        const bEsHd = isEs(b.language) && b.hd ? 0 : 1;
        if (aEsHd !== bEsHd) return aEsHd - bEsHd;
        const ae = isEs(a.language) ? 0 : 1;
        const be = isEs(b.language) ? 0 : 1;
        if (ae !== be) return ae - be;
        if (a.hd !== b.hd) return a.hd ? -1 : 1;
        return b.viewers - a.viewers;
    });
}
