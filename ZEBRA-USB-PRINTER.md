# ZEBRA-USB-PRINTER.md  
Implementación 100 % GRATIS y LOCAL – Impresión de etiquetas desde tablet → Zebra GK420d por USB (sin PrintNode, sin adaptador de red)

**Objetivo:**  
El operario pulsa un botón en la tablet → la Zebra GK420d conectada por USB al PC del almacén imprime la etiqueta en menos de 3 segundos.  

## 1. Tabla en Supabase (una sola vez)

```sql
create table print_jobs (
  id uuid primary key default uuid_generate_v4(),
  isotermo_id text not null,
  nombre text not null,
  contenido text not null,
  created_at timestamp default now()
);