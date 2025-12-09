📘 STYLE.MD - Sistema de Diseño: Fichas Técnicas (V2.0)
Este sistema sigue una filosofía "Mobile-First, Desktop-Optimized", priorizando la densidad de información, la limpieza visual y la accesibilidad de las acciones principales.

1. Arquitectura de Página (Layout)
Contenedor Raíz
Debe permitir scroll infinito y dejar espacio para los botones flotantes.

TypeScript

<main className="pb-24 bg-background min-h-screen">
  {/* Todo el contenido va aquí */}
</main>
Cabecera Pegajosa (Sticky Header)
La cabecera siempre contiene el componente raíz <Tabs> para controlar el contenido inferior.

Posición: sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2

Estructura:

Fila Superior: Navegación (Botón Atrás) y Título (Visible solo en Desktop/Tablet).

Fila Inferior: Lista de Pestañas (TabsList) con scroll horizontal.

TypeScript

<div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
  <Tabs defaultValue="general" className="w-full">
     {/* Fila 1: Navegación */}
     <div className="flex items-center px-3 pb-2 gap-2">
        <Button variant="ghost" ...><ChevronLeft /></Button>
        <h1 className="text-base font-bold truncate hidden sm:block">{pageTitle}</h1>
     </div>
     
     {/* Fila 2: Pestañas Scrollables */}
     <div className="px-3">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-transparent p-0 h-10 gap-4 mb-0 no-scrollbar border-none">
           {/* Triggers... */}
        </TabsList>
     </div>
  </Tabs>
</div>
Cuerpo del Contenido
El contenido de las pestañas vive dentro del mismo contexto <Tabs> pero fuera del div sticky.

Estilo: p-2 sm:p-4 max-w-7xl mx-auto min-h-screen bg-muted/5

2. Componentes de UI (Micro-Estilos)
A. Inputs y Etiquetas (Alta Densidad)
Optimizados para mostrar muchos datos sin ocupar altura excesiva.

Labels (Etiquetas):

text-[10px] uppercase font-bold text-muted-foreground tracking-wide

Uso: Siempre encima del input.

Inputs / Selects:

h-8 (Altura compacta).

text-sm (Texto legible).

bg-background (Fondo blanco/oscuro estándar).

B. Tarjetas (Cards)
Diseño plano y limpio para agrupar secciones.

Contenedor: shadow-none border border-border/60.

Cabecera de Tarjeta: p-3 pb-1 border-b bg-muted/10.

Título: text-sm font-bold.

Cuerpo: p-3.

C. Tablas vs. Tarjetas (Responsive)
Patrón para listas complejas (Ingredientes, Elaboraciones).

Móvil (md:hidden):

Renderizar una lista de div con estilo de tarjeta (bg-background border rounded-md p-2).

Usar Flexbox/Grid interno para alinear "Nombre", "Cantidad" y "Total".

Desktop (hidden md:block):

Usar <Table> estándar.

Alineación Numérica: text-right font-mono.

Anchos Fijos: Usar w-32, w-24 para columnas numéricas para asegurar alineación.

3. Grids y Distribución (Layouts por Pestaña)
Pestaña "Info. General" (Formularios)
Grid: grid-cols-1 lg:grid-cols-2 gap-4.

Columna Izquierda: Tarjetas de datos (Inputs, Selects).

Columna Derecha: Tarjeta de Imágenes principales + Configuración (Switches).

Pestaña "Composición" (Receta/Elaboración)
Grid: grid-cols-1 lg:grid-cols-12 gap-4 items-start.

Columna Principal (lg:col-span-9):

Tarjeta de Lista/Tabla (Ingredientes/Elaboraciones).

Tarjeta de Alérgenos Totales (Siempre al final de esta columna).

Columna Lateral (lg:col-span-3):

Sticky: lg:sticky lg:top-36.

Tarjeta de Información Económica.

Pestaña "Info. Pase / Preparación"
Grid: grid-cols-1 (Móvil) -> md:grid-cols-3 (Desktop) si son pasos separados (Mise en place, etc).

Contenido: Componente unificado de Imagen + Texto (instrucciones).

Pestaña "Gastronómica / Técnica"
Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4.

Permite ver toda la clasificación técnica en una sola fila o dos en desktop.

4. Tarjetas Específicas (Blueprints)
Tarjeta Económica (Resumen)
Diseño específico para destacar la rentabilidad.

Fila Superior (50/50): Coste MP | Margen %.

Labels: text-[10px] text-muted-foreground uppercase font-bold.

Separador: <Separator className="mb-3"/>.

Fila Inferior (Destacado): Precio Venta.

Valor: text-2xl font-bold text-green-700.

Tarjeta "Zona de Peligro"
Para acciones destructivas. Se coloca al final de la pestaña "General", nunca flotante.

Estilo: border-destructive/30 bg-destructive/5 shadow-none.

Botón: variant="ghost" text-destructive.

5. Botones de Acción (FAB)
Los botones principales de acción flotan sobre la interfaz.

Contenedor: fixed bottom-6 right-6 z-50 flex flex-col gap-3.

Botón Guardar (Principal):

rounded-full shadow-lg h-14 w-14

Color: bg-green-600 hover:bg-green-700.

Icono grande: <Save className="h-6 w-6" />.

Botón Cancelar (Secundario):

rounded-full shadow-lg h-10 w-10.

Color: variant="destructive" (Rojo).

6. Ejemplo de Implementación (Skeleton)
TypeScript

<main className="pb-24 bg-background min-h-screen">
    <FormProvider {...form}>
        <form>
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
                 <Tabs defaultValue="general" className="w-full">
                    {/* Navegación */}
                     <div className="flex px-3 pb-2 gap-2">
                         <Button variant="ghost"><ChevronLeft /></Button>
                         <div className="flex-1 overflow-x-auto">
                            {/* Tabs List */}
                            <TabsList className="...">...</TabsList>
                         </div>
                     </div>

                    {/* CONTENIDO */}
                    <div className="p-2 sm:p-4 max-w-7xl mx-auto min-h-screen bg-muted/5">
                        <TabsContent value="general">
                             {/* Grid 2 Columnas */}
                        </TabsContent>

                        <TabsContent value="composicion">
                             {/* Grid 12 Columnas (9 + 3) */}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 z-50">
                <Button type="submit" className="rounded-full h-14 w-14 ..."><Save /></Button>
            </div>
        </form>
    </FormProvider>
</main>