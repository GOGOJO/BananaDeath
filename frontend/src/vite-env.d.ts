/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INFERENCE_MODE?: "browser" | "api";
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
