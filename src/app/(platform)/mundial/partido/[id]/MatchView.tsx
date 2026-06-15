'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Loader2, RefreshCw, Tv, Trophy, ChevronDown } from 'lucide-react';
import type { WorldCupMatch, StreamSource } from '@/services/worldcup';
import ServerSelector from '@/components/worldcup/ServerSelector';

const SCORE_POLL_MS = 45_000;

export default function MatchView({ match: initialMatch }: { match: WorldCupMatch }) {
    const [match, setMatch] = useState<WorldCupMatch>(initialMatch);
    const [sources, setSources] = useState<StreamSource[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [loadingSources, setLoadingSources] = useState(true);
    const [iframeKey, setIframeKey] = useState(0);
    const [iframeLoading, setIframeLoading] = useState(true);
    // Servidores que fallaron al cargar → se saltan en el fallback automático.
    const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
    // El selector de servidores está oculto por defecto (un solo reproductor); el
    // usuario puede desplegarlo con "Más opciones" si quiere cambiar a mano.
    const [showServers, setShowServers] = useState(false);
    const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeSource = sources.find((s) => s.id === activeId) ?? null;
    // ¿Quedan servidores no probados a los que saltar automáticamente?
    const hasFallback = sources.some((s) => s.id !== activeId && !failedIds.has(s.id));

    // ── Cargar servidores de transmisión (bajo demanda) ─────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingSources(true);
            try {
                const res = await fetch(`/api/worldcup/${encodeURIComponent(match.id)}/streams`, {
                    cache: 'no-store',
                });
                const data = await res.json();
                if (cancelled) return;
                const raw: StreamSource[] = Array.isArray(data.sources) ? data.sources : [];
                const seen = new Set<string>();
                const list = raw.filter((s) => (seen.has(s.id) ? false : seen.add(s.id) && true));
                setSources(list);
                setFailedIds(new Set());
                if (list.length > 0) setActiveId(list[0].id);
            } catch {
                if (!cancelled) setSources([]);
            } finally {
                if (!cancelled) setLoadingSources(false);
            }
        })();
        return () => { cancelled = true; };
    }, [match.id]);

    // ── Refrescar marcador/estado en vivo ───────────────────────────────────
    useEffect(() => {
        if (match.status === 'FINISHED') return;
        const tick = async () => {
            if (document.hidden) return;
            try {
                const res = await fetch('/api/worldcup', { cache: 'no-store' });
                const data = await res.json();
                const updated = (data.matches as WorldCupMatch[] | undefined)?.find(
                    (m) => m.id === match.id,
                );
                if (updated) setMatch(updated);
            } catch { /* mantener estado previo */ }
        };
        const timer = setInterval(tick, SCORE_POLL_MS);
        return () => clearInterval(timer);
    }, [match.id, match.status]);

    // Marca el servidor activo como fallido y salta automáticamente al siguiente
    // no-probado (orden ya priorizado: español-HD primero). Si no quedan, deja de
    // intentar y la UI muestra el mensaje de "sin señal".
    const advanceToNextSource = useCallback(() => {
        const tried = new Set(failedIds);
        if (activeId) tried.add(activeId);
        const candidate = sources.find((s) => !tried.has(s.id));
        setFailedIds(tried);
        if (candidate) {
            setActiveId(candidate.id);
            setIframeKey((k) => k + 1);
        }
    }, [sources, activeId, failedIds]);

    // ── Manejo de carga del iframe (timeout suave → fallback) ───────────────
    useEffect(() => {
        if (!activeSource) return;
        setIframeLoading(true);
        if (loadTimer.current) clearTimeout(loadTimer.current);
        // Si el iframe no dispara onLoad en 12s, asumimos que el servidor no carga
        // y saltamos al siguiente (solo si aún queda alguno por probar).
        loadTimer.current = setTimeout(() => {
            setIframeLoading(false);
            if (hasFallback) advanceToNextSource();
        }, 12_000);
        return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
    }, [activeSource, iframeKey, hasFallback, advanceToNextSource]);

    // Selección manual desde "Más opciones": le damos otra oportunidad aunque
    // antes hubiera fallado (lo quitamos del set de fallidos).
    const handleSelect = useCallback((src: StreamSource) => {
        setFailedIds((prev) => {
            if (!prev.has(src.id)) return prev;
            const next = new Set(prev);
            next.delete(src.id);
            return next;
        });
        setActiveId(src.id);
        setIframeKey((k) => k + 1);
    }, []);

    const handleIframeLoad = useCallback(() => {
        if (loadTimer.current) clearTimeout(loadTimer.current);
        setIframeLoading(false);
    }, []);

    // onError del iframe (carga fallida explícita) → saltar de inmediato.
    const handleIframeError = useCallback(() => {
        if (loadTimer.current) clearTimeout(loadTimer.current);
        if (hasFallback) advanceToNextSource();
        else setIframeLoading(false);
    }, [hasFallback, advanceToNextSource]);

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3">
                <Link
                    href="/mundial"
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Mundial 2026
                </Link>
                <span className="text-outline-variant">/</span>
                <span className="text-sm font-medium truncate">
                    {match.homeTeam} vs {match.awayTeam}
                </span>
            </div>

            {/* Aviso honesto de publicidad de terceros */}
            <div className="flex items-start gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/25 rounded-xl text-sm text-orange-200/90">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                    Transmisión en español y HD cuando está disponible. Si aparece un anuncio emergente, ciérralo: un bloqueador de anuncios en tu navegador mejora la experiencia.
                </span>
            </div>

            {/* Selector de servidores — oculto tras "Más opciones" (un solo
                reproductor por defecto; el fallback automático cambia de servidor
                solo si uno falla). */}
            {!loadingSources && sources.length > 1 && (
                <div className="space-y-2">
                    <button
                        onClick={() => setShowServers((v) => !v)}
                        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors"
                        aria-expanded={showServers}
                    >
                        <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${showServers ? 'rotate-180' : ''}`}
                        />
                        {showServers ? 'Ocultar opciones' : `Más opciones (${sources.length})`}
                    </button>
                    {showServers && (
                        <ServerSelector sources={sources} activeId={activeId} onSelect={handleSelect} />
                    )}
                </div>
            )}

            {/* Reproductor */}
            <div
                className="relative w-full rounded-2xl overflow-hidden bg-black border border-outline-variant shadow-2xl"
                style={{ aspectRatio: '16 / 9' }}
            >
                {loadingSources ? (
                    <PlayerMessage>
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span>Buscando transmisiones disponibles…</span>
                    </PlayerMessage>
                ) : !activeSource ? (
                    <PlayerMessage>
                        <Tv className="w-10 h-10 text-text-secondary opacity-40" />
                        <span className="font-medium text-white">Aún no hay señal para este partido</span>
                        <span className="text-sm text-center max-w-sm">
                            {match.status === 'SCHEDULED'
                                ? 'Las transmisiones suelen activarse cerca de la hora de inicio. Vuelve un poco antes del pitazo inicial.'
                                : 'No encontramos un servidor disponible ahora mismo. Inténtalo de nuevo en unos minutos.'}
                        </span>
                    </PlayerMessage>
                ) : (
                    <>
                        {iframeLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 pointer-events-none">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <span className="text-xs text-white/50 uppercase tracking-widest">Cargando señal…</span>
                            </div>
                        )}
                        {/* NO usar `sandbox`: el proveedor lo detecta y bloquea
                            el reproductor ("Remove sandbox attributes on the
                            iframe tag"). Se carga el embed directo. */}
                        <iframe
                            key={`${activeSource.id}#${iframeKey}`}
                            src={activeSource.embedUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                            referrerPolicy="no-referrer"
                            title={`${match.homeTeam} vs ${match.awayTeam} — transmisión en vivo`}
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                        />
                    </>
                )}
            </div>

            {/* Acciones bajo el reproductor */}
            {activeSource && (
                <div className="flex items-center justify-between text-xs text-text-secondary px-1">
                    <span className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        FIFA World Cup 2026
                        <span className="text-text-secondary/60">·</span>
                        <span className="text-white/80">{activeSource.label}</span>
                    </span>
                    <button
                        onClick={() => setIframeKey((k) => k + 1)}
                        className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Recargar
                    </button>
                </div>
            )}
        </div>
    );
}

function PlayerMessage({ children }: { children: React.ReactNode }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-text-secondary">
            {children}
        </div>
    );
}
