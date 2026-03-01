/**
 * LRU cache pre remote marker sprites.
 *
 * Keď backend pridá novú prevádzku s `markerSpriteUrl`, sprite sa stiahne
 * cez `Image.prefetch()` a uloží sa do cache. Sprite je dostupný na použitie
 * až keď je úspešne stiahnutý (aby `tracksViewChanges=false` nepokazil render).
 *
 * Kapacita: MAX_CACHE_SIZE sprites. Po naplnení sa najstarší záznam vymaže (LRU).
 */

const MAX_CACHE_SIZE = 200;

type CacheEntry = {
  status: "pending" | "cached" | "failed";
  accessOrder: number;
};

const cache = new Map<string, CacheEntry>();
let accessCounter = 0;
let imagePrefetchFn: ((url: string) => Promise<boolean>) | null | undefined;

const resolveImagePrefetch = () => {
  if (imagePrefetchFn !== undefined) {
    return imagePrefetchFn;
  }

  try {
    const dynamicRequire = Function(
      "return typeof require === 'function' ? require : null;"
    )() as ((id: string) => { Image?: { prefetch?: (url: string) => Promise<boolean> } }) | null;
    const reactNative = dynamicRequire?.("react-native");
    const candidate = reactNative?.Image?.prefetch;
    imagePrefetchFn = typeof candidate === "function" ? candidate : null;
  } catch {
    imagePrefetchFn = null;
  }

  return imagePrefetchFn;
};

const evictIfNeeded = () => {
  if (cache.size <= MAX_CACHE_SIZE) return;

  let oldestKey: string | null = null;
  let oldestOrder = Infinity;
  cache.forEach((entry, key) => {
    if (entry.accessOrder < oldestOrder) {
      oldestOrder = entry.accessOrder;
      oldestKey = key;
    }
  });
  if (oldestKey) {
    cache.delete(oldestKey);
  }
};

/**
 * Prefetchne sprite URL. Bezpečné volať opakovane — duplikáty sa ignorujú.
 */
export const prefetchSprite = async (url: string): Promise<boolean> => {
  if (!url || typeof url !== "string") return false;

  const existing = cache.get(url);
  if (existing) {
    existing.accessOrder = ++accessCounter;
    return existing.status === "cached";
  }

  const entry: CacheEntry = { status: "pending", accessOrder: ++accessCounter };
  cache.set(url, entry);
  evictIfNeeded();

  try {
    const prefetch = resolveImagePrefetch();
    if (!prefetch) {
      entry.status = "failed";
      return false;
    }
    await prefetch(url);
    entry.status = "cached";
    return true;
  } catch {
    entry.status = "failed";
    return false;
  }
};

/**
 * Vráti true ak sprite pre dané URL je stiahnutý a pripravený na použitie.
 */
export const isSpriteCached = (url: string): boolean => {
  const entry = cache.get(url);
  if (!entry) return false;
  entry.accessOrder = ++accessCounter;
  return entry.status === "cached";
};

/**
 * Prefetchne pole sprite URL-ov paralelne. Vhodné na batch prefetch
 * pri načítaní markerov z backendu.
 */
export const prefetchSprites = async (urls: string[]): Promise<void> => {
  const unique = [...new Set(urls.filter((u) => u && !cache.has(u)))];
  if (unique.length === 0) return;
  await Promise.allSettled(unique.map(prefetchSprite));
};

/**
 * Vymaže celú cache. Užitočné pri memory pressure alebo logout.
 */
export const clearSpriteCache = () => {
  cache.clear();
  accessCounter = 0;
};
