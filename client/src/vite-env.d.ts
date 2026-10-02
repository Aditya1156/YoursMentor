/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_RAZORPAY_KEY_ID: string
  readonly VITE_LIVEKIT_URL: string
  readonly VITE_MOCK_SESSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
