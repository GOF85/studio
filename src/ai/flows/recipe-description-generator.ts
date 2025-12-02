'use server';

/**
 * @fileOverview A Genkit flow for generating a commercial description for a recipe.
 *
 * This flow takes key details about a recipe and uses an AI model to generate
 * a short, appealing description suitable for a menu or commercial proposal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecipeDescriptionInputSchema = z.object({
  nombre: z.string().describe('The name of the dish.'),
  tipoCocina: z.string().optional().describe('The culinary style or origin (e.g., Mediterranean, Asian, Fusion).'),
  perfilSaborPrincipal: z.string().optional().describe('The primary flavor profile (e.g., Salty, Sweet, Sour).'),
  perfilSaborSecundario: z.array(z.string()).optional().describe('Secondary flavor notes (e.g., Spicy, Smoky, Citrus).'),
  perfilTextura: z.array(z.string()).optional().describe('Key textures of the dish (e.g., Crunchy, Creamy, Smooth).'),
  tecnicaCoccionPrincipal: z.string().optional().describe('The main cooking technique used (e.g., Grilled, Slow-cooked, Raw).'),
});
export type RecipeDescriptionInput = z.infer<typeof RecipeDescriptionInputSchema>;

export async function recipeDescriptionGenerator(
  input: RecipeDescriptionInput
): Promise<string> {
  const result = await recipeDescriptionGeneratorFlow(input);
  return result.description;
}

const prompt = ai.definePrompt({
  name: 'recipeDescriptionGeneratorPrompt',
  input: { schema: RecipeDescriptionInputSchema },
  output: { schema: z.object({ description: z.string() }) },
  prompt: `
    Eres un experto en marketing gastronómico y redactor de menús para un catering de lujo.
    Tu tarea es crear una descripción comercial corta (máximo 25 palabras), atractiva y sugerente para una receta.
    Utiliza los siguientes datos para inspirarte, pero no te limites a listarlos. Evoca sensaciones y destaca lo más apetecible.
    No repitas el nombre del plato en la descripción.

    DATOS DE LA RECETA:
    - Nombre: {{{nombre}}}
    {{#if tipoCocina}}- Estilo de Cocina: {{{tipoCocina}}}{{/if}}
    {{#if perfilSaborPrincipal}}- Sabor Principal: {{{perfilSaborPrincipal}}}{{/if}}
    {{#if perfilSaborSecundario}}- Sabores Secundarios: {{#each perfilSaborSecundario}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
    {{#if perfilTextura}}- Texturas: {{#each perfilTextura}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
    {{#if tecnicaCoccionPrincipal}}- Técnica Principal: {{{tecnicaCoccionPrincipal}}}{{/if}}

    Ejemplo de respuesta para "Solomillo de ternera con reducción de Pedro Ximénez":
    "Tierno corazón de solomillo marcado a la parrilla, salseado con una intensa y aterciopelada reducción de vino dulce."

    Ahora, genera la descripción para la receta proporcionada.
  `,
});

const recipeDescriptionGeneratorFlow = ai.defineFlow(
  {
    name: 'recipeDescriptionGeneratorFlow',
    inputSchema: RecipeDescriptionInputSchema,
    outputSchema: z.object({ description: z.string() }),
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
