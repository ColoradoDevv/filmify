import fs from 'fs';
import path from 'path';
import Markdown from 'react-markdown';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default async function SecurityPage() {
    const filePath = path.join(process.cwd(), 'SECURITY.md');
    let content = '';

    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        content = '# Security Policy\n\nSecurity information is currently unavailable.';
    }

    return (
        <main className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <div className="flex-grow max-w-4xl mx-auto px-4 py-24 w-full">
                <div className="prose prose-invert max-w-none">
                    <Markdown>{content}</Markdown>
                </div>
            </div>
            <Footer />
        </main>
    );
}
