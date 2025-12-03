# Estructura del Proyecto - MICE Catering Studio

## 📁 Estructura de Directorios

```
studio/
├── app/                          ← App Router de Next.js
│   ├── (auth)/                   ← Grupo de rutas de autenticación
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/              ← Grupo de rutas privadas (con Header)
│   │   ├── layout.tsx            ← Layout con Header para todas las rutas privadas
│   │   ├── page.tsx              ← Dashboard principal
│   │   ├── dashboard-page.tsx    ← Componente del dashboard
│   │   │
│   │   ├── admin/                ← Administración
│   │   ├── almacen/              ← Gestión de almacén
│   │   ├── analitica/            ← Analítica y reportes
│   │   ├── atipicos/             ← Casos atípicos
│   │   ├── bd/                   ← Bases de datos (proveedores, artículos, etc.)
│   │   │   ├── articulos/
│   │   │   ├── clientes/
│   │   │   ├── espacios/
│   │   │   ├── ingredientes/
│   │   │   ├── personal/
│   │   │   └── proveedores/
│   │   │
│   │   ├── book/                 ← Book Gastronómico
│   │   │   ├── elaboraciones/
│   │   │   ├── ingredientes/
│   │   │   └── recetas/
│   │   │
│   │   ├── calendario/           ← Calendario de servicios
│   │   ├── configuracion/        ← Configuración general
│   │   │
│   │   ├── control-explotacion/  ← Control de explotación
│   │   │   └── cpr/
│   │   │       └── costeMP/
│   │   │
│   │   ├── cpr/                  ← Centro de Producción
│   │   │   ├── planificacion/
│   │   │   ├── produccion/
│   │   │   └── validacion-horas/
│   │   │
│   │   ├── decoracion/           ← Gestión de decoración
│   │   ├── docs/                 ← Documentación
│   │   ├── ejemplos/             ← Ejemplos y demos
│   │   │
│   │   ├── entregas/             ← Gestión de entregas MICE
│   │   │   ├── pedido/
│   │   │   └── ...
│   │   │
│   │   ├── gastronomia/          ← Gastronomía
│   │   ├── hielo/                ← Gestión de hielo
│   │   ├── migration/            ← Herramientas de migración
│   │   │
│   │   ├── os/                   ← Órdenes de Servicio
│   │   │   ├── [id]/
│   │   │   │   ├── comercial/
│   │   │   │   ├── info/
│   │   │   │   └── ...
│   │   │   └── comercial/
│   │   │
│   │   ├── pedidos/              ← Gestión de pedidos
│   │   ├── personal-mice/        ← Personal MICE
│   │   ├── pes/                  ← Previsión de Servicios
│   │   ├── planificacion-cpr/    ← Planificación CPR
│   │   │
│   │   ├── portal/               ← Portales externos
│   │   │   ├── activity-log/
│   │   │   ├── cliente/
│   │   │   └── ...
│   │   │
│   │   ├── rrhh/                 ← Recursos Humanos
│   │   │   ├── contratos/
│   │   │   ├── nominas/
│   │   │   └── ...
│   │   │
│   │   └── transporte/           ← Gestión de transporte
│   │
│   ├── api/                      ← API Routes
│   │   ├── ai/
│   │   ├── genkit/
│   │   └── ...
│   │
│   ├── favicon.ico
│   ├── globals.css               ← Estilos globales
│   └── layout.tsx                ← Layout raíz (providers globales)
│
├── components/                   ← Componentes reutilizables
│   ├── auth/
│   ├── book/
│   ├── catalog/
│   ├── dashboard/
│   ├── entregas/
│   ├── icons/
│   ├── layout/
│   │   ├── global-loading-indicator.tsx
│   │   ├── header.tsx
│   │   ├── loading-skeleton.tsx
│   │   └── page-loading-indicator.tsx
│   ├── order/
│   ├── os/
│   ├── portal/
│   ├── providers/
│   └── ui/                       ← Componentes UI (shadcn)
│
├── hooks/                        ← Custom React Hooks
│   ├── use-data-store.ts
│   ├── use-impersonated-user.tsx
│   ├── use-loading-store.ts
│   ├── use-supabase.ts
│   ├── use-toast.ts
│   └── ...
│
├── lib/                          ← Utilidades y configuración
│   ├── supabase.ts               ← Cliente de Supabase
│   ├── utils.ts                  ← Utilidades generales
│   ├── constants.ts
│   └── ...
│
├── providers/                    ← Context Providers
│   ├── auth-provider.tsx
│   └── query-provider.tsx
│
├── services/                     ← Servicios externos
│   └── ...
│
├── types/                        ← Definiciones de TypeScript
│   └── index.ts
│
├── ai/                           ← Configuración de AI (Genkit)
│   └── ...
│
├── migrations/                   ← Migraciones de base de datos
│   ├── 001_update_recetas_table.sql
│   ├── 002_create_receta_detalles.sql
│   ├── 003_create_storage_bucket.sql
│   ├── 004_add_elaboraciones_fields.sql
│   └── 005_create_formatos_expedicion.sql
│
├── supabase/                     ← Configuración de Supabase
│   ├── .gitignore
│   └── config.toml
│
├── public/                       ← Archivos estáticos
│
├── middleware.ts                 ← Middleware de Next.js (auth + tenant)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                    ← Variables de entorno

```

