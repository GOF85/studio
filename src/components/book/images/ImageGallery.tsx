'use client';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star, GripVertical, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import type { ImagenReceta } from '@/types/index';

interface SortableImageProps {
    imagen: ImagenReceta;
    onDelete: (id: string) => void;
    onSetPrincipal: (id: string) => void;
}

function SortableImage({ imagen, onDelete, onSetPrincipal }: SortableImageProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: imagen.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative aspect-video bg-muted rounded-lg overflow-hidden border">
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 left-2 z-10 p-1.5 bg-black/50 rounded-md cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <GripVertical className="w-4 h-4 text-white" />
            </div>

            {/* Main Image */}
            <img
                src={imagen.url}
                alt={imagen.descripcion || 'Imagen de la receta'}
                className="w-full h-full object-cover"
            />

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                            <Maximize2 className="w-4 h-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/90 border-none">
                        <img
                            src={imagen.url}
                            alt={imagen.descripcion || 'Vista completa'}
                            className="w-full h-full object-contain max-h-[85vh]"
                        />
                    </DialogContent>
                </Dialog>

                <Button
                    variant={imagen.esPrincipal ? "default" : "secondary"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onSetPrincipal(imagen.id)}
                    title={imagen.esPrincipal ? "Es imagen principal" : "Marcar como principal"}
                >
                    <Star className={`w-4 h-4 ${imagen.esPrincipal ? "fill-current" : ""}`} />
                </Button>

                <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDelete(imagen.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Badges */}
            {imagen.esPrincipal && (
                <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground border-none">
                        Principal
                    </Badge>
                </div>
            )}
        </div>
    );
}

interface ImageGalleryProps {
    imagenes: ImagenReceta[];
    onReorder: (newOrder: ImagenReceta[]) => void;
    onDelete: (id: string) => void;
    onSetPrincipal: (id: string) => void;
}

export function ImageGallery({ imagenes, onReorder, onDelete, onSetPrincipal }: ImageGalleryProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = imagenes.findIndex((item) => item.id === active.id);
            const newIndex = imagenes.findIndex((item) => item.id === over.id);

            onReorder(arrayMove(imagenes, oldIndex, newIndex));
        }
    }

    if (imagenes.length === 0) {
        return null;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={imagenes.map(img => img.id)}
                strategy={rectSortingStrategy}
            >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                    {imagenes.map((imagen) => (
                        <SortableImage
                            key={imagen.id}
                            imagen={imagen}
                            onDelete={onDelete}
                            onSetPrincipal={onSetPrincipal}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
