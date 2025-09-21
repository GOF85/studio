"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "./badge";

type MultiSelectOption = {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    onCreated?: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyPlaceholder?: string;
    className?: string;
}

export function MultiSelect({ options, selected, onChange, onCreated, placeholder, searchPlaceholder, emptyPlaceholder, className }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('');

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
        onChange(selected.filter((item) => item !== value));
    } else {
        onChange([...selected, value]);
    }
  }
  
  const handleCreate = () => {
    if (query && !options.some(opt => opt.value.toLowerCase() === query.toLowerCase())) {
        if(onCreated) onCreated(query);
        onChange([...selected, query]);
        setQuery('');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-start font-normal h-auto min-h-9"
            >
                <div className="flex gap-1 flex-wrap">
                    {selected.length === 0 && <span className="text-muted-foreground">{placeholder || "Seleccionar..."}</span>}
                    {selected.map((value) => {
                        const label = options.find(o => o.value === value)?.label || value;
                        return <Badge key={value} variant="secondary">{label}</Badge>
                    })}
                </div>
                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 absolute right-2" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
            <CommandInput 
                placeholder={searchPlaceholder || "Buscar..."}
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>
                    <div className="p-2">
                        {query ? (
                            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleCreate}>
                                <PlusCircle className="mr-2"/>
                                Añadir "{query}"
                            </Button>
                        ) : (
                            <span className="text-sm text-muted-foreground">{emptyPlaceholder || "No se encontraron resultados."}</span>
                        )}
                    </div>
                </CommandEmpty>
                <CommandGroup>
                {options.map((option) => (
                    <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {option.label}
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </PopoverContent>
      </div>
    </Popover>
  )
}
