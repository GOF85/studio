'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalMiceIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-mice`);
    }, [router, params.id]);
    return null;
}
