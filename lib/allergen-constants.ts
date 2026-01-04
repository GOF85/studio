/**
 * Allergen Management Constants
 * Standard allergen list for Spanish catering industry
 */

export const ALLERGEN_LIST = [
  { id: 'gluten', label: 'Gluten', icon: '🌾' },
  { id: 'huevos', label: 'Huevos', icon: '🥚' },
  { id: 'lacteos', label: 'Lácteos', icon: '🥛' },
  { id: 'cacahuetes', label: 'Cacahuetes', icon: '🥜' },
  { id: 'frutos_secos', label: 'Frutos secos', icon: '🌰' },
  { id: 'pescado', label: 'Pescado', icon: '🐟' },
  { id: 'crustaceos', label: 'Crustáceos', icon: '🦐' },
  { id: 'soja', label: 'Soja', icon: '🫘' },
  { id: 'mostaza', label: 'Mostaza', icon: '🌱' },
  { id: 'apio', label: 'Apio', icon: '🥬' },
  { id: 'sesamo', label: 'Sésamo', icon: '🌾' },
  { id: 'moluscos', label: 'Moluscos', icon: '🦪' },
] as const

export type AllergendId = typeof ALLERGEN_LIST[number]['id']

export interface AllergenInfo {
  id: AllergendId
  label: string
  icon: string
}

/**
 * Get allergen info by ID
 */
export function getAllergenInfo(id: AllergendId): AllergenInfo | undefined {
  return ALLERGEN_LIST.find((a) => a.id === id)
}

/**
 * Get all allergen labels
 */
export function getAllergenLabels(): string[] {
  return ALLERGEN_LIST.map((a) => a.label)
}

/**
 * Validate if allergen ID exists
 */
export function isValidAllergen(id: unknown): id is AllergendId {
  return typeof id === 'string' && ALLERGEN_LIST.some((a) => a.id === id)
}
