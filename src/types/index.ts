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

// We need to allow string dates because they come from localStorage
export type ServiceOrder = Omit<OsFormValues, 'startDate' | 'endDate'> & {
    id: string;
    startDate: string; 
    endDate: string;
    order: {
        items: OrderItem[];
        total: number;
        days: number;
    } | null;
    status: 'Borrador' | 'Confirmado' | 'Finalizado';
};
