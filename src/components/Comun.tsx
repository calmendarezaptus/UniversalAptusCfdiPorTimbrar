import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Download, ExternalLink, FlaskConical, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeMenu } from '@/components/ThemeMenu'
import { MenuButton } from '@/components/MenuButton'
import { cn } from '@/lib/utils'
import { inputCls, labelCls } from '@/lib/ui'
import { MENU_URL, screenUrl, EMITIDOS_URL, PAGOS_URL, PENDIENTES_URL } from '@/lib/api'
import {
  abrirEnVentana, archivoPath, descargarBlob, ESTADO_CLS, ESTADO_LABEL, formatFecha, formatFechaHora, formatMoney, FUENTE_TC_LABEL, getArchivo, nombreArchivo, RESULTADO_LABEL, validarTcManual,
  type ArchivoCfdi, type Cancelacion, type Cfdi, type Estado, type FuenteTc, type OpcionesMoneda, type Proveedor, type TipoCambioInfo,
} from '@/lib/cfdi'

export function Encabezado({ icon: Icon, titulo, subtitulo, theme, setTheme, acciones }: {
  icon: React.ComponentType<{ className?: string }>; titulo: string; subtitulo: string; theme: string; setTheme: (t: string) => void; acciones?: ReactNode
}) {
  const regresar = () => {
    const params = new URLSearchParams(window.location.search)
    try { window.location.href = new URL(params.get('origin') || screenUrl(MENU_URL, {})).toString() }
    catch { window.location.href = screenUrl(MENU_URL, {}) }
  }
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-0 relative z-10">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-theme-from to-theme-to flex items-center justify-center shrink-0 shadow-sm border border-black/5 text-white"><Icon className="w-7 h-7" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{titulo}</h1>
            <ThemeMenu theme={theme} setTheme={setTheme} />
            <MenuButton />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{subtitulo}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-4 lg:mt-0 w-full lg:w-auto">
        {acciones}
        <Button variant="outline" type="button" onClick={regresar} className="flex-1 lg:flex-none h-11 px-6 rounded-lg border-slate-200 text-slate-700 font-medium">Regresar</Button>
      </div>
    </div>
  )
}

// Pestañas entre las tres pantallas del proyecto (cada una es su propia Slate).
export function NavCfdi({ actual }: { actual: 'pendientes' | 'emitidos' | 'pagos' }) {
  const items = [
    { id: 'pendientes', label: 'Por timbrar', href: screenUrl(PENDIENTES_URL, {}) },
    { id: 'emitidos', label: 'CFDI emitidos', href: screenUrl(EMITIDOS_URL, {}) },
    { id: 'pagos', label: 'Complementos de pago', href: screenUrl(PAGOS_URL, {}) },
  ] as const
  return (
    <nav aria-label="Secciones de CFDI" className="relative z-10 mb-4 flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 w-max max-w-full overflow-x-auto">
      {items.map(i => (
        <a key={i.id} href={i.href} aria-current={actual === i.id ? 'page' : undefined}
          className={cn('px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all',
            actual === i.id ? 'bg-white text-theme-text shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-theme-light border border-transparent')}>{i.label}</a>
      ))}
    </nav>
  )
}

// Aviso de modo prueba / proveedor. Con otro proveedor (Creator, interno) la pantalla solo consulta.
export function AvisoProveedor({ p, error }: { p: Proveedor | null; error: string }) {
  if (error) return <p role="alert" className="relative z-10 mb-4 text-xs rounded-lg border border-red-200 bg-red-50 p-2 text-red-700">{error}</p>
  if (!p) return null
  if (p.proveedor !== 'aptus') {
    return (
      <p className="relative z-10 mb-4 text-xs rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Este despacho tiene el CFDI en {p.proveedor === 'creator' ? 'su app de Zoho Creator' : p.proveedor === 'interno' ? 'el registro interno' : '"sin CFDI"'}: aquí solo se consulta. Para timbrar desde Aptus, el proveedor debe ser "aptus" (Configuración del despacho).
      </p>
    )
  }
  return (
    <p className="relative z-10 mb-4 text-xs rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900 flex flex-wrap items-center gap-1.5">
      <FlaskConical className="w-3.5 h-3.5 shrink-0" />
      <b>Modo prueba</b>: los CFDI se timbran con el emisor <b>{p.emisor}</b> en el ambiente de pruebas y <b>no existen ante el SAT</b>.
      {p.momento && <span> Se timbra {p.momento === 'al_pagar' ? 'al cobrar (PUE)' : 'al facturar (PPD, con complementos de pago)'}.</span>}
      {p.api && !p.api.configurada && <span className="text-red-700"> Falta configurar la conexión con la API ({(p.api.faltan || []).join(', ')}).</span>}
    </p>
  )
}

