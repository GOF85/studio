| table_name          | column_name                  | data_type                   | max_len | is_nullable | column_default                    |
| ------------------- | ---------------------------- | --------------------------- | ------- | ----------- | --------------------------------- |
| activity_logs       | id                           | uuid                        | null    | NO          | uuid_generate_v4()                |
| activity_logs       | user_id                      | uuid                        | null    | YES         | null                              |
| activity_logs       | accion                       | text                        | null    | NO          | null                              |
| activity_logs       | entidad                      | text                        | null    | YES         | null                              |
| activity_logs       | entidad_id                   | uuid                        | null    | YES         | null                              |
| activity_logs       | detalles                     | jsonb                       | null    | YES         | '{}'::jsonb                       |
| activity_logs       | created_at                   | timestamp with time zone    | null    | YES         | now()                             |
| articulo_packs      | id                           | uuid                        | null    | NO          | gen_random_uuid()                 |
| articulo_packs      | articulo_id                  | uuid                        | null    | NO          | null                              |
| articulo_packs      | erp_id                       | character varying           | 255     | NO          | null                              |
| articulo_packs      | cantidad                     | integer                     | null    | NO          | 1                                 |
| articulo_packs      | created_at                   | timestamp without time zone | null    | YES         | now()                             |
| articulo_packs      | updated_at                   | timestamp without time zone | null    | YES         | now()                             |
| articulos           | id                           | uuid                        | null    | NO          | gen_random_uuid()                 |
| articulos           | erp_id                       | text                        | null    | YES         | null                              |
| articulos           | nombre                       | text                        | null    | NO          | null                              |
| articulos           | categoria                    | text                        | null    | NO          | null                              |
| articulos           | es_habitual                  | boolean                     | null    | YES         | false                             |
| articulos           | precio_venta                 | numeric                     | null    | YES         | 0                                 |
| articulos           | precio_alquiler              | numeric                     | null    | YES         | 0                                 |
| articulos           | precio_reposicion            | numeric                     | null    | YES         | 0                                 |
| articulos           | unidad_venta                 | numeric                     | null    | YES         | null                              |
| articulos           | stock_seguridad              | numeric                     | null    | YES         | null                              |
| articulos           | tipo                         | text                        | null    | YES         | null                              |
| articulos           | loc                          | text                        | null    | YES         | null                              |
| articulos           | imagen                       | text                        | null    | YES         | null                              |
| articulos           | producido_por_partner        | boolean                     | null    | YES         | false                             |
| articulos           | partner_id                   | text                        | null    | YES         | null                              |
| articulos           | receta_id                    | text                        | null    | YES         | null                              |
| articulos           | subcategoria                 | text                        | null    | YES         | null                              |
| articulos           | created_at                   | timestamp with time zone    | null    | YES         | now()                             |
| articulos           | tipo_articulo                | character varying           | 20      | NO          | 'micecatering'::character varying |
| articulos           | pack                         | jsonb                       | null    | YES         | '[]'::jsonb                       |
| articulos           | audit                        | jsonb                       | null    | YES         | '[]'::jsonb                       |
| articulos           | alergenos                    | jsonb                       | null    | YES         | '[]'::jsonb                       |
| articulos           | doc_drive_url                | text                        | null    | YES         | null                              |
| articulos           | iva                          | numeric                     | null    | YES         | 10                                |
| articulos           | dpt_entregas                 | text                        | null    | YES         | null                              |
| articulos           | precio_venta_entregas        | numeric                     | null    | YES         | null                              |
| articulos           | precio_venta_entregas_ifema  | numeric                     | null    | YES         | null                              |
| articulos           | precio_coste                 | numeric                     | null    | YES         | null                              |
| articulos           | precio_coste_alquiler        | numeric                     | null    | YES         | null                              |
| articulos           | precio_alquiler_ifema        | numeric                     | null    | YES         | null                              |
| articulos           | precio_venta_ifema           | numeric                     | null    | YES         | null                              |
| articulos           | imagenes                     | jsonb                       | null    | YES         | '[]'::jsonb                       |
| articulos           | referencia_articulo_entregas | text                        | null    | YES         | null                              |
| articulos           | precio_alquiler_entregas     | numeric                     | null    | YES         | 0                                 |
| articulos_erp       | id                           | uuid                        | null    | NO          | uuid_generate_v4()                |
| articulos_erp       | nombre                       | text                        | null    | NO          | null                              |
| articulos_erp       | referencia_proveedor         | text                        | null    | YES         | null                              |
| articulos_erp       | proveedor_id                 | uuid                        | null    | YES         | null                              |
| articulos_erp       | familia_id                   | uuid                        | null    | YES         | null                              |
| articulos_erp       | precio_compra                | numeric                     | null    | YES         | 0                                 |
| articulos_erp       | unidad_medida                | text                        | null    | YES         | null                              |
| articulos_erp       | merma_defecto                | numeric                     | null    | YES         | 0                                 |
| articulos_erp       | alergenos                    | ARRAY                       | null    | YES         | null                              |
| articulos_erp       | created_at                   | timestamp with time zone    | null    | YES         | now()                             |
| articulos_erp       | erp_id                       | text                        | null    | YES         | null                              |
| articulos_erp       | nombre_proveedor             | text                        | null    | YES         | null                              |
| articulos_erp       | proveedor_preferente_id      | uuid                        | null    | YES         | null                              |
| articulos_erp       | familia_categoria            | text                        | null    | YES         | null                              |
| articulos_erp       | tipo                         | text                        | null    | YES         | null                              |
| articulos_erp       | categoria_mice               | text                        | null    | YES         | null                              |
| articulos_erp       | descuento                    | numeric                     | null    | YES         | 0                                 |
| articulos_erp       | precio                       | numeric                     | null    | YES         | 0                                 |
| articulos_erp       | precio_alquiler              | numeric                     | null    | YES         | 0                                 |
| articulos_erp       | unidad_conversion            | numeric                     | null    | YES         | 1                                 |
| articulos_erp       | stock_minimo                 | numeric                     | null    | YES         | 0                                 |
| articulos_erp       | alquiler                     | boolean                     | null    | YES         | false                             |
| articulos_erp       | gestion_lote                 | boolean                     | null    | YES         | false                             |
| articulos_erp       | observaciones                | text                        | null    | YES         | null                              |
| articulos_erp       | ubicaciones                  | ARRAY                       | null    | YES         | null                              |
| articulos_erp       | updated_at                   | timestamp with time zone    | null    | YES         | now()                             |
| atipico_orders      | id                           | uuid                        | null    | NO          | gen_random_uuid()                 |
| atipico_orders      | os_id                        | character varying           | 255     | NO          | null                              |
| atipico_orders      | fecha                        | date                        | null    | NO          | CURRENT_DATE                      |
| atipico_orders      | concepto                     | character varying           | 255     | NO          | null                              |
| atipico_orders      | observaciones                | text                        | null    | YES         | null                              |
| atipico_orders      | precio                       | numeric                     | null    | YES         | 0                                 |
| atipico_orders      | status                       | character varying           | 50      | YES         | 'Pendiente'::character varying    |
| atipico_orders      | created_at                   | timestamp with time zone    | null    | YES         | now()                             |
| atipico_orders      | updated_at                   | timestamp with time zone    | null    | YES         | now()                             |
| atipicos_catalogo   | id                           | uuid                        | null    | NO          | uuid_generate_v4()                |
| atipicos_catalogo   | nombre                       | text                        | null    | NO          | null                              |
| atipicos_catalogo   | proveedor_id                 | uuid                        | null    | YES         | null                              |
| atipicos_catalogo   | precio_referencia            | numeric                     | null    | YES         | 0                                 |
| atipicos_catalogo   | descripcion                  | text                        | null    | YES         | null                              |
| categorias_personal | id                           | uuid                        | null    | NO          | uuid_generate_v4()                |
| categorias_personal | nombre                       | text                        | null    | NO          | null                              |
| categorias_personal | precio_hora_base             | numeric                     | null    | YES         | 0                                 |
| categorias_personal | departamento                 | text                        | null    | YES         | null                              |
| categorias_recetas  | id                           | text                        | null    | NO          | null                              |
| categorias_recetas  | nombre                       | text                        | null    | NO          | null                              |
| categorias_recetas  | snack                        | boolean                     | null    | YES         | false                             |
| categorias_recetas  | created_at                   | timestamp with time zone    | null    | YES         | now()                             |
| clientes            | id                           | uuid                        | null    | NO          | uuid_generate_v4()                |
| clientes            | nombre                       | text                        | null    | NO          | null                              |
| clientes            | email                        | text                        | null    | YES         | null                              |
| clientes            | telefono                     | text                        | null    | YES         | null                              |
| clientes            | created_at                   | timestamp with time zone    | null    | YES         | now()                             |