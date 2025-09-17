import type { CateringItem } from '@/types';

export const CATERING_ITEMS: CateringItem[] = [
  { itemCode: 'PLT01', description: 'Plato de cena', price: 0.5, stock: 500, imageUrl: 'https://picsum.photos/seed/plates/400/300', imageHint: 'white plates' },
  { itemCode: 'GLS01', description: 'Copa de vino', price: 0.4, stock: 450, imageUrl: 'https://picsum.photos/seed/glasses/400/300', imageHint: 'wine glasses' },
  { itemCode: 'CUT01', description: 'Juego de cubiertos', price: 0.75, stock: 400, imageUrl: 'https://picsum.photos/seed/cutlery/400/300', imageHint: 'silver cutlery' },
  { itemCode: 'TBL01', description: 'Mesa redonda (8p)', price: 10, stock: 50, imageUrl: 'https://picsum.photos/seed/tables/400/300', imageHint: 'banquet table' },
  { itemCode: 'CHR01', description: 'Silla plegable blanca', price: 1.5, stock: 300, imageUrl: 'https://picsum.photos/seed/chairs/400/300', imageHint: 'white chair' },
  { itemCode: 'LIN01', description: 'Mantel blanco', price: 5, stock: 100, imageUrl: 'https://picsum.photos/seed/linens/400/300', imageHint: 'white linen' },
  { itemCode: 'SRV01', description: 'Bandeja para servir', price: 2, stock: 80, imageUrl: 'https://picsum.photos/seed/serving/400/300', imageHint: 'serving tray' },
  { itemCode: 'HTR01', description: 'Calentador de patio', price: 50, stock: 20, imageUrl: 'https://picsum.photos/seed/heater/400/300', imageHint: 'patio heater' },
];
