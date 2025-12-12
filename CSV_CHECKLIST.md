# 🚀 Checklist de Importar/Exportar CSV

## ✅ Verificaciones Completadas

### Tabla Micecatering (`/bd/articulos`)
- [x] CSV Headers correctos (19 columnas)
- [x] Campos nuevos incluidos (iva, doc_drive_url)
- [x] handleImportCSV implementado correctamente
- [x] handleExportCSV implementado correctamente
- [x] Filtrado por tipo_articulo = 'micecatering'
- [x] Parseo de números
- [x] Conversión de booleanos
- [x] IVA default a 10%
- [x] Validación de headers
- [x] Manejo de errores
- [x] Toast notifications
- [x] Nombre de archivo descriptivo

### Tabla Entregas (`/bd/articulos-entregas`)
- [x] CSV Headers correctos (19 columnas)
- [x] Campos nuevos incluidos (precio_coste_alquiler, iva, doc_drive_url)
- [x] handleImportCSV implementado correctamente
- [x] handleExportCSV implementado correctamente
- [x] Filtrado por tipo_articulo = 'entregas'
- [x] Parseo de números
- [x] Conversión de booleanos
- [x] IVA default a 10%
- [x] Validación de headers
- [x] Manejo de errores
- [x] Toast notifications
- [x] Nombre de archivo descriptivo

### Sistema de Soporte
- [x] Schemas actualizados (camelCase)
- [x] Tipos actualizados (ArticuloCatering)
- [x] Data store mejorado (parseJSON, parseNumber)
- [x] Documentación completa (CSV_GUIDE.md)
- [x] Archivos de prueba creados
- [x] Compilación sin errores

---

## 📋 Especificaciones Rápidas

### Micecatering
```
Columnas: id, erp_id, nombre, categoria, es_habitual, precio_venta, 
         precio_alquiler, precio_reposicion, unidad_venta, stock_seguridad, 
         tipo, loc, imagen, producido_por_partner, partner_id, receta_id, 
         subcategoria, iva, doc_drive_url
Filtro: tipo_articulo = 'micecatering'
Archivo: articulos-micecatering.csv
```

### Entregas
```
Columnas: id, erp_id, nombre, categoria, referencia_articulo_entregas, 
         dpt_entregas, precio_venta_entregas, precio_venta_entregas_ifema, 
         precio_coste, precio_coste_alquiler, precio_alquiler_ifema, 
         unidad_venta, loc, imagen, producido_por_partner, partner_id, 
         subcategoria, iva, doc_drive_url
Filtro: tipo_articulo = 'entregas'
Archivo: articulos-entregas.csv
```

---

## 🎯 Próximas Acciones (Opcionales)

- [ ] Crear interfaz de descarga de plantilla
- [ ] Agregar validación adicional en servidor
- [ ] Implementar modo batch para grandes importaciones
- [ ] Agregar logs de auditoría para importaciones
- [ ] Crear reportes de importación/exportación
- [ ] Agregar soporte para múltiples delimitadores automáticos

---

## 📝 Notas Importantes

1. **Los datos vienen correctamente parseados desde Supabase**
   - JSON strings se convierten a objetos automáticamente
   - Números se parsean correctamente
   - Booleanos se manejan correctamente

2. **El tipo_articulo es seguro**
   - Se asigna automáticamente durante importación
   - No aparece en el CSV que descarga el usuario
   - Garantiza integridad de datos

3. **Los headers son case-sensitive**
   - Deben coincidir exactamente
   - La validación es estricta

4. **IVA tiene valor default**
   - Si no está especificado: 10%
   - Se puede sobrescribir en el CSV

---

## 🧪 Pruebas Realizadas

✅ Validación de headers
✅ Parseo de datos numéricos
✅ Conversión de booleanos
✅ Manejo de valores nulos
✅ Filtrado por tipo
✅ Descarga de archivos
✅ Compilación sin errores

**STATUS: ✅ COMPLETAMENTE FUNCIONAL Y LISTO PARA PRODUCCIÓN**
