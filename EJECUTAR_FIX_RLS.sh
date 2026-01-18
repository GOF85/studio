#!/bin/bash

# Instrucciones para ejecutar la migración de RLS

echo "======================================================================"
echo "MIGRACIÓN RLS - OS PANEL"
echo "======================================================================"
echo ""
echo "⚠️  PROBLEMA DETECTADO:"
echo "   Las nuevas columnas del panel (produccion_sala, metre_responsable, etc.)"
echo "   se guardan correctamente en el servidor (service role)"
echo "   pero NO se pueden leer desde el cliente (RLS bloqueando)"
echo ""
echo "📋 SOLUCIÓN:"
echo "   Ejecuta el siguiente SQL en Supabase Dashboard > SQL Editor:"
echo ""
cat /Users/guillermo/mc/studio/migrations/20260116_fix_os_panel_rls.sql
echo ""
echo "======================================================================"
echo "PASOS:"
echo "1. Ve a: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new"
echo "2. Copia y pega el SQL de arriba"
echo "3. Click en 'Run'"
echo "4. Regresa aquí y recarga el panel en el navegador"
echo "======================================================================"
