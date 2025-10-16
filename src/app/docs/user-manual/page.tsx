
'use client';

import { Users, BookOpen, Workflow, Factory, BarChart3, ShieldCheck, Warehouse, GitBranch } from "lucide-react";

export default function UserManualPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Users className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Manual de Usuario: Catering de Eventos</h1>
                    <p className="lead !m-0">Guía funcional completa para la gestión de servicios de catering complejos.</p>
                </div>
            </div>

            <section id="c1">
                <h2 className="flex items-center gap-3"><BookOpen />Capítulo 1: Primeros Pasos</h2>
                <p>Este capítulo introduce los conceptos básicos de la aplicación, su estructura y cómo empezar a trabajar con ella en el contexto de eventos de catering.</p>
                <h3>1.1. Introducción a MICE Catering</h3>
                <p>MICE Catering es una herramienta integral para la gestión de servicios de catering, desde la planificación comercial hasta la ejecución en cocina y la logística del evento. La aplicación ahora se divide en dos grandes verticales: **Catering de Eventos** (el flujo tradicional) y **Entregas MICE** (un nuevo flujo simplificado para pedidos directos).</p>
                <h3>1.2. Roles de Usuario</h3>
                <p>La aplicación está diseñada para diferentes perfiles. Dependiendo de tu rol (Comercial, Jefe de Producción, Cocinero, etc.), verás las secciones y opciones relevantes para tu trabajo, simplificando la interfaz y protegiendo la información.</p>
                <h3>1.3. Gestión de Bases de Datos</h3>
                <p>Desde el menú de "Configuración", puedes acceder a "Bases de Datos" para gestionar toda la información maestra de la empresa: personal, espacios, precios, proveedores, etc. Mantener estos datos actualizados es clave para el buen funcionamiento del sistema.</p>
            </section>

            <section id="c2">
                <h2 className="flex items-center gap-3"><Workflow />Capítulo 2: Flujo Comercial y de Servicios de Catering</h2>
                <p>Aprende a crear y gestionar una Orden de Servicio (OS) para un evento de catering, desde su creación hasta la gestión de sus módulos asociados.</p>
                <h3>2.1. Creación y Gestión de una Orden de Servicio (OS)</h3>
                <p>Todo comienza en "Previsión de Servicios". Desde aquí puedes crear una nueva OS o editar una existente. La ficha de la OS es el centro neurálgico que conecta todos los módulos relacionados con un evento de catering complejo.</p>
                <h3>2.2. El Módulo Comercial: Creando el Briefing</h3>
                <p>Dentro de una OS, el módulo "Comercial" permite detallar cada hito del evento (coffees, almuerzos, cena). Es crucial registrar aquí la **información sobre alergias y dietas especiales** (ej: "3 celiacos") para que cocina reciba el aviso.</p>
                <h3>2.3. Módulos Auxiliares</h3>
                <p>Desde la barra lateral de la OS, puedes acceder a módulos específicos para solicitar material de almacén, bodega, alquiler, transporte, hielo, y registrar gastos atípicos o de decoración. Próximamente, se podrán usar **plantillas de pedidos** para agilizar la creación de solicitudes para servicios estándar (ej: "Coffee Break Básico").</p>
                <h3>2.4. La Cuenta de Explotación</h3>
                <p>El módulo "Cta. Explotación" ofrece una visión financiera completa del evento, comparando los costes presupuestados con los objetivos y los costes reales para analizar la rentabilidad.</p>
            </section>
            
            <section id="c3">
                <h2 className="flex items-center gap-3"><BookOpen />Capítulo 3: El Corazón de la Cocina: El Book Gastronómico</h2>
                <p>El Book Gastronómico es el motor que calcula los costes, gestiona los alérgenos y asegura la consistencia desde la compra de materia prima hasta el plato que se sirve en el evento. Se organiza en una estructura jerárquica de tres niveles:</p>

                <h4>3.1. Nivel 1: Ingredientes (Materia Prima)</h4>
                <p>Esta es la base de todo. El sistema distingue entre dos conceptos:</p>
                <ul>
                    <li><strong>Materia Prima (ERP):</strong> Refleja cómo compras los productos a tus proveedores. Por ejemplo, "Saco de harina de 25 kg" o "Caja de 12 botellas de aceite". Cada entrada tiene su proveedor y precio de compra.</li>
                    <li><strong>Ingredientes Internos:</strong> Es la capa de abstracción que usa la cocina (ej. "Harina", "Aceite de Oliva"). Cada ingrediente se vincula a un producto de la Materia Prima para obtener su coste por unidad base (kg, litro, etc.).</li>
                </ul>
                <p className="border-l-4 border-primary pl-4 py-2 bg-secondary/50"><strong>¿Por qué esta separación?</strong> Permite una flexibilidad total. Si cambias de proveedor de harina, solo tienes que actualizar el vínculo en el "Ingrediente Interno", y el coste se recalculará automáticamente en todas las recetas que lo usen.</p>
                <p>Además, en el Ingrediente Interno se definen dos datos críticos: el **% de merma** (desperdicio al limpiar/preparar) y los **alérgenos**. Esta información se propaga automáticamente hacia arriba.</p>

                <h4>3.2. Nivel 2: Elaboraciones (Sub-recetas)</h4>
                <p>Una "Elaboración" es cualquier preparación que no es un plato final por sí misma, sino un componente (ej. "Salsa de Tomate", "Masa de Pizza").</p>
                <ul>
                    <li><strong>Composición:</strong> Se construyen combinando Ingredientes Internos.</li>
                    <li><strong>Coste y Alérgenos Automáticos:</strong> El sistema suma el coste de cada ingrediente (ajustado por la merma) y agrega todos sus alérgenos para calcular el coste y el perfil de alérgenos de la elaboración.</li>
                    <li><strong>Datos de Producción:</strong> Se define su partida (Frío, Caliente, Pastelería), las instrucciones y cómo se empaqueta.</li>
                </ul>
                
                <h4>3.3. Nivel 3: Recetas (El Plato Final)</h4>
                <p>La "Receta" es el plato que se vende al cliente y que aparece en las propuestas comerciales (ej. "Lasaña de Berenjenas").</p>
                <ul>
                    <li><strong>Composición:</strong> Se construyen combinando una o más Elaboraciones.</li>
                    <li><strong>Coste y Precio de Venta:</strong> El sistema suma el coste de cada elaboración para obtener el **Coste de Materia Prima** del plato. A partir de ahí, y usando el margen de beneficio definido, calcula el **Precio de Venta** recomendado.</li>
                    <li><strong>Instrucciones y Atributos:</strong> Se añaden las instrucciones finales de emplatado, y se clasifica la receta con información para el equipo comercial (sabor, temporada, tipo de dieta, etc.).</li>
                </ul>

                <p className="font-semibold">Este flujo (`Materia Prima` &rarr; `Ingrediente` &rarr; `Elaboración` &rarr; `Receta`) garantiza un control total y en tiempo real sobre los costes y alérgenos de tu oferta gastronómica.</p>
            </section>

            <section id="c4">
                <h2 className="flex items-center gap-3"><Factory />Capítulo 4: Planificación CPR y Producción (El Flujo Maestro)</h2>
                <h3>4.1. Visión General del Ciclo de Producción</h3>
                <p>El ciclo completo es: Agregación de Necesidades &rarr; Orden de Fabricación (OF) &rarr; Producción en Partida &rarr; Control de Calidad &rarr; Picking Logístico &rarr; Servicio en Evento.</p>
                <h3>4.2. Paso 1: Planificación y Generación de OF</h3>
                <p>En el módulo **"Planificación"** de CPR, selecciona un rango de fechas. El sistema calculará automáticamente todas las elaboraciones necesarias (tanto para eventos de catering como para entregas) y las mostrará en tres vistas: **Matriz de Producción**, **Planificación por Recetas** y **Planificación de Elaboraciones**. Desde la vista de elaboraciones, selecciona las necesidades que quieres producir y genera las Órdenes de Fabricación (OF). El sistema les asignará un número de lote único.</p>
                <h3>4.3. Paso 2: Producción y Control de Calidad</h3>
                <p>En **"Órdenes de Fabricación"**, cada partida verá sus OF pendientes. El cocinero la tomará, cambiará su estado a "En Proceso" y, al finalizar, registrará la **cantidad real producida**. La OF pasará entonces a "Control de Calidad", donde un responsable la validará antes de que esté disponible para logística.</p>
                <h3>4.4. Paso 3: Picking y Etiquetado</h3>
                <p>En **"Picking y Logística"**, selecciona un evento. Verás todos los servicios (hitos) que requieren gastronomía. Dentro de cada hito, podrás asignar las elaboraciones validadas a contenedores isotérmicos. Una vez completado el picking para un hito, podrás generar e imprimir las **etiquetas** para cada contenedor, detallando su contenido y destino.</p>
                <h3>4.5. Paso 4: La Hoja de Pase en el Evento</h3>
                <p>El equipo de sala, desde la OS, consultará la **"Hoja de Pase"** (Próximamente) para ver las instrucciones de emplatado, regeneración, **alérgenos** y en qué isotermo se encuentra cada kit de receta, asegurando un servicio eficiente y sin errores.</p>
            </section>

            <section id="c5">
                <h2 className="flex items-center gap-3"><Warehouse />Capítulo 5: Gestión de Almacén</h2>
                <p>El módulo de Almacén centraliza la logística de todo el material que no es gastronomía (bebida, menaje, consumibles, etc.).</p>
                <h3>5.1. Planificación y Generación de Hojas de Picking</h3>
                <p>De forma similar al CPR, el módulo de **"Planificación"** del almacén agrega todas las necesidades de material para los eventos en un rango de fechas. Desde aquí, se pueden seleccionar los artículos pendientes y generar una o varias **Hojas de Picking**.</p>
                <h3>5.2. Proceso de Picking y Gestión de Incidencias</h3>
                <p>En **"Gestión de Picking"**, el personal de almacén accede a las hojas generadas. Durante la recogida, si la cantidad real no coincide con la solicitada, se registra la diferencia y se puede añadir un comentario. Las hojas finalizadas con discrepancias generan automáticamente una **incidencia**.</p>
                <h3>5.3. Resolución de Incidencias y Mermas</h3>
                <p>En el módulo de **"Incidencias"**, un responsable puede revisar las discrepancias. Tiene dos opciones:</p>
                <ol>
                    <li><strong>Aceptar Merma:</strong> Esta acción **ajusta el pedido original** para reflejar la cantidad real recogida. Este cambio se propaga por toda la aplicación, asegurando que los costes y necesidades futuras sean correctos.</li>
                    <li><strong>Sustituir:</strong> Se puede crear un nuevo pedido con un artículo alternativo para cubrir la necesidad no satisfecha.</li>
                </ol>
                <h3>5.4. Gestión de Retornos</h3>
                <p>Después de un evento, desde el módulo de **"Gestión de Retornos"**, se puede procesar el material devuelto, registrando roturas o pérdidas, lo que también afectará al coste final del servicio.</p>
            </section>

            <section id="c6">
                <h2 className="flex items-center gap-3"><GitBranch />Capítulo 6: Estructura Económica y Operativa</h2>
                <p>La aplicación está diseñada para reflejar la estructura de centros de coste de la empresa, permitiendo un análisis financiero preciso y una imputación de costes correcta.</p>
                <h3>6.1. Cálculo de Rentabilidad en la Cuenta de Explotación</h3>
                <p>La Cta. de Explotación es la herramienta definitiva para entender la salud financiera de cada evento. La rentabilidad se calcula siguiendo estos pasos:</p>
                <ol>
                    <li><strong>Facturación Neta:</strong> Se calcula el total facturado en el briefing comercial y se le restan todas las comisiones (agencias) y cánones (espacios). Este es el ingreso real para MICE Catering.</li>
                    <li><strong>Total Costes Directos:</strong> Se suman todos los costes de los módulos asociados al evento (Gastronomía, Bodega, Personal, Transporte, etc.). La Cta. de Explotación muestra tres versiones de este coste:
                        <ul>
                            <li><strong>Presupuesto:</strong> El coste según los pedidos iniciales.</li>
                            <li><strong>Cierre:</strong> El coste de presupuesto más las pérdidas o mermas registradas en la devolución de material.</li>
                            <li><strong>Real:</strong> Un campo editable para introducir el coste final real si difiere de los anteriores.</li>
                        </ul>
                    </li>
                    <li><strong>Rentabilidad Bruta (Margen Bruto):</strong> Es el primer nivel de beneficio. Se calcula como: <code className="block text-center p-2 bg-muted rounded-md">Facturación Neta - Total de Costes Directos</code></li>
                    <li><strong>Repercusión HQ:</strong> Para cubrir los gastos de estructura (administración, marketing, etc.), se imputa un coste fijo del **25% sobre la Rentabilidad Bruta**. <code className="block text-center p-2 bg-muted rounded-md">Rentabilidad Bruta * 0.25</code></li>
                    <li><strong>Rentabilidad Post-HQ (Beneficio Neto):</strong> Es el resultado final del evento. <code className="block text-center p-2 bg-muted rounded-md">Rentabilidad Bruta - Repercusión HQ</code></li>
                </ol>
                <h3>6.2. Centros de Coste</h3>
                <ul>
                    <li><strong>CPR (Centro de Producción):</strong> Responsable de toda la producción gastronómica (cocineros, director gastronómico). Sus ingresos provienen de las "compras" internas que le hace la unidad de Catering para cada evento. Su objetivo es cubrir sus costes operativos (materia prima, personal, etc.).</li>
                    <li><strong>Catering (Sala y Pase):</strong> Es la unidad que factura al cliente final. Se encarga del servicio en el evento (maîtres, camareros, cocineros de pase). Sus costes son el personal, la gastronomía (que le compra a CPR), bebidas, transporte, etc.</li>
                    <li><strong>Almacén:</strong> Centro logístico para material no gastronómico. Se financia a través de un % de cada referencia servida y por los servicios de transporte. Cubre sus propios gastos de personal, mantenimiento y reposición.</li>
                    <li><strong>HQ (Administración):</strong> Engloba los departamentos transversales (administración, marketing, etc.). Se financia con un 25% de la rentabilidad final de cada evento para cubrir sus gastos operativos.</li>
                </ul>
                 <h3>6.3. Flujo de Personal y RRHH</h3>
                <p>El responsable de producción de un evento propone una necesidad de personal (ej: 10 camareros) basada en ratios estándar. RRHH recibe esta propuesta, la valida, y es el departamento con la autoridad final para asignar el personal interno o solicitarlo a ETTs, optimizando los recursos de la empresa a nivel global.</p>
            </section>
            
            <section id="c7">
                <h2 className="flex items-center gap-3"><BarChart3 />Capítulo 7: Informes y Análisis</h2>
                <p>MICE Catering no solo gestiona, sino que también proporciona inteligencia de negocio para tomar decisiones estratégicas.</p>
                <h3>7.1. Informe de Productividad</h3>
                <p>Analiza los tiempos de producción por responsable, desde que una OF es asignada hasta que se finaliza. Permite detectar cuellos de botella y optimizar flujos de trabajo.</p>
                <h3>7.2. Gestión de Excedentes</h3>
                <p>Controla el sobrante de producción, ajusta su cantidad real y define su vida útil para facilitar su reaprovechamiento y reducir mermas.</p>
                <h3>7.3. Trazabilidad de Lotes</h3>
                <p>Consulta el historial completo de cualquier lote de producción (OF), desde su creación hasta los eventos en los que fue servido, para una trazabilidad total.</p>
                <h3>7.4. Informe de Incidencias</h3>
                <p>Revisa un listado centralizado de todas las OF que han sido marcadas con incidencias, facilitando su seguimiento y resolución.</p>
            </section>
        </>
    );
}
