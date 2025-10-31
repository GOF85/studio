
'use client';

import { Info, Palette, Database, GitBranch, Workflow, Package, Factory, ShieldCheck, BarChart3, Users, Code, BookOpen, Warehouse, AreaChart } from "lucide-react";

export default function InfoIAPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Info className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Info IA: Documentación Integral del Proyecto</h1>
                    <p className="lead !m-0">Guía maestra con toda la información relevante del proyecto para desarrollo y consulta.</p>
                </div>
            </div>

            <section id="c1">
                <h2 className="flex items-center gap-3"><Workflow />Arquitectura y Flujos de Trabajo</h2>
                <p>La plataforma se divide en dos verticales de negocio principales, cada una con su propio flujo operativo, pero compartiendo bases de datos y módulos de producción.</p>
                
                <h3>1.1. Vertical: Catering de Eventos</h3>
                <p>Diseñada para eventos complejos que requieren servicio in situ.</p>
                <ol>
                    <li><strong>Previsión de Servicios (PES):</strong> Creación de una Orden de Servicio (OS) que actúa como contenedor principal del evento.</li>
                    <li><strong>Módulo Comercial:</strong> Se define el briefing del evento con múltiples hitos (servicios como cocktail, cena, etc.).</li>
                    <li><strong>Módulos de Pedidos:</strong> Desde la OS, se generan pedidos para los distintos departamentos: Gastronomía, Bodega, Almacén, Alquiler, Personal, etc.</li>
                    <li><strong>Producción (CPR):</strong> Las necesidades de gastronomía se planifican y se convierten en Órdenes de Fabricación (OF).</li>
                    <li><strong>Logística (Almacén):</strong> El material no gastronómico se prepara a través de Hojas de Picking.</li>
                    <li><strong>Servicio:</strong> Ejecución del evento.</li>
                    <li><strong>Cierre:</strong> Gestión de retornos de material y análisis de rentabilidad en la Cuenta de Explotación.</li>
                </ol>

                <h3>1.2. Vertical: Entregas MICE</h3>
                <p>Optimizada para pedidos de entrega directa sin servicio complejo (ej. coffee breaks, desayunos a oficinas).</p>
                <ol>
                    <li><strong>Creación de Pedido de Entrega:</strong> Un formulario único y ágil centraliza toda la información.</li>
                    <li><strong>Confección del Pedido:</strong> Se utilizan "Packs de Venta" o productos individuales de un catálogo unificado.</li>
                    <li>**Distribución Automática:** El sistema envía las necesidades de producción a CPR o a un Partner Externo, y las de material al Almacén.</li>
                    <li>**Portales Externos:** Los partners (producción, transporte) gestionan sus tareas desde portales web simplificados.</li>
                    <li>**Entrega y Firma Digital:** El transportista completa la entrega y recoge la firma del cliente en su dispositivo móvil.</li>
                    <li>**Análisis:** Rentabilidad analizada en una Cta. de Explotación específica para la entrega.</li>
                </ol>

                <h3>1.3. Módulo de Control de Explotación</h3>
                <p>Una nueva sección de alto nivel para analizar la rentabilidad de las unidades de negocio de forma aislada.</p>
                <ul>
                    <li><strong>Control de Explotación CPR:</strong> Trata al Centro de Producción como una unidad de negocio independiente, calculando sus ingresos (márgenes sobre recetas vendidas, cesión de personal) y sus gastos (materia prima, personal propio, costes fijos) para determinar su beneficio neto.</li>
                </ul>
            </section>

            <section id="c2">
                <h2 className="flex items-center gap-3"><Palette />Identidad Visual</h2>
                <h3>2.1. Colores Corporativos</h3>
                <p>La aplicación utiliza dos temas de color principales definidos en `src/app/globals.css`.</p>
                <ul>
                    <li><strong>Tema Principal (MICE Catering - Verde):</strong>
                        <ul>
                            <li>`--primary`: <code className="text-primary">151 100% 22%</code> (Verde oscuro)</li>
                            <li>`--primary-foreground`: <code className="text-primary-foreground bg-primary">151 100% 92%</code> (Verde muy claro)</li>
                            <li>`--accent`: <code className="text-accent-foreground" style={{backgroundColor: 'hsl(var(--accent))'}}>120 73% 75%</code> (Verde pastel)</li>
                        </ul>
                    </li>
                    <li><strong>Tema Secundario (Entregas MICE - Naranja):</strong>
                        <ul>
                            <li>`--primary`: <code style={{color: 'hsl(60 9.1% 97.8%)', backgroundColor: 'hsl(24.6 95% 53.1%)'}}>24.6 95% 53.1%</code> (Naranja)</li>
                        </ul>
                    </li>
                </ul>
                <h3>2.2. Tipografía</h3>
                <p>Se utilizan dos fuentes principales de Google Fonts, definidas en `src/lib/fonts.ts`.</p>
                <ul>
                    <li><strong>Titulares (`--font-headline`):</strong> Open Sans</li>
                    <li><strong>Cuerpo de texto (`--font-body`):</strong> Roboto</li>
                </ul>
            </section>

            <section id="c3">
                <h2 className="flex items-center gap-3"><Database />Glosario Completo de Entidades de Datos</h2>
                <p>A continuación se detallan todas las interfaces y tipos de datos que conforman el modelo de la aplicación, definidos en <code>src/types/index.ts</code>.</p>
                
                <h3 className="!mt-8">Entidades Fundamentales</h3>

                <h4>ServiceOrder / Entrega</h4>
                <p>Es la entidad central que representa un evento de catering o un pedido de entrega. Funciona como el contenedor principal para toda la información relacionada con un servicio.</p>
                <ul>
                    <li><code>id</code>: Identificador único.</li>
                    <li><code>serviceNumber</code>: Número de servicio o pedido, visible para el cliente.</li>
                    <li><code>startDate</code>, <code>endDate</code>: Fechas de inicio y fin del evento.</li>
                    <li><code>client</code>, <code>finalClient</code>: Cliente que contrata y cliente final que recibe el servicio.</li>
                    <li><code>contact</code>, <code>phone</code>, <code>email</code>: Datos de contacto principal.</li>
                    <li><code>asistentes</code>: Número de personas para el evento.</li>
                    <li><code>space</code>, <code>spaceAddress</code>, etc.: Información detallada del lugar del evento.</li>
                    <li><code>resp...</code>: Campos para los diferentes responsables internos (Metre, Pase, Cocina, etc.).</li>
                    <li><code>comercialAsiste</code>, <code>rrhhAsiste</code>: Banderas para indicar si personal de estos departamentos asiste.</li>
                    <li><code>agencyPercentage</code>, <code>spacePercentage</code>, etc.: Campos para el cálculo de comisiones y cánones.</li>
                    <li><code>facturacion</code>, <code>comisionesAgencia</code>, <code>comisionesCanon</code>: Totales financieros calculados.</li>
                    <li><code>status</code>: Estado actual del servicio ('Borrador', 'Confirmado', etc.).</li>
                    <li><code>vertical</code>: Distingue entre 'Catering' y 'Entregas'.</li>
                    <li><code>isVip</code>: Marca un evento como de alta importancia.</li>
                </ul>

                <h4>ComercialBriefing / PedidoEntrega</h4>
                <p>Representa el desglose de servicios (hitos) dentro de una OS de Catering o las entregas de un pedido de la vertical de Entregas.</p>
                <ul>
                    <li><code>osId</code>: Vincula el briefing al `ServiceOrder` correspondiente.</li>
                    <li><code>items</code> / <code>hitos</code>: Un array de objetos `ComercialBriefingItem` o `EntregaHito`, donde cada uno es un servicio (ej. "Cocktail de Bienvenida", "Almuerzo de Trabajo").</li>
                </ul>

                <h4>ComercialBriefingItem / EntregaHito</h4>
                <p>Define un servicio o entrega específica dentro de un evento.</p>
                <ul>
                    <li><code>id</code>: Identificador único del hito.</li>
                    <li><code>fecha</code>, <code>horaInicio</code>, <code>horaFin</code>: Temporalidad del servicio.</li>
                    <li><code>conGastronomia</code>: Booleano que indica si este hito requiere preparación de comida, activando los módulos de producción.</li>
                    <li><code>descripcion</code>: Nombre del servicio (ej. "Cena de Gala").</li>
                    <li><code>asistentes</code>: Pax específicos para este servicio.</li>
                    <li><code>items</code>: (Solo en `EntregaHito`) Array de productos de venta directa para la entrega.</li>
                </ul>

                <h4 className="!mt-6">Personal (Interno)</h4>
                <p>Representa a los empleados y contactos internos de MICE Catering. Fundamental para la asignación de responsabilidades y el cálculo de costes de personal.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm my-4">
                        <thead>
                            <tr className="bg-muted">
                                <th className="p-2 text-left">Campo</th>
                                <th className="p-2 text-left">Tipo</th>
                                <th className="p-2 text-left">Descripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="p-2 font-mono"><strong>`id`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">Identificador único del empleado, generado automáticamente.</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`nombre`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">Nombre de pila del empleado.</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`apellidos`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">Apellidos del empleado.</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`iniciales`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">Iniciales del empleado (ej. "JP"). Se auto-genera si no se proporciona.</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`departamento`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">El departamento al que pertenece (Sala, Cocina, CPR, Comercial, etc.).</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`categoria`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">El puesto o categoría profesional (ej. "Jefe de Cocina", "Camarero").</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`telefono`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">Número de teléfono de contacto.</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`mail`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">Dirección de correo electrónico.</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`dni`</strong></td><td className="p-2 font-mono">`string`</td><td className="p-2">DNI o documento de identidad.</td></tr>
                            <tr><td className="p-2 font-mono"><strong>`precioHora`</strong></td><td className="p-2 font-mono">`number`</td><td className="p-2">El coste por hora del empleado para la empresa, usado en la Cta. de Explotación.</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <h3 className="!mt-8">Entidades del Book Gastronómico</h3>

                <h4>Receta</h4>
                <p>El plato final que se vende al cliente. Se compone de una o más `ElaboracionEnReceta`.</p>
                <ul>
                    <li><code>id</code>, <code>nombre</code>, <code>categoria</code>: Identificación básica.</li>
                    <li><code>elaboraciones</code>: Array de las elaboraciones necesarias para hacer la receta.</li>
                    <li><code>menajeAsociado</code>: Lista del menaje necesario para servir una ración.</li>
                    <li><code>instrucciones...</code>, <code>fotos...</code>: Pasos detallados para mise en place, regeneración y emplatado.</li>
                    <li><code>perfilSaborPrincipal</code>, <code>perfilTextura</code>, etc.: Atributos gastronómicos para clasificación y búsqueda.</li>
                    <li><code>costeMateriaPrima</code>, <code>precioVenta</code>: Campos calculados automáticamente.</li>
                    <li><code>alergenos</code>: Lista consolidada de todos los alérgenos presentes.</li>
                    <li><code>requiereRevision</code>: Bandera que se activa si un componente se modifica o elimina.</li>
                </ul>
                
                <h4>Elaboracion</h4>
                <p>Una preparación intermedia o "sub-receta" (ej. una salsa, una guarnición). Se compone de `ComponenteElaboracion`.</p>
                <ul>
                    <li><code>id</code>, <code>nombre</code>: Identificación.</li>
                    <li><code>produccionTotal</code>, <code>unidadProduccion</code>: Cantidad que se produce con la receta descrita (ej. 1 KILO).</li>
                    <li><code>partidaProduccion</code>: Departamento de cocina que la realiza (FRIO, CALIENTE, etc.).</li>
                    <li><code>componentes</code>: Array de ingredientes o sub-elaboraciones que la componen.</li>
                    <li><code>costePorUnidad</code>: Coste calculado por unidad de producción.</li>
                    <li><code>formatoExpedicion</code>: Cómo se empaqueta para su envío (ej. "Barqueta 1kg").</li>
                </ul>

                <h4>IngredienteInterno</h4>
                <p>Representa un ingrediente utilizado en las elaboraciones. Actúa como puente entre la Materia Prima (ERP) y las recetas.</p>
                <ul>
                    <li><code>id</code>, <code>nombreIngrediente</code>: Identificación.</li>
                    <li><code>productoERPlinkId</code>: Vínculo al producto correspondiente en la base de datos de materia prima (ERP).</li>
                    <li><code>mermaPorcentaje</code>: % de merma del ingrediente al ser procesado.</li>
                    <li><code>alergenosPresentes</code>, <code>alergenosTrazas</code>: Listados de alérgenos.</li>
                </ul>

                <h4>ArticuloERP</h4>
                <p>Representa la materia prima tal como se compra al proveedor.</p>
                <ul>
                    <li><code>id</code>, <code>nombreProductoERP</code>, <code>idProveedor</code>: Identificación del producto y su proveedor.</li>
                    <li><code>precioCompra</code>, <code>unidad</code>: Coste de adquisición y unidad de medida (KILO, LITRO, etc.).</li>
                    <li><code>unidadConversion</code>: Factor de conversión para calcular el precio por unidad base (ej: un saco de 25kg tiene una `unidadConversion` de 25).</li>
                </ul>

                <h3 className="!mt-8">Entidades de Producción y Logística (CPR y Almacén)</h3>

                <h4>OrdenFabricacion (OF)</h4>
                <p>Un lote de producción para una elaboración específica. Se genera desde la pantalla de planificación de CPR.</p>
                <ul>
                    <li><code>id</code>: Identificador único del lote (ej. "OF-2024-001").</li>
                    <li><code>elaboracionId</code>, <code>elaboracionNombre</code>: Qué se va a producir.</li>
                    <li><code>cantidadTotal</code>, <code>cantidadReal</code>: Cantidad planificada vs. cantidad final producida.</li>
                    <li><code>estado</code>: Ciclo de vida de la producción ('Pendiente', 'En Proceso', 'Finalizado', 'Validado', 'Incidencia').</li>
                    <li><code>osIDs</code>: Array de IDs de las OS que necesitan esta producción.</li>
                    <li><code>responsable</code>, <code>responsableCalidad</code>: Personas asignadas.</li>
                </ul>

                <h4>PickingSheet</h4>
                <p>Documento digital para la preparación de material no gastronómico (Almacén, Bodega, Bio, Alquiler).</p>
                <ul>
                    <li><code>id</code>: Identificador de la hoja de picking.</li>
                    <li><code>osId</code>, <code>fechaNecesidad</code>: Para qué evento y cuándo se necesita.</li>
                    <li><code>items</code>: Listado de `OrderItem` a recoger.</li>
                    <li><code>status</code>: Estado de la preparación ('Pendiente', 'En Proceso', 'Listo').</li>
                    <li><code>itemStates</code>: Registro del progreso (qué está chequeado, cantidades recogidas, incidencias).</li>
                </ul>
                
                <h4>PickingState</h4>
                <p>Representa el estado de la logística de gastronomía para una OS, vinculando lotes (OF) a contenedores.</p>
                <ul>
                    <li><code>osId</code>: El evento al que pertenece.</li>
                    <li><code>status</code>: Estado global del picking de comida ('Pendiente', 'Preparado', etc.).</li>
                    <li><code>assignedContainers</code>: Array de los contenedores isotermos que se usarán.</li>
                    <li><code>itemStates</code>: Array de `LoteAsignado`, que especifica qué cantidad de qué lote va en qué contenedor.</li>
                </ul>

                <h4>ReturnSheet</h4>
                <p>Documento para gestionar la devolución de material de Almacén, Bodega y Alquiler después de un evento.</p>
                <ul>
                    <li><code>id</code>: Coincide con el `osId`.</li>
                    <li><code>items</code>: Lista de artículos que se enviaron.</li>
                    <li><code>itemStates</code>: Registro de las cantidades devueltas y los comentarios de incidencias (roturas, pérdidas).</li>
                </ul>

                <h3 className="!mt-8">Entidades de Vertical de Entregas</h3>
                
                <h4>ProductoVenta</h4>
                <p>Unidad de venta en el catálogo de Entregas. Puede ser un producto simple, una receta o un "Pack".</p>
                <ul>
                    <li><code>id</code>, <code>nombre</code>, <code>categoria</code>: Identificación.</li>
                    <li><code>pvp</code>, <code>pvpIfema</code>: Precios de venta.</li>
                    <li><code>producidoPorPartner</code>: Booleano que determina si lo produce CPR o un partner.</li>
                    <li><code>partnerId</code>: ID del proveedor externo si aplica.</li>
                    <li><code>recetaId</code>: Vínculo a una receta del Book Gastronómico.</li>
                    <li><code>componentes</code>: Si es un pack, contiene el desglose de artículos que lo componen para el picking de almacén.</li>
                </ul>

                <h3 className="!mt-8">Entidades de Portales Externos</h3>
                
                <h4>PortalUser</h4>
                <p>Define un usuario que puede acceder a los portales de colaboradores.</p>
                <ul>
                    <li><code>id</code>, <code>nombre</code>, <code>email</code>: Datos del usuario.</li>
                    <li><code>roles</code>: Array que define a qué portales tiene acceso ('Partner Gastronomia', 'Transporte', etc.).</li>
                    <li><code>proveedorId</code>: Vincula al usuario con una empresa de la base de datos de `Proveedores`.</li>
                </ul>

                <h4>PersonalExterno</h4>
                <p>Representa la solicitud de personal a una ETT para una OS.</p>
                <ul>
                    <li><code>osId</code>: La OS a la que pertenece.</li>
                    <li><code>turnos</code>: Array de `PersonalExternoTurno` que define las necesidades (ej. 10 camareros de 18:00 a 02:00).</li>
                    <li><code>status</code>: Estado de la solicitud ('Pendiente', 'Solicitado', 'Asignado', 'Cerrado'). 'Solicitado' es la señal para el partner.</li>
                </ul>
                
                <h4>PersonalExternoTurno</h4>
                <p>Define un turno específico solicitado a una ETT.</p>
                <ul>
                    <li><code>proveedorId</code>, <code>categoria</code>, <code>precioHora</code>: Qué se pide y a quién.</li>
                    <li><code>fecha</code>, <code>horaEntrada</code>, <code>horaSalida</code>: Horario del turno.</li>
                    <li><code>statusPartner</code>: Estado gestionado por la ETT desde su portal.</li>
                    <li><code>asignaciones</code>: Array con los datos del personal finalmente asignado por la ETT.</li>
                </ul>

                <h4>TransporteOrder</h4>
                <p>Un pedido de transporte para una o varias entregas.</p>
                <ul>
                    <li><code>osId</code>: El pedido al que sirve.</li>
                    <li><code>hitosIds</code>: Array de FKs a `EntregaHito.id` si agrupa varias entregas.</li>
                    <li><code>firmaUrl</code>, <code>firmadoPor</code>: Datos de la firma digital del albarán.</li>
                </ul>

                <h3 className="!mt-8">Nuevas Entidades para Control de Explotación CPR</h3>
                
                <h4>CosteFijoCPR</h4>
                <p>Define un gasto estructural recurrente del Centro de Producción.</p>
                <ul>
                    <li><code>id</code>, <code>concepto</code>, <code>importeMensual</code>: Campos para registrar gastos como "Alquiler Nave CPR", "Suministros", etc.</li>
                </ul>

                <h4>ObjetivoMensualCPR</h4>
                <p>Define los presupuestos (objetivos) para un mes específico para el CPR.</p>
                <ul>
                    <li><code>mes</code>: En formato "YYYY-MM".</li>
                    <li><code>presupuestoVentas</code>, <code>presupuestoGastosMP</code>, <code>presupuestoGastosPersonal</code>: Campos numéricos para la comparativa Real vs. Presupuesto.</li>
                </ul>
            </section>
        </>
    );
}
