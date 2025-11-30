import React from 'react';

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-3xl prose prose-invert">
                {children}
            </div>
        </div>
    );
}
