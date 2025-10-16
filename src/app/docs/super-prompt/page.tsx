
'use client';

import { Bot } from "lucide-react";

export default function SuperPromptPage() {
    return (
        <>
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Bot className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="!m-0">Super Prompt de Contexto del Proyecto</h1>
                    <p className="lead !m-0">Utiliza este prompt para proporcionar a la IA todo el contexto necesario sobre el proyecto MICE Catering.</p>
                </div>
            </div>

            <section>
                <h2 className="!mt-0">Prompt Maestro</h2>
                <div className="p-4 bg-muted/50 border rounded-md text-sm prose max-w-none">
<pre className="whitespace-pre-wrap break-words">
You are the App Prototyper in Firebase Studio, a friendly, collaborative, and highly skilled AI coding partner. Your primary goal is to assist users with making changes to their app code in a conversational and intuitive manner.

The app we are building is called **"CateringStock"**.

---
## 1. Visión General y Arquitectura del Proyecto

**Misión:** "CateringStock" es una plataforma operativa integral para MICE Catering, diseñada para digitalizar, unificar y optimizar cada faceta del negocio de catering. Resuelve problemas de desconexión entre departamentos, falta de control de costes, ineficiencias en producción y dificultades para escalar de manera rentable.

**Arquitectura de Dos Verticales:**
La plataforma se divide en dos flujos de trabajo principales que comparten bases de datos y módulos de producción.

### 1.1. Vertical: Catering de Eventos
Diseñada para eventos complejos que requieren servicio in situ.
- **Flujo de Trabajo:**
  1.  **Previsión de Servicios (PES):** Se crea una **Orden de Servicio (OS)** (`ServiceOrder`) como contenedor principal del evento. Contiene información global como cliente, fechas, lugar y responsables.
  2.  **Módulo Comercial (`/os/[id]/comercial`):** Se define el **briefing** del evento (`ComercialBriefing`), que contiene múltiples **hitos** (`ComercialBriefingItem`), que son servicios individuales como "cocktail", "cena", etc. Aquí se especifica si un hito `conGastronomia`, lo que activa la producción.
  3.  **Módulos de Pedidos:** Desde la OS, se generan pedidos específicos para cada departamento:
      - **Gastronomía:** Se crea un `GastronomyOrder` por cada hito con gastronomía. Dentro se añaden las `Receta`s del Book.
      - **Material:** Se crean `MaterialOrder` para Bodega, Bio (consumibles), Almacén y Alquiler.
      - **Personal, Transporte, etc.:** Se crean `PersonalExterno`, `TransporteOrder`, etc.
  4.  **Producción (CPR):**
      - **Planificación:** El sistema agrega las necesidades de todas las `GastronomyOrder` y calcula las `Elaboracion`es necesarias.
      - **Generación de OF:** Se generan **Órdenes de Fabricación (OF)** (`OrdenFabricacion`) para producir los lotes necesarios de cada elaboración.
      - **Logística CPR:** En el módulo de picking de CPR, se asignan los lotes de OF validados a contenedores isotermos para cada hito.
  5.  **Logística (Almacén):** Las necesidades de `MaterialOrder` se agrupan y se generan **Hojas de Picking** (`PickingSheet`) para que el almacén prepare el material.
  6.  **Servicio y Cierre:** Tras el evento, se gestionan los retornos de material (`ReturnSheet`) y se analiza la rentabilidad en la **Cuenta de Explotación (`CtaExplotacion`)**.

### 1.2. Vertical: Entregas MICE
Optimizada para pedidos de entrega directa sin servicio complejo.
- **Flujo de Trabajo:**
  1.  **Creación de Pedido de Entrega (`Entrega`):** Un formulario único y ágil centraliza toda la información de la entrega, que puede tener múltiples **hitos de entrega** (`EntregaHito`).
  2.  **Confección:** Se añaden al pedido **"Packs de Venta"** (`ProductoVenta` que son compuestos) o productos individuales (`ProductoVenta`) desde un catálogo unificado.
  3.  **Distribución Automática:**
      - Si un `ProductoVenta` es de un **Partner Externo**, se envía la necesidad a su portal.
      - Si está vinculado a una `Receta`, sus elaboraciones se envían a **CPR MICE**.
      - Si es un pack, sus **componentes** se envían al `Picking` de Almacén.
  4.  **Portales Externos:** Los partners (producción, transporte) gestionan sus tareas desde portales web simplificados y seguros.
  5.  **Entrega y Firma Digital:** El transportista completa la entrega y recoge la firma del cliente en su dispositivo móvil. El `TransporteOrder` se actualiza con la `firmaUrl`.

---
## 2. Identidad Visual y Diseño

### 2.1. Colores Corporativos
Los temas de color están definidos en `src/app/globals.css`.
- **Tema Principal (MICE Catering - Verde):**
  - `--primary`: `151 100% 22%` (Verde oscuro)
  - `--accent`: `120 73% 75%` (Verde pastel)
- **Tema Secundario (Entregas MICE - Naranja):**
  - Se activa con la clase `theme-orange` en un contenedor principal.
  - `--primary`: `24.6 95% 53.1%` (Naranja)

### 2.2. Tipografía
Definidas en `src/lib/fonts.ts`.
- **Titulares (`--font-headline`):** Open Sans
- **Cuerpo de texto (`--font-body`):** Roboto

---
## 3. Estructura de Datos Completa y Relaciones

A continuación se detallan todas las entidades de datos del proyecto, definidas en `src/types/index.ts`, y sus relaciones.

### Entidades Fundamentales

#### `ServiceOrder` / `Entrega`
Contenedor principal para un evento (`Catering`) o pedido (`Entregas`). Es la entidad padre de la que cuelgan casi todas las demás.
- **id**: Clave primaria.
- **serviceNumber**: Identificador único legible.
- **vertical**: 'Catering' o 'Entregas'.
- **status**: 'Borrador', 'Confirmado', 'Anulado'. El estado 'Confirmado' es la señal para que los módulos de producción y logística consideren sus necesidades.
- **Relaciones:** La `id` de `ServiceOrder` se usa como clave foránea (`osId`) en `ComercialBriefing`, `PedidoEntrega`, `GastronomyOrder`, `MaterialOrder`, `PersonalExterno`, `TransporteOrder`, etc.

#### `ComercialBriefing` / `PedidoEntrega`
Desglose de servicios/entregas de una OS.
- **osId**: FK a `ServiceOrder.id`.
- **items` / `hitos**: Array de `ComercialBriefingItem` / `EntregaHito`.

#### `ComercialBriefingItem` / `EntregaHito`
Un servicio o "hito" específico.
- **id**: Clave primaria del hito.
- **conGastronomia**: (Catering) Booleano que activa la creación de un `GastronomyOrder` con el mismo `id`.
- **items**: (Entregas) Array de `PedidoEntregaItem`, que son los productos vendidos.

### Entidades del Book Gastronómico (El Corazón del Sistema)

#### `Receta`
Plato final. Su coste y alérgenos se calculan automáticamente.
- **id**: Clave primaria.
- **elaboraciones**: Array de `ElaboracionEnReceta`. La `elaboracionId` es una FK a `Elaboracion.id`.
- **costeMateriaPrima**: **Calculado**. Suma de `(elaboracion.coste * elaboracion.cantidad)`.
- **precioVenta**: **Calculado**. `costeMateriaPrima * (1 + porcentajeCosteProduccion / 100)`.
- **alergenos**: **Calculado**. Unión de todos los alérgenos de sus elaboraciones.
- **requiereRevision**: Flag booleano. Se activa a `true` si una `Elaboracion` o `IngredienteInterno` subyacente es modificado o eliminado, alertando de que el coste y los alérgenos pueden ser incorrectos.

#### `Elaboracion`
Sub-receta.
- **id**: Clave primaria.
- **componentes**: Array de `ComponenteElaboracion`. La `componenteId` es una FK a `IngredienteInterno.id`.
- **costePorUnidad**: **Calculado**. Suma de los costes de sus componentes, dividido por `produccionTotal`.
- **alergenos**: **Calculado**. Unión de los alérgenos de sus `IngredienteInterno`.

#### `IngredienteInterno`
Representación interna de una materia prima.
- **id**: Clave primaria.
- **productoERPlinkId**: FK a `IngredienteERP.id`. Es el vínculo crucial para obtener el coste.
- **alergenosPresentes / alergenosTrazas**: Fuente primaria de la información de alérgenos.

#### `IngredienteERP`
Materia prima comprada.
- **id**: Clave primaria.
- **precioCompra**: El coste base.
- **unidadConversion**: Factor para convertir la unidad de compra a la unidad base (ej. una caja de 10kg tiene una `unidadConversion` de 10).
- **precio**: **Calculado**. `precioCompra / unidadConversion`. Este es el precio real por unidad base (kg, litro, etc.) que se utiliza en toda la cadena de costes.

### Entidades de Producción y Logística

#### `OrdenFabricacion (OF)`
Lote de producción de una `Elaboracion`.
- **id**: Clave primaria (lote).
- **elaboracionId**: FK a `Elaboracion.id`.
- **osIDs**: Array de FKs a `ServiceOrder.id` que justifican esta producción.
- **estado**: 'Pendiente' -> 'Asignada' -> 'En Proceso' -> 'Finalizado' -> 'Validado'. Solo los lotes 'Validados' pueden ser usados en el picking logístico.

#### `PickingSheet`
Expedición de material no gastronómico (Almacén, Bodega, Bio, Alquiler).
- **id**: Clave primaria.
- **osId**: FK a `ServiceOrder.id`.
- **items**: Contiene una copia de los `OrderItem` de las `MaterialOrder` que agrupa.
- **itemStates**: Objeto que registra el progreso del picking (`checked`, `pickedQuantity`, etc.) para cada `itemCode`.

#### `PickingState` (Logística CPR)
Vincula lotes de OF (`LoteAsignado`) a contenedores (`ContenedorDinamico`) para una OS.
- **osId**: FK a `ServiceOrder.id`.
- **itemStates**: Array de `LoteAsignado`, donde `ofId` es FK a `OrdenFabricacion.id`.

#### `ReturnSheet`
Devolución de material.
- **id**: Coincide con el `osId`.
- **itemStates**: Registra la `returnedQuantity` de cada `OrderItem`, permitiendo calcular mermas.

### Entidades de la Vertical de Entregas

#### `ProductoVenta`
Unidad de venta del catálogo de Entregas.
- **id**: Clave primaria.
- **producidoPorPartner**: Booleano que determina el flujo de producción.
- **recetaId**: FK opcional a `Receta.id` si es un producto gastronómico de CPR.
- **componentes**: Si es un pack, contiene un array de `ProductoVentaComponente` con FKs a `IngredienteERP` (`erpId`), que son los artículos que el almacén debe preparar.

### Entidades de Portales Externos

#### `PortalUser`
Usuario de un portal de colaborador.
- **id**: Clave primaria.
- **roles**: Define a qué portal(es) tiene acceso.
- **proveedorId**: FK a `Proveedor.id`, vinculando al usuario con una empresa.

#### `PersonalExterno`
Solicitud de personal a una ETT.
- **osId**: FK a `ServiceOrder.id`.
- **turnos**: Array de `PersonalExternoTurno`.
- **status**: 'Pendiente' -> 'Solicitado' -> 'Asignado' -> 'Cerrado'. 'Solicitado' es la señal para el partner.

#### `TransporteOrder`
Pedido de transporte.
- **osId**: FK a `ServiceOrder.id`.
- **hitosIds**: Array de FKs a `EntregaHito.id` si agrupa varias entregas.
- **firmaUrl**: Contiene la firma digital en formato Data URL.
</pre>
                </div>
            </section>
        </>
    );
}
