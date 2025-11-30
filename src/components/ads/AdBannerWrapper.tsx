'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdBanner from '@/components/ads/AdBanner';

/**
 * Hook to check if the current user is a premium subscriber
 * Returns true if user has an active premium subscription
 */
export function useIsPremium() {
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function checkPremiumStatus() {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setIsPremium(false);
                    setIsLoading(false);
                    return;
                }

                // Check if user has premium subscription
                // TODO: Implement actual premium subscription check
                // This could be:
                // 1. A field in the profiles table (is_premium)
                // 2. A separate subscriptions table
                // 3. Integration with Stripe/payment provider

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single();

                setIsPremium(profile?.is_premium || false);
            } catch (error) {
                console.error('Error checking premium status:', error);
                setIsPremium(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkPremiumStatus();
    }, []);

    return { isPremium, isLoading };
}

interface AdBannerWrapperProps {
    position?: 'hero' | 'sidebar' | 'inline';
    dismissible?: boolean;
    className?: string;
}

/**
 * Wrapper component that only shows ads to free (non-premium) users
 */
export default function AdBannerWrapper(props: AdBannerWrapperProps) {
    const { isPremium, isLoading } = useIsPremium();

    // Don't show anything while loading
    if (isLoading) {
        return null;
    }

    // Don't show ads to premium users
    if (isPremium) {
        return null;
    }

    // Show ad to free users
    return <AdBanner {...props} />;
}
