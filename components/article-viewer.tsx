
"use client";

import { useEffect, useState } from "react";
import { Loader2, Eye, Download } from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


function toCSV(data: any[]) {
  if (!data || data.length === 0) {
    return "";
  }

  // Factusol returns an array of rows, where each row is an array of {columna, dato} objects
  // Extract headers from the first row
  const headers = data[0].map((item: any) => item.columna);
  console.log('Headers extracted:', headers);

  const csvRows = [headers.join(',')];

  // Process each row
  for (const row of data) {
    const values = row.map((cell: any) => {
      let value = cell.dato !== null && cell.dato !== undefined ? String(cell.dato) : '';

      // Escape quotes and wrap in quotes if necessary
      if (value.includes('"')) {
        value = value.replace(/"/g, '""');
      }
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value}"`;
      }

      return value;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');

  return csvContent;
}


function downloadCSV(csvContent: string, tableName: string) {
  // Add BOM for UTF-8 to ensure proper encoding in Excel
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Create blob
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });

  const filename = `${tableName}.csv`;

  // Create URL and link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  // Trigger download immediately (synchronously with user action)
  link.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}


export function ArticleViewer() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[] | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showJson, setShowJson] = useState(false);
  const [selectedTable, setSelectedTable] = useState('F_ART');

  const handleQuery = async (action: 'json' | 'csv') => {
    setIsLoading(true);
    setShowJson(false);
    setDebugLog([]);

    try {
      const response = await fetch('/api/factusol/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: `SELECT * FROM ${selectedTable}`,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error en la Carga",
          description: result.error || 'Error desconocido',
        });
        setDebugLog(result.debugLog || []);
        return;
      }

      setData(result.data);
      setDebugLog(result.debugLog || []);

      if (action === 'json') {
        toast({
          title: "Datos Cargados",
          description: `Se han cargado ${Array.isArray(result.data) ? result.data.length : 0} registros.`,
        });
        setShowJson(true);
      } else if (action === 'csv') {
        // Download CSV on client side
        const csv = toCSV(result.data);

        downloadCSV(csv, selectedTable);

        toast({
          title: "Exportación Completa",
          description: `El archivo ${selectedTable}.csv ha sido descargado.`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Visor de Tablas de Factusol</CardTitle>
        <CardDescription>
          Selecciona una tabla y carga sus datos para visualizarlos o exportarlos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="table-selector">Tabla</Label>
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger id="table-selector">
              <SelectValue placeholder="Selecciona una tabla" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="F_ART">Artículos (F_ART)</SelectItem>
              <SelectItem value="F_ENT">Entradas (F_ENT)</SelectItem>
              <SelectItem value="F_FAM">Familias (F_FAM)</SelectItem>
              <SelectItem value="F_LEN">Entrada de mercancías /Lineas (F_LEN)</SelectItem>
              <SelectItem value="F_LPP">Pedidos (F_LPP)</SelectItem>
              <SelectItem value="F_PRO">Proveedores (F_PRO)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={() => handleQuery('csv')}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Download />}
            Exportar a CSV
          </Button>
          <Button
            onClick={() => handleQuery('json')}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Eye />}
            Cargar JSON
          </Button>
        </div>

        {showJson && data && (
          <div className="mt-6">
            <h3 className="text-lg font-medium">Resultado JSON</h3>
            <pre className="mt-2 h-96 w-full overflow-auto rounded-md bg-secondary p-4 text-sm">
              <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
          </div>
        )}

        {debugLog && debugLog.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium">Debug Log</h3>
            <pre className="mt-2 h-96 w-full overflow-auto rounded-md bg-secondary p-4 text-sm">
              <code>{debugLog.join('\n')}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
