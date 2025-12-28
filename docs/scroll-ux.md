
# Scroll UX: Hook useScrollTop

## Descripción
El hook `useScrollTop` asegura que la vista se desplace automáticamente al inicio de la página cada vez que cambia la ruta en Next.js. Mejora la experiencia de usuario en navegación entre módulos y evita que el usuario quede en posiciones intermedias tras cambios de ruta.

## Instalación
El hook ya está disponible en `hooks/useScrollTop.ts`.

## Uso
1. Importa el hook en tu componente:
   ```tsx
   import { useScrollTop } from '@/hooks/useScrollTop';
   ```
2. Llama al hook dentro del componente:
   ```tsx
   export default function MiModulo() {
     useScrollTop();
     // ...resto del componente
   }
   ```

## Ejemplo completo
```tsx
import { useScrollTop } from '@/hooks/useScrollTop';

export default function DashboardPage() {
  useScrollTop();
  return <div>Contenido...</div>;
}
```

## Ventajas
- UX consistente en todos los módulos.
- No requiere props ni configuración.
- Compatible con Next.js App Router y layouts.

## Recomendaciones
- Úsalo en todos los layouts y páginas principales para máxima efectividad.
- No afecta el rendimiento.

## Troubleshooting
- Si el scroll no se realiza, verifica que el hook se llame dentro de un componente renderizado tras el cambio de ruta.
