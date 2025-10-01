
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TransporteOrder, PedidoEntrega, ProductoVenta, Entrega } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, User, Printer, MapPin, Phone, Building } from 'lucide-react';

export default function AlbaranPage() {
    const [order, setOrder] = useState<TransporteOrder | null>(null);
    const [deliveryItems, setDeliveryItems] = useState<PedidoEntrega['hitos'][0]['items']>([]);
    const [entrega, setEntrega] = useState<Entrega | null>(null);
    const [expedicionNumero, setExpedicionNumero] = useState('');
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
            const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
            const currentEntrega = allEntregas.find(e => e.id === currentOrder.osId);
            setEntrega(currentEntrega || null);

            const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
            const currentPedido = allPedidosEntrega.find(p => p.osId === currentOrder.osId);
            
            const hitoId = currentOrder.hitosIds?.[0]; // Assuming one hito per transport for now
            const hito = currentPedido?.hitos.find(h => h.id === hitoId);
            
            if (hito) {
                setDeliveryItems(hito.items || []);
                const hitoIndex = currentPedido?.hitos.findIndex(h => h.id === hitoId) ?? -1;
                if (hitoIndex !== -1 && currentEntrega) {
                    setExpedicionNumero(`${currentEntrega.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`);
                }
            }
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
    
   const handlePrintSigned = () => {
        if (!order || !order.firmaUrl || !entrega) return;
        const doc = new jsPDF();
        const margin = 15;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let finalY = margin;

        // --- Estilos ---
        const primaryColor = '#f97316';
        const textColor = '#374151';
        const mutedColor = '#6b7280';
        const headerColor = '#f3f4f6';

        // --- Cabecera ---
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        doc.text('Albarán de Entrega', margin, finalY);
        
        doc.setFontSize(12);
        doc.setTextColor(textColor);
        doc.text(expedicionNumero, margin, finalY + 8);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${format(new Date(order.fecha), 'dd/MM/yyyy', { locale: es })}`, pageWidth - margin, finalY, { align: 'right' });
        finalY += 20;

        // --- Información de Entrega ---
        autoTable(doc, {
            startY: finalY,
            body: [
                ['Cliente', entrega.client],
                ['Lugar Entrega', order.lugarEntrega],
                ['Hora Entrega', order.horaEntrega],
            ],
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;

        // --- Artículos ---
        autoTable(doc, {
            startY: finalY,
            head: [['Producto', 'Cantidad']],
            body: deliveryItems.map(item => [item.nombre, `${item.quantity} uds.`]),
            theme: 'striped',
            headStyles: { fillColor: headerColor, textColor: textColor, fontStyle: 'bold' },
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
        doc.text(`Recibido por: ${order.firmadoPor} ${order.dniReceptor ? `(${order.dniReceptor})` : ''}`, margin, finalY);
        finalY += 5;
        doc.addImage(order.firmaUrl, 'PNG', margin, finalY, 80, 40);
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, finalY, 80, 40);

        // --- Pie de página ---
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(mutedColor);
            doc.text(`MICE Catering - Albarán`, margin, pageHeight - 10);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }


        doc.save(`Albaran_${expedicionNumero}.pdf`);
    }

    if (!isMounted || !order) {
        return <LoadingSkeleton title="Cargando Albarán..." />;
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <h3 className="font-bold mb-1">Información de Entrega</h3>
                            <p className="font-semibold text-base">{entrega?.client || ''}</p>
                            <p>{order.lugarEntrega}</p>
                            <p>Hora de entrega: {order.horaEntrega}</p>
                        </div>
                        {order.observaciones && (
                             <div className="col-span-1">
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
                                <p className="flex items-center gap-2 mb-2"><User className="h-4 w-4"/>Recibido por: <span className="font-semibold">{order.firmadoPor} {order.dniReceptor && `(${order.dniReceptor})`}</span></p>
                                <img src={order.firmaUrl} alt="Firma del receptor" className="border rounded-md bg-white w-full h-auto"/>
                                <Button onClick={handlePrintSigned} className="mt-4 w-full">
                                    <Printer className="mr-2" />
                                    Previsualizar Albarán (PDF)
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
