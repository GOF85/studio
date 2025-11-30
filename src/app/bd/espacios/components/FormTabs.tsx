'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    MapPin, Users, Truck, Star, Heart,
    Phone, Euro, CheckCircle2, AlertCircle, Zap, Image as ImageIcon,
    LayoutGrid, Wrench, FolderKanban
} from 'lucide-react';

export type TabId =
    | 'identificacion'
    | 'capacidades'
    | 'logistica'
    | 'evaluacion'
    | 'experiencia'
    | 'contactos'
    | 'economico'
    | 'tecnico'
    | 'imagenes';

export type MetaTabId = 'general' | 'tecnico' | 'gestion';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
    metaGroup: MetaTabId;
}

interface MetaTab {
    id: MetaTabId;
    label: string;
    icon: React.ElementType;
    tabs: TabId[];
}

const tabs: Tab[] = [
    // General
    { id: 'identificacion', label: 'Identificación', icon: MapPin, metaGroup: 'general' },
    { id: 'imagenes', label: 'Imágenes', icon: ImageIcon, metaGroup: 'general' },
    { id: 'experiencia', label: 'Experiencia', icon: Heart, metaGroup: 'general' },

    // Técnico
    { id: 'capacidades', label: 'Capacidades', icon: Users, metaGroup: 'tecnico' },
    { id: 'logistica', label: 'Logística', icon: Truck, metaGroup: 'tecnico' },
    { id: 'tecnico', label: 'Cuadros Eléctricos', icon: Zap, metaGroup: 'tecnico' },

    // Gestión
    { id: 'economico', label: 'Económico', icon: Euro, metaGroup: 'gestion' },
    { id: 'evaluacion', label: 'Evaluación MICE', icon: Star, metaGroup: 'gestion' },
    { id: 'contactos', label: 'Contactos', icon: Phone, metaGroup: 'gestion' },
];

const metaTabs: MetaTab[] = [
    {
        id: 'general',
        label: 'General',
        icon: LayoutGrid,
        tabs: ['identificacion', 'imagenes', 'experiencia'],
    },
    {
        id: 'tecnico',
        label: 'Técnico',
        icon: Wrench,
        tabs: ['capacidades', 'logistica', 'tecnico'],
    },
    {
        id: 'gestion',
        label: 'Gestión',
        icon: FolderKanban,
        tabs: ['economico', 'evaluacion', 'contactos'],
    },
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
    // Determine which meta-tab is active based on activeTab
    const activeMetaTab = tabs.find(t => t.id === activeTab)?.metaGroup || 'general';
    const [currentMetaTab, setCurrentMetaTab] = useState<MetaTabId>(activeMetaTab);

    // Get tabs for current meta-group
    const currentMetaTabConfig = metaTabs.find(mt => mt.id === currentMetaTab);
    const currentTabsInGroup = tabs.filter(t => t.metaGroup === currentMetaTab);

    const handleMetaTabChange = (metaId: string) => {
        const meta = metaId as MetaTabId;
        setCurrentMetaTab(meta);
        // Auto-select first tab in the group
        const firstTabId = metaTabs.find(mt => mt.id === meta)?.tabs[0];
        if (firstTabId) {
            onTabChange(firstTabId);
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Meta-Tabs Navigation */}
            <Tabs value={currentMetaTab} onValueChange={handleMetaTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                    {metaTabs.map((meta) => {
                        const MetaIcon = meta.icon;
                        const tabsInGroup = tabs.filter(t => t.metaGroup === meta.id);
                        const hasErrors = tabsInGroup.some(t => tabsWithErrors.has(t.id));
                        const allCompleted = tabsInGroup.every(t => completedTabs.has(t.id)) && tabsInGroup.length > 0;

                        return (
                            <TabsTrigger
                                key={meta.id}
                                value={meta.id}
                                className="relative flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <MetaIcon className="w-5 h-5" />
                                <span className="font-medium">{meta.label}</span>

                                {allCompleted && !hasErrors && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    </div>
                                )}
                                {hasErrors && (
                                    <div className="absolute top-2 right-2">
                                        <AlertCircle className="w-4 h-4 text-destructive" />
                                    </div>
                                )}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </Tabs>

            {/* Sub-Tabs (actual form tabs) */}
            <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabId)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1">
                    {currentTabsInGroup.map((tab) => {
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
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </div>
                                <span className="sm:hidden text-xs">{tab.label}</span>

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
        </div>
    );
}
