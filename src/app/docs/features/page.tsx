
'use client';

import { Award, Zap, ShieldCheck, Scale, GitBranch, Share2, BarChart3, AreaChart } from "lucide-react";

export default function FeaturesPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Award className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Plataforma MICE: Propuesta de Valor</h1>
                    <p className="lead !m-0">Un ecosistema operativo diseñado para la excelencia en catering.</p>
                </div>
            </div>

            <section id="c1">
                <h2 className="flex items-center gap-3"><Zap />Nuestra Misión: Transformar la Gestión de Catering</h2>
                <p>MICE Catering no es simplemente un software de gestión; es una **plataforma operativa integral** diseñada para digitalizar, unificar y optimizar cada faceta de tu negocio. Hemos construido esta herramienta para resolver los problemas endémicos del sector: la desconexión entre departamentos, la falta de control sobre los costes, la ineficiencia en la producción y la dificultad para escalar de manera rentable.</p>
                <p className="font-semibold text-primary border-l-4 border-primary pl-4 py-2 bg-secondary/50">Nuestra propuesta de valor es simple: te damos las herramientas para que puedas enfocarte en lo que mejor sabes hacer —crear experiencias gastronómicas excepcionales— mientras nosotros nos encargamos de que la maquinaria interna funcione con la precisión de un reloj suizo.</p>
            </section>

            <section id="c2">
                <h2 className="flex items-center gap-3"><ShieldCheck />Control Total sobre el Corazón del Negocio: El Escandallo</h2>
                <h3>El Problema a Resolver</h3>
                <p>Márgenes que se evaporan, falta de consistencia en los platos, desconocimiento del coste real de cada receta. Sin un control centralizado del escandallo, es imposible gestionar la rentabilidad.</p>
                <h3>Nuestra Solución: El Book Gastronómico</h3>
                <ul>
                    <li><strong>Fuente Única de Verdad:</strong> Centraliza ingredientes, recetas de elaboraciones y recetas de platos finales en un solo lugar. Cualquier cambio se propaga automáticamente por todo el sistema.</li>
                    <li><strong>Costes en Tiempo Real:</strong> Vincula tus ingredientes a la materia prima del ERP. Al actualizar el precio de un ingrediente, el coste de todas tus elaboraciones y recetas se recalcula al instante.</li>
                    <li><strong>Control de Alérgenos Integrado:</strong> Define los alérgenos a nivel de ingrediente y el sistema los agrega automáticamente en elaboraciones y recetas, garantizando la seguridad alimentaria y facilitando la información al cliente.</li>
                </ul>
                <p><strong>Valor:</strong> Dominio absoluto sobre tus costes y márgenes. Capacidad para diseñar menús rentables y tomar decisiones basadas en datos, no en intuiciones.</p>
            </section>
            
            <section id="c3">
                <h2 className="flex items-center gap-3"><Scale />De la Necesidad a la Producción sin Fricción</h2>
                 <h3>El Problema a Resolver</h3>
                <p>El caos de la planificación: hojas de cálculo, emails, llamadas de última hora... Un proceso propenso a errores que genera mermas, roturas de stock y estrés en cocina.</p>
                 <h3>Nuestra Solución: Módulo de Planificación y Producción (CPR)</h3>
                <ul>
                    <li><strong>Agregación Automática:</strong> El sistema analiza todos los eventos y entregas en un rango de fechas y calcula automáticamente la necesidad total de cada elaboración. Se acabó el sumar a mano.</li>
                    <li><strong>Matriz de Producción Inteligente:</strong> Visualiza todas tus necesidades de producción en una matriz temporal. Entiende qué necesitas producir y para cuándo de un solo vistazo.</li>
                    <li><strong>Generación de Órdenes de Fabricación (OF):</strong> Con un clic, convierte las necesidades en Órdenes de Fabricación (lotes de producción), asignándoles un identificador único para una trazabilidad completa.</li>
                    <li><strong>Control de Excedentes:</strong> El sistema es consciente del excedente de producciones anteriores y lo descuenta de las nuevas necesidades, optimizando el aprovechamiento y reduciendo la merma.</li>
                </ul>
                <p><strong>Valor:</strong> Eficiencia radical en la planificación. Reduce errores a cero, optimiza los recursos de cocina y minimiza el desperdicio alimentario.</p>
            </section>

            <section id="c4">
                <h2 className="flex items-center gap-3"><GitBranch />Trazabilidad y Flujo de Trabajo Digital</h2>
                <h3>El Problema a Resolver</h3>
                <p>La "caja negra" de la operativa: ¿quién está haciendo qué?, ¿estará listo a tiempo?, ¿dónde está el lote X?, ¿se ha recogido todo el material?</p>
                <h3>Nuestra Solución: Gestión de Producción y Almacén</h3>
                <ul>
                    <li><strong>Estados Claros:</strong> Cada Orden de Fabricación (OF) y Hoja de Picking pasa por estados definidos (Pendiente &rarr; En Proceso &rarr; Listo), ofreciendo visibilidad total del taller.</li>
                    <li><strong>Trazabilidad Total:</strong> Cada lote de producción y cada expedición de material están vinculados a los eventos que van a servir. Ante una incidencia, puedes trazar el camino completo.</li>
                     <li><strong>Picking Guiado:</strong> Las hojas de picking digitales le dicen al equipo de logística y almacén exactamente qué elaboraciones o materiales recoger, para qué evento, y en qué cantidad, eliminando errores.</li>
                     <li><strong>Gestión de Incidencias:</strong> Un módulo centralizado para gestionar discrepancias en el picking (mermas, roturas). Las decisiones tomadas (aceptar merma, sustituir) actualizan la información en el pedido original, manteniendo la coherencia de datos.</li>
                </ul>
                <p><strong>Valor:</strong> Control y seguridad operativa. Garantiza la calidad, cumple con la normativa de trazabilidad y reduce a mínimos los errores logísticos.</p>
            </section>
            
            <section id="c5">
                <h2 className="flex items-center gap-3"><BarChart3 />Rentabilidad a Nivel de Servicio</h2>
                <h3>El Problema a Resolver</h3>
                <p>Terminar un evento sin saber si se ha ganado o perdido dinero. Imposibilidad de identificar qué servicios son rentables y cuáles no.</p>
                <h3>Nuestra Solución: Cuenta de Explotación por OS</h3>
                <ul>
                    <li><strong>Agregación de Costes:</strong> El sistema centraliza automáticamente todos los costes asociados a una Orden de Servicio: gastronomía, personal, material, transporte, etc.</li>
                    <li><strong>Análisis Comparativo:</strong> Compara en tiempo real los costes presupuestados con los costes reales y con los objetivos de gasto que has definido, mostrando desviaciones al instante.</li>
                    <li><strong>Decisiones Estratégicas:</strong> Identifica qué tipo de eventos, clientes o menús son más rentables, permitiéndote enfocar tus esfuerzos comerciales y optimizar tu oferta.</li>
                </ul>
                <p><strong>Valor:</strong> Visibilidad financiera total. Pasa de una gestión reactiva a una estrategia proactiva basada en la rentabilidad de cada servicio.</p>
            </section>

             <section id="c6">
                <h2 className="flex items-center gap-3"><Share2 />Expansión y Agilidad: La Vertical de Entregas</h2>
                 <h3>El Problema a Resolver</h3>
                <p>El modelo de gestión de eventos complejos es demasiado lento y pesado para servicios de entrega más sencillos (desayunos, coffee breaks), lo que frena la capacidad de abrir nuevas líneas de negocio.</p>
                 <h3>Nuestra Solución: Módulo de Entregas MICE</h3>
                <ul>
                    <li><strong>Flujo Optimizado:</strong> Un formulario de pedido único y ágil que centraliza la creación de la entrega, desde los productos hasta la logística.</li>
                    <li><strong>"Packs de Venta":</strong> Simplifica la venta de productos compuestos. Vende un "Box de Desayuno" y el sistema desglosa automáticamente todos sus componentes para el picking de almacén.</li>
                    <li><strong>Integración con Partners:</strong> Distribuye automáticamente la producción entre tu CPR y partners externos, enviando a cada uno únicamente lo que necesita producir a través de portales dedicados.</li>
                    <li><strong>Logística Digitalizada:</strong> Asigna entregas a transportistas que gestionan todo desde un portal móvil, incluyendo la recogida de la **firma digital** del cliente en el albarán.</li>
                </ul>
                <p><strong>Valor:</strong> Escalabilidad y diversificación. Abre nuevas vías de ingresos con un modelo operativo ágil, eficiente y perfectamente integrado con tu producción central.</p>
            </section>
            
             <section id="c7">
                <h2 className="flex items-center gap-3"><AreaChart />Control de Explotación por Unidad de Negocio</h2>
                 <h3>El Problema a Resolver</h3>
                <p>Visión financiera global sin entender la rentabilidad individual de cada centro de coste, como el Centro de Producción (CPR).</p>
                 <h3>Nuestra Solución: Módulo de Control de Explotación</h3>
                <ul>
                    <li><strong>El CPR como Unidad de Negocio:</strong> Trata el centro de producción como una entidad con su propia cuenta de resultados.</li>
                    <li><strong>Cálculo de Ingresos del CPR:</strong> Mide los ingresos generados por el margen de las recetas "vendidas" a los eventos y por la cesión de personal a otros departamentos.</li>
                    <li><strong>Imputación de Costes:</strong> Asigna los costes directos (materia prima, personal) e indirectos (alquiler, suministros) al CPR.</li>
                    <li><strong>Análisis de Rentabilidad del CPR:</strong> Obtén el beneficio o pérdida neta del centro de producción, permitiendo evaluar su eficiencia y contribución real al negocio global.</li>
                </ul>
                <p><strong>Valor:</strong> Transparencia financiera y gestión por objetivos. Permite tomar decisiones informadas sobre la estructura de costes, la eficiencia de la producción y la estrategia de precios interna.</p>
            </section>

        </>
    );
}
