
'use client';

import { Bot, Code, Database, GitBranch, Palette, Workflow } from "lucide-react";

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
  1.  **Previsión de Servicios (PES):** Se crea una **Orden de Servicio (OS)** como contenedor principal del evento.
  2.  **Módulo Comercial:** Se define el **briefing** del evento, que contiene múltiples **hitos** (servicios individuales como "cocktail", "cena", etc.).
  3.  **Módulos de Pedidos:** Desde la OS, se generan pedidos específicos para cada departamento: Gastronomía, Bodega, Almacén, Alquiler, Personal, Transporte, etc.
  4.  **Producción (CPR):** Las necesidades de gastronomía se agrupan en el módulo de **Planificación** y se convierten en **Órdenes de Fabricación (OF)**.
  5.  **Logística (Almacén):** El material no gastronómico (bebidas, menaje, etc.) se prepara a través de **Hojas de Picking**.
  6.  **Servicio y Cierre:** Ejecución del evento, gestión de retornos de material y análisis final en la **Cuenta de Explotación**.

### 1.2. Vertical: Entregas MICE
Optimizada para pedidos de entrega directa sin servicio complejo (ej. coffee breaks, desayunos a oficinas).
- **Flujo de Trabajo:**
  1.  **Creación de Pedido de Entrega:** Un formulario único y ágil centraliza toda la información.
  2.  **Confección:** Se añaden al pedido **"Packs de Venta"** (productos compuestos) o productos individuales desde un catálogo unificado.
  3.  **Distribución Automática:** El sistema envía las necesidades de producción a **CPR MICE** o a un **Partner Externo**, y las de material al **Almacén**.
  4.  **Portales Externos:** Los partners (producción, transporte) gestionan sus tareas desde portales web simplificados y seguros.
  5.  **Entrega y Firma Digital:** El transportista completa la entrega y recoge la firma del cliente en su dispositivo móvil.

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
## 3. Estructura de Datos Completa (Glosario de Entidades)

A continuación se detallan todas las interfaces y tipos de datos del proyecto, definidos en `src/types/index.ts`.

### Entidades Fundamentales

#### `ServiceOrder` / `Entrega`
Es la entidad central que representa un evento de catering o un pedido de entrega. Funciona como el contenedor principal.
- **id**: Identificador único.
- **serviceNumber**: Número de servicio visible para el cliente.
- **startDate, endDate**: Fechas del evento.
- **client, finalClient**: Cliente que contrata y cliente final.
- **contact, phone, email**: Datos de contacto.
- **asistentes**: Número de personas.
- **space, spaceAddress**: Información del lugar.
- **resp...**: Campos para responsables internos (Metre, Pase, Cocina, etc.).
- **comercialAsiste, rrhhAsiste**: Banderas para indicar asistencia de personal.
- **...Percentage, ...CommissionValue**: Campos para cálculo de comisiones.
- **facturacion, comisionesAgencia, comisionesCanon**: Totales financieros.
- **status**: Estado del servicio ('Borrador', 'Confirmado', 'Anulado', etc.).
- **vertical**: Distingue entre 'Catering' y 'Entregas'.
- **isVip**: Marca un evento como de alta importancia.

#### `ComercialBriefing` / `PedidoEntrega`
Representa el desglose de servicios (hitos) dentro de una OS.
- **osId**: Vínculo al `ServiceOrder` correspondiente.
- **items` / `hitos**: Array de `ComercialBriefingItem` o `EntregaHito`.

#### `ComercialBriefingItem` / `EntregaHito`
Define un servicio o entrega específica.
- **id**: Identificador único del hito.
- **fecha, horaInicio, horaFin**: Temporalidad.
- **conGastronomia**: (Catering) Booleano que activa los módulos de producción.
- **descripcion**: Nombre del servicio (ej. "Cena de Gala").
- **items**: (Entregas) Array de productos de venta directa.

### Entidades del Book Gastronómico

