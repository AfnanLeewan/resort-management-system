// Deno type declarations for Supabase Edge Functions
// This file provides type definitions to satisfy the TypeScript compiler

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }
  export const env: Env;
}

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export interface ServeInit {
    port?: number;
    hostname?: string;
    handler?: (request: Request) => Response | Promise<Response>;
    onError?: (error: unknown) => Response | Promise<Response>;
  }
  
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: ServeInit
  ): void;
}

declare module "https://deno.land/std@0.177.0/crypto/mod.ts" {
  export const crypto: {
    subtle: SubtleCrypto;
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
    randomUUID(): string;
  };
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
