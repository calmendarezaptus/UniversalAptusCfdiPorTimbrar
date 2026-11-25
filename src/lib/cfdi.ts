import { API_BASE } from './api'

// CFDI con el proveedor `aptus` de ReportesSandbox vía aptus_cfdi_services (hoy solo modo prueba).
// Esta librería es la misma en las tres pantallas del proyecto (Por timbrar, CFDI emitidos y
// Complementos de pago).
export interface Option { ID: string; display: string; secondary?: string; fotoUrl?: string }

export type Estado = 'timbrando' | 'vigente' | 'cancelacion_en_proceso' | 'cancelado' | 'error'
export interface Proveedor {
  proveedor: string; proveedor_nombre?: string; activo: boolean; modo?: string; emisor?: string; momento?: 'al_pagar' | 'al_facturar'
  api?: { configurada: boolean; faltan?: string[]; error?: string | null; host?: string }
  trabajos_en_curso?: unknown[]
}
export interface Pendiente {
  invoice_id: string; invoice_number: string; status_books: string; fecha: string; total: number; saldo: number; moneda: string
  cliente_id: string; cliente_nombre: string; prebill_id: number | null; motivo: string; ultimo_cfdi: { id?: number; uuid?: string; estado?: Estado } | null
}
export interface Pendientes { proveedor: string; momento: string; solo_prebills: boolean; total: number; facturas: Pendiente[] }
export interface ConceptoPrep {
  linea: number; nombre?: string; descripcion_books?: string; concepto: string | null; reconocido_por?: string | null; cantidad: number; valor_unitario: number
  importe: number; descuento: number; iva?: number; iva_books?: number; tasa?: number; clave_prod_serv?: string; clave_unidad?: string; objeto_imp?: string; incluido: boolean
}
export interface Receptor {
  rfc: string; nombre: string; regimen_fiscal: string; cp: string; uso_cfdi: string; tipo: string; residencia_fiscal?: string | null; num_reg_id_trib?: string | null
  origen?: Record<string, string>
}
// ── Moneda y tipo de cambio (fase 2) ──
export type MonedaCfdi = 'factura' | 'mxn'
export type FuenteTc = 'books' | 'banxico' | 'manual'
export interface OpcionesMoneda { moneda?: MonedaCfdi; tc_fuente?: FuenteTc; tipo_cambio?: string }
export interface TipoCambioInfo {
  valor: number | null; fuente: FuenteTc; moneda: string; en_cfdi?: boolean; books?: number | null; fecha_pago?: string
  banxico?: { tipo_cambio: number; fecha_fix: string; rango_aceptado?: { maximo: number; maximo_sat?: number } } | null
  banxico_error?: string | null; desviacion_vs_fix_pct?: number | null; requiere_confirmacion?: boolean
}
export interface Cancelacion {
  resultado: 'en_proceso' | 'sin_aceptacion' | 'aceptada' | 'plazo_vencido' | 'rechazada' | null; texto?: string; estado_sat?: string; mensaje_sat?: string
  motivo?: string; motivo_descripcion?: string; sustituto?: string | null; fecha_solicitud?: string | null; fecha_resultado?: string | null
  puede_volver_a_solicitar?: boolean; fuente_estatus?: string
  seguimiento?: { activo: boolean; proxima_consulta?: string | null; consultas?: number; ultima_consulta?: string | null; terminado?: { fin: string; motivo: string } | null; api?: { activo: boolean; motivo?: string } } | null
  anteriores?: Cancelacion[]
}
export interface Cancelable {
  cfdi_id: number; puede: boolean; bloqueantes: string[]; avisos: string[]
  complementos_vigentes: { cfdi_id: number; uuid: string; serie: string; folio: string; estado: Estado; payment_id: string }[]
}

