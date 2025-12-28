## 6. Propuestas de mejora y decisiones de diseño

### UX/UI y flujo de trabajo
- Wizard de devoluciones orientado a cada módulo, guiando al usuario por referencias/materiales pendientes.
- Dashboard visual de devoluciones y mermas por OS, con alertas y semáforos según % devuelto y merma.
- Acceso rápido a registro de incidencias de material desde la pantalla de devolución.
- Histórico y trazabilidad accesible, con logs por referencia, usuario y acción, filtros y búsqueda.
- Validaciones proactivas: mensajes claros si se intenta devolver más de lo pedido, bloqueo automático al llegar al 100%.
- Acciones rápidas: “Devolver todo”, “Registrar merma”, “Registrar incidencia”.
- Notificaciones visuales/badges en la OS si hay mermas o incidencias.
- Campo de observaciones voluntario en cualquier artículo devuelto/mermado.
- Soporte para exportar informes de devoluciones/mermas por OS (valorado para futuro).

### Backend y modelo de datos
- Tablas separadas para devoluciones/mermas, con histórico inmutable (cada corrección es un nuevo registro).
- Clave única (os_id, articulo_id) para sumar pedidos y devoluciones.
- Penalización de merma en alquiler automática según coste de reposición del artículo.
- Registro de usuario, timestamp, motivo y observaciones en cada devolución/merma.
- Preparado para integración futura con inventario físico y facturación.
- Estado de cierre de OS: bloquea nuevas devoluciones/mermas y permite integración con facturación.
- Permisos y roles preparados para futura gestión granular.
- Documentación técnica y de usuario exhaustiva y actualizada.

## 7. Decisiones y matices recientes
- El cierre de OS bloquea devoluciones/mermas y activa integración con facturación.
- No se requiere soporte multilingüe.
- No aplica gestión de lotes/caducidad.
- Exportación de informes de devoluciones/mermas es valorable y se prepara la estructura para ello.
- El sistema debe ser usable en móvil/tablet, pero no es prioritario el soporte offline.
- El histórico de logs es fundamental para inspección interna y contexto IA.
- El campo de observaciones es voluntario y puede usarse en cualquier devolución/merma.
- El dashboard y wizard deben ser intuitivos y guiar al usuario en todo el proceso.
- La penalización de merma en alquiler se calcula automáticamente.
- El impacto económico de la merma se muestra como línea separada en la cuenta de explotación, pero se imputa al gasto del módulo.
- El sistema debe estar preparado para futuras integraciones y ampliaciones.

## 8. Resumen de respuestas a la consultoría (Consolidado)

Tras la fase de consultoría, se han tomado las siguientes decisiones finales:
1. **Acceso al Wizard:** El asistente de devoluciones será accesible tanto desde cada módulo individual como desde un panel global de la Orden de Servicio (OS).
2. **Visibilidad del Dashboard:** El panel de control de devoluciones y mermas estará restringido a roles específicos (Responsables de OS y personal de Almacén).
3. **Notificaciones y Badges:** Se implementarán indicadores visuales (badges) tanto en los listados globales de OS como en la vista detallada interna para alertar sobre mermas o incidencias.
4. **Registro de Incidencias:** Se permitirá adjuntar evidencias gráficas (fotos) y documentos para justificar el estado del material o los motivos de la merma.
5. **Sugerencias Automáticas:** El sistema detectará discrepancias y sugerirá acciones proactivas, como "Registrar merma" si la cantidad devuelta es inferior a la esperada.
6. **Reversibilidad del Cierre:** El cierre de la OS será reversible por usuarios autorizados, permitiendo correcciones, pero siempre dejando un rastro de auditoría (log) del motivo de la reapertura.
7. **Integración con Facturación:** No será automática; se habilitará un proceso manual de "Enviar a Facturación" una vez la OS esté cerrada y revisada.
8. **Gestión de Logs:** Los registros de actividad serán totalmente filtrables y exportables por usuario, fecha, referencia y tipo de acción.
9. **Documentación:** Se generará documentación tanto técnica (para mantenimiento) como de usuario final (manuales de uso).
10. **Alcance Inicial:** Se priorizarán estos flujos antes de añadir integraciones adicionales con otros módulos externos.

