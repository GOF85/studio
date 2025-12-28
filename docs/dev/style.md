📘 STYLE.MD - Guía de Estilo y Patrones de Desarrollo
Este documento define la "personalidad" del código del proyecto Studio. Actúa como la fuente de la verdad para mantener consistencia visual, arquitectónica y de experiencia de usuario (UX).

1. Stack Tecnológico & Fundamentos
Framework: Next.js (App Router).

Lenguaje: TypeScript (Tipado estricto pero pragmático).

Estilos: Tailwind CSS.

UI Library: Shadcn/UI (Radix Primitives + Tailwind).

Iconos: Lucide React.

Estado Server: Custom Hooks (ej. useRecetas, useElaboraciones) que abstraen la lógica de fetch (React Query/SWR implícito).

Estado Client: URL Search Params (para Tabs, Filtros) > useState (para UI efímera).

2. Arquitectura de Componentes (Patrón "Clean Page")
Estructura del Archivo de Página (page.tsx)
Mantenemos los archivos de página limpios y leíbles siguiendo este orden estricto:

Imports: Ordenados (Librerías externas -> Hooks -> Componentes Globales -> UI Primitives).

Helpers Puros: Funciones auxiliares fuera del componente (ej. formatDate) para no recrearlas en cada render.

Sub-componentes Locales: Si un componente (como RevisionItem) es específico de esa página y no se reutiliza, se define en el mismo archivo antes del componente principal. Esto evita la "contaminación" de carpetas.

Componente Principal (export default):

Hooks y Lógica al principio.

Efectos de UX (Scroll reset).

Manejo de Loading/Error.

JSX limpio y semántico.

Ejemplo de Estructura:
TypeScript

// 1. Imports
import { ... } from '...';

// 2. Helpers
const formatDate = (date) => ...;

// 3. Componentes Locales (Props tipadas)
interface ItemProps { ... }
function Item({ ... }: ItemProps) { return ... }

// 4. Main Page
export default function Page() {
  // Hooks
  // Effects
  // Return
}
3. UX & Comportamiento (La "Firma" del Proyecto)
Cero Redundancia: Si el Breadcrumb ya dice dónde estamos, no ponemos un Título H1 que repita lo mismo. Ganamos espacio vertical.

Scroll Reset: Al navegar entre pestañas o cargar páginas de detalle, forzamos el scroll al inicio (0,0) con behavior: 'instant' para dar sensación de rapidez.

URL Driven UI: El estado de las pestañas (Tabs) y filtros debe reflejarse en la URL (?tab=recetas). Si recargo la página, debo volver al mismo sitio.

Feedback Visual Constante:

Loading: Usar LoadingSkeleton (no spinners genéricos) que imiten la estructura final.

Empty States: Componentes dedicados con iconografía amigable y mensajes claros cuando no hay datos.

Hover: Las tarjetas interactivas deben tener un borde sutil o cambio de sombra al pasar el mouse (hover:border-amber-400).

4. Diseño Visual & Tailwind (Sistema de Diseño)
Paleta Semántica
Primary: Acciones principales.

Muted/Foreground: Textos secundarios y metadatos (fechas, autores).

Acentos & Estados:
- Amber/Orange: "Atención", "Revisión" o "Pendiente". El color ámbar (`amber-100 bg`, `amber-600 text`) es la firma para tareas pendientes.
- Emerald: "Confirmado", "Éxito" o módulos de Previsión (PES).
- Blue: Información técnica, conteo de PAX o metadatos de sistema.
- Orange (Gastronomía): Específico para servicios de comida y métricas de cocina.

Componentes Clave
Tarjetas Interactivas:

Bordes redondeados (rounded-lg).

Borde izquierdo de color para indicar estado (border-l-4 o div absoluto).

Uso de group en Tailwind para animar hijos al hacer hover en el padre.

Badges: Usados para contadores en pestañas. Estilo sutil (variant="secondary").

Sticky Headers & Toolbars: Las barras de herramientas o pestañas deben pegarse arriba (`sticky top-12`) para alinearse con el Breadcrumb global. Usar `backdrop-blur-md` y `bg-background/60` para mantener el contexto.

