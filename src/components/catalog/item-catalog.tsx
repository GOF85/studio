
'use client';

import { useState, useMemo } from 'react';
import type { CateringItem, OrderItem, PedidoPlantilla } from '@/types';
import { ItemListItem } from './item-list-item';
import { AssistantDialog } from '../order/assistant-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '../ui/button';
import { FilePlus2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';

interface ItemCatalogProps {
  items: CateringItem[];
  orderItems: OrderItem[];
  onAddItem: (item: CateringItem, quantity: number) => void;
  orderType: string | null;
  plantillas: PedidoPlantilla[];
  onApplyTemplate: (plantilla: PedidoPlantilla) => void;
}

function TemplateSelectorDialog({ plantillas, onSelect }: { plantillas: PedidoPlantilla[], onSelect: (plantilla: PedidoPlantilla) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><FilePlus2 className="mr-2"/>Usar Plantilla</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Seleccionar Plantilla</DialogTitle></DialogHeader>
                <div className="space-y-2 py-4">
                    {plantillas.length === 0 ? (
                        <p className="text-muted-foreground text-center">No hay plantillas para este tipo de pedido.</p>
                    ) : plantillas.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-secondary">
                            <div>
                                <p className="font-semibold">{p.nombre}</p>
                                <p className="text-sm text-muted-foreground">{p.items.length} artículos</p>
                            </div>
                            <Button onClick={() => { onSelect(p); setIsOpen(false); }}>Aplicar</Button>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function ItemCatalog({ items, onAddItem, orderItems, orderType, plantillas, onApplyTemplate }: ItemCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const types = useMemo(() => {
    const allTypes = new Set(items.map(item => item.tipo).filter(Boolean) as string[]);
    return ['all', ...Array.from(allTypes)];
  }, [items]);
  
  const groupedAndSortedItems = useMemo(() => {
    const filteredItems = items.filter(item => {
      // Robust check to prevent runtime errors
      if (!item || typeof item.description !== 'string' || typeof item.itemCode !== 'string') {
        return false;
      }
      const matchesType = selectedType === 'all' || item.tipo === selectedType;
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || item.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });

    const grouped: { [key: string]: CateringItem[] } = {};
    
    filteredItems.forEach(item => {
      const groupKey = item.tipo || 'Varios';
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(item);
    });

    for (const groupKey in grouped) {
        grouped[groupKey].sort((a, b) => a.description.localeCompare(b.description));
    }
    
    return Object.entries(grouped).sort(([groupA], [groupB]) => groupA.localeCompare(groupB));
  }, [items, searchTerm, selectedType]);


  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-3xl font-headline font-bold tracking-tight">Catálogo de Artículos</h2>
        <div className="flex gap-2">
            {plantillas && plantillas.length > 0 && <TemplateSelectorDialog plantillas={plantillas} onSelect={onApplyTemplate} />}
            {orderType !== 'Alquiler' && <AssistantDialog onAddSuggestedItem={onAddItem} />}
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Buscar por nombre o código..."
          className="flex-grow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full md:w-[240px]">
            <SelectValue placeholder="Filtrar por tipo..." />
          </SelectTrigger>
          <SelectContent>
            {types.map((type, index) => (
              <SelectItem key={`${type}-${index}`} value={type}>
                {type === 'all' ? 'Todos los tipos' : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-y-auto max-h-[calc(100vh-20rem)]">
        {groupedAndSortedItems.length > 0 ? (
          <div className="divide-y">
            {groupedAndSortedItems.map(([type, items]) => (
                <div key={type}>
                    <h3 className="font-bold bg-muted/50 p-2 sticky top-0">{type}</h3>
                    {items.map((item, index) => {
                       const orderedItem = orderItems.find(oi => oi.itemCode === item.itemCode);
                       const availableStock = item.stock - (orderedItem?.quantity || 0);
                       return (
                         <ItemListItem key={`${item.itemCode}-${index}`} item={{...item, stock: availableStock}} onAddItem={(quantity) => onAddItem(item, quantity)} orderType={orderType} />
                       )
                    })}
                </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-8">No se encontraron artículos que coincidan con tu búsqueda.</p>
        )}
      </div>
    </section>
  );
}
