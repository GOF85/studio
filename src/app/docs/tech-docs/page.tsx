'use client';

import { Code, Database, Bot, Workflow, Users, ShieldCheck } from "lucide-react";
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
                    <li><strong>Gestión de Estado:</strong> Zustand (para estados globales simples como la carga) y React Context/Hooks.</li>
                    <li><strong>Formularios:</strong> React Hook Form con Zod para validación.</li>
                    <li><strong>Funcionalidad IA:</strong> Genkit (Google AI)</li>
                    <li><strong>Almacenamiento de Datos:</strong> `localStorage` del navegador.</li>
                    <li><strong>(Futuro) Portal de Proveedores:</strong> Se desarrollará una aplicación satélite o una sección segura para que los proveedores de personal gestionen sus asignaciones.</li>
                </ul>
                <h3>1.2. Estructura de Carpetas del Proyecto</h3>
                <ul>
                    <li><code>/src/app</code>: Contiene todas las rutas y páginas de la aplicación, siguiendo la convención de Next.js App Router.</li>
                    <li><code>/src/components</code>: Componentes React reutilizables.
                        <ul>
                            <li><code>/ui</code>: Componentes base de ShadCN.</li>
                            <li><code>/layout</code>: Componentes estructurales como Header.</li>
                        </ul>
                    </li>
                    <li><code>/src/lib</code>: Utilidades, datos estáticos y definiciones.</li>
                    <li><code>/src/hooks</code>: Hooks de React personalizados.</li>
                    <li><code>/src/types</code>: Definiciones de tipos de TypeScript para todo el modelo de datos.</li>
                    <li><code>/src/ai</code>: Lógica relacionada con la inteligencia artificial, incluyendo flujos de Genkit.</li>
                </ul>
            </section>

             <section id="c2-tech">
                <h2 className="flex items-center gap-3"><Database />Capítulo 2: Modelo de Datos (`/src/types/index.ts`)</h2>
                <p>A continuación se describen las principales entidades de datos y sus relaciones. Todas las definiciones residen en <code>src/types/index.ts</code>.</p>
                
                <h3>Diagrama de Entidad-Relación (Conceptual)</h3>
                <p><em>(Este diagrama se irá completando a medida que se construyan los nuevos módulos)</em></p>
                <div className="p-4 border rounded-md my-6 bg-secondary/30">
                    <p><strong>ServiceOrder (OS)</strong> --1:N--&gt; <strong>GastronomyOrder</strong>, <strong>MaterialOrder</strong>, etc.</p>
                    <p><strong>ServiceOrder (OS)</strong> --1:1--&gt; <strong>ComercialBriefing</strong></p>
                    <p><strong>ComercialBriefingItem</strong> contiene un campo de texto para **anotaciones sobre alérgenos**.</p>
                    <p><strong>GastronomyOrder</strong> --1:N--&gt; <strong>GastronomyOrderItem (Receta)</strong></p>
                    <p><strong>Receta</strong> --N:M--&gt; <strong>Elaboracion</strong> (a través de `ElaboracionEnReceta`)</p>
                    <p><strong>Elaboracion</strong> --N:M--&gt; <strong>IngredienteInterno</strong> (a través de `ComponenteElaboracion`)</p>
                    <p><strong>Elaboracion</strong> contiene un campo `tipoExpedicion` ('REFRIGERADO', 'SECO').</p>
                    <p><strong>IngredienteInterno</strong> --N:1--&gt; <strong>IngredienteERP</strong></p>
                    <p><strong>OrdenFabricacion</strong> --N:1--&gt; <strong>Elaboracion</strong> (Define qué producir)</p>
                    <p><strong>OrdenPicking</strong> --N:M--&gt; <strong>Elaboracion</strong> (Define qué "pickear")</p>
                    <p><strong>OrdenPicking</strong> --N:M--&gt; <strong>ContenedorIsotermo</strong> (Define dónde se "pickea")</p>
                </div>

                <h3>Entidades Clave</h3>
                <dl>
                    <dt>ServiceOrder</dt>
                    <dd>La entidad central que representa un evento. Contiene toda la información general, fechas, cliente, espacio y responsables.</dd>
                    <dt>ComercialBriefing</dt>
                    <dd>Almacena la secuencia de hitos o servicios de un evento (coffees, comidas, etc.) con sus horarios y número de asistentes. Cada hito tiene un campo para registrar información sobre alérgenos.</dd>
                    <dt>GastronomyOrder</dt>
                    <dd>Un pedido de producción para un hito gastronómico específico, derivado del briefing. Hereda la información de alérgenos.</dd>
                    <dt>Receta</dt>
                    <dd>El plato final. Contiene su escandallo (lista de elaboraciones), instrucciones de emplatado, costes, y atributos gastronómicos.</dd>
                    <dt>Elaboracion</dt>
                    <dd>Una preparación base que forma parte de una o más recetas. Contiene su propio escandallo de ingredientes y/o otras elaboraciones, y su **tipo de expedición** (Refrigerado, Seco, etc.).</dd>
                    <dt>OrdenFabricacion</dt>
                    <dd>Una orden para producir una cantidad específica de una elaboración. Actúa como **lote de producción** y registra la merma real, el estado (Pendiente, En Proceso, Control Calidad, Finalizado) y la caducidad.</dd>
                    <dt>OrdenPicking</dt>
                    <dd>La hoja de trabajo para logística, que detallará qué elaboraciones (agrupadas por receta) deben ser empaquetadas en qué contenedores (isotermos) para un evento.</dd>
                </dl>
            </section>
            
            <section id="c3-tech">
                <h2 className="flex items-center gap-3"><Bot />Capítulo 3: Flujos de Inteligencia Artificial (`/ai/flows`)</h2>
                <p>La funcionalidad de IA se gestiona a través de Genkit.</p>
                <h3>3.1. `orderCompletionAssistant`</h3>
                <p>Este flujo recibe una descripción de un evento y devuelve una lista de artículos de alquiler sugeridos con cantidades, basándose en el conocimiento general de modelos de lenguaje sobre organización de eventos.</p>
                <h3>3.2. `recipeDescriptionGenerator`</h3>
                <p>Recibe los datos clave de una receta (nombre, sabores, texturas) y genera una descripción de marketing atractiva y sugerente para menús y propuestas comerciales.</p>
            </section>

             <section id="c4-tech">
                <h2 className="flex items-center gap-3"><Users />Capítulo 4: Roles y Permisos</h2>
                <p>El sistema se diseñará para soportar diferentes roles de usuario, cada uno con acceso a las funcionalidades relevantes para su trabajo, simplificando la interfaz y protegiendo datos sensibles.</p>
                <ul>
                    <li><strong>Administrador:</strong> Acceso total.</li>
                    <li><strong>Comercial:</strong> Gestión de OS y briefings. Visión de rentabilidad sin desglose de costes.</li>
                    <li><strong>Jefe de Producción (CPR):</strong> Control total del módulo de producción, costes y calidad.</li>
                    <li><strong>Cocinero (CPR):</strong> Acceso al panel de su partida para gestionar Órdenes de Fabricación.</li>
                    <li><strong>Operario de Logística:</strong> Acceso al módulo de Picking y gestión de isotermos.</li>
                    <li><strong>Metre / Jefe de Pase:</strong> Acceso a la Hoja de Pase para el servicio en el evento.</li>
                    <li>**Proveedor Externo (Futuro):** Acceso a un portal limitado para gestionar la asignación y horas de su personal.</li>
                </ul>
            </section>

            <section id="c5-tech">
                <h2 className="flex items-center gap-3"><ShieldCheck />Capítulo 5: Seguridad y Trazabilidad</h2>
                <p>La trazabilidad es un pilar fundamental del sistema de producción.</p>
                <h3>5.1. Lotes de Producción</h3>
                <p>Cada `OrdenFabricacion` actuará como un lote único. Esto permite asociar una producción específica (un día, un cocinero) con su fecha de caducidad y los eventos a los que se sirve.</p>
                <h3>5.2. Trazabilidad Inversa</h3>
                <p>El modelo de datos permitirá una trazabilidad inversa. Ante una incidencia en un lote, el sistema podrá identificar rápidamente todas las recetas, Órdenes de Servicio (eventos) y contenedores isotérmicos afectados, permitiendo una acción rápida y precisa.</p>
                <h3>5.3. Sistema de Alertas</h3>
                <p>Se contempla un sistema de notificaciones proactivas para comunicar incidencias de lotes a los responsables de los eventos afectados, centralizando la comunicación de crisis.</p>
            </section>
        </>
    );
}
