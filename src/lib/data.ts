import type { CateringItem } from '@/types';

export const CATERING_ITEMS: CateringItem[] = [
  { itemCode: 'PLT01', description: 'Plato de cena', price: 0.5, stock: 500, imageUrl: 'https://picsum.photos/seed/plates/400/300', imageHint: 'white plates', category: 'Vajilla' },
  { itemCode: 'GLS01', description: 'Copa de vino', price: 0.4, stock: 450, imageUrl: 'https://picsum.photos/seed/glasses/400/300', imageHint: 'wine glasses', category: 'Cristalería' },
  { itemCode: 'CUT01', description: 'Juego de cubiertos', price: 0.75, stock: 400, imageUrl: 'https://picsum.photos/seed/cutlery/400/300', imageHint: 'silver cutlery', category: 'Cubertería' },
  { itemCode: 'TBL01', description: 'Mesa redonda (8p)', price: 10, stock: 50, imageUrl: 'https://picsum.photos/seed/tables/400/300', imageHint: 'banquet table', category: 'Mobiliario' },
  { itemCode: 'CHR01', description: 'Silla plegable blanca', price: 1.5, stock: 300, imageUrl: 'https://picsum.photos/seed/chairs/400/300', imageHint: 'white chair', category: 'Mobiliario' },
  { itemCode: 'LIN01', description: 'Mantel blanco', price: 5, stock: 100, imageUrl: 'https://picsum.photos/seed/linens/400/300', imageHint: 'white linen', category: 'Mantelería' },
  { itemCode: 'SRV01', description: 'Bandeja para servir', price: 2, stock: 80, imageUrl: 'https://picsum.photos/seed/serving/400/300', imageHint: 'serving tray', category: 'Servicio' },
  { itemCode: 'HTR01', description: 'Calentador de patio', price: 50, stock: 20, imageUrl: 'https://picsum.photos/seed/heater/400/300', imageHint: 'patio heater', category: 'Equipamiento' },
  { itemCode: 'PLT02', description: 'Plato de postre', price: 0.4, stock: 500, imageUrl: 'https://picsum.photos/seed/dessertplate/400/300', imageHint: 'dessert plates', category: 'Vajilla' },
  { itemCode: 'GLS02', description: 'Vaso de agua', price: 0.3, stock: 600, imageUrl: 'https://picsum.photos/seed/waterglass/400/300', imageHint: 'water glasses', category: 'Cristalería' },
  { itemCode: 'TBL02', description: 'Mesa rectangular', price: 12, stock: 40, imageUrl: 'https://picsum.photos/seed/recttable/400/300', imageHint: 'long table', category: 'Mobiliario' },
];
