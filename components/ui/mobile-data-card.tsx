import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MobileDataCardProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    status?: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    onClick?: () => void;
    className?: string;
}

export function MobileDataCard({ title, subtitle, status, actions, children, onClick, className }: MobileDataCardProps) {
    return (
        <Card className={cn("mb-4", onClick && "cursor-pointer active:bg-accent/50", className)} onClick={onClick}>
            <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
                <div className="flex-1 space-y-1">
                    <div className="font-semibold text-base leading-none">{title}</div>
                    {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
                </div>
                <div className="flex items-center gap-2">
                    {status}
                    {actions}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
                {children}
            </CardContent>
        </Card>
    );
}

export function DataRow({ label, value, className }: { label: string, value: React.ReactNode, className?: string }) {
    return (
        <div className={cn("flex justify-between items-center text-sm py-1 border-b last:border-0 border-dashed border-gray-100", className)}>
            <span className="text-muted-foreground font-medium">{label}</span>
            <span className="text-foreground text-right">{value}</span>
        </div>
    );
}
