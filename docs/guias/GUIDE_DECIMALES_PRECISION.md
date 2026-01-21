# 📖 Guía: Trabajar con Decimales Precisos

## 🎯 Casos de Uso Comunes

### 1. Especias y Condimentos

**Ejemplo: Saffran (Azafrán)**
```
Receta base: 100g de producto final
Azafrán: 0.001 kg = 1 gramo

Ahora soporta:
- Ajustes pequeños: 0.000500 kg
- Mayor precisión: 0.001234 kg
- Historial exacto de uso
```

**Pasos en la app**:
1. Registrar producción: 100g
2. Ingrediente azafrán: ingresa `0.001` ✓
3. Cantidad real usada: ingresa `0.001002` ✓ (ahora soportado)
4. Merma automática: 0.000002 kg (muy preciso)

---

### 2. Pectina o Gelificantes

**Ejemplo: Pectina en Mermelada**
```
Receta base: 5kg de mermelada
Pectina: 0.050 kg = 50 gramos

Antes:
- Máximo: 0.050 (solo 3 decimales)
- Sugerencias: 0.050 (sin precisión)

Ahora:
- Exacto: 0.050000
- Ajustes: 0.048750, 0.051250
- Historial completo: 6 decimales
```

**Ejemplo de uso**:
```
Producción 1: Pectina usada 0.048 kg
Producción 2: Pectina usada 0.050 kg
Producción 3: Pectina usada 0.049 kg

Factor promedio: 0.982667
Escandallo original: 0.050000 kg
Ajuste sugerido: 0.049133 kg ✓ (6 decimales)
```

---

### 3. Ajo o Aceites Aromáticos

**Ejemplo: Aceite de Trufa**
```
Receta base: 1 litro de aceite
Aceite de trufa: 0.005 L = 5 mL

Nuevo formato con 6 decimales:
- Historial: 0.005000, 0.005050, 0.004950
- Promedio: 0.005000
- Sugerencia: 0.005000 (más exacta)
```

---

## Ejemplo de decimales

```sh
# Código de ejemplo
echo "123.456"
```

## 🔧 Configuración en la App

### Input de Cantidad Real

```tsx
<Input
  type="number"
  step="0.001"              // Permite 3 decimales por paso
  value={cantidadReal}
  onChange={handleChange}
  placeholder="0"
/>
```

**Cómo usarlo**:
- Puedes escribir directamente: `0.008350` ✓
- O usar las flechas: cada paso suma 0.001
- Máximo soportado: 6 decimales (0.000001)

---

## 📊 Ejemplos en Tabla de Componentes

### Antes (3 decimales)
```
Ingrediente          Plan.     Real     Merma
Tomillo Fresco      0.001    0.001    0.000
Azafrán             0.001    0.001    0.000  ← Perdemos precisión
Pectina             0.050    0.050    0.000
```

### Ahora (6 decimales)
```
Ingrediente          Plan.          Real           Merma
Tomillo Fresco      0.001000       0.001020       0.000020
Azafrán             0.001000       0.000998       0.000002  ← Exacto
Pectina             0.050000       0.049875       0.000125
```

---

## 💡 Tips Prácticos

### Tip 1: Ingreso de Pequeñas Cantidades

**Malo**: `0.05` (ambiguo, ¿cuántos decimales reales?)
**Bueno**: `0.050000` (claro, 50 mililitros)

```
Para especias: ingresa siempre con precisión
- Tomillo: 0.001000 (1 gramo exacto)
- Pimienta: 0.000500 (0.5 gramos exacto)
```

### Tip 2: Usar Conversiones Mentales

```
Ejemplo con Azafrán:
- 0.001 kg = 1 g = 1000 mg
- 0.000001 kg = 0.001 g = 1 mg

Si necesitas 1.5 mg:
- Convierte: 1.5 mg = 0.0000015 kg ❌ (muy pequeño)
- O en gramos: 1.5 mg = 0.0015 g = 0.0000015 kg

Recomendación: Usa unidades mayores (g en lugar de mg)
```

### Tip 3: Revisar Sugerencias

Las sugerencias ahora tienen 6 decimales:

```
Dialog de cambios:
Componente: Tomillo Fresco
Actual:      0.001000 kg
Sugerido:    0.001050 kg (5% más)
Factor:      1.050000
Cambio:      +5.00%
```

---

## 🧮 Cálculos Matemáticos

### Factor de Ajuste

```javascript
Factor = cantidad_utilizada / cantidad_planificada

Ejemplo:
- Planificado: 0.050000 kg pectina
- Utilizado: 0.048750 kg pectina
- Factor: 0.048750 / 0.050000 = 0.975000

Interpretación: Usamos 97.5% de lo planificado
(2.5% de eficiencia mejorada)
```

### Escandallo Sugerido

