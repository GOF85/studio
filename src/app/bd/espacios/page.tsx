'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Eye, MapPin, Download, Upload, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getEspacios, deleteEspacio } from '@/services/espacios-service';
import type { EspacioV2 } from '@/types/espacios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportEspaciosToCSV, downloadCSVTemplate } from '@/lib/csv-utils';
import { CSVImporter } from './components/csv/CSVImporter';
import { QuickActions } from './components/QuickActions';
import { calculateEspacioCompleteness, getCompletenessBadgeColor } from '@/lib/espacios-utils';

export default function EspaciosPage() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { toast } = useToast();
  const [espacios, setEspacios] = useState<EspacioV2[]>([]);
  const [filteredEspacios, setFilteredEspacios] = useState<EspacioV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ciudadFilter, setCiudadFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [relacionFilter, setRelacionFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [espacioToDelete, setEspacioToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadEspacios();
  }, []);

  useEffect(() => {
    filterEspacios();
  }, [espacios, searchQuery, ciudadFilter, tipoFilter, relacionFilter]);

  async function loadEspacios() {
    setIsLoading(true);
    try {
      const data = await getEspacios();
      setEspacios(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los espacios: ' + error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function filterEspacios() {
    let filtered = [...espacios];

    // Búsqueda por texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.nombre.toLowerCase().includes(query) ||
          e.ciudad.toLowerCase().includes(query) ||
          e.descripcionCorta?.toLowerCase().includes(query)
      );
    }

    // Filtro por ciudad
    if (ciudadFilter !== 'all') {
      filtered = filtered.filter((e) => e.ciudad === ciudadFilter);
    }

    // Filtro por tipo
    if (tipoFilter !== 'all') {
      filtered = filtered.filter((e) => e.tiposEspacio.includes(tipoFilter));
    }

    // Filtro por relación comercial
    if (relacionFilter !== 'all') {
      filtered = filtered.filter((e) => e.relacionComercial === relacionFilter);
    }

    setFilteredEspacios(filtered);
  }

  async function handleDelete(id: string) {
    try {
      await deleteEspacio(id);
      toast({ description: 'Espacio eliminado correctamente.' });
      loadEspacios();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el espacio: ' + error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setEspacioToDelete(null);
    }
  }

  function openDeleteDialog(id: string) {
    setEspacioToDelete(id);
    setDeleteDialogOpen(true);
  }

  // Obtener ciudades únicas
  const ciudades = Array.from(new Set(espacios.map((e) => e.ciudad))).sort();

  // Obtener tipos únicos
  const tipos = Array.from(new Set(espacios.flatMap((e) => e.tiposEspacio))).sort();

  const relacionOptions = [
    'Exclusividad',
    'Homologado Preferente',
    'Homologado',
    'Puntual',
    'Sin Relación',
  ];

  function getRelacionColor(relacion: string) {
    switch (relacion) {
      case 'Exclusividad':
        return 'bg-purple-100 text-purple-800';
      case 'Homologado Preferente':
        return 'bg-blue-100 text-blue-800';
      case 'Homologado':
        return 'bg-green-100 text-green-800';
      case 'Puntual':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, ciudad o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar/Importar
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportEspaciosToCSV(filteredEspacios, `espacios_${new Date().toISOString().split('T')[0]}.csv`)}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Espacios Filtrados ({filteredEspacios.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportEspaciosToCSV(espacios, `espacios_completo_${new Date().toISOString().split('T')[0]}.csv`)}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Todos ({espacios.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={downloadCSVTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => router.push('/bd/espacios/nuevo')}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Espacio
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="w-[200px]">
            <Select value={ciudadFilter} onValueChange={setCiudadFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {ciudades.map((ciudad) => (
                  <SelectItem key={ciudad} value={ciudad}>
                    {ciudad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Espacio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select value={relacionFilter} onValueChange={setRelacionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Relación Comercial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las relaciones</SelectItem>
                {relacionOptions.map((rel) => (
                  <SelectItem key={rel} value={rel}>
                    {rel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || ciudadFilter !== 'all' || tipoFilter !== 'all' || relacionFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCiudadFilter('all');
                setTipoFilter('all');
                setRelacionFilter('all');
              }}
              className="ml-auto"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando espacios...
            </div>
          ) : filteredEspacios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {espacios.length === 0
                  ? 'No hay espacios registrados.'
                  : 'No se encontraron espacios con los filtros aplicados.'}
              </p>
              {espacios.length === 0 && (
                <Button onClick={() => router.push('/bd/espacios/nuevo')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Espacio
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Ubicación
                  </TableHead>
                  <TableHead className="text-center">Completado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Aforo Cocktail</TableHead>
                  <TableHead className="text-center">Aforo Banquete</TableHead>
                  <TableHead>Relación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEspacios.map((espacio) => (
                  <TableRow key={espacio.id} className="group hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div>
                        <div>{espacio.nombre}</div>
                        {espacio.descripcionCorta && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {espacio.descripcionCorta}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{espacio.ciudad}</div>
                        <div className="text-muted-foreground">{espacio.provincia}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={getCompletenessBadgeColor(calculateEspacioCompleteness(espacio))}
                      >
                        {calculateEspacioCompleteness(espacio)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {espacio.tiposEspacio.slice(0, 2).map((tipo) => (
                          <Badge key={tipo} variant="outline" className="text-xs">
                            {tipo}
                          </Badge>
                        ))}
                        {espacio.tiposEspacio.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{espacio.tiposEspacio.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {espacio.aforoMaxCocktail || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {espacio.aforoMaxBanquete || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getRelacionColor(espacio.relacionComercial)}
                      >
                        {espacio.relacionComercial}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/bd/espacios/${espacio.id}`)}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/bd/espacios/${espacio.id}/editar`)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(espacio.id)}
                          className="text-destructive hover:text-destructive"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El espacio será eliminado permanentemente de la
              base de datos junto con todas sus salas y contactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => espacioToDelete && handleDelete(espacioToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Espacios desde CSV</DialogTitle>
          </DialogHeader>
          <CSVImporter
            onClose={() => setShowImportDialog(false)}
            onSuccess={() => {
              setShowImportDialog(false);
              loadEspacios(); // Recargar lista
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
