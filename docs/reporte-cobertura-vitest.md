# Reporte de Cobertura Vitest


Fecha: 23 de diciembre de 2025

## Resumen Global
- Líneas cubiertas: 58.44%
- Ramas cubiertas: 42.85%
- Funciones cubiertas: 41.02%
- Sentencias cubiertas: 55.9%

## Detalle por archivo

### components/
- ClearLocalStorageButton.tsx: 100% líneas, ramas, funciones
- Migrator.tsx: 90.24% líneas, 84.61% ramas, 75% funciones (líneas no cubiertas: 48-49, 71-73)
- ui/button.tsx: 100% líneas, 66.66% ramas, 100% funciones (línea no cubierta: 44)

### components/__tests__/
- setupTests.ts: 18.18% líneas (líneas no cubiertas: 3-12, 18)

### hooks/
- useModuleData.ts: 80% líneas, 25% ramas, 60% funciones (líneas no cubiertas: 26-30)
- useOS.ts: 80% líneas, 12.5% ramas, 60% funciones (líneas no cubiertas: 28-32)
- useScrollTop.ts: 100% líneas, ramas, funciones

### lib/
- supabase.ts: 100% líneas, 75% ramas, 100% funciones (línea no cubierta: 6)
- utils.ts: 2.27% líneas, 0% ramas, 11.11% funciones (líneas no cubiertas: 10-101)

---

**Archivos y líneas no cubiertas:**
- Migrator.tsx: 48-49, 71-73
- button.tsx: 44
- setupTests.ts: 3-12, 18
- useModuleData.ts: 26-30
- useOS.ts: 28-32
- supabase.ts: 6
- utils.ts: 10-101

---

Para mejorar la cobertura, enfoca los tests en las ramas y funciones no cubiertas indicadas arriba.