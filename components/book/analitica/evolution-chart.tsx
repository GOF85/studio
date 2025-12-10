'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface EvolutionChartProps {
  snapshots: { fecha: string; precio: number; cantidad: number }[];
  isLoading: boolean;
  activeTab: string;
}

export function EvolutionChart({ snapshots, isLoading, activeTab }: EvolutionChartProps) {
  if (isLoading) {
    return <div className="h-full w-full bg-muted/10 animate-pulse rounded-lg" />;
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
        No hay datos suficientes para generar la gráfica.
      </div>
    );
  }

  // 1. Determinar tendencia para el color (Coste sube = Malo/Rojo, Coste baja = Bueno/Verde)
  // Nota: Usamos una comprobación segura por si solo hay 1 dato
  const startPrice = snapshots[0]?.precio || 0;
  const endPrice = snapshots[snapshots.length - 1]?.precio || 0;
  const isCostRising = endPrice > startPrice;

  // Colores Tailwind: Emerald-500 (#10b981) vs Rose-500 (#f43f5e)
  const chartColor = isCostRising ? '#f43f5e' : '#10b981';

  // 2. Calcular Dominio Y robusto para que el gráfico no se vea plano
  const prices = snapshots.map(s => s.precio);
  const minData = Math.min(...prices);
  const maxData = Math.max(...prices);
  
  // Padding del 10% para dar aire arriba y abajo
  const padding = (maxData - minData) * 0.1 || (maxData * 0.1) || 1;
  
  const minDomain = Math.max(0, minData - padding); // El precio nunca debe ser negativo en el eje
  const maxDomain = maxData + padding;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={snapshots} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          
          <XAxis 
            dataKey="fecha" 
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={30}
            tickFormatter={(str) => {
                try {
                    return format(parseISO(str), 'd MMM', { locale: es });
                } catch {
                    return str;
                }
            }}
            style={{ fontSize: '10px', fill: '#6b7280' }}
          />
          
          <YAxis 
            domain={[minDomain, maxDomain]}
            tickLine={false}
            axisLine={false}
            width={45}
            tickFormatter={(number) => `${number.toFixed(1)}€`}
            style={{ fontSize: '10px', fill: '#6b7280' }}
          />
          
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelFormatter={(label) => {
                try {
                    return format(parseISO(label), 'd MMMM yyyy', { locale: es });
                } catch {
                    return label;
                }
            }}
            formatter={(value: number) => [`${value.toFixed(2)} €`, 'Coste Promedio']}
          />
          
          <Area 
            type="monotone" 
            dataKey="precio" 
            stroke={chartColor} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrecio)" 
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}