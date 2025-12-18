# Optimización de Rendimiento - MICE Catering

## 📊 Estado Actual (según PageSpeed Insights)
- **RES**: 81 (Needs Improvement - Objetivo: >90)
- **FCP**: 3.07s (Muy lento - Objetivo: <1.8s)
- **LCP**: 3.58s (Muy lento - Objetivo: <2.5s)
- **TTFB**: 1.23s (Aceptable - Objetivo: <0.6s)

---

## ✅ Cambios Implementados

### 1. **Lazy Loading de Componentes Pesados**
- ✅ `AnalisisEconomicoCard` → Componente separado con `dynamic()`
- ✅ `IngredientesDetailCard` → Lazy loaded con fallback skeleton
- **Impacto**: Reduce bundle inicial y retrasa carga de gráficos

### 2. **Optimización de Queries Supabase**
- ✅ Agregados `limit(500)` a queries de datos
- ✅ Configurado `staleTime` (10-15 min) y `gcTime` (30-45 min)
- **Impacto**: Menos datos transferidos, mejor caché

### 3. **Mejoras en Next.js Config**
- ✅ `compress: true` → Gzip habilitado automáticamente
- ✅ `swcMinify: true` → Minificación más rápida
- ✅ `productionBrowserSourceMaps: false` → Menos datos en producción
- ✅ Formatos de imagen modernos (WebP, AVIF)

---

## 🎯 Recomendaciones Adicionales (Próximos Pasos)

### 1. **Script Análisis de Bundle**
```bash
ANALYZE=true npm run build
```
Esto mostrará qué paquetes ocupan más espacio. Busca oportunidades para:
- Reemplazar librerías pesadas (`date-fns` es pesada, considera `day.js`)
- Tree-shaking incompleto
- Librerías duplicadas

### 2. **Componentes Que Usan Gráficos**
En `app/(dashboard)/book/components/` los gráficos de Recharts son pesados:
```tsx
// ANTES: Carga inmediata
import Chart from './chart'

// DESPUÉS: Lazy con suspense
const Chart = dynamic(() => import('./chart'), { 
  ssr: false,
  loading: () => <div className="h-96 bg-muted animate-pulse rounded" />
});
```

### 3. **Optimizar Fuentes**
En `lib/fonts.ts`, revisa si se cargan todas las variantes necesarias:
```tsx
// Considera solo cargar font-weights necesarios
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'], // Solo necesarios
  display: 'swap', // Muestra fallback mientras carga
});
```

### 4. **Código CSS Crítico**
Tailwind genera mucho CSS. Considera:
- Purgar clases no utilizadas
- Usar PurgeCSS más agresivamente
- Inline CSS crítico en `<head>`

### 5. **Usar Service Worker para Cache Offline**
```bash
npm install next-pwa
```
Esto cachea assets y permite funcionamiento offline.

### 6. **Suspense Boundaries Estratégicas**
```tsx
<Suspense fallback={<Skeleton />}>
  <SlowComponent />
</Suspense>
```
Esto permite que otras partes de la página se rendericen más rápido.

### 7. **Precargar Recursos Críticos**
En `app/layout.tsx`:
```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://zyrqdqpbrsevuygjrhvk.supabase.co" />
```

### 8. **Optimización de Imágenes**
```tsx
// Usa Next.js Image Component
import Image from 'next/image';

// Con tamaño conocido
<Image 
  src={url} 
  alt="..." 
  width={800} 
  height={600}
  priority={false} // Solo true para LCP images
  placeholder="blur" // Blur mientras carga
/>
```

### 9. **Web Vitals Monitoring**
Ya tienes `@vercel/speed-insights` instalado. Asegúrate de:
```tsx
// app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next"

export default function RootLayout() {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### 10. **Vercel Analytics**
```tsx
import { Analytics } from "@vercel/analytics/react"

export default function RootLayout() {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

---

## 📈 Objetivo Final
- **FCP**: <1.5s (Target: -50%)
- **LCP**: <2.2s (Target: -38%)
- **RES**: >90 (Target: +11%)

## 🔍 Testing Local
```bash
# Build optimizado
npm run build

# Servir build localmente
npm run start

# Analizar bundle
npm run build -- --analyze
```

---

## Recursos Útiles
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [PageSpeed Insights API](https://developers.google.com/speed/pagespeed/insights)