export interface Preparado {
  invoice_id?: string; invoice_number?: string; payment_id?: string; status_books?: string; fecha_books?: string; cliente_nombre?: string; prebill_id?: number | null
  momento?: string; metodo_pago?: string; forma_pago?: string; moneda: string; tipo_cambio?: number | null; receptor?: Receptor
  conceptos?: ConceptoPrep[]; impuestos?: { tasa: number; base: number; importe: number }[]
  totales?: { books?: Record<string, number>; cfdi?: Record<string, number> }
  documentos?: DocumentoPago[]; monto?: number
  idempotency_key?: string; cfdi_existentes?: Cfdi[]; puede_timbrar: boolean; bloqueantes: string[]; avisos: string[]
  moneda_factura?: string; moneda_cfdi?: string; conversion?: string | null; requiere_confirmar_tipo_cambio?: boolean
  opciones?: { moneda?: MonedaCfdi; tc_fuente?: FuenteTc; tipo_cambio?: number | null }; tipo_cambio_info?: TipoCambioInfo | null; tipo_cambio_p?: number | null
}
export interface DocumentoPago {
  invoice_id: string; invoice_number: string; cfdi_id?: number | null; uuid?: string | null; num_parcialidad?: number
  saldo_anterior?: number; importe_pagado?: number; saldo_insoluto?: number; monto_books?: number; aplicado?: number
  moneda_dr?: string; equivalencia?: number
}
export interface Cfdi {
  id: number; tipo: 'I' | 'E' | 'P'; origen: 'aptus' | 'interno'; estado: Estado; trabajo_en_curso?: unknown
  invoice_id: string | null; invoice_number: string | null; payment_id: string | null; prebill_id: number | null; cliente_id: string | null
  serie: string | null; folio: string | null; uuid: string | null; total: number | null; moneda: string | null; tipo_cambio?: number | null
  metodo_pago?: string | null; forma_pago?: string | null; fecha?: string | null; fecha_timbrado?: string | null; status_sat?: string | null
  motivo_cancelacion?: string | null; sustituto?: string | null; cancelacion_solicitada_en?: string | null; ultima_consulta?: string | null
  emisor?: string | null; prueba?: boolean; receptor_rfc?: string | null; monto_excluido?: number | null; impuestos?: { tasa: number; base: number; importe: number }[] | null
  error?: string | null; intentos?: number; pdf_pendiente?: boolean; archivos?: { xml: boolean; pdf: boolean; acuse: boolean; pdf_original?: boolean; acuse_xml?: boolean }
  documentos?: DocumentoPago[]; notas?: string | null; creado_en?: string; actualizado_en?: string
  cancelacion?: Cancelacion | null
  pdf?: { leyenda: 'en_proceso' | 'cancelado' | null; leyenda_esperada?: string | null; disponible?: boolean; original_disponible?: boolean; pendiente?: boolean }
  moneda_factura?: string | null; total_factura?: number | null; conversion?: string | null; tipo_cambio_fuente?: FuenteTc | null
  tipo_cambio_books?: number | null; tipo_cambio_fix?: number | null; tipo_cambio_fix_fecha?: string | null; tipo_cambio_confirmado?: boolean; advertencias?: string[] | null
}
export interface Pago {
  payment_id: string; payment_number: string; fecha: string; monto: number; moneda: string; modo_pago_books?: string; forma_pago?: string
  cliente_id: string; cliente_nombre: string; documentos: DocumentoPago[]; complementos_cancelados?: number; error_ultimo_intento?: string | null
}
export interface Trabajo { cfdi_id: number; estado: Estado; idempotency_key?: string; avisos?: string[] }

// ── Lectura y escritura ──
type Fail = Error & { uncertain?: boolean; status?: number }
const fail = (message: string, uncertain: boolean, status?: number) => Object.assign(new Error(message), { uncertain, status }) as Fail
export const url = (org: string, path: string) => `${API_BASE}/${encodeURIComponent(org)}/${path}`

export async function read<T>(org: string, path: string, valid: (d: unknown) => boolean = () => true): Promise<T> {
  let response: Response
  try { response = await fetch(url(org, path)) } catch { throw new Error('No hay conexión con el servicio de CFDI.') }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw fail(typeof data?.error === 'string' ? data.error : 'No se pudo consultar.', false, response.status)
  if (!valid(data)) throw new Error('Respuesta inesperada del servicio de CFDI.')
  return data as T
}

