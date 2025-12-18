# 🚀 GUÍA RÁPIDA DE ACTIVACIÓN

## Paso 1️⃣: Migración de Base de Datos (Supabase)

En tu Supabase Dashboard:
1. Abre **SQL Editor**
2. Copia y ejecuta esto:

```sql
-- Agregar columna variacion_porcentaje a historico_precios_erp
ALTER TABLE historico_precios_erp
ADD COLUMN IF NOT EXISTS variacion_porcentaje DECIMAL(5, 2) DEFAULT 0;

-- Crear índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_historico_precios_erp_variacion 
ON historico_precios_erp(variacion_porcentaje DESC, fecha DESC);

-- Verificar que la columna se creó
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'historico_precios_erp'
ORDER BY ordinal_position;
```

✅ Si ves la columna `variacion_porcentaje` DECIMAL(5,2) → Listo!

---

## Paso 2️⃣: Configurar SMTP (Gmail)

### Opción A: Gmail (Recomendado)

1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona: Mail → Windows Computer (o tu dispositivo)
3. Click **Generar**
4. Copia la contraseña de 16 caracteres
5. Guarda en un lugar seguro

### Opción B: Otros proveedores
- **Sendgrid**: SMTP_HOST=smtp.sendgrid.net, SMTP_PORT=587, SMTP_USER=apikey
- **Mailgun**: SMTP_HOST=smtp.mailgun.org, SMTP_PORT=587
- **Brevo**: SMTP_HOST=smtp-relay.brevo.com, SMTP_PORT=587

---

## Paso 3️⃣: Agregar Variables de Entorno (Vercel)

1. Ve a **Vercel Dashboard** → Tu proyecto
2. Settings → **Environment Variables**
3. Agrega estas 8 variables:

```
CRON_SECRET = [Generar string seguro: https://uuidgenerator.net/]
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_SECURE = false
SMTP_USER = tu-email@gmail.com
SMTP_PASS = [La contraseña de 16 caracteres de Gmail]
SMTP_FROM = noreply@micecatering.com
ADMIN_EMAIL = guillermo.otero@micecatering.com
NEXT_PUBLIC_APP_URL = https://tu-app.vercel.app
```

4. Selecciona todos como scope: **Production, Preview, Development**
5. Click **Save**

---

## Paso 4️⃣: Deploy

```bash
# En tu terminal local:
git add .
git commit -m "feat: Sincronización automática Factusol con alertas de precio"
git push origin main
```

Vercel se desplegará automáticamente. Espera ~3 minutos.

---

## Paso 5️⃣: Verificar Vercel Cron

1. Ve a **Vercel Dashboard** → Tu proyecto → **Functions**
2. Click en la pestaña **Crons**
3. Deberías ver: `/api/cron/sync-factusol` con schedule `0 0 * * *`
4. Click **Test** para ejecutar manualmente

---

## Paso 6️⃣: Test Manual en la App

1. Abre tu app en `/bd/erp`
2. Click en el menú ⋮ (arriba a la derecha)
3. Click **"Sincronizar con Factusol"**
4. Verás un splash screen con spinner
5. Cuando termine, verás el sync log

---

## ✅ Checklist de Verificación

- [ ] Migración SQL ejecutada en Supabase
- [ ] Gmail App Password generado
- [ ] 8 variables de entorno agregadas en Vercel
- [ ] Deploy completado (git push)
- [ ] Vercel Cron visible en Functions
- [ ] Test manual funciona
- [ ] Primer email de alerta recibido

---

## 🔍 Troubleshooting

### El Cron no aparece en Vercel
→ Re-deploy: `git push` nuevamente

### Las variables de entorno no se cargan
→ Después de agregar, espera 2 minutos
→ Verifica que esté en scope "Production"

### Los emails no llegan
→ Verifica `SMTP_USER` y `SMTP_PASS` sean correctos
→ Revisa carpeta SPAM
→ En Vercel, verifica logs: Settings → Logs

### Precios no se actualizan
→ Verifica que Factusol API esté accesible
→ Mira sync log en `/bd/erp` → Sincronizar

### SQL error: relation already exists
→ Normal, la tabla ya existe desde antes
→ Solo agrega la columna `variacion_porcentaje`

---

## 📊 Ejemplo: Primer Email Enviado

Cuando un artículo tenga cambio >= 10% en las próximas 24 horas:

```
From: noreply@micecatering.com
To: guillermo.otero@micecatering.com
Subject: ⚠️ Alertas de Cambio de Precio - 15/12/2025

┌────────────────────────────────────────┐
│         CAMBIOS DE PRECIO DETECTADOS   │
├────────────────────────────────────────┤
│ Artículo        │ Precio │ Variación  │
├─────────────────┼────────┼────────────┤
│ Arroz Premium   │ €45.50 │ +12.50%    │
│ Aceite Oliva    │ €8.75  │ -11.20%    │
└────────────────────────────────────────┘

[Ver en el Sistema] → https://tu-app.vercel.app/bd/erp
```

---

## 🆘 Ayuda

Si tienes problemas:
1. Revisa los logs en Vercel
2. Verifica que todas las variables de entorno sean correctas
3. Prueba el endpoint manualmente:

```bash
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://tu-app.vercel.app/api/cron/sync-factusol
```

---

**¡Listo! Tu sincronización automática está activa** 🎉
