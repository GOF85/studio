
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TransporteOrder, PedidoEntrega, ProductoVenta, Entrega } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, User, Printer, MapPin, Phone, Building, Loader2, Clock } from 'lucide-react';

export default function AlbaranPage() {
    const [order, setOrder] = useState<TransporteOrder | null>(null);
    const [deliveryItems, setDeliveryItems] = useState<PedidoEntrega['hitos'][0]['items']>([]);
    const [entrega, setEntrega] = useState<Entrega | null>(null);
    const [expedicionNumero, setExpedicionNumero] = useState('');
    const [signedBy, setSignedBy] = useState('');
    const [dni, setDni] = useState('');
    const sigCanvas = useRef<SignatureCanvas>(null);
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [isPrinting, setIsPrinting] = useState(false);


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
                fechaFirma: new Date().toISOString(),
            };
            localStorage.setItem('transporteOrders', JSON.stringify(allTransportOrders));
            setOrder(allTransportOrders[orderIndex]);
            toast({ title: 'Entrega Confirmada', description: 'El albarán ha sido firmado y guardado.' });
        }
    };
    
   const handlePrintSigned = () => {
        if (!order || !order.firmaUrl || !entrega) return;
        setIsPrinting(true);
        try {
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
            autoTable(doc, {
                body: [
                    [T.client, entrega.client],
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
            autoTable(doc, {
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


