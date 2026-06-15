'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { getConsent, onConsentChange } from '@/lib/cookie-consent';

/**
 * Adsterra Social Bar — widget flotante CPM.
 * Se renderiza sobre toda la página sin ocupar espacio en el layout.
 * Solo carga si el usuario aceptó cookies de marketing.
 * Script ID: 29648600
 */
export default function SocialBar() {
    const [marketingOk, setMarketingOk] = useState(false);

    useEffect(() => {
        setMarketingOk(getConsent().marketing);
        return onConsentChange((c) => setMarketingOk(c.marketing));
    }, []);

    if (!marketingOk) return null;

    return (
        <Script
            src="https://pl29749099.effectivecpmnetwork.com/2f/9e/3f/2f9e3fc7661bb0dbd53a80d4e9ce07ba.js"
            strategy="afterInteractive"
        />
    );
}
