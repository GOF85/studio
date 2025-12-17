# 🎬 CÓMO PROCEDER - Paso a Paso

**Creado**: 16 Diciembre 2025  
**Tiempo estimado**: 5-10 minutos  
**Objetivo**: Que el servidor dev se inicie correctamente

---

## 📍 Ubicación Actual

Estás en: `/Users/guillermo/mc/studio`  
Error encontrado: ✗ `Error: fetch failed` en middleware  
Status: ✅ **RESUELTO** (middleware mejorado)

---

## 🚀 Plan de Acción

### FASE 1: Verificación Rápida (2 minutos)

**☐ Paso 1.1**: Abre una terminal en `/Users/guillermo/mc/studio`

```bash
cd /Users/guillermo/mc/studio
pwd  # Debería mostrar: /Users/guillermo/mc/studio
```

**☐ Paso 1.2**: Ejecuta el diagnóstico

```bash
./diagnose-setup.sh
```

**Expected output**:
```
✓ Node.js v22.20.0
✓ npm 11.7.0
✓ .env.local exists
✓ Supabase is reachable (HTTP 401)
✓ node_modules exists (816 packages)
✓ Next.js: 15.5.7
✓ @supabase/ssr: ✓ installed
✓ .next exists
✓ middleware.ts exists
  ✓ Retry logic implemented
  ✓ Timeout protection implemented
✓ Internet connection available
```

**☐ Si ves algo rojo**:
1. Nota el error exacto
2. Consulta la sección "Soluciones por Error" abajo
3. Si aún falla, ejecuta: `npm install && rm -rf .next`

**✓ Si todo verde**: Continúa a FASE 2

---

### FASE 2: Limpiar & Reiniciar (3 minutos)

**☐ Paso 2.1**: Limpia el build anterior

```bash
rm -rf .next
```

**☐ Paso 2.2**: Verifica que .env.local tenga Supabase

```bash
cat .env.local | grep SUPABASE
```

**Expected output**:
```
NEXT_PUBLIC_SUPABASE_URL=https://zyrqdqpbrsevuygjrhvk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**☐ Paso 2.3**: Inicia el servidor

```bash
npm run dev
```

**Expected output** (en los próximos 10-20 segundos):
```
> next dev

  ▲ Next.js 15.5.7
  - Local:        http://localhost:3000

✓ Ready in 3.2s
```

**☐ Si ves error**: Ve a "Soluciones por Error" abajo

---

### FASE 3: Verificación en Navegador (2 minutos)

**☐ Paso 3.1**: Abre navegador

Accede a: `http://localhost:3000`

**☐ Paso 3.2**: Abre DevTools

Presiona: `F12`

**☐ Paso 3.3**: Revisa Console

- ✓ Deberías NO ver errores rojos
- ✓ Podrías ver algunos warnings amarillos (normal)
- ✓ Podrías ver logs de "[Middleware]" (esperado)

**☐ Si ves "[Middleware] Auth check failed"**:
- Esto es normal en dev
- Significa que el middleware intentó conectar pero falló gracefully
- La app debería seguir funcionando

**✓ Paso completado**: Si la página carga sin errores rojos

---

## ⚡ Quick Commands Cheat Sheet

```bash
# Diagnosticar setup
./diagnose-setup.sh

# Limpiar todo y reinstalar
rm -rf node_modules .next package-lock.json
npm install

# Iniciar dev
npm run dev

# En otra terminal, test de conectividad
curl -I https://zyrqdqpbrsevuygjrhvk.supabase.co/rest/v1/

# Ver .env.local variables
cat .env.local

# Ver logs de Supabase en middleware
npm run dev 2>&1 | grep -i middleware
```

---

## 🆘 Soluciones por Error

### ❌ Error: "npm: command not found"

```bash
# Verifica Node.js está instalado
node --version
# Debería mostrar: v22.20.0 o similar

# Si no está:
# - Descarga desde https://nodejs.org/
# - Instala la versión LTS
# - Reinicia terminal
```

### ❌ Error: "./diagnose-setup.sh: Permission denied"

```bash
# Dale permisos ejecutables
chmod +x /Users/guillermo/mc/studio/diagnose-setup.sh

# Luego ejecuta
./diagnose-setup.sh
```

### ❌ Error: ".env.local not found" en diagnóstico

```bash
# Verifica que exista
ls -la .env.local

# Si no existe, copia desde example (si existe)
cp .env.local.example .env.local

# Edita con tus credenciales de Supabase
nano .env.local
```

