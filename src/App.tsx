import { useEffect, useMemo, useRef, useState } from 'react'
import 'animate.css'
import { Toaster, toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ExternalLink, FileCheck2, Info, Loader2, RefreshCw, Search, Stamp, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusModal, type StatusModalType } from '@/components/StatusModal'
import { Archivos, AvisoProveedor, Encabezado, EstadoBadge, MonedaTc, NavCfdi, urlEmitido } from '@/components/Comun'
import { cn } from '@/lib/utils'
import { gradientBtnCls, inputCls, useTheme } from '@/lib/ui'
import {
  abrirEnVentana, borradorPath, coincide, esperarTrabajo, formatFecha, formatMoney, getArchivo, getPendientes, getProveedor, prepararFactura, timbrarFactura,
  type Cfdi, type OpcionesMoneda, type Pendiente, type Pendientes, type Preparado, type Proveedor,
} from '@/lib/cfdi'

type Modal = { isOpen: boolean; type: StatusModalType; title: string; message: string }
const th = 'py-1.5 pr-3 font-medium text-[11px] text-slate-500 text-left'
const num = 'tabular-nums text-right whitespace-nowrap'

function App() {
  const [theme, setTheme] = useTheme()
  const [org] = useState(() => new URLSearchParams(window.location.search).get('organization_id'))
  const [inicial] = useState(() => new URLSearchParams(window.location.search).get('invoice_id'))
  const [modal, setModal] = useState<Modal>({ isOpen: !org, type: 'error', title: 'Error de Inicialización', message: 'No se detectó la organización relacionada. Es necesario incluir el parámetro "organization_id" en la URL.' })

  const [prov, setProv] = useState<{ p: Proveedor | null; error: string }>({ p: null, error: '' })
  useEffect(() => { if (org) getProveedor(org).then(p => setProv({ p, error: '' })).catch(e => setProv({ p: null, error: e instanceof Error ? e.message : 'No se pudo consultar el proveedor de CFDI.' })) }, [org])
  const puedeTimbrar = prov.p?.proveedor === 'aptus' && prov.p.activo && prov.p.api?.configurada !== false

  // ── Lista ──
  const [todas, setTodas] = useState(false)
  const [lista, setLista] = useState<Pendientes | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [texto, setTexto] = useState('')
  const load = async () => {
    if (!org) return
    setLoading(true); setError('')
    try { setLista(await getPendientes(org, todas)) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la lista.') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [org, todas]) // eslint-disable-line react-hooks/exhaustive-deps
  const filas = useMemo(() => (lista?.facturas ?? []).filter(f => coincide(texto, f.invoice_number, f.cliente_nombre, f.motivo)), [lista, texto])

  // ── Detalle (vista previa sin timbrar) ──
  const [sel, setSel] = useState<string | null>(inicial)
  const [prep, setPrep] = useState<{ data: Preparado | null; loading: boolean; error: string }>({ data: null, loading: false, error: '' })
  // Moneda y tipo de cambio elegidos para esta factura (se mandan igual a la vista previa, al borrador y al timbrar).
  const [opts, setOpts] = useState<OpcionesMoneda>({})
  const [confirmarTc, setConfirmarTc] = useState(false)
  const cargarPrep = async (id: string, o: OpcionesMoneda = opts) => {
    if (!org) return
    setPrep(p => ({ data: p.data && p.data.invoice_id === id ? p.data : null, loading: true, error: '' }))
    try { setPrep({ data: await prepararFactura(org, id, o), loading: false, error: '' }) }
    catch (e) { setPrep({ data: null, loading: false, error: e instanceof Error ? e.message : 'No se pudo preparar el CFDI.' }) }
  }
  useEffect(() => { if (sel) { setResultado(null); setOpts({}); setConfirmarTc(false); void cargarPrep(sel, {}) } }, [sel]) // eslint-disable-line react-hooks/exhaustive-deps
  const cambiarMoneda = (o: OpcionesMoneda) => { setOpts(o); setConfirmarTc(false); if (sel) void cargarPrep(sel, o) }
  const detalleRef = useRef<HTMLDivElement>(null)
  const elegir = (f: Pendiente) => { setSel(f.invoice_id); setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }

  const [borrador, setBorrador] = useState('')
  const verBorrador = async () => {
    if (!org || !sel) return
    const win = window.open('', '_blank')
    win?.document.write('<p style="font-family:sans-serif;color:#555;padding:24px">Generando la vista previa…</p>')
    setBorrador('cargando')
    try { abrirEnVentana(win, await getArchivo(org, borradorPath(sel, opts)), `Borrador-${prep.data?.invoice_number || sel}.pdf`); setBorrador('') }
    catch (e) { win?.close(); setBorrador(e instanceof Error ? e.message : 'No se pudo generar la vista previa.') }
  }

  // ── Timbrar ──
  const [timbrando, setTimbrando] = useState<{ activo: boolean; c: Cfdi | null }>({ activo: false, c: null })
  const [resultado, setResultado] = useState<Cfdi | null>(null)
  const busy = useRef(false)
  const timbrar = async () => {
    const d = prep.data
    if (!org || !sel || !d || !d.puede_timbrar || busy.current) return
    if (d.requiere_confirmar_tipo_cambio && !confirmarTc) return
    const monedaCfdi = d.moneda_cfdi ?? d.moneda
    const total = formatMoney(d.totales?.cfdi?.total, monedaCfdi)
    const tc = d.tipo_cambio_info?.valor && (monedaCfdi !== 'MXN' || d.conversion) ? `\nTipo de cambio ${d.tipo_cambio_info.valor} (${d.tipo_cambio_info.fuente})${d.conversion ? ', convertido a MXN' : ''}` : ''
    if (!window.confirm(`¿Timbrar el CFDI de ${d.invoice_number} por ${total}?\n\nReceptor: ${d.receptor?.nombre} (${d.receptor?.rfc})\nMétodo ${d.metodo_pago} · forma ${d.forma_pago}${tc}\n\nModo prueba: no existe ante el SAT.`)) return
    busy.current = true; setTimbrando({ activo: true, c: null })
    try {
      const t = await timbrarFactura(org, sel, opts, confirmarTc)
      const c = await esperarTrabajo(org, t.cfdi_id, { onTick: c => setTimbrando({ activo: true, c }) })
      setResultado(c)
      if (c.estado === 'vigente') toast.success(`CFDI timbrado: ${c.uuid}`)
      else if (c.estado === 'timbrando') setModal({ isOpen: true, type: 'warning', title: 'Sigue timbrando', message: 'El servicio sigue trabajando. Revisa en unos minutos en "CFDI emitidos"; no lo vuelvas a timbrar.' })
      else setModal({ isOpen: true, type: 'error', title: 'No se timbró', message: c.error || 'El servicio no pudo timbrar el CFDI.' })
      void load()
    } catch (e) {
      const incierto = (e as { uncertain?: boolean })?.uncertain
      setModal({ isOpen: true, type: 'error', title: incierto ? 'Resultado por verificar' : 'No se timbró', message: e instanceof Error ? e.message : 'Error.' })
    } finally { busy.current = false; setTimbrando({ activo: false, c: null }) }
  }

  const d = prep.data
  return (
    <div className="min-h-screen bg-slate-50/50 p-2 sm:p-4 lg:p-8 flex justify-center items-start font-sans w-full">
      <Toaster position="top-center" richColors />
      <Card className="w-full bg-gradient-to-b from-[#F3F9FD] to-white border border-slate-200 rounded-[20px] overflow-hidden p-3 sm:p-5 lg:p-8 relative animate__animated animate__fadeIn animate__faster">
        <div className="absolute top-0 left-0 right-0 h-15 bg-gradient-to-b from-theme-light to-transparent pointer-events-none z-0"></div>
        <Encabezado icon={Stamp} titulo="CFDI por timbrar" subtitulo="Facturas de Books que deberían tener CFDI: revisa la vista previa y timbra" theme={theme} setTheme={setTheme}
          acciones={<Button variant="outline" onClick={() => void load()} disabled={loading} className="flex-1 lg:flex-none h-11 px-4 rounded-lg border-slate-200 text-slate-700 gap-2"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />Actualizar</Button>} />
        <NavCfdi actual="pendientes" />
        <AvisoProveedor p={prov.p} error={prov.error} />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-start" inert={timbrando.activo}>
          {/* ── Lista ── */}
          <section className="border border-slate-200 rounded-xl bg-white p-3 sm:p-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200" role="radiogroup" aria-label="Qué facturas">
                {[{ v: false, l: 'De Prebills' }, { v: true, l: 'Todas las de Books' }].map(o => (
                  <button key={o.l} type="button" role="radio" aria-checked={todas === o.v} onClick={() => setTodas(o.v)}
                    className={cn('px-3 h-8 text-xs font-semibold rounded-md border', todas === o.v ? 'bg-white text-theme-text shadow-sm border-slate-200' : 'text-slate-500 border-transparent hover:bg-theme-light')}>{o.l}</button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input className={cn(inputCls, 'pl-8 pr-8')} placeholder="Buscar factura o cliente" value={texto} onChange={e => setTexto(e.target.value)} aria-label="Buscar" />
                {texto && <button type="button" aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setTexto('')}><X className="w-4 h-4" /></button>}
              </div>
            </div>
            {error && <p role="alert" className="text-xs text-red-700 mb-2">{error}</p>}
            {loading && !lista ? <p className="text-xs text-slate-500">Cargando…</p> : !filas.length ? (
              <p className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{texto ? 'Ninguna factura coincide.' : todas ? 'No hay facturas pendientes de CFDI.' : 'Ninguna factura de Prebill está pendiente de CFDI. Revisa "Todas las de Books".'}</p>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 mb-1">{filas.length} factura(s){lista?.momento === 'al_pagar' ? ' pagadas' : ''} sin CFDI</p>
                <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200"><th className={th}>Factura</th><th className={th}>Cliente</th><th className={cn(th, 'text-right')}>Total</th><th className={th}>Por qué está aquí</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {filas.map(f => (
                        <tr key={f.invoice_id} onClick={() => elegir(f)} className={cn('cursor-pointer align-top hover:bg-theme-light/50', sel === f.invoice_id && 'bg-theme-light')}>
                          <td className="py-2 pr-3 whitespace-nowrap"><button type="button" className="font-semibold text-slate-800 hover:underline" onClick={e => { e.stopPropagation(); elegir(f) }}>{f.invoice_number}</button>
                            <span className="block text-[10px] text-slate-500">{formatFecha(f.fecha)}{f.prebill_id ? ` · Prebill #${f.prebill_id}` : ''}</span></td>
                          <td className="py-2 pr-3">{f.cliente_nombre}</td>
                          <td className={cn(num, 'py-2 pr-3')}>{formatMoney(f.total, f.moneda)}</td>
                          <td className="py-2 pr-3 text-slate-600">{f.motivo}{f.ultimo_cfdi?.estado && <span className="block text-[10px] text-slate-500">Último CFDI: {f.ultimo_cfdi.estado}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* ── Vista previa ── */}
          <section ref={detalleRef} className="border border-slate-200 rounded-xl bg-white p-3 sm:p-4 min-w-0">
            {!sel ? <p className="text-sm text-slate-500 flex items-center gap-1.5"><Info className="w-4 h-4" />Elige una factura para ver cómo quedaría su CFDI.</p>
              : prep.loading ? <p role="status" className="text-sm text-slate-600 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-theme-text" />Armando el CFDI con los datos de Books…</p>
              : prep.error ? <p role="alert" className="text-sm text-red-700">{prep.error}</p>
              : d && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{d.invoice_number}</h2>
                      <p className="text-xs text-slate-500">{d.cliente_nombre} · Books: {d.status_books} · {formatFecha(d.fecha_books)}{d.prebill_id ? ` · Prebill #${d.prebill_id}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">Total del CFDI</p>
                      <p className="text-xl font-bold tabular-nums">{formatMoney(d.totales?.cfdi?.total, d.moneda_cfdi ?? d.moneda)}</p>
                      {d.conversion && <p className="text-[10px] text-slate-500">Factura en Books: {formatMoney(d.totales?.books?.total, d.moneda_factura)}</p>}
                      {!!d.totales?.cfdi?.diferencia_vs_books && <p className="text-[10px] text-amber-700">Diferencia contra Books: {formatMoney(d.totales.cfdi.diferencia_vs_books, d.moneda)}</p>}
                    </div>
                  </div>

                  {resultado?.estado === 'vigente' && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                      <p className="text-sm text-emerald-800 flex items-center gap-1.5"><FileCheck2 className="w-4 h-4" />Timbrado: <b>{resultado.serie}-{resultado.folio}</b> · UUID <span className="font-mono text-xs">{resultado.uuid}</span> <EstadoBadge e={resultado.estado} prueba={resultado.prueba} /></p>
                      {org && <Archivos org={org} c={resultado} />}
                      <a href={urlEmitido(resultado)} className="inline-flex items-center gap-1 text-xs text-theme-text underline"><ExternalLink className="w-3 h-3" />Ver en CFDI emitidos</a>
                    </div>
                  )}

                  {!!d.bloqueantes.length && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />No se puede timbrar todavía:</p>
                      <ul className="list-disc pl-5 space-y-0.5">{d.bloqueantes.map(b => <li key={b}>{b}</li>)}</ul>
                      <p className="text-[11px] text-red-600">Corrige los datos en Books (o en Configuración del despacho → Conceptos de factura) y pulsa Actualizar.</p>
                    </div>
                  )}
                  {(() => { const avisos = d.avisos.filter(a => !(d.requiere_confirmar_tipo_cambio && /REVISA EL TIPO DE CAMBIO/i.test(a))); return !!avisos.length && <ul className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 list-disc pl-6 space-y-0.5">{avisos.map(a => <li key={a}>{a}</li>)}</ul> })()}
                  {(d.moneda_factura && d.moneda_factura !== 'MXN') && (
                    <MonedaTc monedaFactura={d.moneda_factura} info={d.tipo_cambio_info} opciones={{ moneda: opts.moneda ?? d.opciones?.moneda, tc_fuente: opts.tc_fuente ?? d.opciones?.tc_fuente, tipo_cambio: opts.tipo_cambio }}
                      conMoneda onCambio={cambiarMoneda} disabled={prep.loading || timbrando.activo} />
                  )}
                  {d.requiere_confirmar_tipo_cambio && (
                    <label className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                      <input type="checkbox" className="mt-0.5" checked={confirmarTc} onChange={e => setConfirmarTc(e.target.checked)} />
                      Confirmo el tipo de cambio {d.tipo_cambio_info?.valor} aunque se aleja {d.tipo_cambio_info?.desviacion_vs_fix_pct}% del FIX de Banxico.
                    </label>
                  )}
                  {prep.loading && <p role="status" className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Recalculando…</p>}
                  {!!d.cfdi_existentes?.length && <p className="text-xs text-slate-600">CFDI anteriores de esta factura: {d.cfdi_existentes.map(c => <a key={c.id} href={urlEmitido(c)} className="underline mr-2">{c.serie}-{c.folio} ({c.estado})</a>)}</p>}

                  {d.receptor && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 mb-1">Receptor</h3>
                      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                        {([['RFC', d.receptor.rfc, 'rfc'], ['Razón social', d.receptor.nombre, 'nombre'], ['Régimen fiscal', d.receptor.regimen_fiscal, 'regimen_fiscal'], ['Código postal', d.receptor.cp, 'cp'], ['Uso del CFDI', d.receptor.uso_cfdi, 'uso_cfdi'], ['Tipo', d.receptor.tipo, '']] as const).map(([l, v, k]) => (
                          <div key={l} className="min-w-0"><dt className="text-[10px] text-slate-500">{l}</dt><dd className={cn('truncate', !v && 'text-red-600')} title={k && d.receptor?.origen?.[k] ? `De: ${d.receptor.origen[k]}` : undefined}>{v || 'falta'}</dd></div>
                        ))}
                      </dl>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-slate-700 mb-1">Conceptos · método {d.metodo_pago} · forma {d.forma_pago} · {d.moneda_cfdi ?? d.moneda}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-xs">
                        <thead><tr className="border-b border-slate-200"><th className={th}>Línea</th><th className={th}>Concepto</th><th className={th}>Clave SAT</th><th className={cn(th, 'text-right')}>Importe</th><th className={cn(th, 'text-right')}>IVA</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {(d.conceptos ?? []).map(c => (
                            <tr key={c.linea} className={cn('align-top', !c.incluido && 'text-slate-400')}>
                              <td className="py-1.5 pr-3">{c.linea}</td>
                              <td className="py-1.5 pr-3">{(c as { descripcion_cfdi?: string }).descripcion_cfdi || c.nombre || c.concepto || '—'}{c.descripcion_books && <span className="block text-[10px] text-slate-500">{c.descripcion_books}</span>}{!c.incluido && <span className="block text-[10px]">No entra al CFDI</span>}</td>
                              <td className="py-1.5 pr-3 whitespace-nowrap">{c.clave_prod_serv ? `${c.clave_prod_serv} · ${c.clave_unidad} · obj ${c.objeto_imp}` : '—'}</td>
                              <td className={cn(num, 'py-1.5 pr-3')}>{formatMoney(c.importe)}</td>
                              <td className={cn(num, 'py-1.5')}>{c.tasa != null ? `${Math.round(c.tasa * 100)}%` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {d.totales?.cfdi && (
                      <dl className="mt-2 ml-auto w-full sm:w-72 text-xs space-y-0.5">
                        {[['Subtotal', d.totales.cfdi.subtotal], ['Descuento', d.totales.cfdi.descuento], ['IVA', d.totales.cfdi.iva]].map(([l, v]) => <div key={l as string} className="flex justify-between"><dt className="text-slate-500">{l}</dt><dd className="tabular-nums">{formatMoney(v as number)}</dd></div>)}
                        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(d.totales.cfdi.total, d.moneda_cfdi ?? d.moneda)}</dd></div>
                        {!!d.totales.books?.excluido_del_cfdi && <p className="text-[10px] text-slate-500">Fuera del CFDI (reembolsos): {formatMoney(d.totales.books.excluido_del_cfdi, d.moneda)}</p>}
                      </dl>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {borrador && borrador !== 'cargando' && <p role="alert" className="text-xs text-red-700 mr-auto">{borrador}</p>}
                    <Button variant="outline" className="h-10 gap-1.5 border-slate-200" disabled={!d.puede_timbrar || borrador === 'cargando' || !puedeTimbrar} onClick={() => void verBorrador()}
                      title={!d.puede_timbrar ? 'Primero resuelve lo que impide timbrar' : 'PDF de cómo quedaría, sin timbrar'}>
                      {borrador === 'cargando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}Vista previa PDF
                    </Button>
                    <Button className={cn('h-10 gap-1.5 border-0', gradientBtnCls)} disabled={!d.puede_timbrar || !puedeTimbrar || timbrando.activo || prep.loading || resultado?.estado === 'vigente' || (!!d.requiere_confirmar_tipo_cambio && !confirmarTc)} onClick={() => void timbrar()}>
                      {timbrando.activo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stamp className="w-4 h-4" />}Timbrar CFDI
                    </Button>
                  </div>
                  {timbrando.activo && <p role="status" className="text-xs text-slate-600 text-right">Timbrando… puede tardar hasta 2 minutos; no cierres esta pantalla.{timbrando.c?.intentos ? ` (intento ${timbrando.c.intentos})` : ''}</p>}
                </div>
              )}
          </section>
        </div>
        <p className="mt-4 text-[11px] text-slate-500 relative z-10">La vista previa no timbra ni consume nada. Timbrar crea el CFDI con la API de facturación; desde aquí no se escribe en Books.</p>
      </Card>
      <StatusModal isOpen={modal.isOpen} onClose={!org ? undefined : () => setModal(m => ({ ...m, isOpen: false }))} type={modal.type} title={modal.title} message={modal.message} />
    </div>
  )
}

export default App
