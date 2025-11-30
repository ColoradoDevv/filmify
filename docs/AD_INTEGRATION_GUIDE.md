# Guía de Integración de Anuncios Reales

## ✅ Verificación Completada

El build de producción se completó exitosamente:
- ✅ Componentes compilados sin errores
- ✅ TypeScript validado
- ✅ Todas las páginas generadas correctamente
- ✅ `/legal/cookies`, `/legal/privacy`, `/legal/terms` creadas
- ✅ `/browse` con AdBanner integrado

## 🔧 Pasos para Conectar Anuncios Reales

### Opción 1: Google AdSense (Recomendado)

#### 1. Crear Cuenta en Google AdSense
1. Ve a [https://www.google.com/adsense](https://www.google.com/adsense)
2. Regístrate con tu cuenta de Google
3. Completa la información de tu sitio web
4. Espera la aprobación (puede tomar 1-3 días)

#### 2. Obtener el Código de AdSense
Una vez aprobado, obtendrás:
- **Publisher ID**: `ca-pub-XXXXXXXXXXXXXXXX`
- **Ad Unit IDs**: Para cada tamaño de anuncio

#### 3. Agregar Script Global de AdSense

Edita `src/app/layout.tsx`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

#### 4. Actualizar AdBanner.tsx

Reemplaza el contenido del placeholder en `src/components/ads/AdBanner.tsx`:

```tsx
{/* Ad Network Integration Point */}
<ins 
  className="adsbygoogle"
  style={{ display: 'block' }}
  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
  data-ad-slot="YYYYYYYYYY"  // Diferente para cada posición
  data-ad-format="auto"
  data-full-width-responsive="true"
/>

<script>
  {`(adsbygoogle = window.adsbygoogle || []).push({});`}
</script>
```

#### 5. Crear Variables de Entorno

Agrega a `.env.local`:

```env
# Google AdSense
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT_HERO=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR=0987654321
NEXT_PUBLIC_ADSENSE_SLOT_INLINE=1122334455
```

#### 6. Usar Variables en el Componente

```tsx
const adConfig = {
  hero: {
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HERO,
  },
  sidebar: {
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
  },
  inline: {
    client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE,
  },
};
```

### Opción 2: Media.net

#### 1. Crear Cuenta
1. Ve a [https://www.media.net](https://www.media.net)
2. Regístrate y espera aprobación
3. Obtén tu **Site ID** y **Container ID**

#### 2. Agregar Script

En `src/app/layout.tsx`:

```tsx
<script 
  type="text/javascript" 
  src="//contextual.media.net/dmedianet.js?cid=YOUR_SITE_ID"
/>
```

#### 3. Actualizar AdBanner.tsx

```tsx
<div id={`YOUR_CONTAINER_ID_${position}`}>
  <script type="text/javascript">
    {`
      try {
        window._mNHandle.queue.push(function (){
          window._mNDetails.loadTag("YOUR_CONTAINER_ID_${position}", "728x90", "YOUR_CONTAINER_ID_${position}");
        });
      } catch (error) {}
    `}
  </script>
</div>
```

## 🧪 Testing en Desarrollo

### 1. Modo de Prueba de AdSense
Google AdSense tiene un modo de prueba. Agrega a tu componente:

```tsx
{process.env.NODE_ENV === 'development' && (
  <ins 
    className="adsbygoogle"
    style={{ display: 'block' }}
    data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
    data-ad-slot="YYYYYYYYYY"
    data-ad-format="auto"
    data-adtest="on"  // Modo de prueba
    data-full-width-responsive="true"
  />
)}
```

### 2. Verificar que el Banner Aparece

1. Inicia el servidor: `npm run dev`
2. Ve a `http://localhost:3000/browse`
3. **Cierra sesión** (para simular usuario free)
4. Deberías ver el banner de anuncios

### 3. Verificar Detección de Premium

Para probar que NO aparece a usuarios premium:

```sql
-- En Supabase SQL Editor
UPDATE profiles 
SET is_premium = true 
WHERE id = 'TU_USER_ID';
```

Luego recarga la página - el banner NO debería aparecer.

## 📊 Métricas y Monitoreo

### 1. Google Analytics
Ya tienes Vercel Analytics, pero puedes agregar eventos personalizados:

```tsx
// En AdBanner.tsx
useEffect(() => {
  if (isLoaded) {
    // Track ad impression
    if (window.gtag) {
      window.gtag('event', 'ad_impression', {
        ad_position: position,
        user_type: 'free'
      });
    }
  }
}, [isLoaded, position]);
```

### 2. Monitorear Conversiones a Premium

```tsx
// En página de pricing cuando usuario compra
window.gtag('event', 'purchase', {
  transaction_id: 'TXN_ID',
  value: 9.99,
  currency: 'USD',
  items: [{
    item_id: 'premium_monthly',
    item_name: 'Premium Subscription'
  }]
});
```

## 🚀 Deployment

### 1. Aplicar Migración de Base de Datos

```bash
# Conectar a Supabase
supabase link --project-ref YOUR_PROJECT_REF

# Aplicar migración
supabase db push
```

### 2. Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
   - `NEXT_PUBLIC_ADSENSE_SLOT_HERO`
   - `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR`
   - `NEXT_PUBLIC_ADSENSE_SLOT_INLINE`

### 3. Deploy

```bash
git add .
git commit -m "feat: Add ad monetization system"
git push origin main
```

## ✅ Checklist Final

- [ ] Cuenta de AdSense creada y aprobada
- [ ] Publisher ID obtenido
- [ ] Ad Unit IDs creados para cada posición
- [ ] Variables de entorno configuradas
- [ ] Script de AdSense agregado a layout
- [ ] AdBanner.tsx actualizado con código real
- [ ] Migración de base de datos aplicada
- [ ] Probado en desarrollo (usuario free ve ads)
- [ ] Probado en desarrollo (usuario premium NO ve ads)
- [ ] Variables configuradas en Vercel
- [ ] Deployed a producción
- [ ] Verificado en producción

## 💡 Consejos

1. **Espera 24-48h** después del deploy para que AdSense empiece a mostrar anuncios reales
2. **No hagas clic** en tus propios anuncios (puede resultar en ban)
3. **Usa AdSense Auto Ads** para optimización automática
4. **Monitorea RPM** (Revenue Per Mille) en el dashboard de AdSense
5. **A/B test** diferentes posiciones para maximizar revenue

## 🔗 Recursos

- [Google AdSense Help](https://support.google.com/adsense)
- [AdSense Policies](https://support.google.com/adsense/answer/48182)
- [Media.net Documentation](https://www.media.net/adunits)
- [Next.js + AdSense Guide](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries)