// Red caída o respuesta sin la forma esperada = resultado incierto (puede que sí se haya timbrado).
async function write<T>(org: string, path: string, body: unknown, ok: (d: unknown) => boolean): Promise<T> {
  let response: Response
  try {
    response = await fetch(url(org, path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) })
  } catch {
    throw fail('Se perdió la respuesta. Revisa la lista de CFDI emitidos antes de volver a intentarlo.', true)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const uncertain = data?.outcome_unknown === true || (!data?.stage && response.status >= 500)
    throw fail(`${data?.error || `El servidor rechazó la petición (HTTP ${response.status}).`}${uncertain ? ' Revisa la lista de CFDI emitidos antes de volver a intentarlo.' : ''}`, uncertain, response.status)
  }
  if (!ok(data)) throw fail('No se pudo confirmar. Revisa la lista de CFDI emitidos antes de volver a intentarlo.', true)
  return data as T
}
const isObj = (d: unknown): d is Record<string, unknown> => !!d && typeof d === 'object' && !Array.isArray(d)
const esTrabajo = (d: unknown) => isObj(d) && Number.isInteger(d.cfdi_id)

export const getProveedor = (org: string) => read<Proveedor>(org, 'cfdi/proveedor', isObj)
export const getPendientes = (org: string, todas: boolean) => read<Pendientes>(org, `cfdi/pendientes${todas ? '?todas=1' : ''}`, d => isObj(d) && Array.isArray(d.facturas))
// Solo lo elegido; el tipo de cambio solo con la fuente manual.
export function opcionesQuery(o: OpcionesMoneda = {}, { conMoneda = true } = {}): string {
  const q = new URLSearchParams()
  if (conMoneda && o.moneda) q.set('moneda', o.moneda)
  if (o.tc_fuente) q.set('tc_fuente', o.tc_fuente)
  if (o.tc_fuente === 'manual' && o.tipo_cambio?.trim()) q.set('tipo_cambio', o.tipo_cambio.trim())
  return q.toString()
}
export function validarTcManual(o: OpcionesMoneda): string | null {
  if (o.tc_fuente !== 'manual') return null
  const v = (o.tipo_cambio ?? '').trim()
  if (!v) return 'Escribe el tipo de cambio.'
  if (!/^\d{1,6}(\.\d{1,6})?$/.test(v) || Number(v) <= 0) return 'Tipo de cambio inválido: mayor que 0 y hasta 6 decimales.'
  return null
}
const conQuery = (path: string, q: string) => q ? `${path}?${q}` : path
export const prepararFactura = (org: string, invoiceId: string, o: OpcionesMoneda = {}) =>
  read<Preparado>(org, conQuery(`cfdi/preparar/${encodeURIComponent(invoiceId)}`, opcionesQuery(o)), d => isObj(d) && Array.isArray(d.bloqueantes))
export const prepararComplemento = (org: string, paymentId: string, o: OpcionesMoneda = {}) =>
  read<Preparado>(org, conQuery(`cfdi/complemento/preparar/${encodeURIComponent(paymentId)}`, opcionesQuery(o, { conMoneda: false })), d => isObj(d) && Array.isArray(d.bloqueantes))
export const borradorPath = (invoiceId: string, o: OpcionesMoneda = {}) => conQuery(`cfdi/preparar/${encodeURIComponent(invoiceId)}/borrador`, opcionesQuery(o))
export const getCancelable = (org: string, id: number, motivo?: string, sustituto?: string) => {
  const q = new URLSearchParams()
  if (motivo) q.set('motivo', motivo)
  if (motivo === '01' && sustituto && UUID_RE.test(sustituto.trim())) q.set('sustituto', sustituto.trim())
  return read<Cancelable>(org, conQuery(`cfdi/${id}/cancelable`, q.toString()), d => isObj(d) && typeof d.puede === 'boolean')
}
export const getPagos = (org: string) => read<{ cfdi_ppd_vigentes: number; pagos: Pago[] }>(org, 'pagos-por-complementar', d => isObj(d) && Array.isArray(d.pagos))
export function listaQuery(f: { tipo?: string; estado?: string; origen?: string; invoice_id?: string; invoice_number?: string; payment_id?: string }) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v)
  const s = q.toString()
  return s ? '?' + s : ''
}
export async function getCfdis(org: string, f: Parameters<typeof listaQuery>[0] = {}): Promise<Cfdi[]> {
  const data = await read<unknown>(org, 'cfdi' + listaQuery(f))
  const list = Array.isArray(data) ? data : isObj(data) ? (data.cfdi ?? data.registros ?? data.items) : null
  if (!Array.isArray(list)) throw new Error('Respuesta inesperada del servicio de CFDI.')
  return list as Cfdi[]
}
export const getCfdi = (org: string, id: number) => read<Cfdi>(org, `cfdi/${id}`, d => isObj(d) && Number.isInteger(d.id))
export const getEstatus = (org: string, id: number) => read<{ registro?: Cfdi; api?: Record<string, unknown> }>(org, `cfdi/${id}/estatus`, isObj)