export const EstadoBadge = ({ e, prueba }: { e: Estado; prueba?: boolean }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap">
    <span className={cn('text-[10px] font-semibold rounded px-1.5 py-0.5 border', ESTADO_CLS[e] ?? ESTADO_CLS.error)}>{ESTADO_LABEL[e] ?? e}</span>
    {prueba && <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 border border-amber-200 bg-amber-50 text-amber-800">prueba</span>}
  </span>
)

// Botones de archivos. El PDF lleva la leyenda de cancelación que corresponda; el original, no.
export function Archivos({ org, c }: { org: string; c: Cfdi }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const run = async (archivo: ArchivoCfdi, abrir: boolean) => {
    const win = abrir ? window.open('', '_blank') : null
    setBusy(archivo + abrir); setError('')
    try { const b = await getArchivo(org, archivoPath(c.id, archivo)); const n = nombreArchivo(c, archivo); if (abrir) abrirEnVentana(win, b, n); else descargarBlob(b, n) }
    catch (e) { win?.close(); setError(e instanceof Error ? e.message : 'No se pudo obtener el archivo.') }
    finally { setBusy('') }
  }
  const a = c.archivos ?? { xml: !!c.uuid, pdf: !!c.uuid, acuse: false }
  const leyenda = c.pdf?.leyenda
  const btn = 'h-8 gap-1.5 border-slate-200 text-xs'
  const spin = (k: string) => busy === k ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className={btn} disabled={!!busy || (!a.pdf && !c.pdf_pendiente)} onClick={() => void run('pdf', true)}>{spin('pdftrue') ?? <ExternalLink className="w-3.5 h-3.5" />}Ver PDF{leyenda ? ' (con leyenda)' : ''}</Button>
        <Button variant="outline" size="sm" className={btn} disabled={!!busy || (!a.pdf && !c.pdf_pendiente)} onClick={() => void run('pdf', false)}>{spin('pdffalse') ?? <Download className="w-3.5 h-3.5" />}PDF</Button>
        {leyenda && a.pdf_original && <Button variant="outline" size="sm" className={btn} disabled={!!busy} onClick={() => void run('pdf_original', false)}>{spin('pdf_originalfalse') ?? <Download className="w-3.5 h-3.5" />}PDF original</Button>}
        <Button variant="outline" size="sm" className={btn} disabled={!!busy || !a.xml} onClick={() => void run('xml', false)}>{spin('xmlfalse') ?? <Download className="w-3.5 h-3.5" />}XML</Button>
        {a.acuse && <Button variant="outline" size="sm" className={btn} disabled={!!busy} onClick={() => void run('acuse', false)}>{spin('acusefalse') ?? <Download className="w-3.5 h-3.5" />}Acuse (PDF)</Button>}
        {a.acuse_xml && <Button variant="outline" size="sm" className={btn} disabled={!!busy} onClick={() => void run('acuse_xml', false)}>{spin('acuse_xmlfalse') ?? <Download className="w-3.5 h-3.5" />}Acuse (XML)</Button>}
      </div>
      {leyenda && <p className="text-[11px] text-slate-500">El PDF lleva la leyenda "{leyenda === 'cancelado' ? 'CANCELADO' : 'EN PROCESO DE CANCELACIÓN'}". El XML no cambia: el timbrado no se modifica.</p>}
      {c.pdf_pendiente && <p className="text-[11px] text-amber-800">El PDF todavía se está generando; vuelve a intentar en un momento.</p>}
      {error && <p role="alert" className="text-[11px] text-red-700">{error}</p>}
    </div>
  )
}

// Estado de la cancelación de un CFDI: resultado, fechas, seguimiento y solicitudes anteriores.
export function CancelacionInfo({ c }: { c: Cancelacion }) {
  const tone = c.resultado === 'rechazada' ? 'border-sky-200 bg-sky-50 text-sky-900' : c.resultado === 'en_proceso' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'
  const s = c.seguimiento
  return (
    <div className={cn('rounded-lg border p-2 text-xs space-y-1', tone)}>
      <p className="font-semibold">{c.resultado ? RESULTADO_LABEL[c.resultado] ?? c.resultado : 'Cancelación solicitada'}</p>
      {c.texto && <p>{c.texto}</p>}
      <p className="text-[11px]">Solicitada {formatFechaHora(c.fecha_solicitud)} · motivo {c.motivo}{c.motivo_descripcion ? ` (${c.motivo_descripcion})` : ''}{c.sustituto ? ` · sustituye ${c.sustituto}` : ''}{c.fecha_resultado ? ` · resultado ${formatFechaHora(c.fecha_resultado)}` : ''}</p>
      {c.resultado === 'rechazada' && <p className="text-[11px] font-medium">El CFDI sigue vigente; se puede volver a solicitar la cancelación.</p>}
      {s && c.resultado === 'en_proceso' && (
        <p className="text-[11px]">{s.terminado ? `Se dejó de consultar: ${s.terminado.motivo}` : s.activo ? `Se consulta solo; próxima consulta ${formatFechaHora(s.proxima_consulta)} (${s.consultas ?? 0} hechas).` : 'Sin seguimiento automático.'}
          {s.api && !s.api.activo && s.api.motivo ? ` ${s.api.motivo}` : ''}</p>
      )}
      {c.fuente_estatus && <p className="text-[10px] opacity-80">Fuente: {c.fuente_estatus}</p>}
      {!!c.anteriores?.length && <p className="text-[10px] opacity-80">Solicitudes anteriores: {c.anteriores.map(a => `${formatFecha(a.fecha_solicitud)} (${a.resultado ? RESULTADO_LABEL[a.resultado] ?? a.resultado : '—'})`).join(' · ')}</p>}
    </div>
  )
}

