import { Header } from '@/components/layout/header';
// CAMBIO AQUÍ: Sin llaves { } porque es export default
import SplashScreen from '@/components/layout/splash-screen'; 

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-screen flex-col">
            <SplashScreen />
            <Header />
            {children}
        </div>
    );
}