'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TransporteIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        const getServiceNumber = async () => {
            try {
                const { data, error } = await supabase
                    .from('eventos')
                    .select('numero_expediente')
                    .eq('id', params.id)
                    .single();
                
                const serviceNumber = data?.numero_expediente;
                router.replace(`/os/${serviceNumber || params.id}/transporte`);
            } catch (e) {
                router.replace(`/os/${params.id}/transporte`);
            }
        };
        getServiceNumber();
    }, [router, params.id]);
    return null;
}
