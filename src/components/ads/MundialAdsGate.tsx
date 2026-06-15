'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import SocialBar from '@/components/ads/SocialBar';
import AdblockSuggestionModal from '@/components/ads/AdblockSuggestionModal';

export default function MundialAdsGate({
  isTV,
}: {
  isTV: boolean;
}) {
  const pathname = usePathname() ?? '';

  const isMundial = useMemo(() => {
    // matches:
    //  - /mundial
    //  - /mundial/partido/[id]
    return pathname === '/mundial' || pathname.startsWith('/mundial/');
  }, [pathname]);

  if (isTV || isMundial) {
    return null;
  }

  return (
    <>
      <AdblockSuggestionModal />
      <SocialBar />
    </>
  );
}

