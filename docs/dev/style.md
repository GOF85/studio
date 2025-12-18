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

Acentos (Amber/Orange): Usados para estados de "Atención", "Revisión" o "Pendiente". El color ámbar (amber-100 bg, amber-600 text) es la firma para las tareas pendientes.

Componentes Clave
Tarjetas Interactivas:

Bordes redondeados (rounded-lg).

Borde izquierdo de color para indicar estado (border-l-4 o div absoluto).

Uso de group en Tailwind para animar hijos al hacer hover en el padre.

Badges: Usados para contadores en pestañas. Estilo sutil (variant="secondary").

Sticky Headers: Las barras de herramientas o pestañas deben pegarse arriba (sticky top-0) con un backdrop-blur para mantener el contexto al hacer scroll.

5. Buenas Prácticas de Código
Tipado de Props: Siempre definir interfaces para los props de los componentes, incluso los locales.

Navegación Programática: Para elementos complejos (como una tarjeta entera clickeable), usar onClick={() => router.push(...)} en lugar de envolver todo en un Link, para mantener el HTML válido y controlar mejor el área de click.

Extracción de Lógica: La página no debe saber cómo se obtienen los datos, solo debe llamar a useRecetas().

Manejo de Fechas: Usar Intl.DateTimeFormat para formateo local consistente ('es-ES').

6. Checklist de Calidad antes de un Commit
¿La URL refleja el estado actual (tabs/filtros)?

¿He eliminado títulos redundantes que ya están en el Breadcrumb?

¿El scroll se comporta correctamente al cargar?

¿Tengo un estado de "Cargando" y un estado de "Vacío" (Empty State)?

¿Los componentes locales están tipados?

Filosofía Final: El código debe ser tan limpio como una cocina profesional. Cada utensilio (función) en su lugar, superficies (UI) despejadas, y preparado para servir (renderizar) rápidamente.