
const API_BASE_URL = "https://api.sdelsol.com";

type FactusolCredentials = {
    codfab: string;
    codcli: string;
    basedatos: string;
    password?: string;
};

export class FactusolService {
    private credentials: FactusolCredentials;
    private debugLog: string[];
    private accessToken: string | null = null;

    constructor(credentials: FactusolCredentials, debugLog: string[] = []) {
        this.credentials = credentials;
        this.debugLog = debugLog;
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken) {
            this.debugLog.push("Usando token de acceso en caché.");
            return this.accessToken;
        }

        this.debugLog.push("Paso 2: Obteniendo token de acceso desde la API...");

        if (!this.credentials.password) {
            this.debugLog.push("Error: La contraseña de la API no está configurada.");
            throw new Error("API password is not set.");
        }

        const loginUrl = `${API_BASE_URL}/login/Autenticar`;
        const encodedPassword = btoa(this.credentials.password);

        const apiRequestBody = {
            codigoFabricante: parseInt(this.credentials.codfab, 10),
            codigoCliente: parseInt(this.credentials.codcli, 10),
            baseDatosCliente: this.credentials.basedatos,
            password: encodedPassword
        };

        const credentialsForLog = { ...apiRequestBody, password: '*** (Base64 Encoded)' };
        this.debugLog.push(`URL de login: ${loginUrl}`);
        this.debugLog.push(`Enviando cuerpo de la petición: ${JSON.stringify(credentialsForLog)}`);

        try {
            const loginResponse = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiRequestBody),
            });

            let loginData;
            const responseClone = loginResponse.clone();

            try {
                loginData = await loginResponse.json();
            } catch (e) {
                const responseText = await responseClone.text();
                this.debugLog.push(`Error: La respuesta de la API no es un JSON válido. Respuesta: ${responseText}`);
                throw new Error(`An unexpected response was received from the server.`);
            }

            if (!loginResponse.ok) {
                const errorMessage = loginData?.error?.message || loginData?.message || "Authentication failed.";
                this.debugLog.push(`Error de API al autenticar: ${errorMessage}`);
                this.debugLog.push(`Respuesta completa del error: ${JSON.stringify(loginData)}`);
                throw new Error(`API Error: ${errorMessage}`);
            }

            const token = loginData.resultado;
            if (!token) {
                this.debugLog.push("Error: No se pudo obtener el token de la API. La respuesta no contenía un campo 'resultado'.");
                this.debugLog.push(`Respuesta recibida de la API: ${JSON.stringify(loginData)}`);
                throw new Error("Failed to retrieve API token from 'resultado' field.");
            }

            this.debugLog.push("Token de acceso obtenido con éxito.");
            this.accessToken = token;
            return token;

        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            this.debugLog.push(`Error de conexión durante el login: ${errorMessage}`);
            throw new Error(`Could not connect to the API. ${errorMessage}`);
        }
    }

    public async executeQuery(sql: string): Promise<any[]> {
        this.debugLog.push("Paso 1: Validando credenciales de la API...");
        if (!this.credentials.codfab || !this.credentials.codcli || !this.credentials.basedatos || !this.credentials.password) {
            this.debugLog.push("Error: Las credenciales de la API no están configuradas.");
            throw new Error("API credentials are not fully set.");
        }
        this.debugLog.push("Credenciales validadas.");

        const token = await this.getAccessToken();

        try {
            this.debugLog.push("Paso 3: Solicitando los datos a la API...");
            const consultaUrl = `${API_BASE_URL}/admin/LanzarConsulta`;
            const year = new Date().getFullYear().toString();

            const consultaBody = {
                ejercicio: year,
                consulta: sql,
            };

            this.debugLog.push(`Año actual determinado: ${year}`);
            this.debugLog.push(`URL de consulta: ${consultaUrl}`);
            this.debugLog.push(`Cuerpo de la petición: ${JSON.stringify(consultaBody)}`);

            const response = await fetch(consultaUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(consultaBody),
            });

            const contentType = response.headers.get("content-type");
            this.debugLog.push(`Respuesta de la API recibida con Content-Type: ${contentType}`);

            let responseData;
            const responseClone = response.clone();
            try {
                responseData = await response.json();
            } catch (e) {
                const responseText = await responseClone.text();
                this.debugLog.push(`Error: La respuesta de la consulta no es un JSON válido. Respuesta: ${responseText}`);
                throw new Error(`An unexpected response was received from the server.`);
            }

            if (!response.ok) {
                const errorMessage = responseData?.error?.message || responseData?.Errores?.Excepcion || responseData.message || "Failed to execute query.";
                this.debugLog.push(`Error de API al ejecutar la consulta: ${errorMessage}`);
                this.debugLog.push(`Respuesta completa del error: ${JSON.stringify(responseData)}`);
                throw new Error(`API Error: ${errorMessage}`);
            }

            const result = responseData.resultado;

            if (result === undefined) {
                this.debugLog.push("Error: La respuesta de la API no contenía el campo 'resultado'.");
                this.debugLog.push(`Respuesta completa: ${JSON.stringify(responseData)}`);
                throw new Error("Unexpected API response format.");
            }

            return result;
        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            // Evitar duplicar el mensaje si ya fue lanzado desde getAccessToken
            if (!errorMessage.startsWith("Could not connect to the API") && !errorMessage.startsWith("API Error")) {
                this.debugLog.push(`Error durante la ejecución de la consulta: ${errorMessage}`);
            }
            throw error; // Re-lanzar el error para que sea manejado por el llamador
        }
    }
}
