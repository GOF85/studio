import { Header } from '@/components/layout/header';
// CAMBIO AQUÍ: Sin llaves { } porque es export default
import SplashScreen from '@/components/layout/splash-screen'; 
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ImpersonatedUserProvider>
            <div className="relative flex min-h-screen flex-col">
                <SplashScreen />
                <Header />
                {children}
            </div>
        </ImpersonatedUserProvider>
    );
}