/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** POST URL for new-run form JSON (defaults to https://httpbin.org/post) */
  readonly VITE_SAMPLE_RUN_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
