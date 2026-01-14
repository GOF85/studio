# 👥 Manual de Usuario - Sistema de Gestión de Pedidos de Alquiler

**Para**: Usuarios finales del sistema  
**Versión**: 1.0  
**Fecha**: 10 Enero 2026

---

## 🎯 Guía Rápida (5 Minutos)

### ¿Qué es este sistema?
Sistema para gestionar pedidos de alquiler de espacios. Permite:
- 📝 Crear pedidos para proveedores
- ✏️ Editar cantidades de items
- 📊 Consolidar pedidos por fecha
- 📄 Generar PDFs para enviar

### Pasos Básicos

#### 1️⃣ **Crear un Nuevo Pedido**
```
1. Click en botón "Nuevo Pedido"
2. Seleccionar: Espacio (Sala/Cocina)
3. Seleccionar: Fecha de entrega
4. Seleccionar: Localización
5. Agregar items:
   - Click "Agregar Item"
   - Código del item (ej: "SILLA_01")
   - Cantidad (ej: 10)
   - Proveedor (opcional)
6. Click "Guardar Pedido"
```

**¿Listo? ✓**

---

#### 2️⃣ **Editar un Pedido Existente**
```
1. En tab "Pendientes" buscar el pedido
2. Click en botón "Editar"
3. Modificar cantidades de los items
4. Click "Guardar cambios"
```

**¿Hecho? ✓**

---

#### 3️⃣ **Consolidar y Generar PDF**
```
1. Ir a tab "Enviados"
2. Click botón "Generar PDF"
3. Seleccionar items a consolidar
4. Click "Crear PDF"
5. El PDF se descarga automáticamente
```

**¿Generado? ✓**

---

#### 4️⃣ **Descargar Pedido**
```
1. En tab "Enviados" buscar el pedido
2. Click en botón "Descargar PDF"
3. Archivo se descarga a tu carpeta "Descargas"
```

**¿Descargado? ✓**

---

## 📚 Guía Completa

### TAB 1: PEDIDOS PENDIENTES

**¿Para qué sirve?**  
Aquí ves todos los pedidos que aún no se han enviado a proveedores.

**Opciones disponibles:**

| Acción | Cómo hacerlo | Cuándo usarlo |
|--------|-------------|--------------|
| **Nuevo Pedido** | Click azul "Nuevo Pedido" | Crear nuevo pedido |
| **Editar** | Click en row → Editar | Cambiar cantidades |
| **Cambiar Sala** | Click en row → "Cambiar a Cocina" | Si seleccionaste mal la sala |
| **Eliminar** | Click en row → "Eliminar" | Cancelar pedido |
| **Ver detalles** | Click en la fila | Ver todos los items |

**Estados visuales:**
```
🟦 AZUL     = Pedido activo (listo para consolidar)
🟨 AMARILLO = Pendiente de revisión
🟧 NARANJA  = Requiere atención
```

---

### TAB 2: PEDIDOS ENVIADOS

**¿Para qué sirve?**  
Aquí ves los pedidos que ya se han consolidado y enviado a proveedores.

**Opciones disponibles:**

| Acción | Cómo hacerlo | Para qué |
|--------|-------------|---------|
| **Ver PDF** | Click "Ver PDF" | Abrir PDF en navegador |
| **Descargar PDF** | Click "Descargar" | Guardar PDF en tu equipo |
| **Ver detalles** | Click en la fila | Ver items consolidados |
| **Email** | Click "Enviar por email" | Enviar PDF a proveedor (próximo) |

---

## 🎯 Casos de Uso Comunes

### Caso 1: Primer pedido del día

```
1. Abre el sistema
2. Click "Nuevo Pedido"
3. Selecciona:
   - Espacio: "Sala de Eventos"
   - Fecha: 15 Enero 2026
   - Ubicación: "Principal"
4. Agrega items:
   - Item 1: Sillas (cantidad: 100)
   - Item 2: Mesas (cantidad: 10)
   - Item 3: Vajilla (cantidad: 200)
5. Click "Guardar"
✅ Pedido guardado
```

---

### Caso 2: Actualizar cantidad de un item

```
1. Tab "Pendientes"
2. Busca el pedido
3. Click "Editar"
4. Cambiar cantidad de "Sillas" de 100 → 120
5. Click "Guardar cambios"
✅ Cantidad actualizada
```

---

### Caso 3: Enviar pedido al proveedor

```
1. Tab "Enviados"
2. Click "Generar PDF"
3. Selecciona los pedidos a consolidar
4. Click "Crear PDF"
5. Archivo se descarga automáticamente
6. Ahora puedes enviar el PDF al proveedor
✅ PDF listo para enviar
```

---

### Caso 4: Consultar un pedido antiguo

