📘 STYLE.MD - Sistema de Diseño: Book Gastronómico (V3.0)
Filosofía: "Densidad Limpia". La interfaz debe manejar mucha información técnica sin abrumar, priorizando la velocidad de operación en cocinas (móvil) y la gestión en oficina (desktop).

1. Arquitectura de Página (Layout Master)
Reglas de Oro
Sin Padding en Layout: El layout.tsx no debe tener container ni py-8. Cada página controla sus márgenes para permitir efectos "borde a borde" en móvil.

Scroll Infinito + FAB: El contenedor principal debe tener pb-24 para que el contenido final no quede oculto detrás del Botón Flotante (FAB).

El Patrón "Sticky Tabs" (Crítico)
Para evitar errores de contexto (tabs que no cambian), la estructura debe ser esta jerarquía exacta:

TypeScript

<main className="pb-24 bg-background min-h-screen">
  <FormProvider {...form}>
    <form>
       {/* 1. EL COMPONENTE TABS ENVUELVE TODO */}
       <Tabs defaultValue="general" className="w-full">
          
          {/* 2. HEADER STICKY (Solo contiene navegación y triggers) */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
             <div className="px-3 pb-0">
                <TabsList className="w-full justify-start overflow-x-auto ...">
                   {/* ... Triggers ... */}
                </TabsList>
             </div>
          </div>

          {/* 3. CUERPO DEL CONTENIDO (Dentro de Tabs, fuera del Sticky) */}
          <div className="p-2 sm:p-4 max-w-7xl mx-auto min-h-screen bg-muted/5">
              <TabsContent value="general">...</TabsContent>
              <TabsContent value="detalle">...</TabsContent>
          </div>

       </Tabs>
    </form>
  </FormProvider>
</main>
2. Listados de Datos (Master View)
Estrategia Dual
No usamos tablas responsive HTML. Renderizamos dos interfaces distintas según el dispositivo.

A. Móvil (md:hidden) -> "Clickable Cards"
Interacción: Toda la tarjeta es un botón. No usar botones pequeños de "Editar" o "Lápiz".

Estilo: bg-card border rounded-lg p-3 shadow-sm active:scale-[0.98] transition-transform.

Indicadores de Estado: Usar una franja lateral de color absolute left-0 w-1 bg-color... para indicar estado (Activo/Archivado).

Contenido: Título negrita, datos clave alineados con Flexbox (justify-between).

B. Desktop (hidden md:block) -> "Shadcn Table"
Estilo: Tabla estándar con TableHeader gris suave (bg-muted/40).

Alineación:

Texto: Izquierda.

Números/Precios: Derecha (text-right font-mono).

Estados: Badges o Iconos centrados.

Acciones: DropdownMenu en la última columna (Editar, Clonar, Borrar).

3. Formularios y Fichas (Detail View)
Inputs de Alta Densidad
Altura: h-8 o h-9 (Compacto).

Labels: text-[10px] uppercase font-bold text-muted-foreground.

Manejo de Nulos: En el value del input, usar siempre value={field.value ?? ''} para evitar errores de controlled/uncontrolled components.

Estructura de Pestañas (Estándar)
Info. General:

Datos maestros (Nombre, Categoría, Switches de estado).

Zona de Peligro: Tarjeta al final del todo (no flotante) para "Eliminar". Estilo border-destructive/30.

Composición / Receta:

Izquierda (75%): Lista de Ingredientes/Elaboraciones.

Derecha/Abajo: Tarjetas de Totales (Costes y Alérgenos).

Nota: En "Elaboraciones", los campos de rendimiento (Producción Total) van aquí, encima de la lista.

Multimedia / Pasos:

Componente ImageManager con vista de Grid.

Textarea expandido para instrucciones.

4. Tarjetas Especiales (Blueprints)
Tarjeta Económica (Rentabilidad)
Diseño para lectura rápida de márgenes.

TypeScript

<Card className="border-l-4 border-l-green-600 ...">
   {/* Fila 1 */}
   <div className="flex w-full">
      <div className="w-1/2">COSTE MP (Mono)</div>
      <div className="w-1/2">MARGEN % (Input)</div>
   </div>
   <Separator />
   {/* Fila 2 */}
   <div className="text-2xl font-bold text-green-700">PVP VENTA</div>
</Card>
Tarjeta Alérgenos
Iconos: Usar componente <AllergenBadge />.

Manejo de Arrays: Siempre asegurar array: (data.alergenos || []).map(...).

5. Acciones Principales (FAB)
Los botones de acción no viven en el header, viven en el pulgar del usuario.

Ubicación: fixed bottom-6 right-6 z-50.

Botón Guardar:

Circular grande (h-14 w-14).

Verde corporativo (bg-green-600).

Icono grande, sin texto.

Feedback de carga (Loader2 animate-spin).

Botón Cancelar (Opcional):

Circular pequeño (h-10 w-10), encima del guardar.

Rojo o Gris (variant="destructive" o outline).

6. Seguridad de Tipado (TypeScript Rules)
Para evitar los errores 2322 y 2551:

Mapeo CamelCase <-> SnakeCase:

Supabase devuelve snake_case (ej: produccion_total).

La App usa camelCase (ej: produccionTotal).

Regla: Hacer el mapeo manual explícito en la función loadData.

Tipos Literales:

Si Zod espera "KG" | "L", no le pases un string.

Usa casting: unidad: dbData.unidad as "KG" | "L".

Booleanos Estrictos:

Nunca pasar undefined a un switch o checkbox.

Usa: checked={data.isArchived ?? false}.