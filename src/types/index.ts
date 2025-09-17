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

export type ServiceOrder = OsFormValues & {
    id: string;
    order: {
        items: OrderItem[];
        total: number;
        days: number;
    } | null;
    status: 'Borrador' | 'Confirmado' | 'Finalizado';
};
