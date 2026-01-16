import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { component, message, data, timestamp } = body;

    // Log a terminal con colores
    console.log('\n🔵 [CLIENT LOG]', timestamp);
    console.log(`📍 [${component}]`, message);
    if (data) {
      console.log('📊 Data:', JSON.stringify(data, null, 2));
    }
    console.log('---');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Error en /api/log:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
