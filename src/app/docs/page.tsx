'use client';

import { LifeBuoy, Users, Code, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <>
      <div className="flex items-center gap-4 border-b pb-4 mb-8">
        <LifeBuoy className="w-10 h-10 text-primary" />
        <h1 className="!mt-0 !mb-2">Centro de Documentación</h1>
      </div>
      <p className="lead">
        Bienvenido a la documentación oficial de MICE Catering. Aquí encontrarás
        todo lo que necesitas para entender y utilizar la aplicación, tanto
        desde una perspectiva funcional como técnica.
      </p>

      <div className="not-prose grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
        <Link href="/docs/user-manual" className="no-underline">
          <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Users />Manual de Catering</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Guía completa para la gestión de eventos de catering, desde la OS hasta la producción y el servicio.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/entregas-manual" className="no-underline">
          <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Package />Manual de Entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Flujo de trabajo y operativa específica para la nueva vertical de negocio de Entregas MICE.
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
                Arquitectura, modelo de datos y flujos técnicos para desarrolladores y perfiles técnicos.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
