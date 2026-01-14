# 🔧 Runbook Operacional - Sistema de Gestión de Pedidos

**Para**: Equipo de IT, Support, Operations  
**Versión**: 1.0  
**Fecha**: 10 Enero 2026

---

## 🚀 INICIO RÁPIDO

### Health Check (Primero cada día)
```bash
# 1. Verificar servicio activo
curl -s https://app.studio.com/api/pedidos/download-pdf?pedidoId=test \
  | grep -q "error" || echo "✅ API OK"

# 2. Verificar base de datos
psql $DATABASE_URL -c "SELECT COUNT(*) FROM os_pedidos_enviados;" \
  || echo "❌ DB Error"

# 3. Verificar logs
tail -f ~/.pm2/logs/studio-error.log | head -20
```

---

## 📊 DASHBOARD MONITOREO

### Métricas Clave (Verificar cada 2 horas)

```
┌─────────────────────────────────────────┐
│ SISTEMA DE PEDIDOS - MONITOREO          │
├─────────────────────────────────────────┤
│ Status:           🟢 Online             │
│ Response Time:    145ms (OK < 500ms)    │
│ Error Rate:       0.2% (OK < 1%)        │
│ DB Connections:   12/100 (OK)           │
│ CPU Usage:        32% (OK < 80%)        │
│ Memory:           512MB (OK < 1GB)      │
│ Disk:             45GB/100GB (OK)       │
│ Last Backup:      2h ago (OK)           │
└─────────────────────────────────────────┘
```

### Dónde Consultar Métricas
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Sentry (Errores)**: https://sentry.io
- **New Relic (APM)**: https://newrelic.com (si disponible)

---

## 🛠️ PROCEDIMIENTOS COMUNES

### 1️⃣ Problema: PDF no se genera

#### Diagnosis
```bash
# Ver logs de la API
tail -100f /var/log/app/generate-pdf.log | grep ERROR

# Verificar si Supabase está accesible
curl https://supabase.com/health

# Revisar tablas de BD
psql $DATABASE_URL -c "\dt os_pedidos*"

# Verificar espacio en disco
df -h | grep -E "^/|100%"
```

#### Solución Paso a Paso
```
1. Revisar el error específico en logs
2. Si es error 500: probablemente BD
3. Si es error 403: probablemente auth
4. Si es error 404: probablemente tabla

Por cada caso:

ERROR 500 (Database):
  → Verificar conexión a Supabase
  → Verificar que tablas existen
  → Ejecutar migrations si necesario
  → Reiniciar servicio

ERROR 403 (Auth):
  → Verificar JWT es válido
  → Verificar RLS policies
  → Check NEXT_PUBLIC_SUPABASE_URL

ERROR 404 (Not Found):
  → Verificar que pedidoId existe
  → Verificar ruta API correcta
```

#### Escalation
```
Si aún no funciona después de 15 min:
→ Contactar al equipo de desarrollo
→ Incluir logs completos
→ Incluir timestamp exacto del error
```

---

### 2️⃣ Problema: Velocidad lenta

#### Diagnosis
```bash
# Medir latencia API
time curl https://app.studio.com/api/pedidos/generate-pdf

# Revisar queries lentos en BD
psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Verificar recursos del servidor
top -b -n 1 | head -20

# Revisar cache
redis-cli INFO stats
```

#### Soluciones
```
Rápidas (< 5 min):
  1. Limpiar caché Redis: redis-cli FLUSHDB
  2. Reiniciar servicio: npm restart
  3. Verificar que DB no esté en backups

Medias (5-30 min):
  1. Revisar índices de BD
  2. Optimizar queries
  3. Aumentar cache TTL

Lentas (> 30 min):
  1. Análisis de plan de ejecución
  2. Necesitar escalar recursos
  3. Contactar DevOps
```

---

### 3️⃣ Problema: Errores de base de datos

