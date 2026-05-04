import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Film, Users, Zap, Shield, Heart, Award } from 'lucide-react';
import Image from 'next/image';

export const metadata = {
    title: 'Sobre Nosotros - FilmiFy',
    description: 'Conoce la misión de FilmiFy: transformar la forma en que descubres y disfrutas del cine y las series.',
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-grow pt-24">
                {/* Hero Section */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent -z-10" />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-5xl sm:text-6xl font-bold mb-6">
                            Nuestra <span className="text-gradient-premium">Misión</span>
                        </h1>
                        <p className="text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
                            En FilmiFy, creemos que el cine es más que entretenimiento; es una experiencia que conecta personas. Nuestra misión es simplificar el descubrimiento de contenido y crear la comunidad definitiva para amantes del séptimo arte.
                        </p>
                    </div>
                </section>

                {/* Values Section */}
                <section className="py-20 bg-surface/30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="card p-8 text-center space-y-4 hover:border-primary/30 transition-colors">
                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Zap className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-xl font-bold">Innovación</h2>
                                <p className="text-text-secondary">
                                    Utilizamos inteligencia artificial para ofrecer recomendaciones personalizadas que realmente conecten contigo.
                                </p>
                            </div>
                            <div className="card p-8 text-center space-y-4 hover:border-primary/30 transition-colors">
                                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-accent" />
                                </div>
                                <h2 className="text-xl font-bold">Comunidad</h2>
                                <p className="text-text-secondary">
                                    Creamos espacios como las Watch Parties para que disfrutes de tus películas favoritas con amigos, sin importar la distancia.
                                </p>
                            </div>
                            <div className="card p-8 text-center space-y-4 hover:border-primary/30 transition-colors">
                                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Shield className="w-8 h-8 text-green-500" />
                                </div>
                                <h2 className="text-xl font-bold">Transparencia</h2>
                                <p className="text-text-secondary">
                                    Te ayudamos a encontrar dónde ver contenido de forma legal, centralizando todas las opciones de streaming en un solo lugar.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content Section */}
                <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="prose prose-invert prose-lg max-w-none space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <Heart className="text-accent w-8 h-8" />
                                ¿Por qué FilmiFy?
                            </h2>
                            <p className="text-text-secondary leading-relaxed">
                                El ecosistema del streaming se ha vuelto fragmentado y complejo. Con docenas de plataformas, encontrar qué ver y dónde verlo se ha convertido en una tarea tediosa. FilmiFy nació para resolver este problema, ofreciendo una interfaz elegante, rápida y social.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-8">
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold">Tecnología y Pasión</h3>
                                <p className="text-text-secondary">
                                    Somos un equipo de cinéfilos y desarrolladores apasionados por la tecnología. Cada línea de código en FilmiFy está diseñada para mejorar tu experiencia de visualización.
                                </p>
                            </div>
                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                    <Film className="w-16 h-16 text-white/20 animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 text-center py-12 bg-primary/5 rounded-3xl border border-primary/10">
                            <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                            <h2 className="text-3xl font-bold">Nuestra Promesa</h2>
                            <p className="text-text-secondary max-w-2xl mx-auto px-4">
                                Mantener FilmiFy como una plataforma abierta, segura y en constante evolución, escuchando siempre a nuestra comunidad para definir el futuro del entretenimiento digital.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
