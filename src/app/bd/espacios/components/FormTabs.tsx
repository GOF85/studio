'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    MapPin, Users, Truck, Star, Heart,
    Phone, Euro, CheckCircle2, AlertCircle
} from 'lucide-react';

export type TabId =
    | 'identificacion'
    | 'capacidades'
    | 'logistica'
    | 'evaluacion'
    | 'experiencia'
    | 'contactos'
    | 'economico';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const tabs: Tab[] = [
    { id: 'identificacion', label: 'Identificación', icon: MapPin },
    { id: 'capacidades', label: 'Capacidades', icon: Users },
    { id: 'logistica', label: 'Logística', icon: Truck },
    { id: 'evaluacion', label: 'Evaluación MICE', icon: Star },
    { id: 'experiencia', label: 'Experiencia', icon: Heart },
    { id: 'contactos', label: 'Contactos', icon: Phone },
    { id: 'economico', label: 'Económico', icon: Euro },
];

interface FormTabsProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    completedTabs?: Set<TabId>;
    tabsWithErrors?: Set<TabId>;
    children: React.ReactNode;
}

export function FormTabs({
    activeTab,
    onTabChange,
    completedTabs = new Set(),
    tabsWithErrors = new Set(),
    children
}: FormTabsProps) {
    return (
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabId)} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6 h-auto p-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isCompleted = completedTabs.has(tab.id);
                    const hasErrors = tabsWithErrors.has(tab.id);

                    return (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="relative flex flex-col gap-1 py-2 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                            <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span className="hidden xl:inline">{tab.label}</span>
                            </div>
                            <span className="xl:hidden text-xs">{tab.label}</span>

                            {isCompleted && !hasErrors && (
                                <div className="absolute top-1 right-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                </div>
                            )}
                            {hasErrors && (
                                <div className="absolute top-1 right-1">
                                    <AlertCircle className="w-3 h-3 text-destructive" />
                                </div>
                            )}
                        </TabsTrigger>
                    );
                })}
            </TabsList>
            {children}
        </Tabs>
    );
}
