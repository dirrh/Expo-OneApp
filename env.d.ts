declare module '@env' {
  export const SUPABASE_ANON_KEY: string;
  export const SUPABASE_URL: string;
}

declare module 'text-encoding' {
  export class TextEncoder {
    constructor(encoding?: string);
    encode(input?: string): Uint8Array;
  }

  export class TextDecoder {
    constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
    decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
  }
}

declare module "supercluster" {
  const Supercluster: new (options?: {
    radius?: number;
    maxZoom?: number;
    minZoom?: number;
    minPoints?: number;
    map?: (properties: { weight?: number }) => { weight: number };
    reduce?: (
      accumulated: { weight: number },
      properties: { weight?: number }
    ) => void;
  }) => {
    load(points: Array<{
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: { markerId: string; weight: number };
    }>): void;
    getClusters(
      bbox: [number, number, number, number],
      zoom: number
    ): Array<{
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: {
        cluster?: boolean;
        cluster_id?: number;
        point_count?: number;
        weight?: number;
        markerId?: string;
      };
    }>;
  };

  export default Supercluster;
}

