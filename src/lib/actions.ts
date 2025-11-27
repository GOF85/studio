
"use server";

import { z } from "zod";
import { FactusolService } from "@/services/factusol-service";

const formSchema = z.object({
    codfab: z.string().min(1, "Código de Fabricante is required"),
    codcli: z.string().min(1, "Código de Cliente is required"),
    basedatos: z.string().min(1, "Base de datos is required"),
    password: z.string().optional(),
    sql: z.string().min(1, "SQL query is required"),
});

type FormState = {
    status: "idle" | "success" | "error" | "pending";
    message: string;
    data?: any[];
    debugLog?: string[];
    action?: "json" | "csv";
};

export async function executeQueryAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const debugLog: string[] = [];
    const action = formData.get('action') as 'json' | 'csv' | null;
    debugLog.push(`Acción iniciada: executeQuery (acción: ${action})`);

    const parsedForm = formSchema.safeParse(Object.fromEntries(formData));

    if (!parsedForm.success) {
        const errorMessages = parsedForm.error.issues.map(issue => issue.message).join(', ');
        debugLog.push(`Error: Datos de formulario inválidos. ${errorMessages}`);
        return {
            status: "error",
            message: "Invalid form data. Please check credentials and SQL query.",
            debugLog,
            action: action || undefined,
        };
    }

    const { sql, ...credentials } = parsedForm.data;

    if (!credentials.password) {
        debugLog.push("Error: Las credenciales de la API no están configuradas.");
        return { status: "error", message: "API credentials are not set. Please configure them in settings.", debugLog };
    }

    try {
        const factusolService = new FactusolService(credentials as { codfab: string; codcli: string; basedatos: string; password: string; }, debugLog);
        const result = await factusolService.executeQuery(sql);

        debugLog.push(`¡Proceso completado! Se han cargado ${Array.isArray(result) ? result.length : 0} registros.`);

        // Ensure data is serializable by converting to JSON and back
        const serializableData = JSON.parse(JSON.stringify(result));

        return {
            status: "success",
            message: "Query executed successfully.",
            data: serializableData,
            debugLog,
            action: action || undefined,
        };
    } catch (error) {
        console.error("Query execution failed:", error);
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        debugLog.push(`Error durante la ejecución de la consulta: ${errorMessage}`);
        return { status: "error", message: `Failed to execute query. ${errorMessage}`, debugLog };
    }
}
