
"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from "lucide-react"

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

type ComboboxOption = {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onCreated?: (value: string) => void;
  onDelete?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  className?: string;
}

export function Combobox({ options, value, onChange, onCreated, onDelete, placeholder, searchPlaceholder, emptyPlaceholder, className }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('');

  const filteredOptions = query
    ? options.filter(option => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleCreate = () => {
    if (query && onCreated) {
      onCreated(query);
    }
    onChange(query);
    setQuery('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal h-9", className)}
        >
          <span className="truncate">
            {value
              ? options.find((option) => option.value === value)?.label ?? value
              : placeholder || "Seleccionar..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
              <div
                role="button"
                tabIndex={0}
                className="cursor-pointer px-2 py-1.5 text-sm flex items-center"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreate();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              >
                {query && onCreated ? (
                  <><PlusCircle className="mr-2" />Añadir "{query}"</>
                ) : (emptyPlaceholder || "No se encontraron resultados.")}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={(currentLabel) => {
                    const selectedValue = options.find(opt => opt.label.toLowerCase() === currentLabel.toLowerCase())?.value
                    onChange(selectedValue === value ? "" : selectedValue || '')
                    setOpen(false)
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center flex-1">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </div>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(option.value);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