```javascript
Nuevo_Escandallo = Escandallo_Actual × Factor_Promedio

Ejemplo con 3 producciones:
- Producción 1: Factor = 0.975000
- Producción 2: Factor = 0.980000
- Producción 3: Factor = 0.985000

Factor_Promedio = (0.975000 + 0.980000 + 0.985000) / 3 = 0.980000

Si escandallo actual es 0.050000:
Nuevo_Escandallo = 0.050000 × 0.980000 = 0.049000
```

---

## 🔍 Verificación en Base de Datos

### Consulta para ver datos guardados

```sql
-- Ver una producción con todos sus componentes
SELECT 
  id,
  fecha_produccion,
  cantidad_real_producida,
  ratio_produccion,
  componentes_utilizados
FROM elaboracion_producciones
WHERE elaboracion_id = 'tu-elaboracion-id'
ORDER BY fecha_produccion DESC
LIMIT 1;

-- Resultado esperado:
{
  "id": "prod-123",
  "fecha_produccion": "2025-01-15T10:30:00Z",
  "cantidad_real_producida": 100.000000,
  "ratio_produccion": 0.9800,
  "componentes_utilizados": [
    {
      "componenteId": "comp-456",
      "nombre": "Tomillo Fresco",
      "cantidad_planificada": 0.001000,
      "cantidad_utilizada": 0.001002,
      "merma": 0.000002
    },
    {
      "componenteId": "comp-789",
      "nombre": "Pectina",
      "cantidad_planificada": 0.050000,
      "cantidad_utilizada": 0.048750,
      "merma": 0.001250
    }
  ]
}
```

### Consulta para ver escandallos actualizados

```sql
-- Ver escandallos de una elaboración
SELECT 
  id,
  componente_id,
  cantidad_neta,
  updated_at
FROM elaboracion_componentes
WHERE elaboracion_padre_id = 'tu-elaboracion-id'
ORDER BY updated_at DESC;

-- Resultado esperado:
id              | componente_id | cantidad_neta | updated_at
----------------|---------------|---------------|---------------------
comp-row-001    | comp-456      | 0.001050      | 2025-01-15 10:45:00
comp-row-002    | comp-789      | 0.049000      | 2025-01-15 10:45:00
comp-row-003    | comp-012      | 0.100000      | 2025-01-14 12:00:00
```

---

## 🎓 Casos Especiales

### Caso 1: Ingrediente Muy Pequeño

**Problema**: Tengo que usar 2 mg de especial aromático

**Solución**:
```
1. Convertir a kg: 2 mg = 0.000002 kg ✓ (soportado)
2. Registrar: cantidad_utilizada = 0.000002
3. Sistema calcula merma automáticamente
4. Historial preciso para futuras mejoras
```

### Caso 2: Ingrediente Volátil con Evaporación

**Escenario**: Alcohol que se evapora durante cocción

```
Receta: 0.500000 L alcohol
Producción 1: Usado 0.450000 L (10% evaporación)
Producción 2: Usado 0.449500 L (10.1% evaporación)
Producción 3: Usado 0.450500 L (9.9% evaporación)

Factor promedio: 0.900000
Sistema sugiere: 0.500000 × 0.900000 = 0.450000 L

Nuevo escandallo: 0.450000 L (ajustado por evaporación)
```

### Caso 3: Mejora Continua en Eficiencia

**Escenario**: Aprendemos a usar menos ingrediente

```
Semana 1: 0.050000 kg (original)
Semana 2: Factor 0.980000 (2% mejora)
          → Sugiere: 0.049000 kg ✓

Semana 3-4: Factor 0.985000 (con nuevo escandallo)
            → Sugiere: 0.048265 kg ✓

Semana 5-6: Factor 0.990000 (más mejora)
            → Sugiere: 0.047785 kg ✓

Resultado: 4.4% mejora en eficiencia después de 6 semanas
```

---

## ✅ Checklist de Implementación

- [x] Inputs aceptan 6 decimales
- [x] Datos se guardan con 6 decimales
- [x] Sugerencias calculadas con 6 decimales
- [x] Dialog muestra 6 decimales
- [x] BD almacena con precisión correcta
- [x] Compatibilidad con datos antiguos
- [x] Sin migraciones requeridas
- [x] Testing completado

---

## 🚀 Próximas Mejoras Sugeridas

1. **Convertidor de Unidades**: Mg → G → KG automático
2. **Historial de Cambios**: Ver cómo evolucionó cada ingrediente
3. **Análisis de Tendencias**: Gráficos de eficiencia por ingrediente
4. **Alertas de Desviación**: Notificar si algo sale fuera de rango

---

**Última actualización**: 2025-01-15
**Versión**: 1.0
**Precisión soportada**: 0.000001 (6 decimales)

## Otro ejemplo

```sh
# Otro bloque de código
echo "789.012"
```

## Más ejemplos

```sh
# Más código
echo "345.678"
```

## Último ejemplo

```sh
# Último bloque
echo "901.234"
```

- Elemento de lista
