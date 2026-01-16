'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  Building2,
  UtensilsCrossed,
  ChefHat,
  Package,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TabData } from '@/types/os-panel';

interface Tab {
  id: 'espacio' | 'sala' | 'cocina' | 'logistica' | 'personal';
  label: string;
  icon: React.ReactNode;
  data?: TabData;
}

interface OsPanelTabsProps {
  activeTab?: 'espacio' | 'sala' | 'cocina' | 'logistica' | 'personal';
  tabsData?: {
    espacio?: TabData;
    sala?: TabData;
    cocina?: TabData;
    logistica?: TabData;
    personal?: TabData;
  };
  onChange?: (tab: Tab['id']) => void;
}

export function OsPanelTabs({
  activeTab = 'espacio',
  tabsData = {},
  onChange,
}: OsPanelTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get('tab') ?? activeTab) as
    | 'espacio'
    | 'sala'
    | 'cocina'
    | 'logistica'
    | 'personal';

  const tabs: Tab[] = [
    {
      id: 'espacio',
      label: 'Espacio',
      icon: <Building2 className="h-4 w-4" />,
      data: tabsData.espacio,
    },
    {
      id: 'sala',
      label: 'Sala',
      icon: <UtensilsCrossed className="h-4 w-4" />,
      data: tabsData.sala,
    },
    {
      id: 'cocina',
      label: 'Cocina',
      icon: <ChefHat className="h-4 w-4" />,
      data: tabsData.cocina,
    },
    {
      id: 'logistica',
      label: 'Logística',
      icon: <Package className="h-4 w-4" />,
      data: tabsData.logistica,
    },
    {
      id: 'personal',
      label: 'Personal',
      icon: <Users className="h-4 w-4" />,
      data: tabsData.personal,
    },
  ];

  const handleTabChange = useCallback(
    (tab: Tab['id']) => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('tab', tab);
        
        // Crear URL completa
        const fullUrl = new URL(window.location.href);
        fullUrl.search = params.toString();
        const newUrl = fullUrl.toString();
        
        // Actualizar history API y router
        window.history.pushState({ tab }, '', newUrl);
        router.push(`?${params.toString()}`);
      }
      
      onChange?.(tab);
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [router, searchParams, onChange, currentTab]
  );

  return (
    <div className="flex gap-0 overflow-x-auto border-b bg-gray-100">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const completionPercentage = tab.data?.completionPercentage || 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange(tab.id);
            }}
            className={`flex gap-2 items-center px-4 py-3 h-auto rounded-none whitespace-nowrap transition-all border-b-2 ${
              isActive
                ? 'bg-emerald-500 text-black border-b-2 border-emerald-600'
                : 'bg-gray-100 text-black border-b-2 border-transparent hover:bg-gray-200'
            }`}
            title={`${tab.label} (Cmd+${tabs.indexOf(tab) + 1})`}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.label}</span>

            {tab.data && (
              <Badge
                variant="outline"
                className={`ml-1 text-xs px-1.5 py-0 ${
                  isActive ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-gray-200 text-black border-gray-300'
                }`}
              >
                {tab.data.completedFields || 0}/{tab.data.totalFields || 0}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
