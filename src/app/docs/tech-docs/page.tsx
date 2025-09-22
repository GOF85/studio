'use client';

import { Code, Database, Bot, Workflow } from "lucide-react";
import Image from 'next/image';

export default function TechDocsPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Code className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Documentación Técnica</h1>
                    <p className="lead !m-0">Arquitectura, modelo de datos y flujos técnicos de CateringStock.</p>
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
                </ul>
                <h3>1.2. Estructura de Carpetas del Proyecto</h3>
                <ul>
                    <li><code>/src/app</code>: Contiene todas las rutas y páginas de la aplicación, siguiendo la convención de Next.js App Router.</li>
                    <li><code>/src/components</code>: Componentes React reutilizables.
                        <ul>
                            <li><code>/ui</code>: Componentes base de ShadCN.</li>
                            <li><code>/layout</code>: Componentes estructurales como Header.</li>
                            <li><code>/order</code>, <code>/catalog</code>: Componentes específicos de módulo.</li>
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
                
                <h3>Diagrama de Entidad-Relación (Simplificado)</h3>
                <p><em>(Este diagrama se irá completando a medida que se construyan los nuevos módulos)</em></p>
                <div className="p-4 border rounded-md my-6 bg-secondary/30">
                    <p><strong>ServiceOrder (OS)</strong> --1:N--&gt; <strong>MaterialOrder</strong></p>
                    <p><strong>ServiceOrder (OS)</strong> --1:1--&gt; <strong>ComercialBriefing</strong></p>
                    <p><strong>ComercialBriefing</strong> --1:N--&gt; <strong>ComercialBriefingItem</strong></p>
                    <p><strong>ComercialBriefingItem</strong> --1:1--&gt; <strong>GastronomyOrder</strong></p>
                    <p><strong>GastronomyOrder</strong> --1:N--&gt; <strong>GastronomyOrderItem (Receta)</strong></p>
                    <p><strong>Receta</strong> --N:M--&gt; <strong>Elaboracion</strong></p>
                    <p><strong>Elaboracion</strong> --N:M--&gt; <strong>IngredienteInterno</strong></p>
                    <p><strong>IngredienteInterno</strong> --N:1--&gt; <strong>IngredienteERP</strong></p>
                </div>

                <h3>Entidades Clave</h3>
                <dl>
                    <dt>ServiceOrder</dt>
                    <dd>La entidad central que representa un evento. Contiene toda la información general, fechas, cliente, espacio y responsables.</dd>
                    <dt>ComercialBriefing</dt>
                    <dd>Almacena la secuencia de hitos o servicios de un evento (coffees, comidas, etc.) con sus horarios y número de asistentes.</dd>
                    <dt>GastronomyOrder</dt>
                    <dd>Un pedido de producción para un hito gastronómico específico, derivado del briefing.</dd>
                    <dt>Receta</dt>
                    <dd>El plato final. Contiene su escandallo (lista de elaboraciones), instrucciones de emplatado, costes, y atributos gastronómicos.</dd>
                    <dt>Elaboracion</dt>
                    <dd>Una preparación base que forma parte de una o más recetas. Contiene su propio escandallo de ingredientes y/o otras elaboraciones.</dd>
                    <dt>OrdenFabricacion <em>(Próximamente)</em></dt>
                    <dd>Una orden para producir una cantidad específica de una elaboración. Estará vinculada a un lote, partida y estado.</dd>
                    <dt>OrdenPicking <em>(Próximamente)</em></dt>
                    <dd>La hoja de trabajo para logística, que detalla qué elaboraciones deben ser empaquetadas en qué contenedores para un evento.</dd>
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
        </>
    );
}
