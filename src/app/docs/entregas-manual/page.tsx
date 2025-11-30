
'use client';

import { Package, BookOpen, Workflow, Factory, ShieldCheck, Users, Bot, BarChart3 } from "lucide-react";

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
                <h2 className="flex items-center gap-3"><BookOpen />Capítulo 1: Concepto General y Flujo de Trabajo</h2>
                <p>La vertical de "Entregas MICE" está diseñada para gestionar pedidos que no requieren un servicio de catering complejo en el lugar del evento, como la entrega de desayunos, coffee breaks, material de oficina o packs de bienvenida. El flujo de trabajo está optimizado para la agilidad, la precisión logística y la comunicación digital.</p>
                <h3>1.1. Acceso a la Vertical</h3>
                <p>En la cabecera principal de la aplicación, junto al logo de MICE Catering, encontrarás un nuevo botón distintivo con el logo de **"Entregas MICE"**. Al hacer clic, serás dirigido a un nuevo dashboard con una identidad visual propia (naranja y negro), asegurando que siempre sepas que estás en el contexto de gestión de entregas.</p>
                <h3>1.2. El Flujo de Vida de una Entrega</h3>
                <p>El proceso completo, desde la venta hasta la confirmación, es un ciclo altamente automatizado:</p>
                <ol>
                    <li><strong>Creación del Pedido:</strong> Un comercial (o un sistema de e-commerce en el futuro) crea un pedido desde un formulario único.</li>
                    <li><strong>Guardado Inteligente:</strong> Al guardar, el sistema calcula costes y PVP, y distribuye automáticamente las tareas de producción a CPR MICE o al Partner Externo.</li>
                    <li><strong>Producción y Consolidación:</strong> El partner y CPR producen sus elaboraciones. El almacén recibe una hoja de picking desglosada con todo lo necesario (componentes de packs, bebidas, consumibles, etc.).</li>
                    <li><strong>Logística y Transporte:</strong> Se asigna un transportista, que gestionará la entrega desde su portal móvil.</li>
                    <li><strong>Entrega y Firma Digital:</strong> El transportista entrega el pedido y recoge la firma del cliente en su dispositivo.</li>
                    <li><strong>Análisis:</strong> La Cuenta de Explotación se actualiza en tiempo real para analizar la rentabilidad del servicio.</li>
                </ol>
            </section>

            <section id="c2">
                <h2 className="flex items-center gap-3"><Workflow />Capítulo 2: El Formulario de Pedido Único</h2>
                <p>A diferencia de la OS de Catering, en "Entregas" toda la gestión se centraliza en un único y potente formulario para maximizar la eficiencia.</p>
                <h3>2.1. Datos de la Entrega</h3>
                <p>La primera sección del formulario recoge los datos esenciales: Nº de Pedido, cliente, contacto, dirección completa, y la fecha y hora exactas de la entrega.</p>
                <h3>2.2. Confección del Pedido: El Catálogo Unificado</h3>
                <p>Esta es la herramienta principal para construir el pedido. En lugar de navegar por módulos, usarás un **único buscador inteligente**. Simplemente empieza a escribir el nombre de lo que buscas:</p>
                <ul>
                    <li>Una receta de gastronomía (ej. "Bandeja de Sándwiches Variados").</li>
                    <li>Un pack de venta (ej. "Box Café Natural").</li>
                    <li>Una bebida (ej. "Coca-Cola Zero").</li>
                    <li>Un consumible (ej. "Servilletas de cóctel").</li>
                </ul>
                <p>El sistema te mostrará los resultados de todas las bases de datos relevantes para que puedas añadir artículos al pedido de forma rápida y sin fricción.</p>
                <h3>2.3. Servicios Extra</h3>
                <p>Aunque el foco es la entrega, el formulario incluye una sección opcional para añadir servicios adicionales como personal (ej. un camarero para el montaje y servicio del coffee break), que se gestionará a través del módulo de Personal Externo.</p>
            </section>

            <section id="c3">
                <h2 className="flex items-center gap-3"><Package />Capítulo 3: El Concepto Clave: Packs de Venta</h2>
                <p>Para simplificar la venta de productos compuestos (como un "Box de Desayuno"), hemos introducido la entidad **"Pack de Venta"**.</p>
                <h3>3.1. ¿Qué es un Pack de Venta?</h3>
                <p>Es un artículo que se vende al cliente como una sola unidad (ej. 1 "Box de Desayuno Completo") pero que, internamente, se desglosa en múltiples componentes para que el almacén sepa exactamente qué preparar. Esto garantiza que no haya olvidos y que el control de stock sea preciso.</p>
                <p className="border-l-4 border-primary pl-4 py-2 bg-secondary/50"><strong>Ejemplo práctico:</strong> Al añadir 1 "Box Café Natural" al pedido, el sistema no le dice al almacén "prepara 1 caja", sino que le indica: "prepara 50 cápsulas de café, 10 infusiones, 2 bricks de leche, 50 vasos, 50 sobres de azúcar...".</p>
                <h3>3.2. Creación y Gestión</h3>
                <p>Puedes crear y gestionar estos packs desde `Configuración &gt; Bases de Datos &gt; Packs de Venta`. Para cada pack, defines su nombre, su PVP (Precio de Venta al Público) y todos los artículos del inventario que lo componen con sus cantidades.</p>
            </section>

            <section id="c4">
                <h2 className="flex items-center gap-3"><Factory />Capítulo 4: Producción y Portal del Partner</h2>
                <h3>4.1. Flujo de Producción Automático</h3>
                <p>Al guardar un pedido de entrega, el sistema distribuye las tareas de forma inteligente basándose en el campo **"Producido por"** de cada elaboración:</p>
                <ul>
                    <li>Las elaboraciones asignadas a <strong>CPR MICE</strong> aparecen en el panel de `Planificación` de CPR, siguiendo el flujo de trabajo estándar de Órdenes de Fabricación (OF).</li>
                    <li>Las elaboraciones asignadas al <strong>Partner Externo</strong> se envían automáticamente a su portal de producción.</li>
                    <li>El resto de artículos (bebidas, consumibles, y los componentes desglosados de los Packs de Venta) se añaden directamente a la **hoja de picking** del almacén para esa OS-E.</li>
                </ul>
                <h3>4.2. Portal del Partner</h3>
                <p>Tu partner de gastronomía accede a una web simplificada (`/portal/partner`) donde ve únicamente las elaboraciones que debe producir, las cantidades y la fecha/hora límite de entrega en vuestro centro de producción. Desde ahí, puede actualizar el estado de cada pedido (`Recibido`, `En Producción`, `Listo para Entrega en CPR`), dándote visibilidad total sobre su progreso.</p>
            </section>

            <section id="c5">
                <h2 className="flex items-center gap-3"><ShieldCheck />Capítulo 5: Logística, Albaranes y Firma Digital</h2>
                <h3>5.1. Asignación al Transportista</h3>
                <p>Una vez el pedido está listo, desde la propia OS-E se puede asignar la entrega a un transportista de la base de datos.</p>
                <h3>5.2. Portal del Transportista (Mobile-First)</h3>
                <p>El transportista, desde su móvil (`/portal/transporte`), accede a un portal donde ve sus entregas del día. Para cada una, tiene una "Hoja de Ruta Digital" con la información de recogida y entrega.</p>
                <h3>5.3. Albarán y Firma Digital</h3>
                <p>Al llegar al cliente, el transportista abre el albarán en su dispositivo. El cliente puede revisar el pedido y **firmar con el dedo directamente en la pantalla**. Esta firma queda registrada en el sistema y el pedido se marca automáticamente como "Entregado".</p>
                <h3>5.4. Comunicaciones Automáticas</h3>
                <p>Para mejorar la experiencia del cliente, el sistema enviará notificaciones automáticas por email en puntos clave:</p>
                <ul>
                    <li><strong>Confirmación del Pedido:</strong> Un resumen del pedido al confirmarlo.</li>
                    <li><strong>Pedido en Ruta:</strong> Un aviso cuando el transportista inicia la entrega.</li>
                    <li><strong>Entrega Completada:</strong> Una copia del albarán firmado digitalmente.</li>
                </ul>
            </section>

            <section id="c6">
                <h2 className="flex items-center gap-3"><BarChart3 />Capítulo 6: Análisis Financiero</h2>
                <h3>6.1. Cuenta de Explotación de Entregas</h3>
                <p>Cada OS-E tiene su propia Cuenta de Explotación. El sistema calcula automáticamente el PVP de cada artículo basándose en su coste y los márgenes definidos en la nueva base de datos **"Márgenes por Categoría"**. Esto permite un análisis de rentabilidad preciso para cada entrega.</p>
                <h3>6.2. Plantillas de Objetivos para Entregas</h3>
                <p>Puedes crear plantillas de objetivos de gasto específicas para la vertical de Entregas, permitiendo un control de costes adaptado a la naturaleza de este tipo de servicio.</p>
            </section>
        </>
    );
}
