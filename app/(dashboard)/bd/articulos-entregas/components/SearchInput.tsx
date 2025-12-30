'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  defaultValue?: string;
  className?: string;
}

export function SearchInput({ 
  placeholder = "Buscar...", 
  onSearch, 
  defaultValue = "",
  className = ""
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, 500);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className={`relative group flex-1 max-w-md ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-12 h-12 bg-background/50 border-border/40 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
      />
    </div>
  );
}