#### Diagnosis
```bash
# Ver error específico
grep "os_pedidos" /var/log/app/*.log | tail -20

# Verificar integridad de BD
psql $DATABASE_URL -c "SELECT COUNT(*) FROM os_pedidos_enviados;"

# Revisar constraints
psql $DATABASE_URL -c "SELECT * FROM information_schema.table_constraints WHERE table_name = 'os_pedidos_enviados';"

# Ver últimas transacciones
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE datname = 'studio';"
```

#### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `duplicate key value` | Inserción duplicada | Ver idempotencia en API |
| `foreign key violation` | `numero_expediente` no existe | Verificar `eventos` tabla |
| `too many connections` | Pool exhausto | Reiniciar app |
| `permission denied` | RLS policy | Revisar auth user |

#### Resolución
```
Paso 1: Identificar tipo de error
  → Leer mensaje de error completo
  → Buscar código de error PostgreSQL

Paso 2: Revisar contexto
  → Qué usuario causó el error
  → Cuándo exactamente ocurrió
  → Qué datos estaban involucrados

Paso 3: Aplicar solución
  → Ejecutar rollback si es necesario
  → Corregir datos si es posible
  → Reintentar operación

Paso 4: Prevenir en futuro
  → Mejorar validaciones
  → Mejorar constraints BD
  → Mejorar error handling
```

---

### 4️⃣ Problema: Datos inconsistentes

#### Detection
```bash
# Ver duplicados
psql $DATABASE_URL -c "SELECT numero_expediente, COUNT(*) FROM os_pedidos_enviados GROUP BY numero_expediente HAVING COUNT(*) > 1;"

# Ver huérfanos (pedidos sin evento)
psql $DATABASE_URL -c "SELECT op.* FROM os_pedidos_enviados op LEFT JOIN eventos e ON op.os_id = e.numero_expediente WHERE e.id IS NULL;"

# Ver datos faltantes
psql $DATABASE_URL -c "SELECT * FROM os_pedidos_enviados WHERE items IS NULL OR items = '{}';"
```

#### Limpieza
```sql
-- BACKUP PRIMERO!
BEGIN TRANSACTION;

-- Eliminar duplicados (guardar uno)
DELETE FROM os_pedidos_enviados 
WHERE id NOT IN (
  SELECT DISTINCT ON (numero_expediente) id 
  FROM os_pedidos_enviados 
  ORDER BY numero_expediente, created_at DESC
);

-- Verificar cambios
SELECT COUNT(*) FROM os_pedidos_enviados;

-- Confirmar
COMMIT;

-- O si hay problemas:
ROLLBACK;
```

---

### 5️⃣ Problema: Pérdida de datos o corrupción

#### EMERGENCIA - Procedures
```bash
# 1. PAUSAR SERVICIO INMEDIATAMENTE
systemctl stop studio
pm2 stop studio

# 2. VERIFICAR INTEGRIDAD
psql $DATABASE_URL -c "SELECT pg_database.datname FROM pg_database WHERE pg_database.datname = 'studio';"

# 3. BACKUPS DISPONIBLES
# En Supabase: https://supabase.com/dashboard > Backups
# Ver últimos backups antes del error

# 4. RESTAURAR SI NECESARIO
# Supabase: Click "Restore" en dashboard
# Esperar confirmación

# 5. VERIFICAR DATOS DESPUÉS DE RESTAURAR
psql $DATABASE_URL -c "SELECT COUNT(*) FROM os_pedidos_enviados;"

# 6. REINICAR SERVICIO
systemctl start studio
pm2 start studio

# 7. VALIDAR
curl https://app.studio.com/api/pedidos/download-pdf?pedidoId=test
```

#### Escalation Level: **CRITICAL**
```
→ CTO inmediatamente
→ Database admin
→ Backup team
→ Documentar todo para RCA (Root Cause Analysis)
```

---

## 🔄 MAINTENANCE TASKS

