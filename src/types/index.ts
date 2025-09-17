export type CateringItem = {
  itemCode: string;
  description: string;
  price: number; // per day
  stock: number; // available stock
  imageUrl: string;
  imageHint: string;
};

export type OrderItem = CateringItem & {
  quantity: number;
};
