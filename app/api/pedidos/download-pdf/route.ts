import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generatePedidoPDF } from '@/lib/pdf-generator';

/**
 * GET /api/pedidos/download-pdf
 * Downloads a PDF file by regenerating it from pedido data
 * 
 * Query params:
 * - pedidoId: ID of the pedido_enviado in os_pedidos_enviados
 * OR
 * - fileName: name of the file to download
 * - data: data URL encoded PDF data (from generate-pdf route)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get('pedidoId');
    let fileName = searchParams.get('fileName') || 'pedido.pdf';
    const pdfData = searchParams.get('data');

    let buffer: Buffer;

    if (pdfData) {
      // Use provided PDF data (for backward compatibility)
      let base64Data = pdfData;
      if (pdfData.startsWith('data:application/pdf;base64,')) {
        base64Data = pdfData.replace('data:application/pdf;base64,', '');
      }
      buffer = Buffer.from(base64Data, 'base64');
    } else if (pedidoId) {
      // Regenerate PDF from pedido data
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );

      // Fetch the pedido data
      const { data: pedido, error } = await supabase
        .from('os_pedidos_enviados')
        .select('*')
        .eq('id', pedidoId)
        .single();

      if (error || !pedido) {
        return NextResponse.json(
          { error: 'Pedido not found' },
          { status: 404 }
        );
      }

      // Regenerate PDF from the pedido data
      let items = pedido.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (e) {
          items = [];
        }
      }

      const groupsForPDF = [
        {
          fecha_entrega: pedido.fecha_entrega,
          hora_entrega: pedido.hora_entrega,
          localizacion: pedido.localizacion,
          fecha_recogida: pedido.fecha_recogida,
          hora_recogida: pedido.hora_recogida,
          lugar_recogida: pedido.lugar_recogida,
          items: items || [],
        },
      ];

      // Generate correct filename from DB data
      const correctFileName = `pedido-${pedido.numero_pedido}_${pedido.numero_expediente}.pdf`;
      console.log('[download-pdf] Regenerating PDF with filename:', correctFileName);

      const doc = await generatePedidoPDF(groupsForPDF, {
        numeroPedido: pedido.numero_pedido,
        osNumber: pedido.numero_expediente,
        nombreComercialProveedor: pedido.nombre_proveedor,
        eventName: pedido.nombre_espacio,
        eventSpace: pedido.nombre_espacio,
        eventAddress: pedido.direccion_espacio,
        responsableMetre: pedido.responsable_metre,
        telefonoMetre: pedido.telefono_metre,
        responsablePase: pedido.responsable_pase,
        telefonoPase: pedido.telefono_pase,
        comments: pedido.comentario_pedido || undefined,
        includeImages: true,
        logoUrl: 'https://zyrqdqpbrsevuygjrhvk.supabase.co/storage/v1/object/public/logo/logomice.png',
      });

      // Get PDF as arraybuffer
      const pdfBuffer = doc.output('arraybuffer');
      buffer = Buffer.from(pdfBuffer);
      
      // Override fileName with correct one from DB
      fileName = correctFileName;
    } else {
      return NextResponse.json(
        { error: 'Missing pedidoId or PDF data parameter' },
        { status: 400 }
      );
    }

    // Return PDF file for download with correct filename
    console.log('[download-pdf] Sending PDF with filename:', fileName);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/pedidos/download-pdf:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