#### `Receta`
El plato final que se vende al cliente. Se compone de `ElaboracionEnReceta`.
- **id, nombre, categoria**: Identificación.
- **elaboraciones**: Array de elaboraciones necesarias.
- **menajeAsociado**: Lista del menaje necesario.
- **instrucciones...**: Pasos para mise en place, regeneración y emplatado.
- **perfilSabor...**, **perfilTextura**: Atributos gastronómicos.
- **costeMateriaPrima, precioVenta**: Campos calculados automáticamente.
- **alergenos**: Lista consolidada de alérgenos.
- **requiereRevision**: Bandera de alerta si un componente cambia.

#### `Elaboracion`
Una preparación intermedia o "sub-receta" (ej. una salsa).
- **id, nombre**: Identificación.
- **produccionTotal, unidadProduccion**: Cantidad que se produce (ej. 1 KILO).
- **partidaProduccion**: Departamento (FRIO, CALIENTE, etc.).
- **componentes**: Array de `ComponenteElaboracion` (ingredientes).
- **costePorUnidad**: Coste calculado.
- **formatoExpedicion**: Cómo se empaqueta (ej. "Barqueta 1kg").

#### `IngredienteInterno`
Puente entre la Materia Prima (ERP) y las recetas.
- **id, nombreIngrediente**: Identificación.
- **productoERPlinkId**: Vínculo al producto en `IngredienteERP`.
- **mermaPorcentaje**: % de merma del ingrediente.
- **alergenosPresentes, alergenosTrazas**: Listados de alérgenos.

#### `IngredienteERP`
La materia prima tal como se compra al proveedor.
- **id, nombreProductoERP, idProveedor**: Identificación.
- **precioCompra, unidad**: Coste y unidad de medida.

### Entidades de Producción y Logística

#### `OrdenFabricacion (OF)`
Un lote de producción para una elaboración.
- **id**: Identificador único del lote (ej. "OF-2024-001").
- **elaboracionId**: Qué se produce.
- **cantidadTotal, cantidadReal**: Cantidad planificada vs. final.
- **estado**: Ciclo de vida ('Pendiente', 'En Proceso', 'Finalizado', etc.).
- **osIDs**: IDs de las OS que necesitan esta producción.

#### `PickingSheet`
Documento para preparar material no gastronómico.
- **id, osId, fechaNecesidad**: Identificación.
- **items**: Listado de `OrderItem` a recoger.
- **status**: Estado ('Pendiente', 'En Proceso', 'Listo').
- **itemStates**: Registro del progreso y discrepancias.

#### `PickingState`
Estado de la logística de gastronomía para una OS.
- **osId**: El evento al que pertenece.
- **assignedContainers**: Array de contenedores isotermos a usar.
- **itemStates**: Array de `LoteAsignado` (qué lote va en qué contenedor).

#### `ReturnSheet`
Gestión de la devolución de material tras un evento.
- **id**: Coincide con el `osId`.
- **items**: Lista de artículos enviados.
- **itemStates**: Registro de cantidades devueltas e incidencias (roturas).

### Entidades de la Vertical de Entregas

#### `ProductoVenta`
Unidad de venta en el catálogo de Entregas.
- **id, nombre, categoria**: Identificación.
- **pvp, pvpIfema**: Precios de venta.
- **producidoPorPartner**: Booleano que determina quién produce.
- **recetaId**: Vínculo a una receta del Book.
- **componentes**: Si es un "Pack", contiene el desglose de artículos para almacén.

### Entidades de Portales Externos

#### `PortalUser`
Usuario que puede acceder a portales de colaboradores.
- **id, nombre, email**: Datos del usuario.
- **roles**: Array de roles ('Partner Gastronomia', 'Transporte', etc.).
- **proveedorId**: Vínculo a la empresa en la BD de `Proveedores`.

#### `PersonalExterno`
Solicitud de personal a una ETT para una OS.
- **osId**: La OS a la que pertenece.
- **turnos**: Array de `PersonalExternoTurno`.
- **status**: Estado ('Pendiente', 'Solicitado', 'Asignado', 'Cerrado').

#### `TransporteOrder`
Pedido de transporte.
- **osId**: El pedido al que sirve.
- **proveedorId**: Transportista asignado.
- **status**: Estado ('Pendiente', 'En Ruta', 'Entregado').
- **firmaUrl, firmadoPor**: Datos de la firma digital.
</pre>
                </div>
            </section>
        </>
    );
}

