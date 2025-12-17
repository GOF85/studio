# 🔧 Setup Dev Environment - Guía Completa

**Última actualización**: 16 Diciembre 2025  
**Error reportado**: `Error: fetch failed` en middleware de Supabase

---

## ⚠️ El Problema

Al iniciar desde un nuevo dev environment, el middleware intenta conectarse a Supabase y falla:

```
Error: fetch failed
    at context.fetch (middleware.ts)
    at eval (@supabase/auth-js/dist/module/lib/helpers.js:120:25)
```

---

## ✅ Solución: Pasos de Setup

### 1. **Verificar Variables de Entorno**

```bash
# Verifica que .env.local exista y tenga las credenciales
cat .env.local
```

Debe contener:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://zyrqdqpbrsevuygjrhvk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 2. **Verificar Conectividad a Supabase**

```bash
# Test curl (macOS)
curl -s -I https://zyrqdqpbrsevuygjrhvk.supabase.co/rest/v1/ \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)"
```

✓ Esperado: `HTTP/2 200` o `HTTP/1.1 404` (ambas son OK, significa que Supabase responde)

❌ Si falla: Verifica tu conexión de internet o que la URL de Supabase sea correcta.

### 3. **Instalar Dependencias**

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### 4. **Limpiar Cache de Next.js**

```bash
rm -rf .next
npm run dev
```

### 5. **Verificar Configuración de Supabase**

En [Supabase Dashboard](https://supabase.co):
- ✓ Verifica que el proyecto esté **Activo**
- ✓ Ve a **Settings → API** y confirma que URL y ANON KEY sean correctas
- ✓ Verifica en **Auth → Providers** que esté habilitado

---

## 🏃 Quick Start (5 minutos)

```bash
# 1. Clonar/Setup ambiente
cd /Users/guillermo/mc/studio

# 2. Limpiar y reinstalar
rm -rf node_modules .next
npm install

# 3. Verificar variables
cat .env.local | grep SUPABASE

# 4. Iniciar dev
npm run dev

# 5. Si aún hay error, revisar logs
# Abre http://localhost:3000 en navegador
# Presiona F12 → Console para ver detalles
```

---

## 🚨 Troubleshooting Detallado

### Escenario A: "fetch failed" persiste

**Causa**: Supabase no es accesible desde tu red.

**Soluciones**:
1. Verifica VPN/Firewall
2. Prueba desde otra red (ej: mobile hotspot)
3. Verifica que la URL de Supabase sea correcta:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   # Debe ser: https://zyrqdqpbrsevuygjrhvk.supabase.co
   ```

---

### Escenario B: "Auth check timeout"

**Causa**: Supabase es lento o hay latencia alta.

**Soluciones**:
1. El middleware ahora tiene timeout de 8 segundos → debe resolver
2. Si continúa, aumenta timeout en `middleware.ts` línea ~110
3. Verifica estado de Supabase en [status.supabase.com](https://status.supabase.com)

---

### Escenario C: "Invalid API Key"

**Causa**: ANON KEY expiró o es incorrecta.

**Solución**:
1. Ve a [Supabase Dashboard](https://supabase.co/dashboard)
2. Selecciona el proyecto
3. Settings → API
4. Copia la nueva `anon key`
5. Actualiza `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<nueva_key>
   ```
6. Reinicia con `npm run dev`

---

### Escenario D: Aplicación inicia pero no accede a datos

**Causa**: Middleware pasa pero no hay conexión a BD.

**Verificación**:
```bash
# En navegador Console (F12):
# Deberías ver autenticación exitosa
# Si ves errores de Supabase, revisa la Network tab
```

---

## 📋 Checklist de Setup

- [ ] `.env.local` existe con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Puedes hacer ping a `https://zyrqdqpbrsevuygjrhvk.supabase.co`
- [ ] `npm install` completó sin errores críticos
- [ ] `.next/` directory está limpio
- [ ] `npm run dev` inicia sin errores
- [ ] Puedes acceder a `http://localhost:3000`
- [ ] Puedes hacer login (si existe página de login)

---

## 📊 Mejoras Implementadas al Middleware

✅ **Retry Logic**: Intenta 2 veces con backoff exponencial  
✅ **Timeouts**: Max 5s para OS resolution, 8s para auth check  
✅ **Better Logging**: Mensajes de error más descriptivos  
✅ **Graceful Degradation**: Si Supabase falla, la app sigue funcionando en dev  
✅ **Credentials Check**: Valida que existan variables de entorno antes de intentar conectar

---

## 🔄 Deployment

Si desplegaste recientemente en Vercel/similar:

1. Verifica que **Environment Variables** estén configuradas correctamente
2. Variables deben ser `NEXT_PUBLIC_*` para que sean públicas
3. Redeploy después de actualizar variables:
   ```bash
   vercel env pull  # si usas Vercel CLI
   vercel deploy
   ```

---

## 📞 Soporte

Si el problema persiste:

1. **Revisa los logs**:
   ```bash
   npm run dev 2>&1 | grep -i "middleware\|supabase\|fetch"
   ```

2. **Incluye en el reporte**:
   - Output completo de error
   - Resultado de `curl -I https://zyrqdqpbrsevuygjrhvk.supabase.co/rest/v1/`
   - Tu OS y versión de Node.js: `node --version`
   - Output de `npm run dev` (primeras 50 líneas)

3. **Recursos**:
   - [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
   - [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
