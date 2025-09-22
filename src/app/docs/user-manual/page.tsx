'use client';

import { Users, BookOpen, Workflow, BookHeart, Factory, LifeBuoy } from "lucide-react";

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
                <p>Este capítulo introduce los conceptos básicos de la aplicación y cómo empezar a trabajar con ella.</p>
                <h3>1.1. Introducción a CateringStock</h3>
                <p>CateringStock es una herramienta integral para la gestión de servicios de catering, desde la planificación comercial hasta la ejecución en cocina y la logística del evento.</p>
                <h3>1.2. Navegación y Estructura General</h3>
                <p>La aplicación se organiza en varios módulos principales accesibles desde el menú de cabecera: Previsión de Servicios, Calendario, Book Gastronómico, Planificación CPR y Documentación.</p>
                <h3>1.3. Gestión de Bases de Datos</h3>
                <p>Desde el menú desplegable (icono de menú), puedes acceder a "Bases de Datos" para gestionar toda la información maestra de la empresa: personal, espacios, precios, proveedores, etc.</p>
            </section>

            <section id="c2">
                <h2 className="flex items-center gap-3"><Workflow />Capítulo 2: Flujo Comercial y de Servicios</h2>
                <p>Aprende a crear y gestionar una Orden de Servicio (OS) desde su creación hasta la gestión de sus módulos asociados.</p>
                <h3>2.1. Creación y Gestión de una Orden de Servicio (OS)</h3>
                <p>Todo comienza en "Previsión de Servicios". Desde aquí puedes crear una nueva OS o editar una existente. La ficha de la OS es el centro neurálgico que conecta todos los módulos relacionados con un evento.</p>
                <h3>2.2. El Módulo Comercial: Creando el Briefing</h3>
                <p>Dentro de una OS, el módulo "Comercial" permite detallar cada hito del evento (coffee, almuerzo, cena) con sus horarios, asistentes y necesidades específicas.</p>
                <h3>2.3. Módulos Auxiliares</h3>
                <p>Desde la barra lateral de la OS, puedes acceder a módulos específicos para solicitar material de almacén, bodega, alquiler, transporte, hielo, y registrar gastos atípicos o de decoración.</p>
            </section>
            
            <section id="c3">
                <h2 className="flex items-center gap-3"><BookHeart />Capítulo 3: El Corazón de la Cocina: El Book Gastronómico</h2>
                <p>El Book Gastronómico es donde reside toda la inteligencia culinaria de la empresa. Desde aquí se gestionan ingredientes, elaboraciones y recetas finales.</p>
                 <h3>3.1. Gestión de Materia Prima e Ingredientes</h3>
                <p>Define los productos que compras a tus proveedores (Materia Prima ERP) y luego crea los "Ingredientes Internos" que usarás en tus recetas, vinculándolos a su coste y gestionando alérgenos.</p>
                <h3>3.2. Creación y Escandallo de Elaboraciones</h3>
                <p>Una elaboración es una preparación base (ej: una salsa, un caldo, un sofrito). Aquí se define su receta (escandallo), su coste y su método de preparación.</p>
                <h3>3.3. Creación de Recetas</h3>
                <p>Una receta es el plato final que se sirve al cliente. Se construye combinando una o más elaboraciones, se define su gramaje, menaje, instrucciones de emplatado y precio de venta recomendado.</p>
            </section>

            <section id="c4">
                <h2 className="flex items-center gap-3"><Factory />Capítulo 4: Planificación CPR y Producción</h2>
                <p>Este es el flujo maestro que conecta los pedidos de los eventos con la producción en la cocina central.</p>
                 <h3>4.1. Visión General del Ciclo de Producción</h3>
                <p>El ciclo completo es: Agregación de Necesidades -> Orden de Fabricación -> Producción en Partida -> Control de Calidad -> Picking Logístico -> Servicio en Evento.</p>
                <h3>4.2. Paso 1: La Orden de Fabricación (OF)</h3>
                <p>El sistema consolidará todas las elaboraciones necesarias para los próximos eventos. El Jefe de Cocina revisará esta lista y generará las Órdenes de Fabricación, asignándolas a una partida (Frío, Caliente, Pastelería).</p>
                <h3>4.3. Paso 2: El Proceso en Cocina</h3>
                <p>Cada partida tendrá un panel con sus OF pendientes. El cocinero tomará una OF, cambiará su estado a "En Proceso" y, al finalizar, registrará la cantidad real producida para control de mermas, pasando la OF a "Control de Calidad".</p>
                <h3>4.4. Paso 3: El Picking y la Logística</h3>
                <p>Una vez una OF está aprobada, la elaboración está disponible para el picking. El operario de logística, desde la OS, accederá a la "Orden de Picking", que agrupará las elaboraciones por receta. El operario asignará cada "kit de receta" a un contenedor isotérmico, dejando registro de qué hay en cada contenedor.</p>
                 <h3>4.5. Paso 4: El Servicio en el Evento</h3>
                <p>El equipo de sala, desde la OS, consultará la "Hoja de Pase" para ver las instrucciones de emplatado, regeneración, alérgenos y en qué isotermo se encuentra cada kit de receta.</p>
            </section>
        </>
    );
}
