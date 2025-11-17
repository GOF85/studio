import { redirect } from 'next/navigation';

// This page just redirects to the first page of the CPR module.
export default function CPRPage() {
    redirect('/cpr/of');
}
