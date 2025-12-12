# 📊 Script de Monitoreo de Rendimiento

## 1. Verificar en Local

```bash
# Terminal 1: Build y servir
npm run build
npm run start

# Terminal 2: Abrir DevTools
# Abre: http://localhost:3000/book
# Presiona: F12 → Network → Recarga
# Fíjate en:
# - Tiempo de carga total
# - Tamaño de bundle JS
# - Número de requests
```

## 2. Herramientas para Medir

### Opción A: PageSpeed Insights (Google)
```
https://pagespeed.web.dev/?url=https://micecatering.eu/book
```

### Opción B: WebPageTest
```
https://www.webpagetest.org/
- URL: https://micecatering.eu/book
- Location: Europe
- Browser: Chrome
```

### Opción C: Lighthouse (Chrome DevTools)
```
F12 → Lighthouse → Analyze page load
```

## 3. Analizar Bundle Size

```bash
# Genera reporte visual
ANALYZE=true npm run build

# Abre: .next/analyze/client.html en navegador
```

## 4. Métricas Clave a Monitorear

| Métrica | Herramienta | Cómo Medir |
|---------|------------|-----------|
| **FCP** | DevTools → Performance | Tiempo hasta primer contenido |
| **LCP** | PageSpeed Insights | Elemento más grande visible |
| **TTFB** | Network tab | Tiempo servidor → primer byte |
| **CLS** | Lighthouse | Layout shifts inesperados |
| **INP** | Web Vitals | Interacción → respuesta |

## 5. Comparación Antes/Después

```
ANTES (Baseline):
┌─────────────────────────────────┐
│ FCP: 3.07s                      │
│ LCP: 3.58s                      │
│ TTFB: 1.23s                     │
│ RES: 81                         │
│ Bundle JS: ~450KB               │
└─────────────────────────────────┘

DESPUÉS (Target):
┌─────────────────────────────────┐
│ FCP: ~2.3s (-25%)               │
│ LCP: ~2.5s (-30%)               │
│ TTFB: ~1.0s (-20%)              │
│ RES: ~87 (+7%)                  │
│ Bundle JS: ~350KB (-22%)        │
└─────────────────────────────────┘
```

## 6. Verificaciones Rápidas

### 6.1 ¿Lazy loading funciona?
```bash
# En DevTools → Network → Filter: "js"
# Recarga página /book
# Debería mostrar "analisis-economico-card" como chunk separado
```

### 6.2 ¿Queries optimizadas?
```bash
# En DevTools → Network → Filter: "fetch"
# Debería ver requests a Supabase con menos datos
# Tiempo de respuesta: <500ms (era >2s antes)
```

### 6.3 ¿Gzip habilitado?
```bash
# En DevTools → Network
# Hacer clic en cualquier archivo .js
# En Response Headers debe aparecer:
# "content-encoding: gzip"
```

## 7. Monitoreo Continuo en Vercel

1. Inicia sesión en [Vercel Analytics](https://vercel.com/dashboard)
2. Selecciona el proyecto "studio"
3. Ve a pestaña "Speed Insights"
4. Compara datos semanales
5. Establece alertas para métricas bajo umbral

## 8. Script de Testing Automatizado

```bash
#!/bin/bash
# Guarda como: scripts/performance-check.sh

echo "🚀 Iniciando verificación de rendimiento..."

# Build
echo "📦 Compilando..."
npm run build

# Analizar bundle
echo "📊 Analizando bundle..."
ANALYZE=true npm run build 2>/dev/null

# Contar archivos
echo "📈 Estadísticas:"
echo "  - Archivos JS: $(find .next/static/chunks -name '*.js' 2>/dev/null | wc -l)"
echo "  - Tamaño bundle: $(du -sh .next 2>/dev/null | cut -f1)"

echo "✅ Verificación completada"
```

Ejecutar:
```bash
chmod +x scripts/performance-check.sh
./scripts/performance-check.sh
```

## 9. Baseline de Métricas Actuales

```json
{
  "date": "2024-12-12",
  "metrics": {
    "fcp": "3.07s",
    "lcp": "3.58s",
    "ttfb": "1.23s",
    "res": 81,
    "bundle_size": "~450KB",
    "num_requests": "~85",
    "total_size": "~1.2MB"
  },
  "changes_applied": [
    "Lazy loading AnalisisEconomicoCard",
    "Optimized Supabase queries",
    "Gzip compression enabled",
    "WebP/AVIF image formats"
  ]
}
```

## 10. Roadmap de Mejoras

- [x] Lazy load componentes pesados
- [x] Optimizar queries DB
- [x] Gzip compression
- [ ] Service Worker (PWA)
- [ ] Reemplazar date-fns
- [ ] Lazy load todos los gráficos
- [ ] Image optimization global
- [ ] Database indexing

---

**Nota**: Espera 24-48h después del deploy para ver cambios en PageSpeed Insights.