---

# Plan Técnico y Arquitectura de la Solución (Implementado)

## 1. Modelo de Datos (Supabase/PostgreSQL)

Se han implementado las siguientes tablas utilizando `numero_expediente` como clave de relación para máxima compatibilidad con el sistema actual:

### `os_devoluciones`
- `id`: uuid (PK)
- `os_id`: varchar (FK -> eventos.numero_expediente)
- `articulo_id`: varchar (ERP_ID del artículo)
- `cantidad`: integer
- `usuario_id`: uuid (FK -> auth.users)
- `fecha`: timestamptz
- `modulo`: varchar (Bodega, Bio, Almacen, Alquiler)
- `observaciones`: text
- `es_correccion`: boolean

### `os_mermas`
- `id`: uuid (PK)
- `os_id`: varchar (FK -> eventos.numero_expediente)
- `articulo_id`: varchar
- `cantidad`: integer
- `motivo`: varchar
- `coste_impacto`: numeric(12, 2) (Calculado: cantidad * precio_reposicion)
- `usuario_id`: uuid
- `fecha`: timestamptz

### `os_incidencias_material`
- `id`: uuid (PK)
- `os_id`: varchar (FK -> eventos.numero_expediente)
- `articulo_id`: varchar
- `descripcion`: text
- `fotos`: text[]
- `usuario_id`: uuid
- `fecha`: timestamptz

### `os_estados_cierre`
- `os_id`: varchar (PK, FK -> eventos.numero_expediente)
- `cerrada`: boolean
- `fecha_cierre`: timestamptz
- `usuario_cierre`: uuid
- `motivo_reapertura`: text

### `os_logistica_logs` (Auditoría)
- `id`: uuid (PK)
- `os_id`: varchar (FK -> eventos.numero_expediente)
- `usuario_id`: uuid
- `accion`: varchar (REGISTRO_DEVOLUCION, REGISTRO_MERMA, CIERRE_OS, REAPERTURA_OS)
- `detalles`: jsonb (Datos técnicos del cambio)
- `fecha`: timestamptz

### `atipico_orders` (Migrado de localStorage)
- `id`: uuid (PK)
- `os_id`: varchar (FK -> eventos.numero_expediente)
- `fecha`: date
- `concepto`: varchar
- `precio`: numeric(12, 2)
- `status`: varchar (Pendiente, Aprobado, Rechazado)

## 2. Lógica de Negocio y Cálculos (Implementado)

- **Cálculo de Consumo:** `Consumo = Pedido - Devoluciones - Mermas`.
- **Validación de Cantidades:** `(Suma Devoluciones + Suma Mermas) <= Cantidad Pedida`.
- **Impacto Económico:** Las mermas se valoran al `precio_reposicion` definido en el catálogo de artículos.
- **Bloqueo de Cierre:** Cuando `os_estados_cierre.cerrada` es true, la UI deshabilita el Wizard y cualquier edición de logística.
- **Auditoría:** Cada acción relevante genera un registro en `os_logistica_logs` para trazabilidad total.
- **Triggers de Auditoría:** Cada inserción en `os_devoluciones` o `os_mermas` disparará una actualización en una tabla de resumen o vista materializada para el Dashboard.
- **Seguridad (RLS):** Políticas de Supabase para asegurar que solo roles autorizados puedan insertar/editar registros de cierre o ver el dashboard global.

## 3. Arquitectura de Frontend (React/Next.js)

### Hooks Personalizados
- `useDevoluciones(osId)`: Gestión de CRUD de devoluciones.
- `useMermas(osId)`: Gestión de CRUD de mermas e impacto económico.
- `useOSStatus(osId)`: Control de estado de cierre y permisos de edición.

### Componentes UI (Shadcn/UI)
- `DevolucionesWizard`: Componente por pasos que filtra artículos por módulo y guía el registro.
- `OSDashboardSummary`: Widget visual con gráficos de barras/donas sobre el estado del material.
- `IncidenciaForm`: Formulario con dropzone para subida de imágenes a Supabase Storage.

