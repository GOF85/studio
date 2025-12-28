
# Limpieza Final: Borrar LocalStorage

## Descripción
El componente `ClearLocalStorageButton` permite borrar todas las claves de localStorage del navegador con un solo clic. Es útil para realizar un hard reset tras la migración, refactorización de datos o para depuración en desarrollo.

## Instalación
El componente ya está disponible en `components/ClearLocalStorageButton.tsx`.

## Uso
1. Importa el botón en la página donde lo necesites:
   ```tsx
   import ClearLocalStorageButton from '@/components/ClearLocalStorageButton';
   ```
2. Añádelo al JSX:
   ```tsx
   <ClearLocalStorageButton />
   ```

## Ejemplo completo
```tsx
import ClearLocalStorageButton from '@/components/ClearLocalStorageButton';

export default function AdminTools() {
  return (
    <div>
      <h2>Herramientas de administración</h2>
      <ClearLocalStorageButton />
    </div>
  );
}
```

## Ventajas
- Permite un reset rápido y seguro de los datos locales.
- Útil para migraciones, pruebas y debugging.
- Confirmación visual tras borrar.

## Recomendaciones
- Úsalo solo en páginas de administración, migración o debugging.
- No requiere props ni configuración adicional.

## Troubleshooting
- Si el botón no borra datos, verifica que el navegador permita acceso a localStorage y que no haya restricciones de seguridad.
