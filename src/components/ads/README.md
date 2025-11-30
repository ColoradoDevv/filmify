# Ad Banner Component - Integration Guide

## Overview
The AdBanner component provides a monetization solution for free users through strategic ad placements.

## Components Created

### 1. `AdBanner.tsx`
Core ad banner component with:
- Multiple position variants (hero, sidebar, inline)
- Dismissible option
- Placeholder for ad network integration (Google AdSense, Media.net, etc.)
- Premium upgrade CTA

### 2. `AdBannerWrapper.tsx`
Smart wrapper that:
- Only shows ads to free (non-premium) users
- Checks user premium status from database
- Handles loading states
- Includes `useIsPremium()` hook for reuse

## Usage Examples

### 1. Between Hero and Content Grid (Browse Page)
```tsx
import { AdBannerWrapper } from '@/components/ads';

export default function BrowsePage() {
  return (
    <div>
      <MovieHero movie={featuredMovie} />
      
      {/* Ad Banner - Only shows to free users */}
      <div className="my-8">
        <AdBannerWrapper position="hero" />
      </div>
      
      <MovieGrid movies={movies} />
    </div>
  );
}
```

### 2. In Watch Party Chat Sidebar
```tsx
import { AdBannerWrapper } from '@/components/ads';

export default function WatchPartyChat() {
  return (
    <div className="flex flex-col h-full">
      <ChatMessages messages={messages} />
      
      {/* Sidebar Ad */}
      <div className="mt-4">
        <AdBannerWrapper 
          position="sidebar" 
          dismissible={true}
        />
      </div>
      
      <ChatInput />
    </div>
  );
}
```

### 3. Inline with Movie Details
```tsx
import { AdBannerWrapper } from '@/components/ads';

export default function MovieDetailsPage() {
  return (
    <div>
      <MovieHero movie={movie} />
      <MovieInfo movie={movie} />
      
      {/* Inline Ad */}
      <div className="my-6">
        <AdBannerWrapper position="inline" />
      </div>
      
      <ReviewsSection movieId={movie.id} />
    </div>
  );
}
```

## Database Setup Required

Add `is_premium` column to profiles table:

\`\`\`sql
-- Add premium status column
ALTER TABLE profiles 
ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX idx_profiles_premium ON profiles(is_premium);
\`\`\`

## Ad Network Integration

### Google AdSense
Replace the placeholder in `AdBanner.tsx` with:

\`\`\`tsx
<ins className="adsbygoogle"
     style={{ display: 'block' }}
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="XXXXXXXXXX"
     data-ad-format="auto"
     data-full-width-responsive="true">
</ins>

<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
\`\`\`

### Media.net
\`\`\`tsx
<div id="XXXXXXXXXX">
  <script 
    type="text/javascript" 
    src="//contextual.media.net/dmedianet.js?cid=XXXXXXXX">
  </script>
</div>
\`\`\`

## Strategic Placement Recommendations

1. **High Visibility (Hero Position)**
   - Browse page (after hero, before grid)
   - Movie details page (after hero)
   - TV show details page (after hero)

2. **Engagement Areas (Sidebar Position)**
   - Watch Party chat sidebar
   - User profile sidebar
   - Favorites/Lists sidebar

3. **Content Flow (Inline Position)**
   - Between review sections
   - In search results
   - Between movie recommendations

## Premium Conversion Strategy

The component includes built-in premium upgrade CTAs:
- "Eliminar anuncios con Premium" button in ad
- "Prueba Premium gratis" link below hero ads
- Links to `/pricing` page

## Performance Considerations

- Ads lazy load after 100ms
- Premium status cached during session
- Dismissible ads save state in component
- No ads shown during loading state

## Next Steps

1. ✅ Add `is_premium` column to database
2. ✅ Integrate actual ad network (AdSense/Media.net)
3. ✅ Create `/pricing` page for premium subscriptions
4. ✅ Implement payment integration (Stripe)
5. ✅ Add ad placements to key pages
