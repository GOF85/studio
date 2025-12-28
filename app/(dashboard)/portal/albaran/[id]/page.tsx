
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { loadPDFLibs } from '@/lib/pdf-lazy';

// Lazy load signature canvas (requires window object)
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false });
import type { TransporteOrder, PedidoEntrega, ProductoVenta, Entrega } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, User, Printer, MapPin, Phone, Building, Loader2, Clock } from 'lucide-react';

import { useTransporteOrders, usePedidosEntrega, useEvento } from '@/hooks/use-data-queries';
import { useUpdateTransporteOrder } from '@/hooks/mutations/use-transporte-mutations';

export default function AlbaranPage() {
    const params = useParams() ?? {};
    const id = (params.id as string) || '';
    const { toast } = useToast();
    const router = useRouter();

    const { data: allTransportOrders = [], isLoading: loadingTransport } = useTransporteOrders();
    const order = useMemo(() => allTransportOrders.find(o => o.id === id), [allTransportOrders, id]);
    
    const { data: evento, isLoading: loadingEvento } = useEvento(order?.osId || '');
    const { data: allPedidosEntrega = [], isLoading: loadingPedidos } = usePedidosEntrega(order?.osId || '');
    
    const updateTransporte = useUpdateTransporteOrder();

    const [deliveryItems, setDeliveryItems] = useState<PedidoEntrega['hitos'][0]['items']>([]);
    const [expedicionNumero, setExpedicionNumero] = useState('');
    const [signedBy, setSignedBy] = useState('');
    const [dni, setDni] = useState('');
    const sigCanvas = useRef<any>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [SignatureCanvasComponent, setSignatureCanvasComponent] = useState<any>(null);

    useEffect(() => {
        import('react-signature-canvas').then((mod) => {
            setSignatureCanvasComponent(() => mod.default);
        });
    }, []);

    useEffect(() => {
        if (order && allPedidosEntrega.length > 0 && evento) {
            const currentPedido = allPedidosEntrega.find(p => p.osId === order.osId);
            const hitoId = order.hitosIds?.[0];
            const hito = currentPedido?.hitos.find((h: any) => h.id === hitoId);
            
            if (hito) {
                setDeliveryItems(hito.items || []);
                const hitoIndex = currentPedido?.hitos.findIndex((h: any) => h.id === hitoId) ?? -1;
                if (hitoIndex !== -1) {
                    setExpedicionNumero(`${evento.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`);
                }
            }
        }
    }, [order, allPedidosEntrega, evento]);

    const clearSignature = () => {
        sigCanvas.current?.clear();
    };

    const handleSaveSignature = async () => {
        if (!order || sigCanvas.current?.isEmpty() || !signedBy) {
            toast({
                variant: 'destructive',
                title: 'Faltan datos',
                description: 'La firma y el nombre del receptor son obligatorios.',
            });
            return;
        }

        const signatureDataUrl = sigCanvas.current.toDataURL();
        
        try {
            await updateTransporte.mutateAsync({
                id: order.id,
                updates: {
                    ...order,
                    firmaUrl: signatureDataUrl,
                    firmadoPor: signedBy,
                    dniReceptor: dni,
                    status: 'Entregado',
                    fechaFirma: new Date().toISOString()
                }
            });

            toast({
                title: 'Albarán firmado',
                description: 'La entrega ha sido confirmada correctamente.',
            });
            router.push('/portal/transporte');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo guardar la firma.',
            });
        }
    };
    
   const handlePrintSigned = async () => {
        if (!order || !order.firmaUrl || !evento) return;
        setIsPrinting(true);
        try {
            const { jsPDF } = await loadPDFLibs();
            const autoTableFn = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const margin = 15;
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            let finalY = margin;
            
            // --- TEXTOS ---
            const texts = {
                es: { proposalTitle: 'Albarán de Entrega', client: 'Cliente:', item: 'Producto', qty: 'Cantidad', receivedBy: 'Recibido por:', signatureDate: 'Fecha y hora:', signature: 'Firma:', footer: 'MICE Catering - Albarán de Entrega' },
                en: { proposalTitle: 'Delivery Note', client: 'Client:', item: 'Product', qty: 'Quantity', receivedBy: 'Received by:', signatureDate: 'Date & time:', signature: 'Signature:', footer: 'MICE Catering - Delivery Note' }
            };
            const T = texts['es'];

            // --- CABECERA ---
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#f97316'); // Orange
            doc.text(T.proposalTitle, margin, finalY);

            doc.setFontSize(12);
            doc.setTextColor('#374151');
            doc.text(expedicionNumero, margin, finalY + 8);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Fecha: ${format(new Date(order.fecha), 'dd/MM/yyyy', { locale: es })}`, pageWidth - margin, finalY, { align: 'right' });
            finalY += 20;

            // --- Información de Entrega ---
            autoTableFn(doc, {
                body: [
                    [T.client, evento.client],
                    ['Lugar Entrega', order.lugarEntrega],
                    ['Hora Entrega', order.horaEntrega],
                ],
                startY: finalY,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 1 },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;

            // --- Artículos ---
            autoTableFn(doc, {
                startY: finalY,
                head: [[T.item, T.qty]],
                body: deliveryItems.map(item => [item.nombre, `${item.quantity} uds.`]),
                theme: 'grid',
                headStyles: { fillColor: '#f3f4f6', textColor: '#374151', fontStyle: 'bold' },
                styles: { fontSize: 9 }
            });
            finalY = (doc as any).lastAutoTable.finalY + 15;

            // --- Firma ---
            if (finalY + 60 > pageHeight) {
                doc.addPage();
                finalY = margin;
            }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Confirmación de Entrega:', margin, finalY);
            finalY += 6;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`${T.receivedBy} ${order.firmadoPor} ${order.dniReceptor ? `(${order.dniReceptor})` : ''}`, margin, finalY);
            if(order.fechaFirma) {
                doc.text(`${T.signatureDate} ${format(new Date(order.fechaFirma), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, finalY + 4);
            }
            finalY += 10;
            doc.addImage(order.firmaUrl, 'PNG', margin, finalY, 80, 40);
            doc.setDrawColor(220, 220, 220);
            doc.rect(margin, finalY, 80, 40);

            // --- Pie de página ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor('#6b7280');
                doc.text(`${T.footer}`, margin, pageHeight - 10);
                doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }

            doc.save(`Albaran_${expedicionNumero}.pdf`);
        } catch (error) {
            console.error("Error al generar el PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
        } finally {
            setIsPrinting(false);
        }
    };


    if (loadingTransport || loadingEvento || loadingPedidos) {
        return <LoadingSkeleton title="Cargando Albarán..." />;
    }

    if (!order || !evento) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h2 className="text-2xl font-bold">Albarán no encontrado</h2>
                <Button onClick={() => router.push('/portal/transporte')} className="mt-4">Volver al portal</Button>
            </div>
        );
    }

    const isDelivered = order.status === 'Entregado';

    return (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Albarán de Entrega</CardTitle>
                            <CardDescription className="font-mono text-lg">{expedicionNumero}</CardDescription>
                        </div>
                        <Badge variant={isDelivered ? 'default' : 'secondary'} className={isDelivered ? 'bg-green-600' : ''}>
                            {order.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
                        <div className="space-y-1">
                            <h3 className="font-bold mb-1 flex items-center gap-2"><Building className="h-4 w-4"/>Información de Entrega</h3>
                            <p className="font-semibold text-base">{evento.client}</p>
                            <p className="flex items-center gap-2"><MapPin className="h-4 w-4"/>{order.lugarEntrega}</p>
                            <p className="flex items-center gap-2"><Clock className="h-4 w-4"/>Hora de entrega: {order.horaEntrega}</p>
                        </div>
                        {order.observaciones && (
                             <div className="space-y-1">
                                 <h3 className="font-bold mb-1">Observaciones</h3>
                                 <p className="text-muted-foreground">{order.observaciones}</p>
                            </div>
                        )}
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
                                <p className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4"/>Recibido por: 
                                    <span className="font-semibold">{order.firmadoPor} {order.dniReceptor && `(${order.dniReceptor})`}</span>
                                    {order.fechaFirma && <span className="text-muted-foreground text-xs ml-auto">({format(new Date(order.fechaFirma), 'dd/MM/yyyy HH:mm', { locale: es })})</span>}
                                </p>
                                <img src={order.firmaUrl} alt="Firma del receptor" className="border rounded-md bg-white w-full h-auto"/>
                                <Button onClick={handlePrintSigned} className="mt-4 w-full" disabled={isPrinting}>
                                    {isPrinting ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2" />}
                                    {isPrinting ? 'Generando...' : 'Previsualizar Albarán (PDF)'}
                                </Button>
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
                                    {SignatureCanvasComponent && (
                                        <SignatureCanvasComponent ref={(ref: any) => { sigCanvas.current = ref; }} penColor='black' canvasProps={{className: 'w-full h-32'}} />
                                    )}
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
