
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

export default function DebugDbPage() {
  const [dbData, setDbData] = useState<Record<string, any>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
    }
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
              <AccordionItem value={key} key={key}>
                <AccordionTrigger className="p-4 bg-muted/50 rounded-lg hover:no-underline">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">{key}</h3>
                    <span className="text-sm text-muted-foreground">
                      (
                      {Array.isArray(dbData[key])
                        ? `${dbData[key].length} registros`
                        : typeof dbData[key] === 'object' && dbData[key] !== null
                        ? `${Object.keys(dbData[key]).length} claves`
                        : 'Valor'}
                      )
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[400px] mt-2 border rounded-md">
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