Alineación y Contenedores (Regla de Oro): La cabecera PREMIUM jamás debe exceder el ancho de la cabecera principal. Todo el contenido debe estar envuelto en la clase `container` o `max-w-7xl mx-auto px-4` de Tailwind para asegurar una alineación vertical perfecta con el logo y los elementos de la navegación superior. No usar márgenes negativos (`-mx-4`) en el contenedor de contenido de la cabecera.

Patrón de Cabecera Minimalista (Standard):
Para maximizar el foco y reducir ruido visual, las cabeceras deben seguir este esquema:
- Icono Identificativo: A la izquierda, dentro de un contenedor con estilo "pill" o caja suave.
- Sin Títulos Redundantes: Si el breadcrumb ya indica la sección, omitimos el H1 y subtítulos.
- Spotlight Expandido: El buscador (`GlobalSearch`) debe ocupar todo el espacio central (`flex-1`) para darle máximo protagonismo.
- Acciones a la Derecha: Botones de acción principal (ej. "+ Nuevo") alineados a la derecha.
- Sin Badges Innecesarios: Evitar contadores o badges que no aporten valor crítico inmediato.

Alineación Global: El cuerpo de las páginas debe usar `pt-0` cuando existe un Breadcrumb pegajoso, asegurando que el contenido comience inmediatamente debajo de la navegación. Para toolbars de ancho completo, el fondo puede ser `w-full`, pero el contenido debe ser `container mx-auto`.

5. Identidad Visual Premium (Glassmorphism & Micro-interacciones)
Para interfaces de alto nivel (Dashboards, Paneles de Control), aplicamos una capa de sofisticación visual:

Glassmorphism:
- Fondo: `bg-card/60` o `bg-background/60`.
- Efecto: `backdrop-blur-md` para profundidad.
- Bordes: `border-border/40` (bordes más suaves y semitransparentes).

Jerarquía y Elevación:
- Sombras Base: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` (suaves y amplias).
- Sombras Hover: `hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]`.
- Sección "Pills": Los encabezados de sección usan un estilo de píldora: `inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10`.

Tablas Premium (Alta Densidad):
- Cabeceras: `bg-muted/30` o `bg-background/60` con `backdrop-blur`. Texto en `font-black text-[10px] uppercase tracking-[0.2em]`.
- Filas: Altura generosa (`h-20` o `py-4`), transiciones suaves (`duration-300`) y estados de selección con bordes laterales (`border-l-4 border-l-primary`).
- Celdas: Uso de `font-mono` para códigos de referencia y `font-bold` para métricas principales.

Micro-interacciones (Feedback Táctil):
- Elevación: `hover:-translate-y-1` con `transition-all duration-500`.
- Escala: `active:scale-[0.98]` para clics.
- Iconos Dinámicos: Uso de `group-hover` para animar iconos (ej. `group-hover:scale-110 group-hover:rotate-3`).
- Glow Effects: Gradientes radiales sutiles en hover para guiar la vista.

Fondos de Página:
- Usar gradientes radiales suaves: `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background`.

6. Buenas Prácticas de Código
Tipado de Props: Siempre definir interfaces para los props de los componentes, incluso los locales.

Navegación Programática: Para elementos complejos (como una tarjeta entera clickeable), usar onClick={() => router.push(...)} en lugar de envolver todo en un Link, para mantener el HTML válido y controlar mejor el área de click.

Extracción de Lógica: La página no debe saber cómo se obtienen los datos, solo debe llamar a useRecetas().

Manejo de Fechas: Usar Intl.DateTimeFormat para formateo local consistente ('es-ES').

7. Checklist de Calidad antes de un Commit
¿La URL refleja el estado actual (tabs/filtros)?

¿He eliminado títulos redundantes que ya están en el Breadcrumb?

¿El scroll se comporta correctamente al cargar?

¿Tengo un estado de "Cargando" y un estado de "Vacío" (Empty State)?

¿He verificado la alineación `top-12` para elementos sticky y `pt-0` para el cuerpo de la página?

¿Los componentes locales están tipados?

¿He aplicado Glassmorphism y micro-interacciones en elementos clave?

Filosofía Final: El código debe ser tan limpio como una cocina profesional. Cada utensilio (función) en su lugar, superficies (UI) despejadas, y preparado para servir (renderizar) rápidamente.