### Diarias
```
⏰ 08:00 - Health Check
   └─ curl API
   └─ Verificar DB
   └─ Revisar error logs

⏰ 12:00 - Spot Check
   └─ Crear test PDF
   └─ Descargar test PDF
   └─ Verificar fecha/hora en BD

⏰ 18:00 - End of Day Review
   └─ Revisar error logs del día
   └─ Verificar backups
   └─ Update status page
```

### Semanales
```
🗓️ LUNES - Database Maintenance
   └─ VACUUM (optimizar BD)
   └─ ANALYZE (actualizar estadísticas)
   └─ REINDEX (reconstruir índices)

🗓️ JUEVES - Log Cleanup
   └─ Archivar logs antiguos (> 30 días)
   └─ Comprimir logs
   └─ Verificar disk space

🗓️ VIERNES - Full Backup
   └─ Backup manual de BD
   └─ Backup manual de PDFs
   └─ Verificar integridad de backups
```

### Mensuales
```
📆 PRIMER LUNES - Performance Review
   └─ Análisis de logs
   └─ Revisar slow queries
   └─ Optimizar si necesario

📆 SEGUNDO MARTES - Security Audit
   └─ Revisar RLS policies
   └─ Revisar auth logs
   └─ Verificar HTTPS activo

📆 TERCER JUEVES - Disaster Recovery Test
   └─ Simular restauración de backup
   └─ Documentar tiempo de recovery
   └─ Verificar datos íntegros
```

---

## 🔐 SECURITY OPERATIONS

### Daily Security Check
```bash
# Revisar logs de auth
tail -100 /var/log/auth.log | grep "studio"

# Revisar intentos de acceso fallidos
psql $DATABASE_URL -c "SELECT * FROM auth_audit_log WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20;"

# Verificar HTTPS activo
curl -I https://app.studio.com | grep "Strict-Transport-Security"

# Revisar API keys expiradas
psql $DATABASE_URL -c "SELECT * FROM api_keys WHERE expires_at < NOW();"
```

### Incident Response
```
Paso 1: IDENTIFY
  → Error? Intruso? Data leak?
  → Scope del problema
  → Usuarios afectados

Paso 2: CONTAIN
  → Aislar el servicio si es necesario
  → Prevenir propagación
  → Notificar al equipo

Paso 3: INVESTIGATE
  → Revisar logs
  → Forensics
  → Root cause

Paso 4: REMEDIATE
  → Parchar vulnerabilidad
  → Limpiar datos si necesario
  → Deploy fix

Paso 5: COMMUNICATE
  → Informar a usuarios
  → Documentar lecciones
  → Actualizar procesos
```

---

## 📞 ESCALATION MATRIX

### Nivel 1: IT Support (0-30 min)
```
Problemas que solucionan:
  ✓ Resetear contraseña usuario
  ✓ Limpiar caché
  ✓ Reinicar servicio
  ✓ Ver logs básicos

Si no pueden resolver → Nivel 2
```

### Nivel 2: Backend Developer (0-1 hora)
```
Problemas que solucionan:
  ✓ Errores de API
  ✓ Problemas de base de datos
  ✓ Bugs de código
  ✓ Queries lentos

Contacto:
  📧 dev-backend@company.com
  💬 Slack: @backend-team
  ☎️ On-call: [teléfono]

Si no pueden resolver → Nivel 3
```

### Nivel 3: CTO / DevOps (0-2 horas)
```
Problemas críticos:
  ✗ Pérdida de datos
  ✗ Servicio completamente caído
  ✗ Security breach
  ✗ Performance crítico

Contacto:
  📧 cto@company.com
  ☎️ Emergencias: [teléfono CTO]

Procedimiento:
  1. War room call inmediato
  2. Assessment situación
  3. Activar plan de contingencia
  4. Comunicación stakeholders
```

---

## 📋 RUNBOOKS ESPECÍFICOS

