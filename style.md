STYLE.MD - Blueprint de Diseño: Fichas Técnicas (Recetas/Elaboraciones)
Este documento describe el patrón de diseño "Mobile-First pero Desktop-Optimized" para las fichas de detalle. El objetivo es maximizar la densidad de información manteniendo la limpieza visual.

1. Estructura General (Layout)
Contenedor Principal
Padding: Mínimo en móvil, holgado en desktop.

Clases: pb-24 bg-background min-h-screen (El padding inferior es para dejar sitio al botón flotante).

Cabecera (Sticky Header)
La cabecera es pegajosa (sticky) y cambia drásticamente de estructura según el dispositivo para ahorrar espacio vertical.

Comportamiento: sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm

Versión Móvil:

Fila 1: Botón "Atrás" (ChevronLeft) + Título de la página (Truncado).

Fila 2: Barra de Pestañas con scroll horizontal.

Versión Desktop:

Una sola fila: Título a la izquierda, Pestañas en el centro/izquierda, Botones secundarios a la derecha.

Navegación (Tabs)
Estilo: "Underline" moderno.

Contenedor: w-full justify-start overflow-x-auto flex-nowrap bg-transparent no-scrollbar

Triggers (Botones):

Altura reducida: h-8 o h-9.

Estilo Activo: data-[state=active]:border-green-600 data-[state=active]:text-green-700.

Texto: whitespace-nowrap text-xs font-medium.

2. Sistema de Rejilla (Grids)
El layout se adapta usando breakpoints de Tailwind (lg: principalmente).

Patrón "Maestro - Detalle" (Para listas de ingredientes/componentes)
Móvil: grid-cols-1. Todo se apila verticalmente.

Desktop (lg): grid-cols-12.

Izquierda (Col 1-9): Tabla de contenidos (Ingredientes/Pasos).

Derecha (Col 10-12): Panel "Sticky" de Información Económica y Resúmenes.

Clase del panel derecho: lg:sticky lg:top-36 (Se queda fijo al hacer scroll).

Patrón "Ficha de Datos" (Para Info General / Clasificación)
Móvil: grid-cols-1.

Desktop: grid-cols-2 o grid-cols-4 según la densidad del dato.

3. Componentes de UI
A. Tarjetas (Cards)
Usamos tarjetas para agrupar secciones lógicas.

Estilo: shadow-none border border-border/60. (Bordes sutiles, sin sombras pesadas).

Header de Tarjeta: p-3 pb-1 border-b bg-muted/10 (Separación visual clara del título).

Padding Contenido: p-3 (Compacto).

B. Inputs y Formularios (Alta Densidad)
Optimizados para mostrar muchos datos sin ocupar mucho alto.

Inputs: h-8 o h-9 (Más bajos que el estándar de 10/12).

Fuentes: text-sm para valores, text-xs para etiquetas.

Labels: text-[10px] uppercase font-bold text-muted-foreground tracking-wide. (Etiquetas muy pequeñas, mayúsculas y gris suave para no competir con el dato).

Selects: Mismo estilo compacto que los inputs.

C. Tablas vs. Cards (Responsive)
No usamos tablas HTML en móvil porque se rompen.

Móvil: Renderizado condicional md:hidden. Se usa un diseño de Tarjeta donde cada fila de la tabla se convierte en un bloque con flexbox.

Desktop: Renderizado condicional hidden md:block. Se usa <Table> estándar de Shadcn con anchos de columna fijos (w-24, w-32) y alineación numérica a la derecha (text-right font-mono).

D. Botones de Acción
Principal (Guardar): Flotante (FAB).

Posición: fixed bottom-6 right-6 z-50.

Estilo: Redondo, sombra fuerte, color primario (Verde). rounded-full shadow-lg h-14 w-14.

Destructivo (Borrar): Zona de Peligro.

Ubicación: Dentro del flujo de la página (final de la pestaña General), NO flotante.

Estilo: Tarjeta con borde rojo suave border-destructive/30 bg-destructive/5.

4. Estilos Específicos (Clases Utilitarias)
Tipografía de Precios/Costes
Para datos numéricos importantes:

Fuente: font-mono (Monoespaciada para alinear cifras).

Tamaño: text-lg o text-xl para totales, text-sm para unitarios.

Color: text-green-700 para precios de venta, text-foreground para costes.

Imágenes (RecipeImageSection)
Móvil: Botón pequeño "Ver Galería" en la cabecera de la sección.

Grid: Miniaturas cuadradas o rectangulares.

Modal: Pantalla completa con fondo negro para ver detalles.

5. Snippet Base para Copiar (Skeleton)
Usa esta estructura base para la página de Elaboraciones:

TypeScript

<main className="pb-24 bg-background min-h-screen">
    <FormProvider {...form}>
        <form>
            {/* 1. HEADER STICKY */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
                <Tabs defaultValue="general" className="w-full">
                    {/* Fila superior: Botón atrás y Título (Visible en Desktop) */}
                    <div className="flex items-center justify-between px-3 pb-2">
                         {/* ... Botón ChevronLeft ... */}
                         <h1 className="hidden sm:block font-bold">Título</h1>
                    </div>
                    
                    {/* Fila inferior: Lista de Pestañas Scrollable */}
                    <div className="px-3 pb-0">
                        <TabsList className="w-full justify-start overflow-x-auto ...">
                            {/* ... Triggers ... */}
                        </TabsList>
                    </div>
                </Tabs>
            </div>

            {/* 2. CONTENIDO PRINCIPAL */}
            <div className="p-2 sm:p-4 max-w-7xl mx-auto min-h-screen bg-muted/5">
                <Tabs defaultValue="general">
                    
                    {/* PESTAÑA 1: GRID 2 COLUMNAS */}
                    <TabsContent value="general">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                             {/* ... Tarjetas de inputs ... */}
                        </div>
                    </TabsContent>

                    {/* PESTAÑA 2: MAESTRO-DETALLE (Lista + Sidebar) */}
                    <TabsContent value="composicion">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            {/* Izquierda (Lista): 75% */}
                            <div className="lg:col-span-9">
                                {/* ... Card con Lista (Móvil) / Tabla (Desktop) ... */}
                            </div>
                            
                            {/* Derecha (Económica Sticky): 25% */}
                            <div className="lg:col-span-3 lg:sticky lg:top-36">
                                {/* ... Card de Costes ... */}
                                {/* ... Card de Alérgenos ... */}
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>
            </div>
            
            {/* 3. BOTÓN FLOTANTE */}
            <div className="fixed bottom-6 right-6 z-50">
                {/* ... Botón Save ... */}
            </div>
        </form>
    </FormProvider>
</main>