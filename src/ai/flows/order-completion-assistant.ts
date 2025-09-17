'use server';

/**
 * @fileOverview This file defines a Genkit flow for an AI-powered order completion assistant.
 *
 * The assistant recommends items to rent for an event based on a short description.
 *
 * @fileOverview
 * orderCompletionAssistant - A function that takes an event description and returns a list of recommended items.
 * OrderCompletionAssistantInput - The input type for the orderCompletionAssistant function.
 * OrderCompletionAssistantOutput - The output type for the orderCompletionAssistant function, which is a list of recommended items with descriptions and prices.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OrderCompletionAssistantInputSchema = z.object({
  eventDescription: z
    .string()
    .describe('A short description of the event, including type and number of attendees.'),
});
export type OrderCompletionAssistantInput = z.infer<
  typeof OrderCompletionAssistantInputSchema
>;

const OrderCompletionAssistantOutputSchema = z.array(z.object({
  itemCode: z.string().describe('The unique code of the item.'),
  description: z.string().describe('A description of the item.'),
  price: z.number().describe('The price of the item per day.'),
  quantity: z.number().describe('The quantity of the item recommended for the event.')
}));

export type OrderCompletionAssistantOutput = z.infer<
  typeof OrderCompletionAssistantOutputSchema
>;

export async function orderCompletionAssistant(
  input: OrderCompletionAssistantInput
): Promise<OrderCompletionAssistantOutput> {
  return orderCompletionAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'orderCompletionAssistantPrompt',
  input: {schema: OrderCompletionAssistantInputSchema},
  output: {schema: OrderCompletionAssistantOutputSchema},
  prompt: `You are a catering equipment rental expert. You will receive a description of an event, and you will provide a list of items that are recommended to be rented, along with a quantity of how many of each item is recommended. You must respond with a JSON array.

Event Description: {{{eventDescription}}}`,
});

const orderCompletionAssistantFlow = ai.defineFlow(
  {
    name: 'orderCompletionAssistantFlow',
    inputSchema: OrderCompletionAssistantInputSchema,
    outputSchema: OrderCompletionAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
