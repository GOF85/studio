
'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { mainNav, cprNav, rrhhNav, bookNavLinks, bdNavLinks } from "@/lib/nav-links";
import { ScrollArea } from "../ui/scroll-area";

const navSections = [
    { title: "General", links: mainNav },
    { title: "CPR", links: cprNav },
    { title: "RRHH", links: rrhhNav },
    { title: "Bases de Datos", links: bdNavLinks },
    { title: "Book Gastronómico", links: bookNavLinks },
]

export function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
    const pathname = usePathname();

    return (
        <ScrollArea className="h-full py-6 pr-6">
            <div className="space-y-4">
                {navSections.map(section => (
                    <div key={section.title}>
                        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                            {section.title}
                        </h2>
                        <div className="space-y-1">
                             {section.links.map((item) => {
                                const isActive = item.exact 
                                    ? pathname === item.href || (item.href === '/pes' && pathname === '/')
                                    : pathname.startsWith(item.href);
                                
                                return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onLinkClick}
                                >
                                    <span
                                        className={cn(
                                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                            isActive ? "bg-accent" : "transparent"
                                        )}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.title}</span>
                                    </span>
                                </Link>
                            )})}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
