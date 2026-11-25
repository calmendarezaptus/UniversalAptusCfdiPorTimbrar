import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const toModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')
const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')
const api = read('../src/lib/api.ts').replace(/import\.meta\.env\.DEV/g, 'true').replace(/import\.meta\.env\.\w+/g, 'undefined')
const lib = await import(toModule(read('../src/lib/cfdi.ts').replace("from './api'", `from '${toModule(api)}'`)))

test('cancelación: motivo válido y UUID sustituto solo con 01', () => {
  assert.equal(lib.validarCancelacion('', ''), 'Elige el motivo de cancelación.')
  assert.equal(lib.validarCancelacion('02', ''), null)
  assert.equal(lib.validarCancelacion('01', 'abc'), 'Escribe el UUID del CFDI que sustituye al cancelado.')
  assert.equal(lib.validarCancelacion('01', ' 843B5A51-A5C8-4CA9-BCC0-396179F37ECC '), null)
})

test('lista: query solo con filtros puestos; acepta arreglo u objeto', async () => {
  assert.equal(lib.listaQuery({ tipo: 'P', estado: '', origen: 'aptus' }), '?tipo=P&origen=aptus')
  assert.equal(lib.listaQuery({}), '')
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify([{ id: 1 }]), { status: 200 })
    assert.equal((await lib.getCfdis('1')).length, 1)
    globalThis.fetch = async () => new Response(JSON.stringify({ cfdi: [{ id: 1 }, { id: 2 }] }), { status: 200 })
    assert.equal((await lib.getCfdis('1')).length, 2)
    globalThis.fetch = async () => new Response(JSON.stringify({ x: 1 }), { status: 200 })
    await assert.rejects(lib.getCfdis('1'), /inesperada/)
  } finally { globalThis.fetch = original }
})

test('timbrar: cuerpo con confirmar; red caída = incierto; 422 con el mensaje', async () => {
  const original = globalThis.fetch
  try {
    let req
    globalThis.fetch = async (u, o) => { req = [u, o.method, o.body]; return new Response(JSON.stringify({ cfdi_id: 7, estado: 'timbrando' }), { status: 202 }) }
    assert.equal((await lib.timbrarFactura('636939444', '446794000021109021')).cfdi_id, 7)
    assert.deepEqual(req, ['/api/636939444/cfdi/timbrar', 'POST', '{"invoice_id":"446794000021109021","confirmar":true}'])
    await lib.cancelarCfdi('1', 7, '02', 'ignorado')
    assert.equal(req[2], '{"motivo":"02","confirmar":true}')
    globalThis.fetch = async () => { throw new TypeError('x') }
    await assert.rejects(lib.timbrarFactura('1', '2'), e => e.uncertain === true)
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'El cliente no tiene RFC', stage: 'validation', outcome_unknown: false }), { status: 422 })
    await assert.rejects(lib.timbrarComplemento('1', '2'), e => e.uncertain === false && /RFC/.test(e.message))
    globalThis.fetch = async () => new Response(JSON.stringify({ estado: 'timbrando' }), { status: 202 })
    await assert.rejects(lib.timbrarFactura('1', '2'), e => e.uncertain === true)
  } finally { globalThis.fetch = original }
})

test('esperar trabajo: sigue mientras "timbrando" y devuelve el estado final', async () => {
  const estados = ['timbrando', 'timbrando', 'vigente']
  let i = 0
  const ticks = []
  const c = await lib.esperarTrabajo('1', 7, { cada: 1, onTick: x => ticks.push(x.estado) }, async () => ({ id: 7, estado: estados[i++] }), async () => {})
  assert.equal(c.estado, 'vigente')
  assert.deepEqual(ticks, ['timbrando', 'timbrando', 'vigente'])
  const sigue = await lib.esperarTrabajo('1', 7, { cada: 1, max: 5 }, async () => ({ id: 7, estado: 'timbrando' }), async () => new Promise(r => setTimeout(r, 2)))
  assert.equal(sigue.estado, 'timbrando')
})

test('presentación', () => {
  assert.equal(lib.serieFolio({ serie: 'PRB', folio: '856' }), 'PRB-856')
  assert.equal(lib.nombreArchivo({ serie: 'PRB', folio: '856', id: 1 }, 'acuse'), 'PRB-856-acuse-cancelacion.pdf')
  assert.equal(lib.coincide('avolar 796', 'INV-000796', 'Avolar'), true)
  assert.equal(lib.formatFecha('2026-11-25T09:57:00'), '25/11/2026')
})

test('fase 2: opciones de moneda y TC, archivos y cancelable', async () => {
  assert.equal(lib.opcionesQuery({ moneda: 'mxn', tc_fuente: 'manual', tipo_cambio: ' 19.5 ' }), 'moneda=mxn&tc_fuente=manual&tipo_cambio=19.5')
  assert.equal(lib.opcionesQuery({ tc_fuente: 'books', tipo_cambio: '19' }), 'tc_fuente=books')
  assert.equal(lib.opcionesQuery({ moneda: 'mxn', tc_fuente: 'banxico' }, { conMoneda: false }), 'tc_fuente=banxico')
  assert.equal(lib.validarTcManual({ tc_fuente: 'manual', tipo_cambio: '' }), 'Escribe el tipo de cambio.')
  assert.equal(lib.validarTcManual({ tc_fuente: 'manual', tipo_cambio: '19.1234567' }), 'Tipo de cambio inválido: mayor que 0 y hasta 6 decimales.')
  assert.equal(lib.validarTcManual({ tc_fuente: 'banxico' }), null)
  assert.equal(lib.borradorPath('9', { moneda: 'mxn' }), 'cfdi/preparar/9/borrador?moneda=mxn')
  assert.equal(lib.archivoPath(3, 'acuse_xml'), 'cfdi/3/acuse?formato=xml')
  assert.equal(lib.archivoPath(3, 'pdf_original'), 'cfdi/3/pdf?original=1')
  assert.equal(lib.nombreArchivo({ serie: 'PRB', folio: '1', id: 3, pdf: { leyenda: 'en_proceso' } }, 'pdf'), 'PRB-1_EN_CANCELACION.pdf')
  assert.equal(lib.nombreArchivo({ serie: 'PRB', folio: '1', id: 3 }, 'acuse_xml'), 'PRB-1-acuse-cancelacion.xml')
  const original = globalThis.fetch
  try {
    let req
    globalThis.fetch = async (u, o) => { req = [u, o?.body]; return new Response(JSON.stringify({ cfdi_id: 9, estado: 'timbrando', puede: false, bloqueantes: [] }), { status: 200 }) }
    await lib.timbrarFactura('1', '2', { moneda: 'mxn', tc_fuente: 'manual', tipo_cambio: '22' }, true)
    assert.equal(req[1], '{"invoice_id":"2","confirmar":true,"moneda":"mxn","tc_fuente":"manual","tipo_cambio":"22","confirmar_tipo_cambio":true}')
    await lib.timbrarComplemento('1', '5', { moneda: 'mxn', tc_fuente: 'banxico' })
    assert.equal(req[1], '{"payment_id":"5","confirmar":true,"tc_fuente":"banxico"}')
    await lib.getCancelable('1', 3, '01', 'no-uuid')
    assert.equal(req[0], '/api/1/cfdi/3/cancelable?motivo=01')
  } finally { globalThis.fetch = original }
})