## 🔑 Cambios Principales

### 1. **Eliminación de `src/`**
   - Todos los archivos se movieron de `src/*` a la raíz del proyecto
   - Actualizado `tsconfig.json` y `tailwind.config.ts` para reflejar los nuevos paths

### 2. **Organización del App Router**
   - **`(auth)/`**: Rutas públicas de autenticación (login, register, etc.)
   - **`(dashboard)/`**: Rutas privadas que requieren autenticación
     - Incluye su propio `layout.tsx` con el componente `Header`
     - Todas las rutas principales de la aplicación están aquí

### 3. **Layouts Jerárquicos**
   - **`app/layout.tsx`**: Layout raíz con providers globales (Auth, Query, etc.)
   - **`app/(dashboard)/layout.tsx`**: Layout para rutas privadas con Header

### 4. **Middleware de Autenticación**
   - Archivo `middleware.ts` en la raíz
   - Protege todas las rutas excepto `/login`
   - Usa `@supabase/ssr` para gestión de sesiones

### 5. **Limpieza de Archivos**
   - ✅ Eliminados archivos `.sql` de la raíz (movidos a `migrations/`)
   - ✅ Eliminada carpeta `app/analitika` (duplicada/huérfana)
   - ✅ Consolidada toda la analítica en `app/(dashboard)/analitica/`

## 📝 Configuración Actualizada

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/types": ["./types/index.ts"],
      "@/dnd/*": ["./components/dnd/*"]
    }
  }
}
```

### `tailwind.config.ts`
```typescript
{
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ]
}
```

### `middleware.ts`
```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Protección de rutas con Supabase Auth
  // Redirige a /login si no hay sesión
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## 🚀 Comandos de Desarrollo

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar servidor de producción
npm run start

# Linting
npm run lint

# Type checking
npm run typecheck
```

## ✅ Verificación de Build

El proyecto ha sido verificado y **compila correctamente** con `npm run build`.

## 📌 Notas Importantes

1. **Imports**: Todos los imports usan el alias `@/` que apunta a la raíz del proyecto
2. **Rutas Dinámicas**: Los paths con `(auth)` y `(dashboard)` son route groups y no aparecen en la URL
3. **Client Components**: Los componentes que usan hooks deben tener `'use client'` al inicio
4. **Middleware**: Protege automáticamente todas las rutas excepto las públicas

## 🔄 Próximos Pasos Recomendados

1. Revisar y actualizar la documentación en `GEMINI.md`
2. Verificar que todos los enlaces internos funcionen correctamente
3. Probar el flujo de autenticación end-to-end
4. Considerar agregar más route groups si es necesario (ej: `(admin)`, `(public)`)
