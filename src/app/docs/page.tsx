
'use client';

import { LifeBuoy, Users, Code, Package, Award, GitBranch, Bot, Info, Palette } from "lucide-react";
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
        <Link href="/docs/super-prompt" className="no-underline col-span-1 md:col-span-2 lg:col-span-3">
          <Card className="hover:border-primary hover:shadow-lg transition-all h-full bg-primary/10 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Bot />Super Prompt de Contexto</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                El prompt maestro con toda la información del proyecto para poner al día a la IA y asegurar la coherencia en el desarrollo.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
         <Link href="/docs/info-ia" className="no-underline">
          <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Info />Info IA</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Documentación integral del proyecto, incluyendo arquitectura, flujos de trabajo y estructura de datos.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
         <Link href="/docs/design-info" className="no-underline">
          <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Palette />Información de Diseño</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Guía visual y estructural de la interfaz de usuario de la aplicación, pantalla por pantalla.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/features" className="no-underline">
          <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Award />Propuesta de Valor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Descubre el potencial de la plataforma, sus características clave y cómo soluciona los problemas críticos del sector.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/user-manual" className="no-underline">
          <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
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
          <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
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
          <Card className="hover:border-primary/50 hover:shadow-lg transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Code />Checklist de Funcionalidades</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Un listado técnico y detallado de todas las capacidades implementadas en la plataforma.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