function cuerpoMoneda(o: OpcionesMoneda, confirmarTc: boolean, conMoneda: boolean) {
  const b: Record<string, unknown> = {}
  if (conMoneda && o.moneda) b.moneda = o.moneda
  if (o.tc_fuente) b.tc_fuente = o.tc_fuente
  if (o.tc_fuente === 'manual' && o.tipo_cambio?.trim()) b.tipo_cambio = o.tipo_cambio.trim()
  if (confirmarTc) b.confirmar_tipo_cambio = true
  return b
}
export const timbrarFactura = (org: string, invoiceId: string, o: OpcionesMoneda = {}, confirmarTc = false) =>
  write<Trabajo>(org, 'cfdi/timbrar', { invoice_id: invoiceId, confirmar: true, ...cuerpoMoneda(o, confirmarTc, true) }, esTrabajo)
export const timbrarComplemento = (org: string, paymentId: string, o: OpcionesMoneda = {}, confirmarTc = false) =>
  write<Trabajo>(org, 'cfdi/complemento', { payment_id: paymentId, confirmar: true, ...cuerpoMoneda(o, confirmarTc, false) }, esTrabajo)
export const cancelarCfdi = (org: string, id: number, motivo: string, sustituto?: string) =>
  write<{ registro?: Cfdi; api?: Record<string, unknown>; en_proceso?: boolean; mensaje?: string }>(org, `cfdi/${id}/cancelar`, { motivo, ...(motivo === '01' ? { sustituto } : {}), confirmar: true }, isObj)

// Sigue un trabajo hasta que deja de estar "timbrando" (la API puede tardar hasta 2 min).
export async function esperarTrabajo(org: string, id: number, { cada = 3000, max = 200000, onTick }: { cada?: number; max?: number; onTick?: (c: Cfdi) => void } = {},
  leer: (org: string, id: number) => Promise<Cfdi> = getCfdi, dormir = (ms: number) => new Promise(r => setTimeout(r, ms))): Promise<Cfdi> {
  const inicio = Date.now()
  let ultimo: Cfdi | null = null
  while (Date.now() - inicio < max) {
    try { ultimo = await leer(org, id); onTick?.(ultimo) } catch { /* reintenta */ }
    if (ultimo && ultimo.estado !== 'timbrando' && !ultimo.trabajo_en_curso) return ultimo
    await dormir(cada)
  }
  if (ultimo) return ultimo
  throw new Error('No se pudo seguir el timbrado. Revisa la lista de CFDI emitidos.')
}

// Archivos: se piden como blob para mostrar el error en pantalla si falla.
export async function getArchivo(org: string, path: string): Promise<Blob> {
  let response: Response
  try { response = await fetch(url(org, path), { signal: AbortSignal.timeout(40000) }) } catch { throw new Error('No hay conexión con el servicio de CFDI.') }
  const type = response.headers.get('content-type') || ''
  if (!response.ok || /json/.test(type)) {
    const data = await response.json().catch(() => null)
    throw new Error(typeof data?.error === 'string' ? data.error : `No se pudo obtener el archivo (HTTP ${response.status}).`)
  }
  return response.blob()
}
export function descargarBlob(blob: Blob, nombre: string) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 60000)
}
export function abrirEnVentana(win: Window | null, blob: Blob, nombre: string) {
  const href = URL.createObjectURL(blob)
  if (win && !win.closed) win.location.href = href
  else descargarBlob(blob, nombre)
  setTimeout(() => URL.revokeObjectURL(href), 5 * 60000)
}
export type ArchivoCfdi = 'xml' | 'pdf' | 'pdf_original' | 'acuse' | 'acuse_xml'
export const archivoPath = (id: number, a: ArchivoCfdi) =>
  a === 'pdf_original' ? `cfdi/${id}/pdf?original=1` : a === 'acuse_xml' ? `cfdi/${id}/acuse?formato=xml` : `cfdi/${id}/${a}`
