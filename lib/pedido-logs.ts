// Helpers para logging de cambios en pedidos

export interface PedidoChangeLog {
  id: string;
  pedido_id: string;
  os_id: string;
  usuario_id: string;
  usuario_email?: string;
  tipo_cambio: 'entrega' | 'recogida' | 'items' | 'completo';
  cambios: {
    campo: string;
    valor_anterior: any;
    valor_nuevo: any;
  }[];
  timestamp: string;
  razon?: string;
}

export async function logPedidoChange({
  pedidoId,
  osId,
  usuarioId,
  usuarioEmail,
  tipoCambio,
  cambios,
  razon,
}: Omit<PedidoChangeLog, 'id' | 'timestamp'>) {
  try {
    const response = await fetch('/api/pedidos/log-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedido_id: pedidoId,
        os_id: osId,
        usuario_id: usuarioId,
        usuario_email: usuarioEmail,
        tipo_cambio: tipoCambio,
        cambios,
        razon,
      }),
    });

    if (!response.ok) {
      console.error('Error al registrar cambio:', await response.json());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error al registrar cambio en pedido:', error);
    return null;
  }
}

export function detectarCambios(original: any, modificado: any): { campo: string; valor_anterior: any; valor_nuevo: any }[] {
  const cambios: { campo: string; valor_anterior: any; valor_nuevo: any }[] = [];
  
  const campos = [
    'fecha_entrega',
    'hora_entrega',
    'localizacion',
    'fecha_recogida',
    'hora_recogida',
    'lugar_recogida',
    'items',
  ];

  campos.forEach(campo => {
    const orig = original[campo];
    const mod = modificado[campo];
    
    // Para items, comparar cantidad total
    if (campo === 'items') {
      const origTotal = Array.isArray(orig) ? orig.reduce((sum, item) => sum + item.cantidad, 0) : 0;
      const modTotal = Array.isArray(mod) ? mod.reduce((sum, item) => sum + item.cantidad, 0) : 0;
      
      if (origTotal !== modTotal || JSON.stringify(orig) !== JSON.stringify(mod)) {
        cambios.push({
          campo,
          valor_anterior: `${origTotal} unidades`,
          valor_nuevo: `${modTotal} unidades`,
        });
      }
    } else if (orig !== mod) {
      cambios.push({
        campo,
        valor_anterior: orig,
        valor_nuevo: mod,
      });
    }
  });

  return cambios;
}
