import type { OsFormValues } from "@/app/os/page";

export type CateringItem = {
  itemCode: string;
  description: string;
  price: number; // per day
  stock: number; // available stock
  imageUrl: string;
  imageHint: string;
  category: string;
};

export type OrderItem = CateringItem & {
  quantity: number;
};

export type MaterialOrderStatus = 'Asignado' | 'En preparación' | 'Listo';
export type MaterialOrderType = 'Almacén' | 'Bodega';

export type MaterialOrder = {
  id: string;
  osId: string;
  type: MaterialOrderType;
  items: OrderItem[];
  days: number;
  total: number;
  contractNumber: string;
  status: MaterialOrderStatus;
  deliveryDate?: string;
  deliverySpace?: string;
  deliveryLocation?: string;
};

// We need to allow string dates because they come from localStorage
export type ServiceOrder = Omit<OsFormValues, 'startDate' | 'endDate'> & {
    id: string;
    startDate: string; 
    endDate: string;
    deliveryLocations: string[];
    status: 'Borrador' | 'Confirmado' | 'Finalizado';
};
