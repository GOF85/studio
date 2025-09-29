'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SignatureCanvas from 'react-signature-canvas';
import type { TransporteOrder, PedidoEntrega, ProductoVenta } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, User } from 'lucide-react';

export default function AlbaranPage() {
    const [order, setOrder] = useState<TransporteOrder | null>(null);
    const [deliveryItems, setDeliveryItems] = useState<PedidoEntrega['hitos'][0]['items']>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [signedBy, setSignedBy] = useState('');
    const [dni, setDni] = useState('');
    const sigCanvas = useRef<SignatureCanvas>(null);
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    useEffect(() => {
        const allTransportOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        const currentOrder = allTransportOrders.find(o => o.id === id);
        setOrder(currentOrder || null);
        
        if (currentOrder) {
            const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
            const currentPedido = allPedidosEntrega.find(p => p.osId === currentOrder.osId);
            
            // Assuming one hito per transport order for simplicity for now. This might need adjustment.
            const hito = currentPedido?.hitos.find(h => h.lugarEntrega === currentOrder.lugarEntrega);
            setDeliveryItems(hito?.items || []);
        }

        setIsMounted(true);
    }, [id]);

    const clearSignature = () => {
        sigCanvas.current?.clear();
    };

    const handleSaveSignature = () => {
        if (!order || sigCanvas.current?.isEmpty() || !signedBy) {
            toast({
                variant: 'destructive',
                title: 'Faltan datos',
                description: 'La firma y el nombre del receptor son obligatorios.',
            });
            return;
        }

        const signatureDataUrl = sigCanvas.current.toDataURL();
        
        const allTransportOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        const orderIndex = allTransportOrders.findIndex(o => o.id === id);

        if (orderIndex !== -1) {
            allTransportOrders[orderIndex] = {
                ...allTransportOrders[orderIndex],
                firmaUrl: signatureDataUrl,
                firmadoPor: signedBy,
                dniReceptor: dni,
                status: 'Entregado',
            };
            localStorage.setItem('transporteOrders', JSON.stringify(allTransportOrders));
            setOrder(allTransportOrders[orderIndex]);
            toast({ title: 'Entrega Confirmada', description: 'El albarán ha sido firmado y guardado.' });
        }
    };

    if (!isMounted || !order) {
        return <LoadingSkeleton title="Cargando Albarán..." />;
    }

    const isDelivered = order.status === 'Entregado';

    return (
        <main className="container mx-auto px-4 py-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Albarán de Entrega</CardTitle>
                            <CardDescription>OS: {order.osId}</CardDescription>
                        </div>
                        <Badge variant={isDelivered ? 'default' : 'secondary'} className={isDelivered ? 'bg-green-600' : ''}>
                            {order.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <h3 className="font-bold">Información de Recogida</h3>
                            <p>{order.lugarRecogida}</p>
                            <p>Hora: {order.horaRecogida}</p>
                        </div>
                        <div>
                            <h3 className="font-bold">Información de Entrega</h3>
                            <p>{order.lugarEntrega}</p>
                            <p>Hora: {order.horaEntrega}</p>
                        </div>
                        <div className="col-span-2">
                             <h3 className="font-bold">Observaciones</h3>
                             <p className="text-muted-foreground">{order.observaciones || 'Sin observaciones.'}</p>
                        </div>
                    </div>

                    <h3 className="font-bold mb-2">Contenido del Pedido</h3>
                    <div className="border rounded-md divide-y">
                        {deliveryItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-3">
                                <div className="flex items-center gap-3">
                                    <Package className="h-5 w-5 text-muted-foreground"/>
                                    <span>{item.nombre}</span>
                                </div>
                                <span className="font-semibold">{item.quantity} uds.</span>
                            </div>
                        ))}
                    </div>

                    <Separator className="my-6" />

                    {isDelivered && order.firmaUrl ? (
                        <div>
                            <h3 className="font-bold mb-2">Confirmación de Entrega</h3>
                            <div className="border rounded-lg p-4 bg-secondary/50">
                                <p className="flex items-center gap-2 mb-2"><User className="h-4 w-4"/>Recibido por: <span className="font-semibold">{order.firmadoPor} {order.dniReceptor && `(${order.dniReceptor})`}</span></p>
                                <img src={order.firmaUrl} alt="Firma del receptor" className="border rounded-md bg-white w-full h-auto"/>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-bold">Confirmación de Entrega</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="signedBy">Recibido por (Nombre y Apellidos)</Label>
                                    <Input id="signedBy" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="dni">DNI (Opcional)</Label>
                                    <Input id="dni" value={dni} onChange={(e) => setDni(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>Firma del Cliente</Label>
                                <div className="border rounded-md bg-white">
                                    <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{className: 'w-full h-32'}} />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <Button variant="outline" onClick={clearSignature}>Limpiar Firma</Button>
                                <Button onClick={handleSaveSignature}><CheckCircle className="mr-2"/>Confirmar Entrega</Button>
                            </div>
                        </div>
                    )}
                     <Button variant="secondary" className="w-full mt-8" onClick={() => router.push('/portal/transporte')}>Volver al listado</Button>
                </CardContent>
            </Card>
        </main>
    )
}
