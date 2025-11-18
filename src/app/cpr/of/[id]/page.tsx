

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, RefreshCw, Euro, Archive, BrainCircuit, AlertTriangle } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, ArticuloERP, Alergeno, CategoriaReceta, SaborPrincipal, PartidaProduccion, ElaboracionEnReceta, TecnicaCoccion, OrdenFabricacion, Personal } from '@/types';
import { SABORES_PRINCIPALES, ALERGENOS, UNIDADES_MEDIDA, PARTIDAS_PRODUCCION, TECNICAS_COCCION } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn, formatNumber } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isBefore, subMonths, startOfToday, format } from 'date-fns';
import { useDataStore } from '@/hooks/use-data-store';
import { OfPageContent } from '@/components/cpr/of-page-content';

function OrdenFabricacionPage() {
    return (
        <Suspense fallback={<