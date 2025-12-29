# Guía de Optimización: Patrón RPC + Server Components

Esta guía documenta el patrón de arquitectura implementado para reducir los tiempos de carga y mejorar la escalabilidad de la aplicación Mice Catering.

## 1. El Problema: Client-Side Overload
Anteriormente, las páginas realizaban múltiples consultas pesadas desde el cliente (TanStack Query), descargando tablas completas y procesando lógica compleja (como agregaciones de JSONB) en el navegador. Esto causaba:
- Tiempos de carga elevados (LCP pobre).
- Alto consumo de memoria.
- Inconsistencias en el filtrado por roles.

## 2. La Solución: Arquitectura Híbrida

### A. Postgres RPC (Capa de Datos)
Toda la lógica de agregación y filtrado pesado se mueve a funciones SQL en Supabase.
- **Beneficio**: El procesamiento ocurre cerca de los datos. Solo se transfiere el resultado final (KB en lugar de MB).
- **Seguridad**: El RPC puede validar el rol del usuario (`auth.uid()`) y aplicar filtros de `proveedor_id` automáticamente.

**Ejemplo de RPC (`get_dashboard_metrics`):**
```sql
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_start_date timestamptz, p_end_date timestamptz)
RETURNS jsonb AS $$
BEGIN
  -- Lógica de agregación aquí...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### B. Resolución de IDs en Joins
Al unir tablas como `comercial_briefings` o `comercial_ajustes`, siempre se debe considerar que el `os_id` puede ser tanto el UUID (`id`) como el `numero_expediente`.
- **Patrón SQL**: `WHERE b.os_id = e.numero_expediente OR b.os_id = e.id::text`
- **Patrón JS**: `briefings.find(b => b.osId === os.id || b.osId === os.serviceNumber)`

### C. Server Components (Capa de Renderizado)
Las páginas principales (`page.tsx`) se convierten en componentes asíncronos del servidor.
- **Beneficio**: El primer renderizado (First Paint) contiene los datos reales, eliminando estados de "Cargando..." infinitos.
- **SEO**: Mejora la indexación y la velocidad percibida.

**Ejemplo de Implementación (`app/(dashboard)/page.tsx`):**
```tsx
export default async function Page() {
  const supabase = await createClient(); // Helper de servidor
  const { data } = await supabase.rpc('get_dashboard_metrics', { ... });
  
  return <ClientComponent initialData={data} />;
}
```

### C. Hydration (Capa de Cliente)
El componente de cliente recibe los datos iniciales y los usa como `initialData` en TanStack Query.
- **Beneficio**: La aplicación es interactiva inmediatamente, pero mantiene la capacidad de refrescar datos en segundo plano.

**Ejemplo de Hook (`hooks/use-dashboard-metrics.ts`):**
```tsx
export function useDashboardMetrics(initialData?: Metrics) {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async () => { /* fetch via RPC */ },
    initialData,
    staleTime: 1000 * 60 * 5,
  });
}
```

## 3. Checklist para Nuevas Páginas
1. [ ] Identificar consultas pesadas en `use-data-queries.ts`.
2. [ ] Crear un RPC en Supabase que realice los joins y agregaciones necesarios.
3. [ ] Implementar filtrado por `proveedor_id` dentro del RPC si la página es accesible por partners.
4. [ ] Refactorizar la `page.tsx` a Server Component.
5. [ ] Pasar los datos al componente de cliente e hidratar el hook correspondiente.

## 4. UX & Branding
- **Splash Screen**: Implementar mensajes duales (Técnicos para ADMIN, Negocio para Clientes).
- **Mobile First**: En vistas complejas (como el Calendario), priorizar la vista de Agenda en dispositivos móviles.
- **Sticky Headers**: Usar `sticky top-0` (o `top-12` si hay breadcrumbs) con `backdrop-blur` para mantener el contexto durante el scroll.

## 5. Micro-optimizaciones de UI y Lógica de Negocio

### A. Pre-cálculo en useMemo
Para evitar violaciones del hilo principal (>50ms), toda la lógica de transformación de datos (agrupación, conteos, sumas de PAX) debe ocurrir dentro de un `useMemo` antes del renderizado.
- **Regla**: Nunca realizar `.filter()`, `.reduce()` o `.map()` pesados directamente en el JSX.
- **Estructura**: El `useMemo` debe devolver un objeto ya preparado con todas las estadísticas necesarias por grupo/fila.

### B. Memoización de Componentes (React.memo)
En listas largas (PES, Calendario), cada fila o celda debe estar envuelta en `memo`.
- **Beneficio**: Evita re-renderizados en cascada cuando cambia un estado global (como el término de búsqueda o un filtro).
- **Propiedades**: Asegurarse de que las funciones pasadas como props estén envueltas en `useCallback`.

### C. Lógica de Duplicación por Fecha (Briefing-driven)
Los eventos (OS) no deben mostrarse solo por su `startDate`. La lógica correcta es:
1. Iterar sobre los items del `briefing`.
2. Extraer todas las fechas únicas donde hay servicios.
3. Mostrar el evento **una vez por cada día** que tenga servicios.
4. Si no hay servicios definidos, usar el `startDate` como fallback.
5. **Estadísticas por Día**: 
   - El conteo de servicios de gastronomía debe ser específico para la fecha.
   - **Cálculo de PAX**: Para evitar duplicar el PAX en días con múltiples servicios (ej: Desayuno + Almuerzo para los mismos 300 pax), se debe usar el **valor máximo** (`Math.max`) de asistentes entre los servicios de ese día, en lugar de sumarlos.
   - Si no hay servicios ese día, usar el PAX total de la OS como fallback.

### D. Next.js 15 Scroll Behavior
Para evitar el warning `Skipping auto-scroll behavior`, los elementos con `position: fixed` (como SplashScreens o Modales) deben estar contenidos dentro de un elemento con `position: relative` si se renderizan durante la navegación.