```
1. Tab "Enviados"
2. Busca la fecha o número de expediente
3. Click en el pedido
4. Puedes:
   - Ver todos los items
   - Descargar PDF nuevamente
   - Ver cuándo se creó
✅ Información disponible
```

---

## ⚠️ Errores Comunes y Soluciones

### Error 1: "No puedo agregar items"
```
Causa: Campo vacío o número inválido
Solución:
  1. Revisa que ingreses números positivos (>0)
  2. Revisa que el código del item no esté vacío
  3. Intenta nuevamente
```

### Error 2: "PDF no descarga"
```
Causa: Bloqueador de popups activo
Solución:
  1. Desactiva el bloqueador de popups
  2. O baja el PDF en 5 segundos
  3. Intenta nuevamente
```

### Error 3: "Pedido no aparece en Pendientes"
```
Causa: Ya fue consolidado (está en Enviados)
Solución:
  1. Busca en tab "Enviados"
  2. Si no está, contacta a soporte
```

### Error 4: "¿Cómo edito un pedido ya enviado?"
```
Respuesta: No se puede editar pedidos enviados
Solución: Crear un nuevo pedido de corrección
```

---

## 🔒 Preguntas de Seguridad

### ¿Mis datos están seguros?
✅ Sí. Base de datos encriptada, solo tú puedes verlos.

### ¿Quién puede ver mis pedidos?
✅ Solo tú y el equipo autorizado (RLS configurado).

### ¿Los PDFs son privados?
✅ Sí, generados en el servidor y encriptados.

### ¿Qué pasa si pierdo conexión?
✅ Tus cambios se guardan automáticamente cuando envías.

---

## 📞 Soporte

### Tengo una pregunta
→ Lee esta guía primero  
→ Si no encuentras respuesta, contacta a: **support@company.com**

### Encontré un error
→ Screenshot del error  
→ Qué estabas haciendo  
→ Envialo a: **bugs@company.com**

### El sistema está lento
→ Intenta:
  1. Refrescar la página (F5)
  2. Limpiar caché (Ctrl+Shift+Delete)
  3. Usar otro navegador
  4. Si persiste, contacta a soporte

### No puedo iniciar sesión
→ Verifica:
  1. Usuario y contraseña correctos
  2. Conexión a internet
  3. Cookies habilitadas
  4. Si aún falla, contacta IT

---

## 🎓 Consejos Útiles

### Tip 1: Guardar PDFs organizados
```
Recomendado crear carpeta:
  📁 Pedidos_Alquiler/
     📁 2026/
        📁 Enero/
           📄 Pedido_Sala_15_Enero.pdf
           📄 Pedido_Cocina_15_Enero.pdf
```

### Tip 2: Consolidar en momentos específicos
```
Recomendado:
  ✅ Todas las mañanas: revisar pendientes
  ✅ Mediodía: consolidar primer lote
  ✅ Tarde: consolidar segundo lote
  ✅ Final del día: confirmación
```

### Tip 3: Verificar PDFs antes de enviar
```
Checklist:
  ☑️ Fecha correcta
  ☑️ Items y cantidades correctas
  ☑️ Localización correcta
  ☑️ Proveedor correcto
  → Enviar
```

### Tip 4: Usar búsqueda para agilizar
```
En lugar de buscar manualmente:
  1. Click en buscador
  2. Tipea la fecha o número
  3. Sistema filtra automáticamente
```

---

## 📋 Checklists

### Checklist: Crear Pedido Completo
- [ ] Espacio seleccionado (Sala o Cocina)
- [ ] Fecha de entrega seleccionada
- [ ] Localización especificada
- [ ] Mínimo 1 item agregado
- [ ] Cantidades son números positivos
- [ ] Proveedor especificado (si aplica)
- [ ] Click "Guardar"
- [ ] Confirmación visual ✓

### Checklist: Antes de Generar PDF
- [ ] Todos los pedidos que deseas están en "Pendientes"
- [ ] Revisaste cantidades
- [ ] Fecha de entrega correcta
- [ ] Localización correcta
- [ ] Items tienen sentido juntos

### Checklist: Antes de Enviar PDF
- [ ] PDF generado correctamente
- [ ] Datos visibles y legibles
- [ ] Totales son correctos
- [ ] Formato profesional ✓

---

## 🚀 Siguiente Paso

Después de usar el sistema:
1. Proporciona feedback en: **feedback@company.com**
2. Reporta problemas inmediatamente
3. Sugiere mejoras

**Gracias por usar el sistema. ¡Esperamos que lo encuentres útil!**

---

## 📱 Disponibilidad

```
📅 Lunes - Viernes: 08:00 - 18:00
📞 Emergencias: +34 XXX XXX XXX
📧 Email: support@company.com
💬 Slack: #pedidos-alquiler
```

---

**Manual de Usuario v1.0**  
Última actualización: 10 Enero 2026  
Próxima revisión: 15 Enero 2026
