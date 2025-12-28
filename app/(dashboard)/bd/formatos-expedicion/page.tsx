
'use client';

import { useState, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import Papa from 'papaparse';
import { downloadCSVTemplate } from '@/lib/utils';
import { useFormatosExpedicion, useUpsertFormatoExpedicion, useDeleteFormatoExpedicion } from '@/hooks/use-data-queries';

const CSV_HEADERS = ["id", "nombre"];

function FormatosExpedicionPageContent() {
  const { data, isLoading } = useFormatosExpedicion();
  const items = data || [];
  const upsertMutation = useUpsertFormatoExpedicion();
  const deleteMutation = useDeleteFormatoExpedicion();

  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteMutation.mutateAsync(itemToDelete);
      toast({ title: 'Formato eliminado' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: async (results) => {
        if (!results.meta.fields || !CSV_HEADERS.every(field => results.meta.fields?.includes(field))) {
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas: ${CSV_HEADERS.join(', ')}` });
          setIsImportAlertOpen(false);
          return;
        }

        const importedData = results.data.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          nombre: item.nombre
        }));

        try {
          await upsertMutation.mutateAsync(importedData);
          toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        }
        setIsImportAlertOpen(false);
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        setIsImportAlertOpen(false);
      }
    });
    if (event.target) event.target.value = '';
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
      return;
    }

    const csv = Papa.unparse(items, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `formatos_expedicion.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Formatos de Expedición..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[2rem] bg-primary/10 text-primary shadow-inner">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Formatos de Expedición</h1>
              <p className="text-sm font-medium text-muted-foreground/70">Gestión de tipos de embalaje y formatos de envío</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push('/bd/formatos-expedicion/nuevo')}
              className="rounded-2xl font-black px-6 h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Nuevo Formato
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-border/40 bg-background/40 backdrop-blur-sm hover:bg-background/60 transition-all">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/40 shadow-2xl p-2">
                <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)} className="rounded-xl gap-2 font-bold py-3">
                  <FileUp size={18} className="text-primary" /> Importar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_formatos_expedicion.csv')} className="rounded-xl gap-2 font-bold py-3">
                  <FileDown size={18} className="text-primary" /> Descargar Plantilla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl gap-2 font-bold py-3">
                  <FileDown size={18} className="text-primary" /> Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por nombre..."
              className="pl-12 h-12 bg-background/40 border-border/40 rounded-2xl focus:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Vista Escritorio: Tabla Premium */}
      <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40 h-16">
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 pl-8">Nombre del Formato</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 text-right pr-8">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => router.push(`/bd/formatos-expedicion/${item.id}`)}
                  className="group cursor-pointer transition-all duration-300 border-border/40 h-20 hover:bg-primary/[0.03]"
                >
                  <TableCell className="pl-8">
                    <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{item.nombre}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-border/40 shadow-2xl p-2">
                        <DropdownMenuItem onClick={() => router.push(`/bd/formatos-expedicion/${item.id}`)} className="rounded-xl gap-2 font-bold py-3">
                          <Pencil className="h-4 w-4 text-primary" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl gap-2 font-bold py-3 text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id) }}>
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                    <Package className="h-16 w-16 mb-4 opacity-10" />
                    <p className="text-lg font-black uppercase tracking-widest">No se encontraron formatos</p>
                    <p className="text-sm font-medium mt-1">Prueba a cambiar los filtros de búsqueda</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro del formato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
              onClick={handleDelete}
            >
              Eliminar Formato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">Importar Archivo CSV</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
            <Button 
              variant="outline"
              className="rounded-xl h-12 font-bold flex-1"
              onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}
            >
              Comas ( , )
            </Button>
            <Button 
              variant="outline"
              className="rounded-xl h-12 font-bold flex-1"
              onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}
            >
              Punto y Coma ( ; )
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function FormatosExpedicionPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Formatos de Expedición..." />}>
      <FormatosExpedicionPageContent />
    </Suspense>
  )
}
