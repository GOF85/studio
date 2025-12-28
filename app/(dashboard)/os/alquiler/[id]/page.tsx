'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AlquilerIdRedirectPage({ params }: { params: { id: string } }) {
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
                router.replace(`/os/${serviceNumber || params.id}/alquiler`);
            } catch (e) {
                router.replace(`/os/${params.id}/alquiler`);
            }
        };
        getServiceNumber();
    }, [router, params.id]);
    return null;
}
