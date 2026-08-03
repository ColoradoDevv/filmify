import type { Metadata } from 'next';

// Personal, auth-gated route — exclude from search engines.
// (page.tsx is a client component, so metadata lives here.)
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
