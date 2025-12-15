#!/bin/bash

# Deploy script for sync-articulos fix
# Uso: bash deploy-fix.sh

set -e

echo "🚀 Iniciando deployment del fix..."
echo ""

# Verificar que estamos en la rama correcta
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Rama actual: $BRANCH"

if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    echo "⚠️  No estás en main/master"
    read -p "¿Continuar de todas formas? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Abortado"
        exit 1
    fi
fi

echo ""
echo "📦 Agregando cambios..."
git add app/api/factusol/sync-articulos/route.ts

echo ""
echo "✍️  Escribiendo commit..."
git commit -m "fix: Cambiar de UPSERT a UPDATE+INSERT para evitar constraint conflicts en sincronización"

echo ""
echo "🌍 Subiendo a GitHub..."
git push origin $BRANCH

echo ""
echo "✅ Deploy iniciado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ve a Vercel Dashboard: https://vercel.com/dashboard"
echo "2. Busca tu proyecto"
echo "3. Espera a que aparezca el deployment (status: Building)"
echo "4. Cuando esté ✅ Deployed, prueba en /bd/erp"
echo ""
echo "⏱️  Tiempo estimado: 5-10 minutos"
