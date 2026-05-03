'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, X, Tv, Globe, Tag, TrendingUp, Radio, Loader2 } from 'lucide-react';
import type { LiveChannel } from '@/services/liveTV';
import LiveTVGrid from '@/components/live-tv/LiveTVGrid';

interface LiveTVClientProps {
    initialChannels?: LiveChannel[];
    categories?: string[];
    countries?: string[];
}

export default function LiveTVClient({ initialChannels: propChannels, categories: propCategories, countries: propCountries }: LiveTVClientProps = {}) {
    const [channels, setChannels] = useState<LiveChannel[]>(propChannels || []);
    const [categories, setCategories] = useState<string[]>(propCategories || []);
    const [countries, setCountries] = useState<string[]>(propCountries || []);
    const [isLoading, setIsLoading] = useState(!propChannels);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    // Fetch channels on client if not provided as props
    useEffect(() => {
        if (!propChannels) {
            const loadChannels = async () => {
                try {
                    setIsLoading(true);
                    const res = await fetch('/api/channels');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    setChannels(data.channels ?? []);
                    setCategories(data.categories ?? []);
                    setCountries(data.countries ?? []);
                } catch (error) {
                    console.error('Error loading channels:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            loadChannels();
        }
    }, [propChannels]);

    // Filter channels based on search and filters
    const filteredChannels = useMemo(() => {
        return channels.filter(channel => {
            // Search filter
            if (searchQuery && !channel.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Category filter
            if (selectedCategory && channel.category !== selectedCategory) {
                return false;
            }

            // Country filter
            if (selectedCountry && !channel.country.toLowerCase().includes(selectedCountry.toLowerCase())) {
                return false;
            }

            return true;
        });
    }, [channels, searchQuery, selectedCategory, selectedCountry]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('');
        setSelectedCountry('');
    };

    const hasActiveFilters = searchQuery || selectedCategory || selectedCountry;

    // Show loading state while fetching channels
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-text-secondary">Cargando canales...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Header with Gradient */}
            <div className="relative bg-gradient-to-br from-primary/20 via-background to-background border-b border-surface-light">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="container mx-auto px-4 py-12 relative">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                            <Radio className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                                TV en Vivo
                            </h1>
                            <p className="text-text-secondary text-lg">
                                Transmisiones en directo de todo el mundo
                            </p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <div className="bg-surface/50 backdrop-blur-sm border border-surface-light rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Tv className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{filteredChannels.length}</p>
                                    <p className="text-xs text-text-secondary">Canales</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface/50 backdrop-blur-sm border border-surface-light rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Tag className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{categories.length}</p>
                                    <p className="text-xs text-text-secondary">Categorías</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface/50 backdrop-blur-sm border border-surface-light rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <Globe className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{countries.length}</p>
                                    <p className="text-xs text-text-secondary">Países</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface/50 backdrop-blur-sm border border-surface-light rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">24/7</p>
                                    <p className="text-xs text-text-secondary">En Vivo</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Search and Filters */}
                <div className="mb-8 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar canales por nombre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-surface border border-surface-light rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all font-medium ${showFilters
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-surface border-surface-light text-text-secondary hover:border-primary/50 hover:text-white'
                                }`}
                        >
                            <Filter size={18} />
                            <span>Filtros Avanzados</span>
                        </button>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-surface-light text-text-secondary hover:border-red-500/50 hover:text-red-400 transition-all font-medium"
                            >
                                <X size={18} />
                                <span>Limpiar Filtros</span>
                            </button>
                        )}

                        {/* Active Filter Tags */}
                        {selectedCategory && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
                                <Tag size={14} />
                                <span>{selectedCategory}</span>
                            </div>
                        )}
                        {selectedCountry && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm">
                                <Globe size={14} />
                                <span>{selectedCountry.toUpperCase()}</span>
                            </div>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-surface/50 backdrop-blur-sm border border-surface-light rounded-xl">
                            {/* Category Filter */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                                    <Tag size={16} className="text-primary" />
                                    Categoría
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-surface-light rounded-xl text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                >
                                    <option value="">Todas las categorías</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Country Filter */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                                    <Globe size={16} className="text-blue-400" />
                                    País
                                </label>
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-surface-light rounded-xl text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                >
                                    <option value="">Todos los países</option>
                                    {countries.map((country) => (
                                        <option key={country} value={country}>
                                            {country.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Channels Grid */}
                <LiveTVGrid channels={filteredChannels} />
            </div>
        </div>
    );
}
