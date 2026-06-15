'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Loader2, RefreshCw, Tv, Trophy } from 'lucide-react';
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
    const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeSource = sources.find((s) => s.id === activeId) ?? null;

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

    // ── Manejo de carga del iframe (timeout suave) ──────────────────────────
    useEffect(() => {
        if (!activeSource) return;
        setIframeLoading(true);
        if (loadTimer.current) clearTimeout(loadTimer.current);
        loadTimer.current = setTimeout(() => setIframeLoading(false), 12_000);
        return () => { if (loadTimer.current) clearTimeout(loadTimer.current); };
    }, [activeSource, iframeKey]);

    const handleSelect = useCallback((src: StreamSource) => {
        setActiveId(src.id);
        setIframeKey((k) => k + 1);
    }, []);

    const handleIframeLoad = useCallback(() => {
        if (loadTimer.current) clearTimeout(loadTimer.current);
        setIframeLoading(false);
    }, []);

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
            <div className="flex items-start gap-2 px-4 py-3 bg-orange-500/15 border border-orange-500/30 rounded-xl text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                    Esta funcionalidad actualmente esta bajo desarrollo y depende de servicios de terceros que contienen anuncios agresivos y pop-ups. Te recomendamos usar un bloqueador de anuncios y tener cuidado al interactuar con los reproductores. Estamos trabajando para mejorar esta experiencia lo antes posible. ¡Gracias por tu comprensión!
                </span>
            </div>

            {/* Selector de servidores */}
            {!loadingSources && sources.length > 0 && (
                <ServerSelector sources={sources} activeId={activeId} onSelect={handleSelect} />
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
                        <iframe
                            key={`${activeSource.id}#${iframeKey}`}
                            src={activeSource.embedUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                            referrerPolicy="no-referrer"
                            title={`${match.homeTeam} vs ${match.awayTeam} — transmisión en vivo`}
                            onLoad={handleIframeLoad}
                        />
                    </>
                )}
            </div>

            {/* Acciones bajo el reproductor */}
            {activeSource && (
                <div className="flex items-center justify-between text-xs text-text-secondary px-1">
                    <span className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        FIFA World Cup 2026 — Transmisión gratuita
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
