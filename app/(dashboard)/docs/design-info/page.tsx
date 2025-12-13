
'use client';

import { Palette, Layers, Type, Layout, Tablet, LayoutDashboard, ClipboardList, Briefcase, Factory, Warehouse, Truck, Users, Package, BarChart3, Settings } from 'lucide-react';

export default function DesignInfoPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Palette className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Información de Diseño y UI</h1>
                    <p className="lead !m-0">Una guía visual y estructural de la interfaz de usuario de la aplicación.</p>
                </div>
            </div>

            <section id="s1">
                <h2 className="flex items-center gap-3"><Layers />1. Sistema de Diseño y Principios Generales</h2>
                <p>La interfaz de la aplicación se construye sobre una base de tecnologías y principios de diseño modernos para garantizar consistencia, mantenibilidad y una estética profesional.</p>
                
                <h3>1.1. Librería de Componentes: Shadcn/ui</h3>
                <p>
                    Utilizamos exclusivamente <strong>Shadcn/ui</strong>. Esto significa que todos los componentes básicos (botones, tarjetas, tablas, diálogos, etc.) provienen de esta librería. No se utilizan otras librerías como Material-UI o Bootstrap. Esto asegura una apariencia y comportamiento coherentes en toda la aplicación. Los componentes están ubicados en <code>src/components/ui</code>.
                </p>
                
                <h3>1.2. Estilos y Layout: Tailwind CSS</h3>
                <p>
                    El layout y los estilos se gestionan con <strong>Tailwind CSS</strong>. Seguimos un enfoque de "utility-first", utilizando clases como <code>p-4</code>, <code>flex</code>, <code>justify-between</code>, etc. El espaciado, los tamaños y los colores se basan en la configuración por defecto de Tailwind, que a su vez se rige por una escala de múltiplos de 4px (ej. `p-4` = 16px).
                </p>

                <h3>1.3. Colores Corporativos</h3>
                <p>La paleta de colores se define con variables CSS HSL en <code>src/app/globals.css</code>, siguiendo el sistema de temas de Shadcn/ui.</p>
                <ul>
                    <li><strong>Tema Principal (MICE Catering):</strong> Verde y blanco suave.
                        <ul>
                            <li><code>--primary</code>: Verde oscuro (#00703C), usado para botones principales, enlaces y elementos de enfoque.</li>
                            <li><code>--background</code>: Blanco suave (#F8F8FF), para los fondos generales.</li>
                            <li><code>--accent</code>: Verde claro (#90EE90), para resaltar elementos interactivos como filas de tabla seleccionadas o fondos sutiles.</li>
                            <li><code>--destructive</code>: Rojo estándar para acciones de borrado o alertas de error.</li>
                        </ul>
                    </li>
                    <li><strong>Tema Vertical de Entregas:</strong> Naranja y negro.
                        <ul>
                            <li>Se activa aplicando la clase <code>theme-orange</code> al contenedor principal.</li>
                            <li><code>--primary</code>: Naranja MICE (#f97316).</li>
                        </ul>
                    </li>
                </ul>

                <h3>1.4. Tipografía</h3>
                <p>La jerarquía tipográfica está definida en <code>src/lib/fonts.ts</code> y se aplica globalmente.</p>
                <ul>
                    <li><strong>Titulares (H1, H2, H3):</strong> Se utiliza la fuente <strong>'Open Sans'</strong> en negrita (<code>font-headline</code>). Los tamaños varían jerárquicamente, desde <code>text-4xl</code> (36px) para títulos de página hasta <code>text-xl</code> (20px) para títulos de tarjetas.</li>
                    <li><strong>Cuerpo de texto:</strong> Se utiliza la fuente <strong>'Roboto'</strong> (<code>font-body</code>) para todo el texto de párrafos, etiquetas y descripciones. El tamaño base es <code>text-sm</code> (14px).</li>
                </ul>
                
                <h3>1.5. Iconografía</h3>
                <p>Todos los iconos provienen de la librería <strong>Lucide React</strong>. Son iconos de línea, con un grosor consistente y esquinas redondeadas, coloreados generalmente con el color primario o <code>muted-foreground</code>.</p>
            </section>

            <section id="s2">
                <h2 className="flex items-center gap-3"><Tablet />2. Análisis Pantalla por Pantalla</h2>
                <p>A continuación, se describe el diseño y la estructura de las pantallas clave de la aplicación.</p>

                <h3 className="flex items-center gap-2 !mt-8"><LayoutDashboard />2.1. Dashboard Principal (`/`)</h3>
                <p>
                    Es la página de inicio. Presenta una estructura de tarjetas (<code>Card</code>) grandes que actúan como accesos directos a los módulos principales.
                </p>
                <ul>
                    <li><strong>Layout:</strong> Un grid responsivo (<code>grid-cols-1 md:grid-cols-2 lg:grid-cols-3</code>) que contiene las tarjetas.</li>
                    <li><strong>Componentes:</strong> Cada tarjeta contiene un <code>CardHeader</code> con un icono de Lucide y un <code>CardTitle</code>, y un <code>CardContent</code> con una breve descripción. El efecto `hover` aumenta la sombra y resalta el borde, invitando a la interacción.</li>
                    <li><strong>Navegación:</strong> Toda la tarjeta está envuelta en un componente <code>&lt;Link&gt;</code> de Next.js.</li>
                </ul>
                
                <h3 className="flex items-center gap-2 !mt-8"><ClipboardList />2.2. Previsión de Servicios (`/pes`)</h3>
                <p>
                    Esta pantalla muestra un listado de todas las Órdenes de Servicio (OS) de Catering.
                </p>
                <ul>
                    <li><strong>Estructura:</strong> Un título principal, seguido de una zona de filtros y una tabla que ocupa el ancho principal.</li>
                    <li><strong>Filtros:</strong> Una combinación de <code>Input</code> con un icono de `Search` para búsqueda de texto, y un <code>Select</code> para filtrar por mes. Un componente <code>Checkbox</code> con `Label` permite incluir eventos pasados.</li>
                    <li><strong>Tabla:</strong> Se utiliza el componente <code>Table</code> de Shadcn. Las filas son interactivas y al hacer clic navegan al detalle de la OS. La columna "Estado" utiliza un componente <code>Badge</code> con colores que dependen del estado (`Confirmado` es verde, `Borrador` amarillo, etc.).</li>
                </ul>
                
                <h3 className="flex items-center gap-2 !mt-8"><Briefcase />2.3. Detalle de Orden de Servicio (Ej: `/os/[id]/comercial`)</h3>
                <p>
                    Esta es una de las vistas más complejas, con un layout de dos columnas en escritorio.
                </p>
                <ul>
                    <li><strong>Layout:</strong> Un grid <code>lg:grid-cols-[280px_1fr]</code>.
                        <ul>
                            <li><strong>Columna Izquierda (Sidebar):</strong> Contiene el menú de navegación de módulos de la OS. Es un <code>&lt;aside&gt;</code> que es pegajoso (<code>sticky</code>). La navegación usa componentes <code>&lt;Link&gt;</code> con un estilo que resalta el elemento activo (`bg-accent`).</li>
                            <li><strong>Columna Derecha (Contenido Principal):</strong> Aquí se renderiza el contenido del módulo seleccionado (ej. el briefing comercial).</li>
                        </ul>
                    </li>
                    <li><strong>Cabecera del Módulo:</strong> Antes del contenido principal, hay una cabecera que muestra el título del módulo actual (ej. "Comercial") y, de forma contextual, un `ObjectiveDisplay` que muestra la rentabilidad objetivo para ese módulo.</li>
                    <li><strong>Componentes Comunes:</strong> Se utilizan `Card`, `Table` y `Accordion` para organizar la información. Por ejemplo, en el módulo Comercial, cada hito del briefing es una fila de una tabla, y la información financiera se agrupa en un `Accordion`.</li>
                </ul>

                <h3 className="flex items-center gap-2 !mt-8"><Factory />2.4. Módulo de Producción - Planificación (`/cpr/planificacion`)</h3>
                <p>
                    Pantalla para la planificación de la producción gastronómica.
                </p>
                <ul>
                    <li><strong>Layout:</strong> Título, zona de filtros de fecha (<code>DatePicker</code> de Shadcn) y una serie de `Accordion` anidados.</li>
                    <li><strong>Estructura:</strong> El primer nivel de `Accordion` agrupa las necesidades por fecha. Dentro de cada fecha, un `Collapsible` agrupa las necesidades por Orden de Servicio.</li>
                    <li><strong>Interacción:</strong> Se utilizan `Checkbox` para seleccionar los artículos a producir. Un botón "Generar OF" se activa cuando hay selecciones, mostrando entre paréntesis el número de OFs que se van a crear.</li>
                </ul>
                
                <h3 className="flex items-center gap-2 !mt-8"><Warehouse />2.5. Módulo de Almacén (Ej: `/os/[id]/almacen`)</h3>
                <p>
                    Similar a otros módulos de OS, pero con un layout de "tarjetas de estado".
                </p>
                <ul>
                    <li><strong>Estructura:</strong> En lugar de una tabla única, la pantalla se divide en tres `Card` principales: "Asignado (Pendiente)", "En Preparación" y "Listo".</li>
                    <li><strong>Componentes:</strong> Cada tarjeta (`StatusCard`) muestra un resumen numérico (Nº de referencias, cantidad de artículos, valoración total) y es clicable, abriendo un `Dialog` modal con el listado detallado de artículos en ese estado.</li>
                    <li><strong>Flujo:</strong> Los pedidos pendientes de material se muestran en la sección inferior y, a medida que se generan Hojas de Picking, "desaparecen" de la vista de pendientes y su estado se refleja en las tarjetas superiores.</li>
                </ul>

                <h3 className="flex items-center gap-2 !mt-8"><Package />2.6. Módulo de Entregas (`/entregas`)</h3>
                <p>
                    Esta vertical tiene su propia identidad visual (`theme-orange`).
                </p>
                <ul>
                    <li><strong>Dashboard (`/entregas`):</strong> Similar al principal, pero con colores naranjas y accesos directos a los submódulos de Entregas (Previsión, Calendario, Picking, etc.).</li>
                    <li><strong>Formulario de Pedido (`/entregas/pedido/[id]`):</strong> Es un formulario de una sola página. La parte principal es un `Accordion` que agrupa "Información General", "Cliente", "Financiero", etc.</li>
                    <li><strong>Confección de Entrega (`/entregas/entrega/[id]`):</strong> Es una vista de dos columnas. A la izquierda, un `UnifiedItemCatalog` permite buscar y añadir productos. A la derecha, un `DeliveryOrderSummary` (Resumen del Pedido) muestra los artículos añadidos y los costes, actualizándose en tiempo real. Esta tarjeta de resumen es `sticky` para estar siempre visible.</li>
                </ul>

                <h3 className="flex items-center gap-2 !mt-8"><Users />2.7. Portales Externos (Ej: `/portal/partner`)</h3>
                <p>
                    Los portales están diseñados para ser extremadamente simples y directos, con una UI minimalista.
                </p>
                <ul>
                    <li><strong>Layout:</strong> Cabecera con el nombre del portal y el nombre del partner (si aplica). El contenido es una lista de tareas (ej. pedidos de producción).</li>
                    <li><strong>Componentes:</strong> Principalmente se usan `Card` y `Table` para presentar la información. Las acciones se realizan a través de `Button` (ej. "Aceptar Pedido") o `Dialog` para acciones más complejas como asignar personal.</li>
                    <li>**Diseño Mobile-First:** El portal de transporte está especialmente pensado para móviles, con una vista de "Hoja de Ruta" simple y un componente de `SignatureCanvas` para la firma digital, que se adapta al ancho del dispositivo.</li>
                </ul>
            </section>
        </>
    );
}
