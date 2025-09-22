'use client';

import { Users, BookOpen, Workflow, Factory, BarChart3 } from "lucide-react";

export default function UserManualPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Users className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Manual de Usuario</h1>
                    <p className="lead !m-0">Guía funcional completa para aprender a utilizar CateringStock.</p>
                </div>
            </div>

            <section id="c1">
                <h2 className="flex items-center gap-3"><BookOpen />Capítulo 1: Primeros Pasos</h2>
                <p>Este capítulo introduce los conceptos básicos de la aplicación, su estructura y cómo empezar a trabajar con ella.</p>
                <h3>1.1. Introducción a CateringStock</h3>
                <p>CateringStock es una herramienta integral para la gestión de servicios de catering, desde la planificación comercial hasta la ejecución en cocina y la logística del evento.</p>
                <h3>1.2. Roles de Usuario</h3>
                <p>La aplicación está diseñada para diferentes perfiles. Dependiendo de tu rol (Comercial, Jefe de Producción, Cocinero, etc.), verás las secciones y opciones relevantes para tu trabajo, simplificando la interfaz y protegiendo la información.</p>
                <h3>1.3. Gestión de Bases de Datos</h3>
                <p>Desde el menú desplegable (icono de menú), puedes acceder a "Bases de Datos" para gestionar toda la información maestra de la empresa: personal, espacios, precios, proveedores, etc. Mantener estos datos actualizados es clave para el buen funcionamiento del sistema.</p>
            </section>

            <section id="c2">
                <h2 className="flex items-center gap-3"><Workflow />Capítulo 2: Flujo Comercial y de Servicios</h2>
                <p>Aprende a crear y gestionar una Orden de Servicio (OS) desde su creación hasta la gestión de sus módulos asociados.</p>
                <h3>2.1. Creación y Gestión de una Orden de Servicio (OS)</h3>
                <p>Todo comienza en "Previsión de Servicios". Desde aquí puedes crear una nueva OS o editar una existente. La ficha de la OS es el centro neurálgico que conecta todos los módulos relacionados con un evento.</p>
                <h3>2.2. El Módulo Comercial: Creando el Briefing</h3>
                <p>Dentro de una OS, el módulo "Comercial" permite detallar cada hito del evento (coffee, almuerzo, cena) con sus horarios y asistentes. Es crucial registrar aquí la **información sobre alergias y dietas especiales** (ej: "3 celiacos, 1 alérgico a marisco") para que cocina reciba el aviso.</p>
                <h3>2.3. Módulos Auxiliares</h3>
                <p>Desde la barra lateral de la OS, puedes acceder a módulos específicos para solicitar material de almacén, bodega, alquiler, transporte, hielo, y registrar gastos atípicos o de decoración.</p>
                <h3>2.4. La Cuenta de Explotación</h3>
                <p>El módulo "Cta. Explotación" ofrece una visión financiera completa del evento, comparando los costes presupuestados con los objetivos y los costes reales para analizar la rentabilidad.</p>
            </section>
            
            <section id="c3">
                <h2 className="flex items-center gap-3"><BookOpen />Capítulo 3: El Corazón de la Cocina: El Book Gastronómico</h2>
                <p>El Book Gastronómico es donde reside toda la inteligencia culinaria de la empresa. Desde aquí se gestionan ingredientes, elaboraciones y recetas finales.</p>
                 <h3>3.1. Gestión de Materia Prima e Ingredientes</h3>
                <p>Define los productos que compras a tus proveedores (Materia Prima ERP) y luego crea los "Ingredientes Internos" que usarás en tus recetas, vinculándolos a su coste y gestionando alérgenos.</p>
                <h3>3.2. Creación y Escandallo de Elaboraciones</h3>
                <p>Una elaboración es una preparación base (ej: una salsa, un caldo, un sofrito). Aquí se define su receta (escandallo), su coste, su **tipo de expedición** (refrigerado, seco) y su método de preparación.</p>
                <h3>3.3. Creación de Recetas</h3>
                <p>Una receta es el plato final. Se construye combinando elaboraciones. Aquí se define el gramaje de cada elaboración por ración, el menaje, las instrucciones de emplatado, el precio de venta recomendado y atributos gastronómicos clave.</p>
            </section>

            <section id="c4">
                <h2 className="flex items-center gap-3"><Factory />Capítulo 4: Planificación y Producción (CPR)</h2>
                <p>Este es el flujo maestro que conecta los pedidos de los eventos con la producción en la cocina central.</p>
                <h3>4.1. Visión General del Ciclo de Producción</h3>
                <p>El ciclo completo es: Agregación de Necesidades &rarr; Orden de Fabricación (OF) &rarr; Producción en Partida &rarr; Control de Calidad &rarr; Picking Logístico &rarr; Servicio en Evento.</p>
                <h3>4.2. Paso 1: La Orden de Fabricación (OF)</h3>
                <p>El sistema consolidará todas las elaboraciones necesarias para los próximos eventos. El Jefe de Cocina revisará esta lista, verá el coste teórico, y generará las Órdenes de Fabricación, asignándolas a una partida y generando un **número de lote único**.</p>
                <h3>4.3. Paso 2: El Proceso en Cocina y Control de Calidad</h3>
                <p>Cada partida tendrá un panel con sus OF pendientes. El cocinero tomará una, cambiará su estado a "En Proceso" y, al finalizar, registrará la **cantidad real producida** para control de mermas. La OF pasará entonces a "Control de Calidad", donde un responsable la validará antes de que esté disponible para logística.</p>
                <h3>4.4. Paso 3: El Picking y la Logística</h3>
                <p>El operario de logística, desde la **"Orden de Picking"** de un evento, verá los "kits de receta" a preparar. Recogerá las elaboraciones (ya con su etiqueta de lote) y las asignará a **contenedores isotérmicos**, indicando qué kit va en qué contenedor para una trazabilidad perfecta.</p>
                <h3>4.5. Paso 4: La Hoja de Pase en el Evento</h3>
                <p>El equipo de sala, desde la OS, consultará la **"Hoja de Pase"** para ver las instrucciones de emplatado, regeneración, **alérgenos** y en qué isotermo se encuentra cada kit de receta, asegurando un servicio eficiente y sin errores.</p>
            </section>
            
            <section id="c5">
                <h2 className="flex items-center gap-3"><BarChart3 />Capítulo 5: Informes y Análisis</h2>
                <p>CateringStock no solo gestiona, sino que también proporciona inteligencia de negocio para tomar decisiones estratégicas.</p>
                <h3>5.1. Informes de Rentabilidad</h3>
                <p>El sistema permitirá analizar la rentabilidad histórica por cliente o tipo de evento para identificar las áreas más rentables del negocio.</p>
                <h3>5.2. Análisis de Producción</h3>
                <p>Se podrán generar informes para analizar las mermas por elaboración, ayudando a optimizar recetas y procesos. También se podrá ver qué recetas son las más utilizadas y cuáles no, para refinar la oferta gastronómica.</p>
                 <h3>5.3. Trazabilidad Inversa y Alertas</h3>
                <p>Ante una incidencia con un lote de producción, el sistema permitirá identificar al instante todas las recetas, eventos e isotermos afectados, y notificar a los responsables.</p>
            </section>
        </>
    );
}
