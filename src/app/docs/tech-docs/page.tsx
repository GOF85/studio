'use client';

import { Code, Database, Bot, Workflow, Users, ShieldCheck, BarChart3, Package } from "lucide-react";
import Image from 'next/image';

export default function TechDocsPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Code className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Documentación Técnica</h1>
                    <p className="lead !m-0">Arquitectura, modelo de datos y flujos técnicos de MICE Catering.</p>
                </div>
            </div>

            <section id="c1-tech">
                <h2 className="flex items-center gap-3"><Code />Capítulo 1: Arquitectura General</h2>
                <p>Este capítulo describe la estructura técnica general de la aplicación y las tecnologías utilizadas.</p>
                <h3>1.1. Pila Tecnológica (Tech Stack)</h3>
                <ul>
                    <li><strong>Framework Frontend:</strong> Next.js (con App Router)</li>
                    <li><strong>Lenguaje:</strong> TypeScript</li>
                    <li><strong>UI y Estilos:</strong> React, ShadCN UI, Tailwind CSS</li>
                    <li><strong>Gestión de Estado:</strong> Zustand (para estados globales simples) y React Context/Hooks.</li>
                    <li><strong>Formularios:</strong> React Hook Form con Zod para validación.</li>
                    <li><strong>Funcionalidad IA:</strong> Genkit (Google AI)</li>
                    <li><strong>Almacenamiento de Datos:</strong> `localStorage` del navegador.</li>
                </ul>
                <h3>1.2. Estructura de Carpetas del Proyecto</h3>
                <ul>
                    <li><code>/src/app</code>: Contiene todas las rutas y páginas de la aplicación, siguiendo la convención de Next.js App Router. Cada módulo principal (ej. `cpr`, `book`, `entregas`) tiene su propio `layout.tsx`.</li>
                    <li><code>/src/components</code>: Componentes React reutilizables.</li>
                    <li><code>/src/lib</code>: Utilidades y datos estáticos.</li>
                    <li><code>/src/hooks</code>: Hooks de React personalizados.</li>
                    <li><code>/src/types</code>: Definiciones de tipos de TypeScript para todo el modelo de datos.</li>
                    <li><code>/src/ai</code>: Lógica relacionada con la inteligencia artificial (Genkit).</li>
                    <li><code>/src/app/portal</code>: Nueva sección para las vistas externas de partners y transportistas.</li>
                </ul>
            </section>

             <section id="c2-tech">
                <h2 className="flex items-center gap-3"><Database />Capítulo 2: Modelo de Datos (`/src/types/index.ts`)</h2>
                <p>A continuación se describen las principales entidades de datos y sus relaciones. Todas las definiciones residen en src/types/index.ts.</p>
                
                <h3>Diagrama de Entidad-Relación (Conceptual)</h3>
                <div className="p-4 border rounded-md my-6 bg-secondary/30 text-sm">
                    <p><strong>ServiceOrder (OS)</strong> --1:N--&gt; <strong>GastronomyOrder</strong>, <strong>MaterialOrder</strong>, etc.</p>
                    <p><strong>Receta</strong> --N:M--&gt; <strong>Elaboracion</strong></p>
                    <p><strong>Elaboracion</strong> --N:M--&gt; <strong>IngredienteInterno</strong></p>
                    <p><strong>IngredienteInterno</strong> --N:1--&gt; <strong>IngredienteERP</strong></p>
                    <p><strong>OrdenFabricacion (OF)</strong> --N:1--&gt; <strong>Elaboracion</strong></p>
                    <p><strong>PackDeVenta</strong> --N:M--&gt; <strong>Precio</strong> (artículos de almacén/bodega/bio)</p>
                    <p><strong>PedidoEntrega</strong> es una OS con una `vertical` específica que activa un flujo diferente.</p>
                </div>

                <h3>Entidades Clave</h3>
                <dl>
                    <dt>ServiceOrder</dt>
                    <dd>La entidad central que representa un evento o entrega. El campo `vertical` ('Catering' o 'Entregas') discrimina el flujo de trabajo.</dd>
                    <dt>Receta</dt>
                    <dd>El plato final. Contiene su escandallo (lista de elaboraciones), costes y atributos. Las recetas para "Entregas" se venden por unidades de venta (cajas, bandejas).</dd>
                    <dt>PackDeVenta</dt>
                    <dd>Entidad específica para la vertical "Entregas". Es un producto compuesto (ej. "Box Café") que se vende como una unidad pero se desglosa en múltiples artículos de almacén para el picking.</dd>
                    <dt>OrdenFabricacion</dt>
                    <dd>Actúa como **lote de producción** para una elaboración. Es el núcleo de la trazabilidad en CPR.</dd>
                </dl>
            </section>
            
            <section id="c3-tech">
                <h2 className="flex items-center gap-3"><Package />Capítulo 3: Lógica de la Vertical "Entregas"</h2>
                <p>Esta sección detalla la arquitectura específica de la nueva vertical de negocio.</p>
                <h3>3.1. Formulario de Pedido Único</h3>
                <p>A diferencia de las OS de Catering, las OS de Entrega no usan un sistema de módulos separados. En su lugar, un único formulario gestiona la adición de todos los productos (gastronomía, bebidas, consumibles) a través de un **catálogo unificado** que busca en tiempo real en las bases de datos de Recetas (categoría "Entregas"), Packs de Venta y Precios (Bodega, Bio, Almacén).</p>
                <h3>3.2. Flujo de Guardado Inteligente</h3>
                <p>Al guardar una OS de Entrega, un orquestador de lógica de negocio se activa:</p>
                <ol>
                    <li><strong>Cálculo de Costes y PVP:</strong> Se recupera el coste de producción de cada ítem. Se busca el margen aplicable desde la nueva base de datos "Márgenes por Categoría" y se calcula el PVP final.</li>
                    <li><strong>Desglose de Necesidades:</strong> El sistema desglosa los "Packs de Venta" en sus componentes individuales.</li>
                    <li><strong>Distribución de Tareas:</strong> Las elaboraciones se distribuyen a CPR MICE o al Portal del Partner según el campo `producidoPor`. El resto de artículos (bebidas, consumibles, componentes de packs) se envían directamente a la "Hoja de Picking" del almacén.</li>
                </ol>
                <h3>3.3. Portales Externos</h3>
                <p>Se ha creado una nueva sección `/portal` para dar acceso restringido y con una UI adaptada a partners y transportistas. Estos portales leen los datos relevantes (necesidades de producción, rutas de entrega) y permitirán actualizar estados, desencadenando acciones en el sistema principal (ej. notificaciones por email).</p>
            </section>

            <section id="c4-tech">
                <h2 className="flex items-center gap-3"><Bot />Capítulo 4: Flujos de Inteligencia Artificial (`/ai/flows`)</h2>
                <p>La funcionalidad de IA se gestiona a través de Genkit.</p>
                <h3>4.1. `orderCompletionAssistant`</h3>
                <p>Este flujo recibe una descripción de un evento y devuelve una lista de artículos de alquiler sugeridos con cantidades.</p>
                <h3>4.2. `recipeDescriptionGenerator`</h3>
                <p>Recibe los datos clave de una receta y genera una descripción de marketing atractiva y sugerente para menús y propuestas comerciales.</p>
            </section>

             <section id="c5-tech">
                <h2 className="flex items-center gap-3"><Users />Capítulo 5: Roles y Permisos</h2>
                <p>La aplicación está diseñada para soportar diferentes roles de usuario, cada uno con acceso a las funcionalidades relevantes para su trabajo.</p>
                <ul>
                    <li><strong>Administrador:</strong> Acceso total.</li>
                    <li><strong>Comercial:</strong> Gestión de OS (Catering y Entregas).</li>
                    <li><strong>Jefe de Producción (CPR):</strong> Control total del módulo de producción y calidad.</li>
                    <li><strong>Partner Externo:</strong> Acceso de solo lectura a su portal de producción.</li>
                    <li><strong>Transportista:</strong> Acceso de solo lectura a su portal de entregas y al módulo de firma de albaranes.</li>
                </ul>
            </section>

            <section id="c6-tech">
                <h2 className="flex items-center gap-3"><ShieldCheck />Capítulo 6: Seguridad y Trazabilidad</h2>
                <p>La trazabilidad es un pilar fundamental del sistema de producción.</p>
                <h3>6.1. Lotes de Producción</h3>
                <p>Cada `OrdenFabricacion` actúa como un lote único. Esto permite asociar una producción específica (un día, un cocinero) con su fecha de caducidad y los eventos a los que se sirve.</p>
                <h3>6.2. Trazabilidad Inversa</h3>
                <p>El modelo de datos permitirá una trazabilidad inversa. Ante una incidencia en un lote, el sistema podrá identificar rápidamente todas las recetas, Órdenes de Servicio (eventos/entregas) y contenedores isotérmicos afectados.</p>
                <h3>6.3. Albaranes y Firma Digital</h3>
                <p>La firma del cliente en el portal del transportista se captura como una imagen (data URL) y se almacena asociada al albarán. Esto proporciona una prueba de entrega segura e irrefutable, eliminando la necesidad de papel. El estado del pedido se actualiza atómicamente al guardar la firma.</p>
            </section>

            <section id="c7-tech">
                <h2 className="flex items-center gap-3"><BarChart3 />Capítulo 7: Lógica de Informes</h2>
                <h3>7.1. Productividad</h3>
                <p>El informe de productividad (`/cpr/productividad`) filtra las `OrdenFabricacion` y calcula la diferencia de tiempo entre los timestamps `fechaAsignacion`, `fechaInicioProduccion` y `fechaFinalizacion`.</p>
                <h3>7.2. Cuenta de Explotación</h3>
                <p>Tanto para Catering como para Entregas, este módulo agrega los costes de todos los sub-módulos y los compara con la facturación neta y los objetivos de gasto definidos en plantillas para calcular la rentabilidad del servicio.</p>
            </section>
        </>
    );
}
