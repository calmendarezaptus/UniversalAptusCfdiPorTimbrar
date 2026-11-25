// Función del proyecto CFDI (CfdiForAptusFinancials): aptus_cfdi_services.
// Desarrollo usa el proxy de Vite (mismo origen); VITE_API_BASE_URL la reemplaza si se define.
const FALLBACK_API = 'https://cfdiforaptusfinancials-730085095.development.catalystserverless.com/server/aptus_cfdi_services'
export const API_BASE = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || FALLBACK_API).replace(/\/$/, '')

// A dónde regresa "Regresar" si no llega ?origin= (menú principal).
export const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://universal-aptus-home.onslate.com/'

// Las tres pantallas del proyecto se abren entre sí.
export const PENDIENTES_URL = import.meta.env.VITE_PENDIENTES_URL || 'https://universal-aptus-cfdi-portimbrar.onslate.com/'
export const EMITIDOS_URL = import.meta.env.VITE_EMITIDOS_URL || 'https://universal-aptus-cfdi-emitidos.onslate.com/'
export const PAGOS_URL = import.meta.env.VITE_PAGOS_URL || 'https://universal-aptus-cfdi-pagos.onslate.com/'
export function screenUrl(base: string, params: Record<string, string | number | null | undefined>) {
  const u = new URL(base, window.location.href)
  const org = new URLSearchParams(window.location.search).get('organization_id')
  if (org) u.searchParams.set('organization_id', org)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v))
  return u.toString()
}
