import { describe, it, expect, vi } from 'vitest';
import {
  cn,
  formatCurrency,
  formatNumber,
  formatUnit,
  formatPercentage,
  calculateHours,
  formatDuration,
  downloadCSVTemplate,
  getSupabaseImageUrl
} from '../utils';

describe('utils', () => {
  it('cn combina clases correctamente', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('formatCurrency maneja null, undefined y NaN', () => {
    expect(formatCurrency(null)).toMatch('€');
    expect(formatCurrency(undefined)).toMatch('€');
    expect(formatCurrency(NaN)).toMatch('€');
    // Solo comprobamos que contiene la parte decimal y el símbolo
    expect(formatCurrency(1234.56)).toMatch(/1234.*56.*€/);
  });

  it('formatNumber formatea decimales', () => {
    // Solo comprobamos que contiene la parte decimal
    expect(formatNumber(1234.5678)).toMatch(/1234.*57/);
    expect(formatNumber(1234, 0)).toMatch(/1234/);
  });

  it('formatUnit mapea unidades y fallback', () => {
    expect(formatUnit('KG')).toBe('kg');
    expect(formatUnit('L')).toBe('l');
    expect(formatUnit('UD')).toBe('ud');
    expect(formatUnit('OTRO')).toBe('OTRO');
  });

  it('formatPercentage formatea correctamente', () => {
    expect(formatPercentage(0.1234)).toBe('12.34%');
  });

  it('calculateHours calcula horas entre strings válidos', () => {
    expect(calculateHours('08:00', '10:30')).toBeCloseTo(2.5);
  });

  it('calculateHours retorna 0 si falta start o end', () => {
    expect(calculateHours(undefined, '10:00')).toBe(0);
    expect(calculateHours('08:00', undefined)).toBe(0);
  });

  it('calculateHours retorna 0 si formato inválido', () => {
    expect(calculateHours('xx', 'yy')).toBe(0);
  });

  it('calculateHours soporta paso de día', () => {
    expect(calculateHours('23:00', '01:00')).toBeCloseTo(2);
  });

  it('formatDuration convierte horas decimales a hh:mm', () => {
    expect(formatDuration(2.5)).toBe('02:30');
    expect(formatDuration(0)).toBe('00:00');
  });

  it('downloadCSVTemplate crea y descarga un archivo', () => {
    // Creamos un nodo real para jsdom
    const link = document.createElement('a');
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(link, 'click');
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    downloadCSVTemplate(['a','b','c'], 'test.csv');
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('getSupabaseImageUrl retorna null si url vacía', () => {
    expect(getSupabaseImageUrl(null)).toBeNull();
    expect(getSupabaseImageUrl(undefined)).toBeNull();
  });

  it('getSupabaseImageUrl retorna url si ya es http/https', () => {
    expect(getSupabaseImageUrl('https://foo.com/img.jpg')).toBe('https://foo.com/img.jpg');
    expect(getSupabaseImageUrl('http://foo.com/img.jpg')).toBe('http://foo.com/img.jpg');
  });

  it('getSupabaseImageUrl construye url pública si es relativa', () => {
    const OLD_ENV = process.env;
    process.env = { ...OLD_ENV, NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.io' };
    expect(getSupabaseImageUrl('img.jpg')).toBe('https://supabase.io/storage/v1/object/public/recetas/img.jpg');
    expect(getSupabaseImageUrl('/img.jpg')).toBe('https://supabase.io/storage/v1/object/public/recetas/img.jpg');
    process.env = OLD_ENV;
  });

  it('getSupabaseImageUrl retorna original si falta SUPABASE_URL', () => {
    const OLD_ENV = process.env;
    process.env = { ...OLD_ENV, NEXT_PUBLIC_SUPABASE_URL: '' };
    expect(getSupabaseImageUrl('img.jpg')).toBe('img.jpg');
    process.env = OLD_ENV;
  });
});