### Runbook A: Restaurar desde Backup
```
Tiempo estimado: 15-30 min

1. Verificar integridad backup
   psql backup.dmp -c "SELECT COUNT(*) FROM os_pedidos_enviados;"

2. Pausar servicio
   pm2 stop studio

3. Respaldar BD actual (para análisis post-mortem)
   pg_dump $DATABASE_URL > /backups/pre-restore-$(date +%Y%m%d).sql

4. Restaurar backup
   pg_restore --clean --create --dbname=studio /backups/latest.dump

5. Verificar integridad post-restore
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM os_pedidos_enviados;"

6. Reiniciar servicio
   pm2 start studio

7. Validar
   curl https://app.studio.com/api/pedidos/download-pdf?pedidoId=test

8. Documentar
   - Timestamp de restauración
   - Datos perdidos (si aplica)
   - Causa del problema
   - Acción preventiva
```

### Runbook B: Escalar recursos
```
Tiempo estimado: 5-15 min (depende de provider)

En Vercel:
  1. Dashboard > Settings > Scaling
  2. Aumentar Concurrency Limit
  3. Aumentar Memory per Function
  4. Deploy new version

En Supabase:
  1. Dashboard > Project Settings
  2. Compute Size → Increase
  3. Esperar a que aplique (5-10 min)
  4. Verificar query performance

En Redis:
  1. Console > Memory
  2. Si > 90%: Upgrade instance
  3. O aumentar TTL de caché
```

### Runbook C: Deploy de patch de emergencia
```
Tiempo estimado: 10-20 min

1. Fix código en rama hotfix
   git checkout -b hotfix/issue-123

2. Test localmente
   npm run dev
   # Test el fix

3. Commit y push
   git add .
   git commit -m "Fix: [descripción] [urgente]"
   git push origin hotfix/issue-123

4. Create PR (sin wait para reviews)
   # Descripción: Lo más clara posible

5. Merge a main
   git checkout main
   git merge hotfix/issue-123

6. Deploy
   git push origin main
   # Vercel auto-deploys

7. Verificar en staging
   curl https://staging.app/api/pedidos/...

8. If OK → produção (auto)

9. Documentar incident
   - Qué salió mal
   - Cómo lo detectamos
   - Cómo lo arreglamos
   - Cómo prevenirlo
```

---

## 📊 LOGS Y ALERTAS

### Dónde Ver Logs
```
Vercel Logs:
  https://vercel.com/dashboard > Deployments > Logs

Supabase Logs:
  https://supabase.com/dashboard > Logs > Database

Local Logs:
  ~/.pm2/logs/studio-*.log
  /var/log/app/pedidos.log

Aggregated (si disponible):
  ELK Stack: https://logs.company.com
  Sentry: https://sentry.io
```

### Configurar Alertas
```
📧 Emails de alerta (si > 10 errores/min):
  config/alerts.ts

💬 Slack notifications:
  #pedidos-alquiler-alerts

📱 PagerDuty (críticos):
  https://pagerduty.company.com
```

---

## ✅ CHECKLIST FINAL

### Diariamente
- [ ] Verificar status API
- [ ] Revisar error logs
- [ ] Confirmar backups OK
- [ ] Test crear 1 PDF

### Semanalmente
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Review performance logs
- [ ] Backup check
- [ ] Security audit

### Mensualmente
- [ ] Disaster recovery test
- [ ] Performance tuning review
- [ ] Capacity planning
- [ ] Documentation update

---

## 📞 CONTACTOS DE EMERGENCIA

```
CTO:                [nombre] [teléfono]
Backend Lead:       [nombre] [teléfono]
Database Admin:     [nombre] [teléfono]
DevOps:             [nombre] [teléfono]
On-Call:            [nombre] [teléfono rotativo]

Escalation Groups:
  🔴 Critical: cto, backend-lead, devops
  🟠 High: backend-lead, database-admin
  🟡 Medium: support-team, backend
```

---

**Runbook v1.0**  
Última actualización: 10 Enero 2026  
Próxima revisión: 17 Enero 2026  
Responsable: Equipo DevOps/IT
