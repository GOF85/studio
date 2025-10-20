
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { ArticuloCatering, Personal, Espacio } from '@/types';
import { PlusCircle, Menu, FileUp, FileDown, Database, Users, Package, Building, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

const bdNavLinks = [
    { title: 'Gestión de Personal', path: '/bd/personal', icon: Users },
    { title: 'Gestión de Espacios', path: '/bd/espacios', icon: Building },
    { title: 'Gestión de Artículos MICE', path: '/bd/articulos', icon: Package },
];

const CSV_HEADERS: Record<string, string[]> = {
    '/bd/personal': ["id", "nombre", "apellidos", "iniciales", "departamento", "categoria", "telefono", "mail", "dni", "precioHora"],
    '/bd/espacios': ["id", "nombreEspacio", "ciudad", "aforoMaximoBanquete", "aforoMaximoCocktail", "tipoDeEspacio", "relacionComercial"],
    '/bd/articulos': ["id", "nombre", "categoria", "precioVenta", "precioAlquiler", "producidoPorPartner", "partnerId", "recetaId"],
};

export default function BdLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
    }, [])

    const currentPage = useMemo(() => {
        return bdNavLinks.find(link => pathname.startsWith(link.path));
    }, [pathname]);

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
        const file = event.target.files?.[0];
        if (!file || !currentPage) {
          setIsImportAlertOpen(false);
          return;
        }
        
        const storageKey = currentPage.path.split('/')[2]; // e.g., 'personal'
        const expectedHeaders = CSV_HEADERS[currentPage.path];

        Papa.parse<any>(file, {
          header: true,
          skipEmptyLines: true,
          delimiter,
          complete: (results) => {
            if (!results.meta.fields || !expectedHeaders.every(field => results.meta.fields?.includes(field))) {
                toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas: ${expectedHeaders.join(', ')}`});
                return;
            }
            
            // This is a generic parser. It should be adapted for each specific data type if needed.
            const importedData = results.data;
            
            localStorage.setItem(storageKey, JSON.stringify(importedData));
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros. Recarga la página para ver los cambios.` });
            setIsImportAlertOpen(false);
             window.location.reload();
          },
          error: (error) => {
            toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
            setIsImportAlertOpen(false);
          }
        });
        if(event.target) {
            event.target.value = '';
        }
    };
    
    const handleExportCSV = () => {
        if (!currentPage) return;
        const storageKey = currentPage.path.split('/')[2];
        const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (data.length === 0) {
            toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
            return;
        }

        const csv = Papa.unparse(data);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${storageKey}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exportación completada' });
    };

    if (!isMounted) {
        return <div className="h-screen w-full" />;
    }

    const newPath = currentPage ? `${currentPage.path}/nuevo` : '/bd';

    return (
        <>
            <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Database className="h-5 w-5 text-muted-foreground"/>
                            <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                            {currentPage && (
                                <>
                                    <currentPage.icon className="h-5 w-5 text-muted-foreground"/>
                                    <span>{currentPage.title}</span>
                                </>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button asChild>
                                <Link href={newPath}>
                                    <PlusCircle className="mr-2" />
                                    Nuevo
                                </Link>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><Menu /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}>
                                        <FileUp size={16} className="mr-2"/>Importar CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportCSV}>
                                        <FileDown size={16} className="mr-2"/>Exportar CSV
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
             <main>
                {children}
            </main>
             <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
                        <AlertDialogDescription>
                            Selecciona el tipo de delimitador que utiliza tu archivo CSV. Normalmente es una coma (,) para archivos de USA/UK o un punto y coma (;) para archivos de Europa. El fichero debe tener cabeceras que coincidan con el modelo de datos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="!justify-center gap-4">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                        <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
