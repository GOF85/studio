'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalMiceIdRedirectPage() {
    const router = useRouter();
    const params = useParams() ?? {};
    const id = (params.id as string) || '';
    
    useEffect(() => {
        if (id) {
            router.replace(`/os/${id}/personal-mice`);
        }
    }, [router, id]);
    
    return null;
}
