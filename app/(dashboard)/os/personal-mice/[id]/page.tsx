'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalMiceIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        try {
            const all = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
            const current = all.find((o: any) => o.id === params.id);
            const serviceNumber = current?.serviceNumber;
            router.replace(`/os/${serviceNumber || params.id}/personal-mice`);
        } catch (e) {
            router.replace(`/os/${params.id}/personal-mice`);
        }
    }, [router, params.id]);
    return null;
}