// Moneda del CFDI y tipo de cambio (facturas) o solo el tipo de cambio (complementos).
// `aplicar` vuelve a armar la vista previa; con TC manual espera a que se pulse "Aplicar".
export function MonedaTc({ monedaFactura, info, opciones, conMoneda, onCambio, disabled }: {
  monedaFactura?: string | null; info?: TipoCambioInfo | null; opciones: OpcionesMoneda; conMoneda: boolean
  onCambio: (o: OpcionesMoneda) => void; disabled?: boolean
}) {
  const [manual, setManual] = useState(opciones.tipo_cambio ?? '')
  useEffect(() => { setManual(opciones.tipo_cambio ?? '') }, [opciones.tipo_cambio])
  const extranjera = !!monedaFactura && monedaFactura !== 'MXN'
  if (!extranjera && !info?.valor) return null
  const fuente = opciones.tc_fuente ?? info?.fuente ?? 'books'
  const errManual = fuente === 'manual' ? validarTcManual({ tc_fuente: 'manual', tipo_cambio: manual }) : null
  const seg = (on: boolean) => cn('px-3 h-8 text-xs font-semibold rounded-md border whitespace-nowrap', on ? 'bg-white text-theme-text shadow-sm border-slate-200' : 'text-slate-500 border-transparent hover:bg-theme-light')
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        {conMoneda && extranjera && (
          <div className="space-y-1"><span className={cn(labelCls, 'block')}>Moneda del CFDI</span>
            <div role="radiogroup" aria-label="Moneda del CFDI" className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button type="button" role="radio" aria-checked={(opciones.moneda ?? 'factura') === 'factura'} disabled={disabled} className={seg((opciones.moneda ?? 'factura') === 'factura')} onClick={() => onCambio({ ...opciones, moneda: 'factura' })}>{monedaFactura} (la de la factura)</button>
              <button type="button" role="radio" aria-checked={opciones.moneda === 'mxn'} disabled={disabled} className={seg(opciones.moneda === 'mxn')} onClick={() => onCambio({ ...opciones, moneda: 'mxn' })}>MXN (convertir)</button>
            </div>
          </div>
        )}
        <div className="space-y-1"><span className={cn(labelCls, 'block')}>Tipo de cambio</span>
          <div role="radiogroup" aria-label="Fuente del tipo de cambio" className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {(['books', 'banxico', 'manual'] as FuenteTc[]).map(f => (
              <button key={f} type="button" role="radio" aria-checked={fuente === f} disabled={disabled} className={seg(fuente === f)}
                onClick={() => { if (f === 'manual') onCambio({ ...opciones, tc_fuente: 'manual', tipo_cambio: manual || String(info?.valor ?? '') }); else onCambio({ ...opciones, tc_fuente: f, tipo_cambio: undefined }) }}>{FUENTE_TC_LABEL[f]}</button>
            ))}
          </div>
        </div>
        {fuente === 'manual' && (
          <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); if (!errManual) onCambio({ ...opciones, tc_fuente: 'manual', tipo_cambio: manual }) }}>
            <label className="space-y-1"><span className={cn(labelCls, 'block')}>Valor</span>
              <Input inputMode="decimal" className={cn(inputCls, 'w-28 text-right')} value={manual} onChange={e => setManual(e.target.value)} aria-label="Tipo de cambio manual" /></label>
            <Button type="submit" variant="outline" className="h-9 border-slate-200" disabled={disabled || !!errManual || manual.trim() === (opciones.tipo_cambio ?? '')}>Aplicar</Button>
          </form>
        )}
      </div>
      {errManual && <p role="alert" className="text-[11px] text-red-700">{errManual}</p>}
      {info && (
        <p className="text-[11px] text-slate-600">
          Usado: <b className="tabular-nums">{info.valor != null ? info.valor : '—'}</b> ({FUENTE_TC_LABEL[info.fuente] ?? info.fuente}{info.fecha_pago ? `, pago del ${formatFecha(info.fecha_pago)}` : ''})
          {' · '}Books: {info.books ?? '—'}
          {' · '}FIX Banxico: {info.banxico ? `${info.banxico.tipo_cambio} (${formatFecha(info.banxico.fecha_fix)})` : info.banxico_error ? 'no disponible' : '—'}
          {info.desviacion_vs_fix_pct != null && <> · <span className={cn(Math.abs(info.desviacion_vs_fix_pct) > 10 ? 'text-red-700 font-semibold' : '')}>{info.desviacion_vs_fix_pct}% contra el FIX</span></>}
          {info.banxico?.rango_aceptado?.maximo != null && <span className="text-slate-400"> · el SAT acepta hasta {formatMoney(info.banxico.rango_aceptado.maximo)}</span>}
        </p>
      )}
    </div>
  )
}

export const urlEmitido = (c: Pick<Cfdi, 'id'>) => screenUrl(EMITIDOS_URL, { cfdi_id: c.id })
