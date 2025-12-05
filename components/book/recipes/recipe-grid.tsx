import { Receta } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface RecipeGridProps {
    items: Receta[];
}

export function RecipeGrid({ items }: RecipeGridProps) {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
                const mainImage = item.fotosComerciales?.find((f) => f.esPrincipal)?.url;

                return (
                    <div
                        key={item.id}
                        className={cn(
                            "group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer hover:shadow-lg transition-all",
                            item.isArchived && "opacity-60"
                        )}
                        onClick={() => router.push(`/book/recetas/${item.id}`)}
                    >
                        {/* Image */}
                        <div className="absolute inset-0">
                            {mainImage ? (
                                <Image
                                    src={mainImage}
                                    alt={item.nombre}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                                    <Image
                                        src="/favicon.ico"
                                        alt="No image"
                                        width={64}
                                        height={64}
                                        className="opacity-20 grayscale"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Category Badge - Top Right */}
                        {item.categoria && (
                            <div className="absolute top-2 right-2">
                                <Badge
                                    variant="secondary"
                                    className="bg-white text-black hover:bg-white/90 font-medium shadow-sm border-0"
                                >
                                    {item.categoria}
                                </Badge>
                            </div>
                        )}

                        {/* Recipe Name - Bottom Center */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                            <h3 className="font-semibold text-white text-lg leading-tight line-clamp-2 drop-shadow-md">
                                {item.nombre}
                            </h3>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