### ❌ Error: "node_modules not found"

```bash
# Instala dependencias
npm install

# Espera a que termine (puede tardar 1-3 minutos)
# Verás muchas líneas, al final:
# added XXX packages in XXXs
```

### ❌ Error: "NEXT_PUBLIC_SUPABASE_URL is empty"

```bash
# Verifica variables
cat .env.local

# Debería tener dos líneas:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Si no, edita:
nano .env.local

# O desde Supabase Dashboard:
# https://supabase.co/dashboard → Settings → API
```

### ❌ Error: "Error: fetch failed" aún aparece

**Opciones de debug** (en orden):

```bash
# 1. Ver logs detallados
npm run dev 2>&1 | head -100

# 2. Ver solo logs de middleware
npm run dev 2>&1 | grep -i "middleware\|fetch\|auth"

# 3. Test de conectividad a Supabase
curl -v https://zyrqdqpbrsevuygjrhvk.supabase.co/rest/v1/

# 4. Verifica tu IP/VPN
curl https://api.ipify.org

# 5. Reset completo
rm -rf node_modules .next package-lock.json
npm install
npm run dev
```

### ❌ Error: "Port 3000 already in use"

```bash
# Opción 1: Usa otro puerto
npm run dev -- -p 3001

# Opción 2: Mata el proceso en puerto 3000
# macOS/Linux:
lsof -ti :3000 | xargs kill -9

# Luego reinicia
npm run dev
```

### ❌ Error: "TypeError: Cannot read property 'url' of undefined"

```bash
# Probablemente .env.local no está siendo cargado

# Verifica existencia
ls -la .env.local

# Si existe, verifica contenido
cat .env.local

# Si está vacío o mal formateado, edita:
nano .env.local

# Debe ser:
# NEXT_PUBLIC_SUPABASE_URL=https://zyrqdqpbrsevuygjrhvk.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## ✅ Verificación Final (Checklist)

Marca cada ítem cuando esté completo:

- [ ] `./diagnose-setup.sh` ejecuta sin errores rojos
- [ ] `npm run dev` inicia sin errores
- [ ] Ves `✓ Ready in X.Xs` en la terminal
- [ ] Puedo acceder a `http://localhost:3000`
- [ ] F12 → Console no muestra errores rojos (warnings OK)
- [ ] La página carga y es funcional
- [ ] Puedo navegar por la app

**Si todos ✓**: ¡Listo! El error está resuelto.

---

## 🎓 Qué Cambió Desde Antes

| Antes | Ahora |
|-------|-------|
| ❌ Fetch fallaba sin reintentos | ✅ Reintentos con backoff |
| ❌ Se colgaba indefinidamente | ✅ Timeout de 8 segundos |
| ❌ Errors silenciosos | ✅ Logs descriptivos |
| ❌ Crash si Supabase falla | ✅ Graceful degradation |
| ❌ Debugging frustrante | ✅ Debugging fácil |

---

## 🆘 Si Aún No Funciona

1. **Toma nota de**:
   - Texto exacto del error
   - Output de `./diagnose-setup.sh`
   - Tu OS (macOS/Linux/Windows)
   - Versión de Node.js: `node --version`

2. **Documenta**:
   ```bash
   # Ejecuta y guarda output
   npm run dev 2>&1 > /tmp/error.log
   cat /tmp/error.log
   ```

3. **Comparte**: Output de los pasos anteriores

---

## 📞 Recursos

- 📄 [Guía Completa de Setup](SETUP_DEV_ENVIRONMENT.md)
- 🔍 [Diagnóstico Detallado](README_FIX_FETCH_ERROR.md)
- 🛠️ [Cambios Implementados](CAMBIOS_FIX_MIDDLEWARE_FETCH.md)
- 🔧 [Script Diagnóstico](diagnose-setup.sh)

---

## 🎯 Resumen

1. **Ejecuta**: `./diagnose-setup.sh` (2 min)
2. **Limpia**: `rm -rf .next` (10 seg)
3. **Inicia**: `npm run dev` (30 seg)
4. **Verifica**: Abre `http://localhost:3000` (1 min)
5. **Listo**: Todo debería funcionar ✅

---

**Tiempo total**: ~5-10 minutos  
**Complejidad**: Fácil  
**Resultado**: Dev server funcionando correctamente

¿Necesitas ayuda? Sigue los pasos de "Soluciones por Error" arriba.

