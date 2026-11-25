import { useState, type ReactNode } from 'react'
import { AlertTriangle, Download, ExternalLink, FlaskConical, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeMenu } from '@/components/ThemeMenu'
import { MenuButton } from '@/components/MenuButton'
import { cn } from '@/lib/utils'
import { MENU_URL, screenUrl, EMITIDOS_URL, PAGOS_URL, PENDIENTES_URL } from '@/lib/api'
import { abrirEnVentana, descargarBlob, ESTADO_CLS, ESTADO_LABEL, getArchivo, nombreArchivo, type Cfdi, type Estado, type Proveedor } from '@/lib/cfdi'

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

// Botones para ver o bajar XML, PDF y acuse de un CFDI.
export function Archivos({ org, c }: { org: string; c: Cfdi }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const run = async (archivo: 'xml' | 'pdf' | 'acuse', abrir: boolean) => {
    const win = abrir ? window.open('', '_blank') : null
    setBusy(archivo + abrir); setError('')
    try { const b = await getArchivo(org, `cfdi/${c.id}/${archivo}`); const n = nombreArchivo(c, archivo); if (abrir) abrirEnVentana(win, b, n); else descargarBlob(b, n) }
    catch (e) { win?.close(); setError(e instanceof Error ? e.message : 'No se pudo obtener el archivo.') }
    finally { setBusy('') }
  }
  const a = c.archivos ?? { xml: !!c.uuid, pdf: !!c.uuid, acuse: false }
  const btn = 'h-8 gap-1.5 border-slate-200 text-xs'
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className={btn} disabled={!!busy || (!a.pdf && !c.pdf_pendiente)} onClick={() => void run('pdf', true)}>{busy === 'pdftrue' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}Ver PDF</Button>
        <Button variant="outline" size="sm" className={btn} disabled={!!busy || (!a.pdf && !c.pdf_pendiente)} onClick={() => void run('pdf', false)}><Download className="w-3.5 h-3.5" />PDF</Button>
        <Button variant="outline" size="sm" className={btn} disabled={!!busy || !a.xml} onClick={() => void run('xml', false)}><Download className="w-3.5 h-3.5" />XML</Button>
        {a.acuse && <Button variant="outline" size="sm" className={btn} disabled={!!busy} onClick={() => void run('acuse', false)}><Download className="w-3.5 h-3.5" />Acuse de cancelación</Button>}
      </div>
      {c.pdf_pendiente && <p className="text-[11px] text-amber-800">El PDF todavía se está generando; vuelve a intentar en un momento.</p>}
      {error && <p role="alert" className="text-[11px] text-red-700">{error}</p>}
    </div>
  )
}

export const urlEmitido = (c: Pick<Cfdi, 'id'>) => screenUrl(EMITIDOS_URL, { cfdi_id: c.id })
