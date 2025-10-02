
'use client';

import { Code, Database, Bot, Workflow, Users, ShieldCheck, BarChart3, Package, BookOpen, Factory, GitBranch, CheckSquare, XSquare } from "lucide-react";

function Feature({ children, checked = true }: { children: React.ReactNode, checked?: boolean }) {
    return (
        <li className="flex items-start gap-3">
            <div className="mt-1">
                {checked ? <CheckSquare className="w-5 h-5 text-green-600" /> : <XSquare className="w-5 h-5 text-muted-foreground" />}
            </div>
            <span>{children}</span>
        </li>
    );
}

export default function TechDocsPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Code className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Checklist de Funcionalidades</h1>
                    <p className="lead !m-0">Un listado detallado de las capacidades técnicas y funcionales de la plataforma.</p>
                </div>
            </div>

            <section id="c1-tech">
                <h2 className="flex items-center gap-3"><GitBranch />Módulos y Funcionalidades Principales</h2>
                <ul>
                    <Feature>Gestión de Órdenes de Servicio (OS) para Catering y Entregas.</Feature>
                    <Feature>Calendario de servicios con vista mensual.</Feature>
                    <Feature>Dashboard principal con acceso a todos los módulos.</Feature>
                    <Feature>Sistema de gestión de bases de datos maestras (Personal, Espacios, Proveedores, etc.).</Feature>
                    <Feature>Importación y exportación de datos mediante archivos CSV para todas las BBDD.</Feature>
                    <Feature>Módulo de configuración del sistema.</Feature>
                </ul>
            </section>
            
            <section id="c2-tech">
                <h2 className="flex items-center gap-3"><BookOpen />Book Gastronómico</h2>
                <ul>
                    <Feature>Gestión de Materia Prima (ERP) con costes y unidades.</Feature>
                    <Feature>Gestión de Ingredientes Internos con vinculación a ERP y control de alérgenos.</Feature>
                    <Feature>Creación de Elaboraciones con escandallos (ingredientes y sub-elaboraciones).</Feature>
                    <Feature>Cálculo de coste automático para elaboraciones.</Feature>
                    <Feature>Creación de Recetas (platos finales) a partir de elaboraciones.</Feature>
                    <Feature>Cálculo automático de coste de materia prima y precio de venta recomendado.</Feature>
                    <Feature>Agregación automática de alérgenos desde ingredientes hasta la receta final.</Feature>
                    <Feature>Gestión de Menaje y su asociación a recetas.</Feature>
                    <Feature>Clonación de recetas y elaboraciones para agilizar la creación.</Feature>
                    <Feature>Alertas de revisión en recetas si una elaboración hija es eliminada.</Feature>
                    <Feature>Gestión de categorías, tipos de cocina y otros atributos gastronómicos.</Feature>
                </ul>
            </section>
            
            <section id="c3-tech">
                <h2 className="flex items-center gap-3"><Factory />Módulo de Producción (CPR)</h2>
                <ul>
                    <Feature><strong>Planificación:</strong> Agregación automática de necesidades de producción desde OS confirmadas en un rango de fechas.</Feature>
                    <Feature><strong>Matriz de Producción:</strong> Vista consolidada de necesidades por día.</Feature>
                    <Feature><strong>Gestión de Excedentes:</strong> El sistema calcula los excedentes de producciones anteriores y los descuenta de las nuevas necesidades.</Feature>
                    <Feature><strong>Generación de Órdenes de Fabricación (OF):</strong> Creación de lotes de producción con un solo clic desde la pantalla de planificación.</Feature>
                    <Feature><strong>Gestión de OF:</strong> Ciclo de vida completo por estados (Pendiente, Asignada, En Proceso, Finalizado, Calidad, Incidencia).</Feature>
                    <Feature><strong>Control de Calidad:</strong> Flujo de validación para lotes finalizados.</Feature>
                    <Feature><strong>Picking y Logística:</strong> Asignación de lotes a contenedores isotermos para cada servicio (hito) de una OS.</Feature>
                    <Feature><strong>Generación de Etiquetas de Picking (PDF):</strong> Impresión de hojas de carga detalladas por hito y contenedor.</Feature>
                    <Feature><strong>Trazabilidad:</strong> Visor completo del historial de lotes de producción.</Feature>
                    <Feature><strong>Informes:</strong> Módulos de productividad (tiempos) e incidencias.</Feature>
                </ul>
            </section>

             <section id="c4-tech">
                <h2 className="flex items-center gap-3"><Package />Vertical de Entregas MICE</h2>
                <ul>
                    <Feature>Dashboard específico para la vertical de Entregas.</Feature>
                    <Feature>Gestión de Pedidos de Entrega con múltiples hitos (entregas por pedido).</Feature>
                    <Feature><strong>Catálogo Unificado:</strong> Buscador inteligente para añadir productos de gastronomía, packs, bebidas y consumibles desde un único lugar.</Feature>
                    <Feature><strong>Gestión de "Packs de Venta":</strong> Creación de productos compuestos que se desglosan en componentes para el picking de almacén.</Feature>
                    <Feature><strong>Distribución de Producción:</strong> El sistema asigna automáticamente la producción a CPR MICE o a un partner externo basado en la configuración del producto.</Feature>
                    <Feature>Analítica de Rentabilidad específica para la vertical.</Feature>
                </ul>
            </section>

            <section id="c5-tech">
                <h2 className="flex items-center gap-3"><Users />Portales Externos</h2>
                 <ul>
                    <Feature><strong>Portal de Partner de Producción:</strong> Vista simplificada para que los partners de gastronomía vean y gestionen los pedidos de producción que tienen asignados.</Feature>
                    <Feature><strong>Portal de Partner de Personal:</strong> Permite a las ETTs ver los turnos solicitados y asignar a su personal, incluyendo nombre, DNI, teléfono y comentarios.</Feature>
                    <Feature><strong>Portal de Transporte:</strong> Interfaz móvil para que los transportistas vean sus rutas, los detalles de entrega y recojan la firma digital del cliente.</Feature>
                    <Feature><strong>Firma Digital:</strong> Captura de firma en el dispositivo para la confirmación de entrega, generando un albarán en PDF.</Feature>
                </ul>
            </section>

            <section id="c6-tech">
                <h2 className="flex items-center gap-3"><GitBranch />Funcionalidades Transversales</h2>
                <ul>
                    <Feature><strong>Módulo Comercial:</strong> Gestión de briefings de eventos con múltiples servicios (hitos).</Feature>
                    <Feature><strong>Gestión de Personal MICE e Externo:</strong> Asignación y control de costes de personal por evento.</Feature>
                    <Feature><strong>Gestión de Pedidos Auxiliares:</strong> Módulos para Almacén, Bodega, Bio, Alquiler, Hielo, Transporte, Decoración y Gastos Atípicos.</Feature>
                    <Feature><strong>Plantillas de Pedidos:</strong> Creación de plantillas para agilizar la solicitud de material recurrente.</Feature>
                    <Feature><strong>Cuenta de Explotación por OS:</strong> Análisis detallado de rentabilidad, comparando presupuesto, cierre y objetivos.</Feature>
                    <Feature><strong>Plantillas de Objetivos de Gasto:</strong> Definición de márgenes de coste objetivo por categoría de gasto.</Feature>
                    <Feature><strong>Integración de IA (Genkit):</strong> Asistente para la creación de pedidos y generación de descripciones de marketing.</Feature>
                </ul>
            </section>
        </>
    );
}
