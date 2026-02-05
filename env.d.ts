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

