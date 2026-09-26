/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BLOCKFROST_API_KEY: string;
  readonly VITE_PINATA_JWT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
