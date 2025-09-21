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

type ComboboxOption = {
    value: string;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    onCreated?: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyPlaceholder?: string;
}

export function Combobox({ options, value, onChange, onCreated, placeholder, searchPlaceholder, emptyPlaceholder }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('');

  const filteredOptions = query 
    ? options.filter(option => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleCreate = () => {
    if (query && onCreated && !options.some(opt => opt.value.toLowerCase() === query.toLowerCase())) {
        onCreated(query);
    }
    onChange(query);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9"
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
                className="cursor-pointer px-2 py-1.5 text-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreate();
                }}
              >
                {query ? (
                    <span className="flex items-center"><PlusCircle className="mr-2"/>Añadir "{query}"</span>
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
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
