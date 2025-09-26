'use client';

import { Package, BookOpen, Workflow, Factory, ShieldCheck } from "lucide-react";

export default function EntregasManualPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Package className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Manual de Usuario: Entregas MICE</h1>
                    <p className="lead !m-0">Guía de operativa para la vertical de negocio de Entregas.</p>
                </div>
            </div>

            <section id="c1">
                <h2 className="flex items-center gap-3"><BookOpen />Capítulo 1: Concepto General</h2>
                <p>La vertical de "Entregas MICE" está diseñada para gestionar pedidos que no requieren un servicio de catering completo, como la entrega de desayunos, coffee breaks o material a oficinas. El flujo es más directo y se centra en la logística de la entrega.</p>
                <h3>1.1. Acceso a la Vertical</h3>
                <p>Para acceder, haz clic en el botón <strong>"Entregas MICE"</strong> situado en la cabecera principal de la aplicación. Serás dirigido a un nuevo dashboard con una identidad visual propia (naranja y negro) para que siempre sepas que estás en el contexto de entregas.</p>
            </section>

            <section id="c2">
                <h2 className="flex items-center gap-3"><Workflow />Capítulo 2: Creación de un Pedido de Entrega</h2>
                <p>El proceso de creación de un pedido de entrega se centraliza en un único formulario para agilizar la gestión.</p>
                <h3>2.1. Dashboard de Entregas</h3>
                <p>La página principal de la vertical muestra una previsión de todos los pedidos de entrega. Desde aquí puedes crear uno nuevo o editar uno existente.</p>
                <h3>2.2. Formulario de Pedido Único</h3>
                <p>A diferencia de los eventos de catering, aquí no hay módulos separados. En un solo formulario se define:</p>
                <ul>
                    <li><strong>Datos del Cliente y Entrega:</strong> Nº de Pedido, cliente, dirección, fecha y hora de entrega.</li>
                    <li><strong>Confección del Pedido:</strong> Usando un catálogo unificado, puedes buscar y añadir cualquier artículo, ya sea una receta de gastronomía (ej. "Bandeja de Sándwiches"), una bebida, o material de almacén (ej. "Servilletas").</li>
                    <li><strong>Servicios Extra:</strong> Puedes añadir personal (ej. un camarero) si el cliente lo solicita.</li>
                </ul>
            </section>
            
            <section id="c3">
                <h2 className="flex items-center gap-3"><Package />Capítulo 3: Gestión de "Packs de Venta"</h2>
                <p>Para simplificar la venta de productos compuestos, como un "Box de Desayuno", hemos introducido el concepto de "Packs de Venta".</p>
                <h3>3.1. ¿Qué es un Pack de Venta?</h3>
                <p>Es un artículo que se vende como una unidad pero que internamente se desglosa en múltiples componentes para el picking de almacén. Por ejemplo, al añadir 1 "Box de Café", el sistema sabe que debe preparar 50 cápsulas, 10 infusiones, 2 bricks de leche, etc.</p>
                <h3>3.2. Creación y Gestión</h3>
                <p>Desde `Configuración &gt; Bases de Datos &gt; Packs de Venta`, puedes crear nuevos packs, definir su PVP y detallar todos los artículos que lo componen.</p>
            </section>

            <section id="c4">
                <h2 className="flex items-center gap-3"><Factory />Capítulo 4: Producción y Portal del Partner</h2>
                <h3>4.1. Flujo de Producción Automático</h3>
                <p>Al guardar un pedido de entrega, el sistema distribuye las tareas automáticamente:</p>
                <ul>
                    <li>Las elaboraciones asignadas a <strong>CPR MICE</strong> aparecen en el panel de planificación de CPR para su producción interna.</li>
                    <li>Las elaboraciones asignadas al <strong>Partner Externo</strong> aparecen en su portal específico.</li>
                    <li>El resto de artículos (bebidas, consumibles, componentes de packs) se añaden directamente a la hoja de picking del almacén.</li>
                </ul>
                <h3>4.2. Portal del Partner</h3>
                <p>Tu partner de gastronomía tiene un acceso web simplificado donde ve únicamente las elaboraciones que debe producir, las cantidades y la fecha y hora límite de entrega en vuestro centro de producción.</p>
            </section>
            
            <section id="c5">
                <h2 className="flex items-center gap-3"><ShieldCheck />Capítulo 5: Logística, Albaranes y Firma Digital</h2>
                <h3>5.1. Asignación a Transportista</h3>
                <p>Una vez el pedido está preparado, desde la propia OS-E se puede asignar la entrega a un transportista de la base de datos.</p>
                <h3>5.2. Portal del Transportista (App Móvil)</h3>
                <p>El transportista, desde su móvil, accede a un portal donde ve sus entregas del día. Para cada una, tiene una "Hoja de Ruta Digital" con la información de recogida y entrega.</p>
                <h3>5.3. Albarán y Firma Digital</h3>
                <p>Al llegar al cliente, el transportista abre el albarán en su dispositivo. El cliente puede revisar el pedido y firmar con el dedo directamente en la pantalla. Esta firma queda registrada en el sistema y el pedido se marca automáticamente como "Entregado". Se envía una copia del albarán firmado por email tanto al cliente como al comercial.</p>
            </section>
        </>
    );
}
