// Sistema de logging que envía al servidor para verlo en terminal
export function serverLog(component: string, message: string, data?: any) {
  if (typeof window === 'undefined') return; // Solo en cliente

  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      component,
      message,
      data,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {}); // Silenciar errores de logging
}
