
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { rrhhNav } from '@/lib/rrhh-nav';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RrhhDashboardPage() {
  return (
    <main className="min-h-screen bg-background/30 pb-20">
        {/* Header Premium Sticky */}
        <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                <div className="flex items-center">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Users className="h-5 w-5 text-blue-500" />
                    </div>
                </div>
                <div className="flex-1" />
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rrhhNav.filter(item => item.href !== '/rrhh').map(item => (
                <Link href={item.href} key={item.href}>
                    <Card className="bg-background/40 backdrop-blur-sm border-border/40 hover:border-blue-500/50 hover:shadow-lg transition-all h-full flex flex-col group">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                                <item.icon className="h-5 w-5" />
                                {item.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <p className="text-xs text-muted-foreground font-medium">{item.description}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </main>
  );
}
