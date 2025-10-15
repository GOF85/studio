
'use client';

import { Info, Palette, Database, GitBranch, Workflow, Package, Factory, ShieldCheck, BarChart3, Users, Code, BookOpen, Warehouse } from "lucide-react";

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
                    <li>**Previsión de Servicios (PES):** Creación de una Orden de Servicio (OS) que actúa como contenedor principal del evento.</li>
                    <li>**Módulo Comercial:** Se define el briefing del evento con múltiples hitos (servicios como cocktail, cena, etc.).</li>
                    <li>**Módulos de Pedidos:** Desde la OS, se generan pedidos para los distintos departamentos: Gastronomía, Bodega, Almacén, Alquiler, Personal, etc.</li>
                    <li>**Producción (CPR):** Las necesidades de gastronomía se planifican y se convierten en Órdenes de Fabricación (OF).</li>
                    <li>**Logística (Almacén):** El material no gastronómico se prepara a través de Hojas de Picking.</li>
                    <li>**Servicio:** Ejecución del evento.</li>
                    <li>**Cierre:** Gestión de retornos de material y análisis de rentabilidad en la Cuenta de Explotación.</li>
                </ol>
                <h3>1.2. Vertical: Entregas MICE</h3>
                <p>Optimizada para pedidos de entrega directa sin servicio complejo (ej. coffee breaks, desayunos a oficinas).</p>
                <ol>
                    <li>**Creación de Pedido de Entrega:** Un formulario único y ágil centraliza toda la información.</li>
                    <li>**Confección del Pedido:** Se utilizan "Packs de Venta" o productos individuales de un catálogo unificado.</li>
                    <li>**Distribución Automática:** El sistema envía las necesidades de producción a CPR o a un Partner Externo, y las de material al Almacén.</li>
                    <li>**Portales Externos:** Los partners (producción, transporte) gestionan sus tareas desde portales web simplificados.</li>
                    <li>**Entrega y Firma Digital:** El transportista completa la entrega y recoge la firma del cliente en su dispositivo móvil.</li>
                    <li>**Análisis:** Rentabilidad analizada en una Cta. de Explotación específica para la entrega.</li>
                </ol>
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
                <h2 className="flex items-center gap-3"><Database />Estructura de Datos Principal</h2>
                <p>El corazón de la aplicación reside en sus tipos de datos, definidos en `src/types/index.ts`. A continuación, un resumen de las entidades más importantes.</p>
                <ul>
                    <li><strong>ServiceOrder / Entrega:</strong> La entidad principal que representa un evento o pedido. Contiene toda la información del cliente, fechas, responsables y datos financieros.</li>
                    <li><strong>ComercialBriefing / PedidoEntrega:</strong> Almacena los detalles de los servicios o "hitos" de un evento (qué se sirve, cuándo, cuántos asistentes).</li>
                    <li><strong>Receta / Elaboracion / IngredienteInterno:</strong> La base del Book Gastronómico. Definen desde la materia prima hasta el plato final, con sus costes y alérgenos.</li>
                    <li><strong>MaterialOrder / HieloOrder / etc.:</strong> Registros de pedidos específicos para cada departamento.</li>
                    <li><strong>OrdenFabricacion (OF):</strong> Representa un lote de producción en el CPR.</li>
                    <li><strong>PickingSheet / ReturnSheet:</strong> Documentos para la gestión logística del almacén.</li>
                    <li><strong>Proveedor / Personal / Espacio:</strong> Bases de datos maestras con información de recursos.</li>
                </ul>
                <p className="border-l-4 border-primary pl-4 py-2 bg-secondary/50"><strong>Nota para IA:</strong> Siempre que se modifique una funcionalidad, es crucial revisar y actualizar `src/types/index.ts` para mantener la coherencia y evitar errores de compilación.</p>
            </section>

            <section id="c4">
                <h2 className="flex items-center gap-3"><Code />Checklist de Funcionalidades</h2>
                <p>Este es un listado exhaustivo de las capacidades de la plataforma, módulo por módulo.</p>
                
                <h3><BookOpen className="inline-block mr-2" />Book Gastronómico</h3>
                <ul>
                    <li>Gestión de Materia Prima (ERP), Ingredientes, Elaboraciones y Recetas.</li>
                    <li>Cálculo de costes y precios de venta en tiempo real.</li>
                    <li>Trazabilidad automática de alérgenos.</li>
                    <li>Clonación de recetas y elaboraciones.</li>
                </ul>

                <h3><Factory className="inline-block mr-2" />Módulo de Producción (CPR)</h3>
                <ul>
                    <li>Planificación automática de necesidades de producción.</li>
                    <li>Generación y gestión de Órdenes de Fabricación (OF).</li>
                    <li>Control de excedentes para minimizar mermas.</li>
                    <li>Flujo de estados: Pendiente, Asignada, En Proceso, Finalizado, Calidad, Incidencia.</li>
                    <li>Picking logístico de elaboraciones para eventos.</li>
                    <li>Informes de productividad, trazabilidad e incidencias.</li>
                </ul>
                
                <h3><Warehouse className="inline-block mr-2" />Módulo de Almacén</h3>
                <ul>
                    <li>Planificación de necesidades de material (Bodega, Bio, Alquiler).</li>
                    <li>Generación y gestión de Hojas de Picking.</li>
                    <li>Registro y resolución de incidencias (mermas, roturas).</li>
                    <li>Gestión de retornos de material post-evento.</li>
                </ul>
                
                <h3><Package className="inline-block mr-2" />Vertical de Entregas</h3>
                <ul>
                    <li>Dashboard y flujo de trabajo específicos para entregas.</li>
                    <li>Creación de pedidos desde un formulario único y ágil.</li>
                    <li>Gestión de "Packs de Venta" para productos compuestos.</li>
                    <li>Distribución automática de producción a CPR o Partners.</li>
                    <li>Logística digital con firma de albaranes en dispositivo móvil.</li>
                </ul>

                <h3><Users className="inline-block mr-2" />Portales Externos</h3>
                <ul>
                    <li>Portal para Partners de producción.</li>
                    <li>Portal para Partners de personal (ETTs).</li>
                    <li>Portal para Transportistas.</li>
                    <li>Gestión de accesos y registro de actividad.</li>
                </ul>

                <h3><GitBranch className="inline-block mr-2" />Funcionalidades Transversales</h3>
                <ul>
                    <li>Gestión de Órdenes de Servicio (Catering y Entregas).</li>
                    <li>Módulo Comercial para la creación de briefings detallados.</li>
                    <li>Gestión de personal interno (MICE) y externo.</li>
                    <li>Módulos de pedidos para todos los departamentos.</li>
                    <li>Plantillas de pedidos para agilizar solicitudes.</li>
                    <li>Cuenta de Explotación por OS para análisis de rentabilidad.</li>
                    <li>Integración de IA para asistencia en pedidos y marketing.</li>
                </ul>
            </section>
        </>
    );
}
