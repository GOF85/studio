'use client';

import { LifeBuoy, Users, Code } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <>
      <div className="flex items-center gap-4">
        <LifeBuoy className="w-10 h-10 text-primary" />
        <h1 className="!mt-0 !mb-2">Centro de Documentación</h1>
      </div>
      <p className="lead">
        Bienvenido a la documentación oficial de CateringStock. Aquí encontrarás
        todo lo que necesitas para entender y utilizar la aplicación, tanto
        desde una perspectiva funcional como técnica.
      </p>

      <div className="not-prose grid md:grid-cols-2 gap-8 mt-12">
        <Link href="/docs/user-manual" className="no-underline">
          <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Users />Manual de Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Una guía completa orientada a los usuarios finales. Aprende a
                gestionar órdenes de servicio, planificar la producción, y
                utilizar todos los módulos de la aplicación paso a paso.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/tech-docs" className="no-underline">
          <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Code />Documentación Técnica</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Para desarrolladores y perfiles técnicos. Descubre la
                arquitectura de la aplicación, el modelo de datos detallado,
                y cómo están construidos los componentes y flujos clave.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
