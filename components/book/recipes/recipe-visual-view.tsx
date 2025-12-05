import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Utensils,
    Wind,
    Thermometer,
    ChefHat,
    Scale,
    Clock,
    Euro,
    ImageIcon,
    Leaf,
    Info,
    Flame,
    Snowflake,
    AlertTriangle
} from "lucide-react";
import Image from "next/image";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AllergenBadge } from "@/components/icons/allergen-badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { Receta, Elaboracion, Alergeno } from "@/types";

interface RecipeVisualViewProps {
    recipe: Receta;
}

export function RecipeVisualView({ recipe }: RecipeVisualViewProps) {
    const mainImage = recipe.fotosComerciales?.find(f => f.esPrincipal) || recipe.fotosComerciales?.[0] || recipe.fotosEmplatado?.[0];

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* HERO SECTION */}
            <div className="relative w-full h-[30vh] md:h-[40vh] rounded-xl overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-800">
                {mainImage ? (
                    <Image
                        src={mainImage.url}
                        alt={recipe.nombre}
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Utensils className="h-16 w-16 mb-4 opacity-20" />
                        <p>Sin imagen principal</p>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white w-full">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-white border-white/50 bg-black/30 backdrop-blur-sm">
                            {recipe.categoria}
                        </Badge>
                        {recipe.estacionalidad && (
                            <Badge variant="secondary" className="bg-white/90 text-black">
                                {recipe.estacionalidad}
                            </Badge>
                        )}
                        {recipe.tipoDieta && recipe.tipoDieta !== 'NINGUNO' && (
                            <Badge variant="outline" className="text-green-300 border-green-400/50 bg-green-950/30">
                                <Leaf className="w-3 h-3 mr-1" />
                                {recipe.tipoDieta}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold font-headline leading-tight tracking-tight mb-2">
                        {recipe.nombre}
                    </h1>
                    {recipe.nombre_en && (
                        <p className="text-lg md:text-xl text-white/80 italic font-serif">
                            {recipe.nombre_en}
                        </p>
                    )}
                </div>
            </div>

            {/* QUICK STATS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={ChefHat} label="Partida" value={recipe.partidaProduccion || "Sin asignar"} />
                <StatCard icon={Scale} label="Gramaje" value={`${recipe.gramajeTotal} g`} />
                {/* <StatCard icon={Euro} label="Coste MP" value={formatCurrency(recipe.costeMateriaPrima)} highlight /> */}
                <StatCard icon={Thermometer} label="Servicio" value={recipe.temperaturaServicio || "N/A"} />
                {/* Allergens Row for Mobile Compactness */}
                <div className="col-span-2 md:col-span-1 bg-card rounded-lg border p-3 flex items-center gap-3 overflow-x-auto">
                    {recipe.alergenos && recipe.alergenos.length > 0 ? (
                        <div className="flex -space-x-2">
                            {recipe.alergenos.map((alergeno) => (
                                <div key={alergeno} className="relative z-0 hover:z-10 transition-all">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AllergenBadge allergen={alergeno} className="h-8 w-8 border-2 border-background" />
                                            </TooltipTrigger>
                                            <TooltipContent>{alergeno}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Sin alérgenos</span>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT TABS */}
            <Tabs defaultValue="ficha" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="ficha">Ficha Técnica</TabsTrigger>
                    <TabsTrigger value="media">Multimedia & Pasos</TabsTrigger>
                </TabsList>

                {/* TAB: FICHA TÉCNICA */}
                <TabsContent value="ficha" className="mt-6 space-y-6">

                    {/* Description */}
                    {(recipe.descripcionComercial || recipe.descripcionComercial_en) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Info className="h-5 w-5 text-primary" /> Descripción
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {recipe.descripcionComercial && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">ESPAÑOL</h4>
                                        <p className="text-base leading-relaxed">{recipe.descripcionComercial}</p>
                                    </div>
                                )}
                                {recipe.descripcionComercial && recipe.descripcionComercial_en && <Separator />}
                                {recipe.descripcionComercial_en && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">ENGLISH</h4>
                                        <p className="text-base leading-relaxed italic text-muted-foreground">{recipe.descripcionComercial_en}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Elaborations / Ingredients */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Utensils className="h-5 w-5 text-primary" /> Escandallo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr className="text-left">
                                                <th className="p-3 font-medium">Ingrediente / Elaboración</th>
                                                <th className="p-3 font-medium text-right">Cant.</th>
                                                <th className="p-3 font-medium text-right">Unidad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {recipe.elaboraciones?.map((elab, idx) => (
                                                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                                    <td className="p-3 font-medium">{elab.nombre}</td>
                                                    <td className="p-3 text-right font-mono">{elab.cantidad}</td>
                                                    <td className="p-3 text-right text-muted-foreground">{elab.unidad}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            {/* Menaje */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Box className="h-5 w-5 text-primary" /> Menaje & Presentación
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {recipe.menajeAsociado && recipe.menajeAsociado.length > 0 ? (
                                        <ul className="space-y-2">
                                            {recipe.menajeAsociado.map((item, idx) => (
                                                <li key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                                    <span>{item.descripcion}</span>
                                                    <Badge variant="outline">{item.ratio} pax/ud</Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-muted-foreground italic">No hay menaje especificado.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Technical Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Settings2 className="h-5 w-5 text-primary" /> Datos Técnicos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Dificultad" value={`${recipe.dificultadProduccion}/5`} />
                                    <DetailItem label="Estabilidad Buffet" value={`${recipe.estabilidadBuffet}/5`} />
                                    <DetailItem label="Técnica Principal" value={recipe.tecnicaCoccionPrincipal} />
                                    <DetailItem label="Temp. Servicio" value={recipe.temperaturaServicio} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB: MEDIA & PASOS */}
                <TabsContent value="media" className="mt-6 space-y-8">
                    <TimelineStep
                        title="Mise en Place"
                        description={recipe.instruccionesMiseEnPlace}
                        images={recipe.fotosMiseEnPlace}
                        icon={BoxSelect}
                    />
                    <TimelineStep
                        title="Regeneración / Cocción"
                        description={recipe.instruccionesRegeneracion}
                        images={recipe.fotosRegeneracion}
                        icon={Flame}
                    />
                    <TimelineStep
                        title="Emplatado Final"
                        description={recipe.instruccionesEmplatado}
                        images={recipe.fotosEmplatado}
                        icon={Utensils}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, highlight = false }: { icon: any, label: string, value: string | number, highlight?: boolean }) {
    return (
        <div className={cn("bg-card p-3 rounded-lg border flex flex-col items-center justify-center text-center gap-1", highlight && "border-primary/50 bg-primary/5")}>
            <Icon className={cn("h-5 w-5 text-muted-foreground", highlight && "text-primary")} />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className={cn("font-bold text-sm md:text-base", highlight && "text-primary")}>{value}</span>
        </div>
    )
}

function DetailItem({ label, value }: { label: string, value?: string | number | null }) {
    if (!value) return null;
    return (
        <div>
            <span className="text-xs text-muted-foreground block">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    )
}

import { Box, BoxSelect, Settings2, CheckCircle2 } from "lucide-react";

function TimelineStep({ title, description, images, icon: Icon }: { title: string, description?: string, images?: any[], icon: any }) {
    if (!description && (!images || images.length === 0)) return null;

    return (
        <div className="relative pl-8 md:pl-10 border-l-2 border-muted pb-8 last:pb-0">
            <div className="absolute left-[-9px] top-0 bg-background p-1 rounded-full border-2 border-primary text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>

            {description && (
                <div className="prose prose-sm dark:prose-invert max-w-none mb-4 bg-muted/30 p-4 rounded-lg">
                    <p className="whitespace-pre-line leading-relaxed">{description}</p>
                </div>
            )}

            {images && images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border bg-black/5">
                            <Image
                                src={img.url}
                                alt={`${title} ${idx + 1}`}
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
