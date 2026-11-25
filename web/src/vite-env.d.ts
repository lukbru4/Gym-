/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_BACKEND?: 'local' | 'cloud' }
interface ImportMeta { readonly env: ImportMetaEnv }