## 4. Flujo de Implementación (Roadmap)

1. **Fase 1: Infraestructura:** Creación de tablas en Supabase y configuración de Storage para fotos.
2. **Fase 2: Capa de Datos:** Implementación de hooks y validaciones en el lado del servidor (RPC o Triggers).
3. **Fase 3: UI de Registro:** Desarrollo del Wizard de devoluciones y formulario de incidencias.
4. **Fase 4: Dashboard y Cierre:** Implementación del panel de control y lógica de bloqueo por cierre de OS.
5. **Fase 5: Auditoría y Exportación:** Sistema de logs y generación de informes en PDF/CSV.

---

Este documento sirve como base para la ejecución técnica inmediata.
# Estructura y Gestión de Devoluciones y Mermas en Órdenes de Servicio

## 1. Reglas por módulo

| Módulo        | ¿Devoluciones? | ¿Mermas? | ¿Impacta gasto? | Observaciones                                  |
|---------------|:--------------:|:--------:|:---------------:|-----------------------------------------------|
| Gastronomía   | No             | No       | Sí              | Todo lo pedido se da por consumido             |
| Bodega        | Sí             | Sí       | Sí              | Consumo = pedido - devolución; merma si falta  |
| Bio           | Sí             | Sí       | Sí              | Igual que Bodega                               |
| Almacén       | Sí             | Sí       | Sí              | Es alquiler, siempre debe haber devolución     |
| Alquiler      | Sí             | Sí       | Sí              | Igual que Almacén, pero Partner externo        |
| Decoración    | No             | No       | Sí              | Todo consumido                                 |
| Atípicos      | No             | No       | Sí              | Todo consumido                                 |
| Hielo         | No             | No       | Sí              | Todo consumido                                 |
| Personal      | No             | No       | Sí              | Solo gasto, no aplica                          |
| Transporte    | No             | No       | Sí              | Solo gasto, no aplica                          |
| Prueba menú   | No             | No       | Sí              | Solo gasto, no aplica                          |

## 2. Claves y sumatorios
- La clave única para sumar pedidos y devoluciones es `(os_id, articulo_id)`.
- Siempre se trabaja en unidades enteras.
- El coste de reposición para penalización de merma en alquiler está en el campo correspondiente del artículo MICE.

## 3. Devoluciones y mermas
- Se pueden registrar varias devoluciones parciales por referencia/material, con histórico (quién, cuándo, cantidad).
- Se puede anular o corregir una devolución, siempre dejando histórico de quién lo hace.
- El usuario se toma del login/sesión.
- No es necesaria firma digital.
- Solo se permite sumar devoluciones hasta el máximo pedido; si se supera, se notifica al usuario.
- La merma nunca puede ser positiva.
- El cálculo de merma y consumo debe ser visible por referencia y como sumatorio global por módulo.
- El histórico de devoluciones/mermas debe estar disponible para inspección interna.
- El sistema debe bloquear la devolución si ya se ha devuelto el 100% del material.
- Si el material está en mal estado, se devolverá igualmente, pero se debe registrar una incidencia/documentación.
- El impacto económico de la merma debe mostrarse como línea separada en la cuenta de explotación, pero imputarse al gasto del módulo.
- No se requiere validación de devoluciones, pero cualquier edición deja registro.
- El sistema debe estar preparado para futura integración con inventario físico/ERP.

## 4. Inventario y almacén
- Existirá una gestión de inventario de artículos MICE por parte del almacén.
- El inventario tendrá en cuenta los inventarios iniciales, los consumos de las órdenes de servicio, los pedidos enviados y las devoluciones recibidas.

## 5. Notas de integración y robustez
- El sistema debe permitir una UI independiente para devoluciones, usable en móvil/tablet.
- El impacto económico de la merma debe mostrarse en tiempo real.
- Las devoluciones y mermas deben estar siempre auditadas (usuario, fecha, acción).
- El sistema debe estar preparado para notificaciones visuales de mermas significativas.
- Alquiler y almacén funcionan igual, solo cambia la propiedad del material y la penalización.

---

Este documento se irá actualizando conforme se avance en la implementación y se concreten detalles adicionales.
