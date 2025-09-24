'use client';

import { Users, BookOpen, Workflow, Factory, BarChart3, ShieldCheck } from "lucide-react";

export default function UserManualPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Users className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Manual de Usuario</h1>
                    <p className="lead !m-0">Guía funcional completa para aprender a utilizar MICE Catering.</p>
                </div>
            </div>

            <section id="c1">
                <h2 className="flex items-center gap-3"><BookOpen />Capítulo 1: Primeros Pasos</h2>
                <p>Este capítulo introduce los conceptos básicos de la aplicación, su estructura y cómo empezar a trabajar con ella.</p>
                <h3>1.1. Introducción a MICE Catering</h3>
                <p>MICE Catering es una herramienta integral para la gestión de servicios de catering, desde la planificación comercial hasta la ejecución en cocina y la logística del evento.</p>
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
                <p>Dentro de una OS, el módulo "Comercial" permite detallar cada hito del evento (coffees, almuerzos, cena). Es crucial registrar aquí la **información sobre alergias y dietas especiales** (ej: "3 celiacos") para que cocina reciba el aviso.</p>
                <h3>2.3. Módulos Auxiliares</h3>
                <p>Desde la barra lateral de la OS, puedes acceder a módulos específicos para solicitar material de almacén, bodega, alquiler, transporte, hielo, y registrar gastos atípicos o de decoración. Próximamente, se podrán usar **plantillas de pedidos** para agilizar la creación de solicitudes para servicios estándar (ej. "Coffee Break Básico").</p>
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
                <h2 className="flex items-center gap-3"><Factory />Capítulo 4: Planificación CPR y Producción (El Flujo Maestro)</h2>
                <h3>4.1. Visión General del Ciclo de Producción</h3>
                <p>El ciclo completo es: Agregación de Necesidades &rarr; Orden de Fabricación (OF) &rarr; Producción en Partida &rarr; Control de Calidad &rarr; Picking Logístico &rarr; Servicio en Evento.</p>
                <h3>4.2. Paso 1: Planificación y Generación de OF</h3>
                <p>En el módulo **"Planificación"** de CPR, selecciona un rango de fechas. El sistema calculará automáticamente todas las elaboraciones necesarias y las mostrará en tres vistas: **Matriz de Producción**, **Planificación por Recetas** y **Planificación de Elaboraciones**. Desde la vista de elaboraciones, selecciona las necesidades que quieres producir y genera las Órdenes de Fabricación (OF). El sistema les asignará un número de lote único.</p>
                <h3>4.3. Paso 2: Producción y Control de Calidad</h3>
                <p>En **"Órdenes de Fabricación"**, cada partida verá sus OF pendientes. El cocinero la tomará, cambiará su estado a "En Proceso" y, al finalizar, registrará la **cantidad real producida**. La OF pasará entonces a "Control de Calidad", donde un responsable la validará antes de que esté disponible para logística.</p>
                <h3>4.4. Paso 3: Picking y Etiquetado</h3>
                <p>En **"Picking y Logística"**, selecciona un evento. Verás todos los servicios (hitos) que requieren gastronomía. Dentro de cada hito, podrás asignar las elaboraciones validadas a contenedores isotérmicos. Una vez completado el picking para un hito, podrás generar e imprimir las **etiquetas** para cada contenedor, detallando su contenido y destino.</p>
                <h3>4.5. Paso 4: La Hoja de Pase en el Evento</h3>
                <p>El equipo de sala, desde la OS, consultará la **"Hoja de Pase"** (Próximamente) para ver las instrucciones de emplatado, regeneración, **alérgenos** y en qué isotermo se encuentra cada kit de receta, asegurando un servicio eficiente y sin errores.</p>
            </section>
            
            <section id="c5">
                <h2 className="flex items-center gap-3"><BarChart3 />Capítulo 5: Informes y Análisis</h2>
                <p>MICE Catering no solo gestiona, sino que también proporciona inteligencia de negocio para tomar decisiones estratégicas.</p>
                <h3>5.1. Informe de Productividad</h3>
                <p>Analiza los tiempos de producción por responsable, desde que una OF es asignada hasta que se finaliza. Permite detectar cuellos de botella y optimizar flujos de trabajo.</p>
                <h3>5.2. Gestión de Excedentes</h3>
                <p>Controla el sobrante de producción, ajusta su cantidad real y define su vida útil para facilitar su reaprovechamiento y reducir mermas.</p>
                <h3>5.3. Trazabilidad de Lotes</h3>
                <p>Consulta el historial completo de cualquier lote de producción (OF), desde su creación hasta los eventos en los que fue servido, para una trazabilidad total.</p>
                <h3>5.4. Informe de Incidencias</h3>
                <p>Revisa un listado centralizado de todas las OF que han sido marcadas con incidencias, facilitando su seguimiento y resolución.</p>
            </section>
        </>
    );
}
