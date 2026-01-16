#!/bin/bash

# Test Script - OS Control Panel Debugging
# Uso: ./test-control-panel.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       OS Control Panel - Debugging Test Script             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Prerrequisitos:${NC}"
echo "✓ Dev server corriendo en puerto 3001"
echo "✓ Navegador con F12 (Consola) abierta"
echo ""

echo -e "${YELLOW}Test 1: Verificar que loads la página correctamente${NC}"
echo "URL: http://localhost:3001/os/2025-12345/control-panel?tab=espacio"
echo "Buscar en consola:"
echo "  - [OSDetailsLayout] Layout mounted/updated"
echo "  - [OsPanelPage] Rendered with: {osId: \"2025-12345\", activeTab: \"espacio\""
echo ""
read -p "Presiona ENTER después de verificar..."
echo ""

echo -e "${YELLOW}Test 2: Probar cambio de pestaña (Sala)${NC}"
echo "1. Abre consola (F12)"
echo "2. Pulsa botón 'Sala'"
echo "3. Buscar en consola EN ESTE ORDEN:"
echo "  - [OsPanelTabs] handleTabChange triggered: {newTab: \"sala\""
echo "  - [OsPanelTabs] router.push called: {newUrl: \"?tab=sala\""
echo "  - [OsPanelPage] Rendered with: {osId: \"2025-12345\", activeTab: \"sala\""
echo ""
echo -e "${RED}PROBLEMA: Si activeTab sigue siendo 'espacio'${NC}"
echo "  → searchParams no se actualizó"
echo "  → Ver si router.push se ejecutó"
echo ""
read -p "Presiona ENTER después de verificar..."
echo ""

echo -e "${YELLOW}Test 3: Probar Historial${NC}"
echo "1. Pulsa botón 'Historial' (reloj)"
echo "2. Buscar en consola:"
echo "  - [OsPanelPage] Historial button clicked"
echo "  - [HistorialModal] Modal state changed: {isOpen: true"
echo "  - [useOsPanelHistory] Query function called"
echo ""
echo -e "${RED}PROBLEMA: Si modal NO se abre${NC}"
echo "  → Buscar si ves '[HistorialModal]' en consola"
echo "  → Si no lo ves, click no se ejecutó"
echo ""
read -p "Presiona ENTER después de verificar..."
echo ""

echo -e "${YELLOW}Test 4: Probar Export PDF${NC}"
echo "1. Pulsa botón 'Exportar PDF' (documento)"
echo "2. Buscar en consola:"
echo "  - [OsPanelPage] handleExport called: {osId: \"2025-12345\""
echo "  - [OsPanelPage] Fetching export: {exportUrl: \"/api/os/panel/export?osId=2025-12345\""
echo "  - [export/route] Request received: {osId: \"2025-12345\""
echo "  - [export/route] Supabase query result: {found: true"
echo "  - [OsPanelPage] Export response status: {status: 200"
echo "  - [OsPanelPage] Export completed successfully"
echo ""
echo -e "${RED}PROBLEMA: Si export NO se descarga${NC}"
echo "  - Si ves status 200 pero no descarga → Blob inválido"
echo "  - Si ves status 404/500 → Error en API"
echo "  - Si NO ves handleExport → Click no se ejecutó"
echo ""
read -p "Presiona ENTER después de verificar..."
echo ""

echo -e "${YELLOW}Test 5: Verificar que NO hay UUID${NC}"
echo "En TODOS los logs anteriores, buscar:"
echo ""
echo -e "${RED}❌ NO debe aparecer: 8935afe1-48bc-4669-b5c3-a6c4135fcac5${NC}"
echo -e "${RED}❌ NO debe aparecer: otros UUIDs${NC}"
echo ""
echo -e "${GREEN}✓ DEBE aparecer: 2025-12345 (numero_expediente)${NC}"
echo ""
read -p "Presiona ENTER después de verificar..."
echo ""

echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Test Completado!${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Copiar TODOS los logs de consola"
echo "2. Identificar dónde falla el flujo"
echo "3. Compartir logs para diagnóstico preciso"
echo ""
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
