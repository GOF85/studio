"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { KeyRound, Building, Database, User } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSettings, type ApiSettings } from "@/hooks/use-settings";

const formSchema = z.object({
  codfab: z.string().min(1, {
    message: "Código de Fabricante cannot be empty.",
  }),
  codcli: z.string().min(1, {
    message: "Código de Cliente cannot be empty.",
  }),
  basedatos: z.string().min(1, {
    message: "Base de datos cannot be empty.",
  }),
  password: z.string().min(1, {
    message: "Password cannot be empty.",
  }),
});


type SettingsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: () => void;
}

export function SettingsDialog({ open, onOpenChange, onSave }: SettingsDialogProps) {
  const { settings, saveSettings, isSettingsLoaded } = useSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        codfab: '',
        codcli: '',
        basedatos: '',
        password: '',
    },
  });

  useEffect(() => {
    if (isSettingsLoaded) {
      form.setValue('codfab', settings.codfab || '');
      form.setValue('codcli', settings.codcli || '');
      form.setValue('basedatos', settings.basedatos || '');
      form.setValue('password', settings.password || '');
    }
  }, [isSettingsLoaded, settings, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    saveSettings(values as ApiSettings);
    onSave?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            Enter your Factusol API credentials here. They will be stored securely in your browser.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="codfab"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Fabricante</FormLabel>
                  <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="F0000" {...field} className="pl-10"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codcli"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Cliente</FormLabel>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="C0000" {...field} className="pl-10"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="basedatos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base de Datos</FormLabel>
                   <div className="relative">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                        <Input placeholder="factusol_db" {...field} className="pl-10"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                     <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                        <Input type="password" placeholder="API Password" {...field} className="pl-10"/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="submit">Save Credentials</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
