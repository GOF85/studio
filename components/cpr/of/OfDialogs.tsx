'use client';

import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatUnit } from '@/lib/utils';
import type { ProveedorConLista } from '@/hooks/use-cpr-of-logic';

interface OfDialogsProps {
    orderToDelete: string | null;
    setOrderToDelete: (id: string | null) => void;
    handleDeleteOrder: (id: string) => Promise<void>;
    pedidoParaImprimir: ProveedorConLista | null;
    setPedidoParaImprimir: (p: ProveedorConLista | null) => void;
    redondearCompra: boolean;
    isReportDialogOpen: boolean;
    setIsReportDialogOpen: (open: boolean) => void;
    flatCompraList: any[];
    handlePrintReport: (redondearCompra: boolean) => void;
}

export function OfDialogs({
    orderToDelete,
    setOrderToDelete,
    handleDeleteOrder,
    pedidoParaImprimir,
    setPedidoParaImprimir,
    redondearCompra,
    isReportDialogOpen,
    setIsReportDialogOpen,
    flatCompraList,
    handlePrintReport
}: OfDialogsProps) {
    return (
        <>
            <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la Orden de Fabricación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!pedidoParaImprimir} onOpenChange={(open) => !open && setPedidoParaImprimir(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Borrador de Pedido para: {pedidoParaImprimir?.nombreComercial}</DialogTitle>
                        <DialogDescription>
                            Este es un prototipo visual. La generación y envío del PDF final se implementará en un futuro.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 border rounded-lg p-6 bg-white text-black font-sans text-sm">
                        <h2 className="text-2xl font-bold mb-1">Pedido a Proveedor</h2>
                        <p className="font-semibold text-lg text-primary mb-4">{pedidoParaImprimir?.nombreComercial}</p>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                            <div>
                                <p><strong>De:</strong> MICE CATERING</p>
                                <p>Avda. de la Industria, 38, 28108 Alcobendas, Madrid</p>
                            </div>
                            <div className="text-right">
                                <p><strong>Fecha Pedido:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
                                <p><strong>Atención:</strong> {pedidoParaImprimir?.nombreComercial} - {pedidoParaImprimir?.telefonoContacto}</p>
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-black">Ref.</TableHead>
                                    <TableHead className="text-black">Producto</TableHead>
                                    <TableHead className="text-right text-black">Cantidad</TableHead>
                                    <TableHead className="text-right text-black">Formato Compra</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(pedidoParaImprimir?.listaCompra || []).map(item => {
                                    const cantidadAComprar = redondearCompra
                                        ? Math.ceil(item.necesidadNeta / item.unidadConversion)
                                        : (item.necesidadNeta / item.unidadConversion);
                                    return (
                                        <TableRow key={item.erpId}>
                                            <TableCell className="font-mono text-xs">{item.refProveedor}</TableCell>
                                            <TableCell>{item.nombreProducto}</TableCell>
                                            <TableCell className="text-right font-bold">{redondearCompra ? cantidadAComprar : formatNumber(cantidadAComprar, 2)}</TableCell>
                                            <TableCell className="text-right">{item.formatoCompra}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPedidoParaImprimir(null)}>Cerrar</Button>
                        <Button disabled><Printer className="mr-2 h-4 w-4" />Imprimir (próximamente)</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Informe Consolidado de Compra</DialogTitle>
                        <DialogDescription>
                            Resumen detallado de todos los productos necesarios agrupados por proveedor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Producto ERP (Ref.)</TableHead>
                                    <TableHead className="text-right">Cant. a Comprar</TableHead>
                                    <TableHead>Formato Compra</TableHead>
                                    <TableHead className="text-right">Necesidad Neta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {flatCompraList.map(item => {
                                    const cantidadAComprar = redondearCompra
                                        ? Math.ceil(item.necesidadNeta / item.unidadConversion)
                                        : (item.necesidadNeta / item.unidadConversion);
                                    return (
                                        <TableRow key={`${item.proveedorNombre}-${item.erpId}`}>
                                            <TableCell>{item.proveedorNombre}</TableCell>
                                            <TableCell>
                                                {item.nombreProducto} <span className="text-xs text-muted-foreground">({item.refProveedor})</span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary">{redondearCompra ? cantidadAComprar : formatNumber(cantidadAComprar, 2)}</TableCell>
                                            <TableCell>{item.formatoCompra}</TableCell>
                                            <TableCell className="text-right font-mono">{formatNumber(item.necesidadNeta, 3)} {formatUnit(item.unidadNeta)}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>Cerrar</Button>
                        <Button onClick={() => handlePrintReport(redondearCompra)}><Printer className="mr-2 h-4 w-4" />Descargar PDF</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
