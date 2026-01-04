export type NormalizedImage = {
  id: string;
  url: string;
  esPrincipal?: boolean;
  orden?: number;
};

export function normalizeImages(images: any): NormalizedImage[] {
  if (!images) return [];
  // If it's already an array, map; if it's a JSON string, try parse
  let arr: any[] = images;
  if (typeof images === 'string') {
    try {
      arr = JSON.parse(images);
    } catch (_) {
      // not JSON, maybe a single url
      arr = [images];
    }
  }
  if (!Array.isArray(arr)) return [];

  return arr
    .map((img: any, idx: number) => {
      if (!img) return null;
      if (typeof img === 'string') {
        return { id: img, url: img, esPrincipal: idx === 0, orden: idx } as NormalizedImage;
      }
      const url = img.url || img.path || img.src || img.key || img.file || null;
      if (!url) return null;
      return {
        id: img.id || url,
        url,
        esPrincipal: !!img.esPrincipal || !!img.principal || false,
        orden: typeof img.orden === 'number' ? img.orden : idx,
      } as NormalizedImage;
    })
    .filter(Boolean) as NormalizedImage[];
}

export function getThumbnail(images: any): string | undefined {
  const list = normalizeImages(images);
  if (list.length === 0) return undefined;
  const principal = list.find((i) => i.esPrincipal);
  return (principal || list[0]).url;
}

export function getImageList(images: any): NormalizedImage[] {
  return normalizeImages(images);
}
