

'use client';

import { useState, useEffect } from 'react';
import { Database, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ALL_DATABASE_KEYS = [
    'personal', 'espacios', 'articulos', 'tipoServicio', 'tiposPersonal', 'tiposTransporte',
    'atipicosDB', 'personalMiceOrders', 'decoracionDB', 
    'tiposCocina', 'pedidoPlantillas', 'formatosExpedicionDB', 'proveedores', 'serviceOrders', 
    'entregas', 'comercialBriefings', 'gastronomyOrders', 'materialOrders', 'transporteOrders', 
    'hieloOrders', 'decoracionOrders', 'atipicoOrders', 'personalExterno', 'personalExternoAjustes', 'pruebasMenu', 
    'pickingSheets', 'returnSheets', 'ordenesFabricacion', 'pickingStates', 'excedentesProduccion',
    'pedidosEntrega', 'personalEntrega', 'partnerPedidosStatus', 'activityLogs', 'ctaRealCosts', 
    'ctaComentarios', 'objetivosGastoPlantillas', 'defaultObjetivoGastoId', 'articulosERP', 'familiasERP',
    'ingredientesInternos', 'elaboraciones', 'recetas', 'categoriasRecetas', 'portalUsers',
    'comercialAjustes', 'productosVenta', 'pickingEntregasState', 'stockElaboraciones', 'personalExternoDB', 'historicoPreciosERP',
    'incidenciasRetorno'
];


const KEY_DESCRIPTIONS: Record<string, string> = {
    personal: 'Base de datos maestra del personal interno de MICE.',
    espacios: 'Base de datos maestra de los espacios para eventos.',
    articulos: 'Catálogo maestro de artículos de Almacén, Bodega, Bio y Alquiler.',
    articulosERP: 'Base de datos maestra de materia prima, con precios de proveedor.',
    familiasERP: 'Tabla de correspondencia entre códigos de familia de ERP y categorías MICE.',
    ingredientesInternos: 'Base de datos que vincula la materia prima (ERP) con las elaboraciones.',
    elaboraciones: 'Base de datos maestra de las sub-recetas (ej. salsas, guarniciones).',
    recetas: 'Base de datos maestra de los platos finales que se venden.',
    categoriasRecetas: 'Configuración de las categorías de las recetas (ej. "Aperitivos", "Postres").',
    tipoServicio: 'Configuración de los tipos de servicio para los briefings (ej. "Cocktail", "Cena").',
    tiposTransporte: 'Catálogo de vehículos y tarifas de las empresas de transporte.',
    atipicosDB: 'Catálogo de conceptos para gastos varios/atípicos.',
    decoracionDB: 'Catálogo de conceptos para gastos de decoración.',
    formatosExpedicionDB: 'Configuración de los formatos de empaquetado para producción (ej. "Barqueta 1kg").',
    proveedores: 'Base de datos maestra de todos los proveedores y sus datos fiscales.',
    tiposPersonal: 'Catálogo de categorías y tarifas del personal externo (ETTs).',
    personalExternoDB: 'Base de datos de trabajadores de ETTs.',
    objetivosGastoPlantillas: 'Plantillas para los objetivos de rentabilidad en la Cta. de Explotación.',
    defaultObjetivoGastoId: 'ID de la plantilla de objetivos de gasto por defecto.',
    pedidoPlantillas: 'Plantillas de pedidos de material para agilizar la creación.',
    portalUsers: 'Base de datos de usuarios externos con acceso a los portales.',
    activityLogs: 'Registro de auditoría de las acciones realizadas en los portales de colaboradores.',

    // Transactional Data
    serviceOrders: 'Datos transaccionales de las Órdenes de Servicio de Catering.',
    entregas: 'Datos transaccionales de los Pedidos de la vertical de Entregas.',
    comercialBriefings: 'Datos transaccionales que contienen los hitos (servicios) de cada OS.',
    comercialAjustes: 'Ajustes manuales a la facturación de una OS.',
    gastronomyOrders: 'Datos transaccionales de los pedidos de gastronomía para cada hito.',
    materialOrders: 'Datos transaccionales de los pedidos de material (Almacén, Bodega, Bio, Alquiler).',
    transporteOrders: 'Datos transaccionales de los pedidos de transporte.',
    hieloOrders: 'Datos transaccionales de los pedidos de hielo.',
    decoracionOrders: 'Datos transaccionales de los gastos de decoración asociados a eventos.',
    atipicoOrders: 'Datos transaccionales de los gastos atípicos asociados a eventos.',
    personalMiceOrders: 'Datos transaccionales de las asignaciones de personal interno a eventos.',
    personalExterno: 'Datos transaccionales de las solicitudes de personal a ETTs.',
    personalExternoAjustes: 'Ajustes manuales al coste del personal externo (dietas, etc.).',
    pruebasMenu: 'Datos transaccionales de las pruebas de menú asociadas a una OS.',
    pickingSheets: 'Datos transaccionales de las hojas de picking de almacén.',
    returnSheets: 'Datos transaccionales de la gestión de retornos de material.',
    ordenesFabricacion: 'Datos transaccionales de las órdenes de fabricación (lotes) del CPR.',
    pickingStates: 'Datos transaccionales del estado del picking de gastronomía para cada OS.',
    pedidosEntrega: 'Datos transaccionales con el desglose de productos de cada entrega.',
    personalEntrega: 'Datos transaccionales de la asignación de personal para la vertical de entregas.',
    partnerPedidosStatus: 'Registro del estado de los pedidos gestionados por partners externos.',
    ctaRealCosts: 'Almacena los costes reales introducidos manualmente en la Cta. de Explotación.',
    ctaComentarios: 'Almacena los comentarios de cada partida de coste en la Cta. de Explotación.',
    productosVenta: 'Catálogo de productos para la vertical de Entregas, incluyendo "Packs".',
    pickingEntregasState: 'Estado del picking para la vertical de Entregas.',
    stockElaboraciones: 'Inventario en tiempo real de las elaboraciones producidas y validadas por calidad.',
    historicoPreciosERP: 'Registro histórico de los precios de la materia prima.',
    incidenciasRetorno: 'Registro de incidencias detectadas durante la devolución de material.'
};



export default function DebugDbPage() {
  const [dbData, setDbData] = useState<Record<string, any>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const data: Record<string, any> = {};
    ALL_DATABASE_KEYS.forEach(key => {
        const storedData = localStorage.getItem(key);
        if (storedData) {
            try {
                data[key] = JSON.parse(storedData);
            } catch (e) {
                data[key] = storedData;
            }
        } else {
            data[key] = null;
        }
    });
    setDbData(data);
  }, []);

  const handleClearLocalStorage = () => {
    localStorage.clear();
    setDbData({});
    setShowConfirmDialog(false);
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Database />
            Visor de Bases de Datos (LocalStorage)
          </h1>
          <Button variant="destructive" onClick={() => setShowConfirmDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Borrar Todos los Datos
          </Button>
        </div>

        <Accordion type="multiple" className="w-full space-y-4">
          {Object.keys(dbData)
            .sort()
            .map((key) => (
              <AccordionItem value={key} key={key} className="border rounded-lg bg-muted/50">
                <AccordionTrigger className="p-4 hover:no-underline text-left">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-baseline gap-4">
                            <h3 className="text-lg font-semibold">{key}</h3>
                            <span className="text-sm text-muted-foreground">
                            (
                            {Array.isArray(dbData[key])
                                ? `${dbData[key].length} registros`
                                : typeof dbData[key] === 'object' && dbData[key] !== null
                                ? `${Object.keys(dbData[key]).length} claves`
                                : dbData[key] === null ? 'Vacío' : 'Valor'}
                            )
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-xl text-right pr-4">{KEY_DESCRIPTIONS[key] || 'Sin descripción.'}</p>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[400px] mt-2 border-t bg-background">
                    <pre className="p-4 text-xs whitespace-pre-wrap break-all">
                      {JSON.stringify(dbData[key], null, 2)}
                    </pre>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </main>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible y eliminará **TODOS** los datos de la aplicación almacenados en tu navegador, incluyendo órdenes de servicio, bases de datos maestras, etc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleClearLocalStorage}
            >
              Sí, borrar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