export const nombreArchivo = (c: Pick<Cfdi, 'serie' | 'folio' | 'uuid' | 'id'> & { pdf?: Cfdi['pdf'] }, archivo: ArchivoCfdi) => {
  const base = [c.serie, c.folio].filter(Boolean).join('-') || 'CFDI-' + c.id
  const sufijo = archivo === 'acuse' || archivo === 'acuse_xml' ? '-acuse-cancelacion' : archivo === 'pdf_original' ? '-original'
    : archivo === 'pdf' && c.pdf?.leyenda === 'cancelado' ? '_CANCELADO' : archivo === 'pdf' && c.pdf?.leyenda === 'en_proceso' ? '_EN_CANCELACION' : ''
  return `${base}${sufijo}.${archivo === 'xml' || archivo === 'acuse_xml' ? 'xml' : 'pdf'}`
}

// ── Presentación ──
export const ESTADO_LABEL: Record<Estado, string> = {
  timbrando: 'Timbrando…', vigente: 'Vigente', cancelacion_en_proceso: 'Cancelación en proceso', cancelado: 'Cancelado', error: 'Error',
}
export const ESTADO_CLS: Record<Estado, string> = {
  timbrando: 'bg-sky-50 text-sky-800 border-sky-200', vigente: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelacion_en_proceso: 'bg-amber-50 text-amber-800 border-amber-200', cancelado: 'bg-slate-100 text-slate-600 border-slate-200', error: 'bg-red-50 text-red-700 border-red-200',
}
export const TIPO_LABEL: Record<string, string> = { I: 'Ingreso', E: 'Egreso', P: 'Complemento de pago' }
export const MOTIVOS: { id: string; label: string; desc: string }[] = [
  { id: '02', label: '02 · Comprobante emitido con errores sin relación', desc: 'El caso más común: se cancela y no se sustituye.' },
  { id: '01', label: '01 · Comprobante emitido con errores con relación', desc: 'Ya existe un CFDI nuevo que lo sustituye: se indica su UUID.' },
  { id: '03', label: '03 · No se llevó a cabo la operación', desc: 'La operación facturada no ocurrió.' },
  { id: '04', label: '04 · Operación nominativa relacionada en factura global', desc: 'Solo para facturas globales.' },
]
export const UUID_RE = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/
export function validarCancelacion(motivo: string, sustituto: string): string | null {
  if (!MOTIVOS.some(m => m.id === motivo)) return 'Elige el motivo de cancelación.'
  if (motivo === '01' && !UUID_RE.test(sustituto.trim())) return 'Escribe el UUID del CFDI que sustituye al cancelado.'
  return null
}
export function formatMoney(n: number | null | undefined, moneda?: string | null) {
  if (n == null) return '—'
  const s = Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return moneda ? `${s} ${moneda}` : s
}
export function formatFecha(iso?: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}
export const serieFolio = (c: Pick<Cfdi, 'serie' | 'folio'>) => [c.serie, c.folio].filter(Boolean).join('-') || '—'
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const coincide = (texto: string, ...campos: (string | number | null | undefined)[]) => {
  const words = norm(texto.trim()).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = norm(campos.filter(v => v !== null && v !== undefined).join(' '))
  return words.every(w => hay.includes(w))
}

export const RESULTADO_LABEL: Record<string, string> = {
  en_proceso: 'Cancelación en proceso', sin_aceptacion: 'Cancelado sin aceptación', aceptada: 'Cancelación aceptada por el receptor',
  plazo_vencido: 'Cancelado por plazo vencido', rechazada: 'El receptor rechazó la cancelación',
}
export const FUENTE_TC_LABEL: Record<FuenteTc, string> = { books: 'El de Books', banxico: 'FIX de Banxico', manual: 'Manual' }
export function formatFechaHora(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}
