import Link from 'next/link';
import { Construction, ArrowLeft } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-pulse">
                <Construction className="w-12 h-12 text-primary" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {title}
            </h1>

            <p className="text-xl text-gray-400 max-w-lg mb-12">
                {description}
            </p>

            <Link
                href="/browse"
                className="group flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-all font-medium"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Volver a Explorar
            </Link>
        </div>
    );
}
