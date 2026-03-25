import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Field, Badge, Empty, StatCard, ProgBar } from '../components/UI.jsx'
import { addKmLog, importSatrackData, addMachineWork, addMachineMaintenance, updateMachine } from '../lib/hooks.js'
import { parseSatrackEmail, calcSelladoPredictive, fmtKm, fmtCOP, fmtDate, fmtH, today } from '../lib/logic.js'
import { supabase } from '../lib/supabase.js'

// ─── helpers ──────────────────────────────────────────────────────────────────
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function startOfWeek(d) {
  const c = new Date(d)
  const day = c.getDay()
  c.setDate(c.getDate() - (day === 0 ? 6 : day - 1))
  return c
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function fmtDateShort(iso) {
  if (!iso) return '—'
  const [y,m,d] = iso.split('-')
  return new Date(+y,+m-1,+d).toLocaleDateString('es-CO',{day:'2-digit',month:'short'})
}
function fmtN(n) { return (n||0).toLocaleString('es-CO') }

// ─── mini sparkline SVG inline ────────────────────────────────────────────────
function Spark({ data, color = '#f5c800', h = 32, w = 80 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h * 0.88
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  )
}

// ─── barra de progreso mini ───────────────────────────────────────────────────
function MiniBar({ value, max, color = '#f5c800' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ width:'100%', height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden', marginTop:6 }}>
      <div style={{ width:`${pct}%`, height:'100%', background: color, borderRadius:3, transition:'width 0.5s ease' }} />
    </div>
  )
}

// ─── botón de período ─────────────────────────────────────────────────────────
function PBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--yellow,#f5c800)' : 'var(--bg3)',
      color: active ? '#0a0a0a' : 'var(--t3)',
      border: `1.5px solid ${active ? 'var(--yellow,#f5c800)' : 'var(--b)'}`,
      borderRadius: 8, padding: '5px 13px',
      fontFamily: 'var(--mono,monospace)', fontSize: 12, fontWeight: 700,
      letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.15s',
      textTransform: 'uppercase'
    }}>{label}</button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// KM & VELOCIDAD — RENOVADO
// ══════════════════════════════════════════════════════════════════════════════
export function KmVelocidad({ vehicles, allKm, selId }) {
  // ── estado UI ──
  const [adding, setAdding]       = useState(false)
  const [importing, setImport]    = useState(false)
  const [emailText, setEmail]     = useState('')
  const [parseResult, setParse]   = useState(null)
  const [form, setForm]           = useState({ vehicle_id: selId || '', fecha: today() })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // ── estado de período ──
  const [period, setPeriod]       = useState('semana')  // dia | semana | mes | custom
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]   = useState('')

  // ── datos del período ──
  const [logs, setLogs]           = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [selVeh, setSelVeh]       = useState(null)  // filtro por vehículo específico

  // ── fechas del rango ──
  const range = useCallback(() => {
    const hoy = new Date()
    if (period === 'dia')    return { from: toISO(hoy), to: toISO(hoy) }
    if (period === 'semana') return { from: toISO(startOfWeek(hoy)), to: toISO(hoy) }
    if (period === 'mes')    return { from: toISO(startOfMonth(hoy)), to: toISO(hoy) }
    if (period === 'custom') return { from: customFrom || toISO(hoy), to: customTo || toISO(hoy) }
    return { from: toISO(hoy), to: toISO(hoy) }
  }, [period, customFrom, customTo])

  // ── carga logs del período desde Supabase ──
  const loadLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const { from, to } = range()
      let q = supabase
        .from('km_logs')
        .select('id,vehicle_id,fecha,km_dia,km_inicio,km_fin,excesos')
        .gte('fecha', from)
        .lte('fecha', to)
        .order('fecha', { ascending: true })
      if (selVeh) q = q.eq('vehicle_id', selVeh)
      const { data } = await q
      setLogs(data || [])
    } catch(e) { console.error(e) }
    setLoadingLogs(false)
  }, [range, selVeh])

  useEffect(() => { loadLogs() }, [loadLogs])

  // ── cálculos ──
  const vehMap = Object.fromEntries((vehicles||[]).map(v => [v.id, v]))

  // agrupar por vehículo
  const byVeh = {}
  logs.forEach(l => {
    const km = l.km_dia || (l.km_inicio && l.km_fin ? l.km_fin - l.km_inicio : 0)
    if (!byVeh[l.vehicle_id]) byVeh[l.vehicle_id] = { km: 0, dias: 0, excesos: 0, timeline: [] }
    byVeh[l.vehicle_id].km      += km
    byVeh[l.vehicle_id].excesos += (l.excesos || 0)
    byVeh[l.vehicle_id].dias    += km > 0 ? 1 : 0
    byVeh[l.vehicle_id].timeline.push({ fecha: l.fecha, km, inicio: l.km_inicio, fin: l.km_fin })
  })

  const totalKm      = Object.values(byVeh).reduce((s,v) => s + v.km, 0)
  const totalExcesos = Object.values(byVeh).reduce((s,v) => s + v.excesos, 0)
  const diasUnicos   = new Set(logs.map(l => l.fecha)).size
  const promDia      = diasUnicos > 0 ? Math.round(totalKm / diasUnicos) : 0
  const vehActivos   = Object.keys(byVeh).length

  // KM por fecha (para gráfico de barras)
  const byFecha = {}
  logs.forEach(l => {
    const km = l.km_dia || (l.km_inicio && l.km_fin ? l.km_fin - l.km_inicio : 0)
    byFecha[l.fecha] = (byFecha[l.fecha] || 0) + km
  })
  const fechasSorted = Object.entries(byFecha).sort(([a],[b]) => a.localeCompare(b))
  const sparkData    = fechasSorted.map(([,v]) => v)
  const maxBarKm     = fechasSorted.length ? Math.max(...fechasSorted.map(([,v])=>v), 1) : 1

  // ranking vehículos
  const ranking = Object.entries(byVeh)
    .map(([vid, d]) => ({ vid, ...d, v: vehMap[vid] || {} }))
    .sort((a,b) => b.km - a.km)
  const maxVehKm = ranking.length ? ranking[0].km : 1

  // detalle del vehículo seleccionado
  const detalleVeh = selVeh && byVeh[selVeh]
    ? byVeh[selVeh].timeline.sort((a,b) => a.fecha.localeCompare(b.fecha))
    : []

  const { from: rFrom, to: rTo } = range()

  // ── handlers del modal manual ──
  async function handleSave() {
    if (!form.vehicle_id || (!form.km_dia && !form.km_inicio)) return alert('Completa los campos')
    await addKmLog(form.vehicle_id, form)
    setAdding(false)
    setForm({ vehicle_id: selId || '', fecha: today() })
    loadLogs()
  }

  function handleParse() { setParse(parseSatrackEmail(emailText)) }

  async function handleImport() {
    if (!parseResult?.length) return
    await importSatrackData(parseResult)
    setImport(false); setEmail(''); setParse(null)
    loadLogs()
  }

  // ── render ──
  return (
    <div className="fade-in">
      {/* ─ Topbar ─ */}
      <div className="topbar">
        <div>
          <div className="page-title">Km & velocidad</div>
          <div className="page-sub">
            {rFrom === rTo ? fmtDateShort(rFrom) : `${fmtDateShort(rFrom)} → ${fmtDateShort(rTo)}`}
            {' · '}{loadingLogs ? 'Cargando...' : `${logs.length} registros`}
          </div>
        </div>
        <div className="top-actions">
          <button className="btn btn-g" onClick={() => setImport(true)}>📧 SATRACK</button>
          <button className="btn btn-g" onClick={loadLogs}>↺</button>
          <button className="btn btn-p" onClick={() => setAdding(true)}>+ Manual</button>
        </div>
      </div>

      <div className="content">

        {/* ─ Filtros de período ─ */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
          {[['dia','Hoy'],['semana','Semana'],['mes','Mes'],['custom','Rango']].map(([k,l]) => (
            <PBtn key={k} label={l} active={period===k} onClick={() => setPeriod(k)} />
          ))}
        </div>

        {/* Rango personalizado */}
        {period === 'custom' && (
          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            {[['Desde', customFrom, setCustomFrom],['Hasta', customTo, setCustomTo]].map(([lbl,val,set]) => (
              <div key={lbl} style={{ flex:1, minWidth:140 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'var(--t3)',
                  textTransform:'uppercase', marginBottom:5 }}>{lbl}</div>
                <input type="date" value={val} onChange={e=>set(e.target.value)}
                  style={{ background:'var(--bg3)', border:'1.5px solid var(--b)', borderRadius:8,
                    padding:'8px 10px', color:'var(--t1)', fontSize:13, width:'100%',
                    outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
          </div>
        )}

        {/* ─ Filtro rápido por vehículo ─ */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          <button onClick={() => setSelVeh(null)} style={{
            background: !selVeh ? 'var(--yellow,#f5c800)' : 'var(--bg3)',
            color: !selVeh ? '#0a0a0a' : 'var(--t3)',
            border:`1.5px solid ${!selVeh ? 'var(--yellow,#f5c800)' : 'var(--b)'}`,
            borderRadius:16, padding:'4px 12px', fontSize:12, fontWeight:700,
            cursor:'pointer', fontFamily:'var(--mono)'
          }}>Todos</button>
          {vehicles.map(v => (
            <button key={v.id} onClick={() => setSelVeh(selVeh===v.id ? null : v.id)} style={{
              background: selVeh===v.id ? (v.color_indicador||'#3a9df8') : 'var(--bg3)',
              color: selVeh===v.id ? '#fff' : 'var(--t3)',
              border:`1.5px solid ${selVeh===v.id ? (v.color_indicador||'#3a9df8') : 'var(--b)'}`,
              borderRadius:16, padding:'4px 12px', fontSize:12, fontWeight:700,
              cursor:'pointer', fontFamily:'var(--mono)'
            }}>{v.placa}</button>
          ))}
        </div>

        {/* ─ Stat cards ─ */}
        <div className="g4 mb4">
          <div className="card" style={{ position:'relative', overflow:'hidden' }}>
            <div className="card-t" style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase' }}>KM total período</div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:6 }}>
              <div style={{ fontSize:32, fontWeight:900, fontFamily:'var(--mono)', letterSpacing:-1, color:'var(--yellow,#f5c800)' }}>
                {fmtN(totalKm)}
              </div>
              <Spark data={sparkData} color="var(--yellow,#f5c800)" />
            </div>
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>
              {diasUnicos} día{diasUnicos!==1?'s':''} con registro
            </div>
          </div>

          <div className="card">
            <div className="card-t" style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase' }}>Promedio / día</div>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:'var(--mono)', letterSpacing:-1,
              color:'var(--green,#27c95e)', marginTop:6 }}>{fmtN(promDia)}</div>
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>
              {vehActivos} veh. activo{vehActivos!==1?'s':''}
            </div>
          </div>

          <div className="card">
            <div className="card-t" style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase' }}>Excesos velocidad</div>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:'var(--mono)', letterSpacing:-1,
              color: totalExcesos > 0 ? 'var(--red,#e63946)' : 'var(--t3)', marginTop:6 }}>
              {totalExcesos}
            </div>
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>eventos en el período</div>
          </div>

          <div className="card">
            <div className="card-t" style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase' }}>Flota activa</div>
            <div style={{ fontSize:32, fontWeight:900, fontFamily:'var(--mono)', letterSpacing:-1,
              color:'var(--blue,#3a9df8)', marginTop:6 }}>{vehActivos}/{vehicles.length}</div>
            <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>vehículos con registros</div>
          </div>
        </div>

        <div className="g2 mb4">

          {/* ─ Gráfico KM por día ─ */}
          <div className="card">
            <div className="card-hd">
              <div className="card-tl">KM por día — flota completa</div>
            </div>
            {fechasSorted.length === 0
              ? <Empty icon="📍" title="Sin registros" sub="Los conductores aún no han reportado km en este período" />
              : (
                <div style={{ overflowX:'auto' }}>
                  {fechasSorted.map(([fecha, km]) => (
                    <div key={fecha} className="bar-row" style={{ marginBottom:6 }}>
                      <div className="bar-date" style={{ minWidth:48, fontSize:11 }}>
                        {fmtDateShort(fecha)}
                      </div>
                      <div className="bar-track" style={{ flex:1 }}>
                        <div className="bar-fill" style={{
                          width: `${Math.max(8, Math.round((km/maxBarKm)*100))}%`,
                          background:'var(--yellow,#f5c800)', color:'#0a0a0a',
                          fontWeight:700, fontSize:11
                        }}>
                          {fmtN(km)} km
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* ─ Ranking por vehículo ─ */}
          <div className="card">
            <div className="card-hd">
              <div className="card-tl">Recorrido por vehículo</div>
            </div>
            {ranking.length === 0
              ? <Empty icon="🚛" title="Sin datos" sub="No hay km registrados en este período" />
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {ranking.map(r => {
                    const v   = r.v
                    const ind = v.color_indicador || '#3a9df8'
                    const sel = selVeh === r.vid
                    return (
                      <div key={r.vid}
                        onClick={() => setSelVeh(sel ? null : r.vid)}
                        style={{
                          background: sel ? `${ind}18` : 'var(--bg3)',
                          border: `1.5px solid ${sel ? ind : 'var(--b)'}`,
                          borderRadius:10, padding:'12px 12px',
                          cursor:'pointer', transition:'all 0.18s'
                        }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:8, height:8, borderRadius:'50%',
                              background:ind, flexShrink:0 }}/>
                            <div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:16,
                                fontWeight:800, letterSpacing:1.5,
                                color: sel ? ind : 'var(--t1)' }}>
                                {v.placa || r.vid.slice(0,8)}
                              </div>
                              <div style={{ fontSize:11, color:'var(--t3)' }}>
                                {v.conductor || `${v.marca||''} ${v.modelo||''}`.trim() || '—'}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:'var(--mono)', fontSize:22,
                              fontWeight:900, color:ind, lineHeight:1 }}>
                              {fmtN(r.km)} km
                            </div>
                            <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>
                              {r.dias} día{r.dias!==1?'s':''} · {r.excesos} exceso{r.excesos!==1?'s':''}
                            </div>
                          </div>
                        </div>
                        <MiniBar value={r.km} max={maxVehKm} color={ind} />
                        {r.timeline.length > 1 && (
                          <div style={{ marginTop:6, opacity:0.6 }}>
                            <Spark data={r.timeline.map(t=>t.km)} color={ind} h={20} w={100}/>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>

        {/* ─ Detalle diario del vehículo seleccionado ─ */}
        {selVeh && detalleVeh.length > 0 && (
          <div className="card mb4">
            <div className="card-hd">
              <div className="card-tl">
                Detalle diario — {vehMap[selVeh]?.placa}
              </div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>
                {vehMap[selVeh]?.conductor || ''}
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>KM día</th>
                  <th>Odóm. salida</th>
                  <th>Odóm. llegada</th>
                </tr>
              </thead>
              <tbody>
                {detalleVeh.map((l,i) => (
                  <tr key={i}>
                    <td>{fmtDateShort(l.fecha)}</td>
                    <td style={{ fontFamily:'var(--mono)', fontWeight:700,
                      color: l.km > 0 ? 'var(--yellow,#f5c800)' : 'var(--t3)' }}>
                      {l.km > 0 ? `${fmtN(l.km)} km` : '—'}
                    </td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--t3)' }}>
                      {l.inicio ? fmtN(l.inicio) : '—'}
                    </td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--t3)' }}>
                      {l.fin ? fmtN(l.fin) : '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background:'rgba(245,200,0,0.06)' }}>
                  <td style={{ fontWeight:700, fontSize:11, letterSpacing:1,
                    color:'var(--t3)', textTransform:'uppercase' }}>Total</td>
                  <td style={{ fontFamily:'var(--mono)', fontWeight:900, fontSize:18,
                    color:'var(--yellow,#f5c800)' }}>
                    {fmtN(byVeh[selVeh]?.km)} km
                  </td>
                  <td /><td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ─ Tabla consolidada (semana / mes / rango) ─ */}
        {(period === 'semana' || period === 'mes' || period === 'custom') && ranking.length > 0 && (
          <div className="card mb4">
            <div className="card-hd">
              <div className="card-tl">
                Consolidado {period==='semana' ? 'semanal' : period==='mes' ? 'mensual' : 'del rango'}
              </div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Conductor</th>
                    <th>KM total</th>
                    <th>Días</th>
                    <th>Prom/día</th>
                    <th>Excesos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r,i) => {
                    const v    = r.v
                    const ind  = v.color_indicador || '#3a9df8'
                    const prom = r.dias > 0 ? Math.round(r.km / r.dias) : 0
                    return (
                      <tr key={r.vid} style={{ cursor:'pointer' }}
                        onClick={() => setSelVeh(selVeh===r.vid ? null : r.vid)}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:6,height:6,borderRadius:'50%',background:ind }}/>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:800,
                              letterSpacing:1 }}>{v.placa||'—'}</span>
                          </div>
                        </td>
                        <td style={{ color:'var(--t3)', fontSize:12 }}>{v.conductor||'—'}</td>
                        <td>
                          <span style={{ fontFamily:'var(--mono)', fontWeight:900,
                            fontSize:16, color:'var(--yellow,#f5c800)' }}>
                            {fmtN(r.km)}
                          </span>
                        </td>
                        <td>{r.dias}</td>
                        <td style={{ color:'var(--green,#27c95e)', fontFamily:'var(--mono)' }}>
                          {fmtN(prom)}
                        </td>
                        <td>
                          {r.excesos > 0
                            ? <Badge type="warn">{r.excesos}</Badge>
                            : <Badge type="ok">0</Badge>}
                        </td>
                      </tr>
                    )
                  })}
                  {/* fila de totales */}
                  <tr style={{ background:'rgba(245,200,0,0.07)', fontWeight:700 }}>
                    <td colSpan={2} style={{ fontSize:11, letterSpacing:1,
                      color:'var(--yellow,#f5c800)', textTransform:'uppercase' }}>
                      Total flota
                    </td>
                    <td>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:900, fontSize:18,
                        color:'var(--yellow,#f5c800)' }}>{fmtN(totalKm)}</span>
                    </td>
                    <td style={{ fontFamily:'var(--mono)' }}>{diasUnicos}</td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--green,#27c95e)' }}>
                      {fmtN(promDia)}
                    </td>
                    <td style={{ color: totalExcesos>0?'var(--red,#e63946)':'var(--t3)' }}>
                      {totalExcesos}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>{/* /content */}

      {/* ─ Modal manual ─ */}
      {adding && (
        <Modal title="Registrar km manual" onClose={() => setAdding(false)} onSave={handleSave}>
          <div className="form-row">
            <Field label="Vehículo">
              <select value={form.vehicle_id} onChange={set('vehicle_id')}>
                <option value="">Seleccionar...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} · {v.marca}</option>)}
              </select>
            </Field>
            <Field label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Km del día"><input type="number" value={form.km_dia||''} onChange={set('km_dia')} placeholder="ej. 142" /></Field>
            <Field label="Excesos velocidad"><input type="number" value={form.excesos||''} onChange={set('excesos')} placeholder="0" /></Field>
          </div>
          <div className="form-row">
            <Field label="Km inicio (odómetro)"><input type="number" value={form.km_inicio||''} onChange={set('km_inicio')} /></Field>
            <Field label="Km fin (odómetro)"><input type="number" value={form.km_fin||''} onChange={set('km_fin')} /></Field>
          </div>
        </Modal>
      )}

      {/* ─ Modal SATRACK ─ */}
      {importing && (
        <Modal title="Importar email SATRACK" onClose={() => { setImport(false); setParse(null) }}
          onSave={handleImport} saveLabel="Importar datos" wide>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:12, lineHeight:1.6 }}>
            Copia y pega el texto del email de SATRACK (<strong>noti@satrack.com</strong>).
            El sistema detecta automáticamente las placas con sus km y excesos.
          </div>
          <Field label="Texto del email" full>
            <textarea rows={8} value={emailText} onChange={e => setEmail(e.target.value)}
              placeholder="Pega aquí el contenido del email de SATRACK..." />
          </Field>
          <button className="btn btn-g" style={{ marginTop:10 }} onClick={handleParse}>
            🔍 Detectar datos
          </button>
          {parseResult && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:12, color:'var(--t3)', marginBottom:8 }}>Datos detectados:</div>
              {parseResult.length === 0
                ? <div style={{ color:'var(--amber)', fontSize:13 }}>No se detectaron datos.</div>
                : parseResult.map((r,i) => (
                  <div key={i} className="hint-box" style={{ marginBottom:6 }}>
                    <strong>{r.placa}</strong> · {r.fecha} · {r.km_dia} km · {r.excesos} excesos
                  </div>
                ))
              }
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COSTOS — sin cambios
// ══════════════════════════════════════════════════════════════════════════════
export function Costos({ vehicles, allMaint, allCosts }) {
  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Costos</div>
          <div className="page-sub">Bitácora de gastos · Costo por km</div></div>
      </div>
      <div className="content">
        {vehicles.map(v => {
          const maints = allMaint[v.id] || []
          const costs  = allCosts[v.id] || []
          const km     = v.km_actual || 0
          const kmOper = Math.max(1, km - (v.km_compra || 0))
          const tMant  = maints.reduce((a, m) => a + (m.costo || 0), 0)
          const tOp    = costs.reduce((a, c) => a + (c.monto || 0), 0)
          const total  = tMant + tOp
          const cpkm   = Math.round(total / kmOper)

          const byType = {}
          costs.forEach(c => { byType[c.tipo] = (byType[c.tipo] || 0) + c.monto })

          return (
            <div key={v.id} className="card mb4">
              <div className="card-hd">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:v.color_indicador||'#0A84FF' }}/>
                  <div className="card-tl">{v.placa} · {v.marca}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--mono)', letterSpacing:-1 }}>{fmtCOP(total)}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>total acumulado</div>
                </div>
              </div>
              <div className="g3" style={{ marginBottom:16 }}>
                <div className="card" style={{ background:'var(--bg3)', border:'1px solid var(--b)' }}>
                  <div className="card-t">Mantenimientos</div>
                  <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--mono)', margin:'6px 0 2px' }}>{fmtCOP(tMant)}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{maints.length} registros</div>
                </div>
                <div className="card" style={{ background:'var(--bg3)', border:'1px solid var(--b)' }}>
                  <div className="card-t">Operativos</div>
                  <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--mono)', margin:'6px 0 2px' }}>{fmtCOP(tOp)}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{costs.length} registros</div>
                </div>
                <div className="card" style={{ background:'var(--bg3)', border:'1px solid var(--b)' }}>
                  <div className="card-t">Costo por km</div>
                  <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--mono)', margin:'6px 0 2px' }}>{fmtCOP(cpkm)}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>por km recorrido</div>
                </div>
              </div>
              {Object.keys(byType).length > 0 && (
                <div>
                  <div className="section-hd"><div className="section-t">Por categoría</div></div>
                  {Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([tipo,monto]) => (
                    <div key={tipo} className="cost-pill">
                      <span className="cost-label">{tipo}</span>
                      <span className="cost-val">{fmtCOP(monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SELLADORA — sin cambios
// ══════════════════════════════════════════════════════════════════════════════
export function Selladora({ machine, work, machineMaints, onSaved }) {
  const [addWork, setAddWork]   = useState(false)
  const [addMaint, setAddMaint] = useState(false)
  const [form, setForm]         = useState({ fecha: today() })
  const [mf, setMf]             = useState({ fecha: today(), tipo: 'Cambio de aceite' })
  const [mach, setMach]         = useState(machine || { nombre: 'Selladora de fisuras', horometro_actual: 0 })
  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setm = k => e => setMf(p => ({ ...p, [k]: e.target.value }))

  const pred = calcSelladoPredictive(machine || mach, machineMaints)
  const totalHoras = work.reduce((a, w) => a + (w.horas_trabajadas || 0), 0)
  const totalCajas = work.reduce((a, w) => a + (w.cajas_polibyt || 0), 0)
  const totalKmL   = work.reduce((a, w) => a + (w.km_lineales || 0), 0)
  const rendimiento = totalCajas > 0 && totalKmL > 0 ? (totalKmL / totalCajas).toFixed(1) : null

  const byMonth = {}
  work.forEach(w => {
    const mes = w.fecha?.slice(0, 7)
    if (!mes) return
    if (!byMonth[mes]) byMonth[mes] = { cajas:0, km:0, horas:0 }
    byMonth[mes].cajas += w.cajas_polibyt || 0
    byMonth[mes].km    += w.km_lineales   || 0
    byMonth[mes].horas += w.horas_trabajadas || 0
  })

  async function handleAddWork() {
    if (!form.horas_trabajadas) return alert('Ingresa las horas trabajadas')
    await addMachineWork(form)
    setAddWork(false); setForm({ fecha: today() }); onSaved?.()
  }

  async function handleAddMaint() {
    if (!mf.horometro) return alert('Ingresa el horómetro')
    await addMachineMaintenance(mf)
    setAddMaint(false); setMf({ fecha: today(), tipo: 'Cambio de aceite' }); onSaved?.()
  }

  async function handleSaveMachine() {
    await updateMachine(machine?.id || null, mach)
    onSaved?.()
  }

  const hActual = machine?.horometro_actual || 0

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Selladora de fisuras</div>
          <div className="page-sub">Horómetro · Polibyt · Rendimiento · Mantenimiento</div></div>
        <div className="top-actions">
          <button className="btn btn-g" onClick={() => setAddMaint(true)}>+ Mantenimiento</button>
          <button className="btn btn-p" onClick={() => setAddWork(true)}>+ Registrar jornada</button>
        </div>
      </div>
      <div className="content">
        <div className="g4 mb4">
          <StatCard label="Horómetro actual" value={fmtH(hActual)} sub="horas acumuladas" />
          <StatCard label="Cajas Polibyt total" value={totalCajas} sub={`${(totalCajas*21).toLocaleString('es-CO')} kg`} />
          <StatCard label="Km lineales total" value={totalKmL>0?`${totalKmL.toLocaleString('es-CO')} m`:'—'} sub="metros sellados" />
          <StatCard label="Rendimiento" value={rendimiento?`${rendimiento} m`:'—'} sub="metros por caja"
            badge={rendimiento?'Calculado':'Sin datos'} badgeType={rendimiento?'ok':'neu'} />
        </div>
        <div className="g2 mb4">
          <div className="card">
            <div className="card-hd"><div className="card-tl">Estado de mantenimiento</div></div>
            {pred.map(p => {
              const cls  = {ok:'maint-ok',warn:'maint-warn',danger:'maint-danger'}[p.estado]
              const dotC = {ok:'var(--green)',warn:'var(--amber)',danger:'var(--red)'}[p.estado]
              const icon = {ok:'✓',warn:'↑',danger:'⚠'}[p.estado]
              let sub = ''
              if (p.estado==='ok')     sub = `Último a ${p.lastH}h · faltan ${p.remaining}h`
              else if (p.estado==='warn') sub = `Próximo en ${p.remaining}h`
              else sub = `Vencido hace ${Math.abs(p.remaining)}h`
              return (
                <div key={p.tipo} className={`maint-row ${cls}`}>
                  <div className="maint-dot" style={{ background:dotC }}/>
                  <div className="maint-info">
                    <div className="maint-tipo">{icon} {p.tipo}</div>
                    <div className="maint-sub">{sub} · Cada {p.intervalo}h</div>
                    <ProgBar pct={p.pct} estado={p.estado}/>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="card">
            <div className="card-hd"><div className="card-tl">Consumo mensual Polibyt</div></div>
            {Object.keys(byMonth).length===0
              ? <Empty icon="📦" title="Sin registros" sub="Registra jornadas para ver el consumo"/>
              : <table className="tbl">
                  <thead><tr><th>Mes</th><th>Horas</th><th>Cajas</th><th>Kg</th><th>Km</th><th>Rend.</th></tr></thead>
                  <tbody>
                    {Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0])).map(([mes,d])=>{
                      const rend = d.cajas>0&&d.km>0?(d.km/d.cajas).toFixed(1):'—'
                      return (
                        <tr key={mes}>
                          <td style={{fontFamily:'var(--mono)'}}>{mes}</td>
                          <td>{d.horas}h</td>
                          <td style={{fontWeight:600}}>{d.cajas}</td>
                          <td style={{color:'var(--t3)'}}>{(d.cajas*21).toLocaleString('es-CO')}</td>
                          <td style={{fontFamily:'var(--mono)'}}>{d.km>0?`${d.km}m`:'—'}</td>
                          <td>{rend!=='—'?<Badge type="ok">{rend} m/caja</Badge>:'—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            }
          </div>
        </div>
        <div className="card mb4">
          <div className="card-hd"><div className="card-tl">Knowhow acumulado</div></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {[
              ['Rendimiento promedio', rendimiento?`${rendimiento}m`:'—', 'metros por caja de 21kg'],
              ['Productividad', totalHoras>0&&totalKmL>0?`${(totalKmL/totalHoras).toFixed(1)}m`:'—', 'metros sellados por hora'],
              ['Jornadas registradas', work.length, `${totalHoras}h operativas totales`]
            ].map(([tit,val,sub])=>(
              <div key={tit} style={{background:'var(--bg3)',borderRadius:10,padding:14}}>
                <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:1}}>{tit}</div>
                <div style={{fontSize:28,fontWeight:700,fontFamily:'var(--mono)',margin:'6px 0 2px'}}>{val}</div>
                <div style={{fontSize:11,color:'var(--t3)'}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-tl">Historial de jornadas</div></div>
          {work.length===0
            ? <Empty icon="⏱" title="Sin jornadas" sub="Registra la primera jornada de trabajo"/>
            : <table className="tbl">
                <thead><tr><th>Fecha</th><th>Horas</th><th>Horóm.</th><th>Cajas</th><th>Km lineales</th><th>Notas</th></tr></thead>
                <tbody>{work.map(w=>(
                  <tr key={w.id}>
                    <td>{fmtDate(w.fecha)}</td>
                    <td style={{fontFamily:'var(--mono)',fontWeight:600}}>{w.horas_trabajadas}h</td>
                    <td style={{fontFamily:'var(--mono)',color:'var(--t3)'}}>{w.horometro_fin||'—'}</td>
                    <td>{w.cajas_polibyt||'—'}</td>
                    <td>{w.km_lineales?`${w.km_lineales}m`:'—'}</td>
                    <td style={{color:'var(--t3)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.notas||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
          }
        </div>
      </div>

      {addWork && (
        <Modal title="Registrar jornada selladora" onClose={()=>setAddWork(false)} onSave={handleAddWork}>
          <div className="hint-box">Puedes registrar una semana completa sumando las horas, o día a día.</div>
          <div className="form-row">
            <Field label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')}/></Field>
            <Field label="Horas trabajadas"><input type="number" step="0.5" value={form.horas_trabajadas||''} onChange={set('horas_trabajadas')} placeholder="ej. 8"/></Field>
          </div>
          <div className="form-row">
            <Field label="Horómetro al terminar"><input type="number" step="0.1" value={form.horometro_fin||''} onChange={set('horometro_fin')} placeholder="ej. 1253.5"/></Field>
            <Field label="Cajas Polibyt"><input type="number" value={form.cajas_polibyt||''} onChange={set('cajas_polibyt')} placeholder="ej. 8"/></Field>
          </div>
          <div className="form-row">
            <Field label="Km lineales (m)"><input type="number" value={form.km_lineales||''} onChange={set('km_lineales')} placeholder="ej. 180"/></Field>
            <Field label="Notas"><input value={form.notas||''} onChange={set('notas')} placeholder="Obra, cliente..."/></Field>
          </div>
        </Modal>
      )}

      {addMaint && (
        <Modal title="Mantenimiento selladora" onClose={()=>setAddMaint(false)} onSave={handleAddMaint}>
          <div className="form-row">
            <Field label="Fecha"><input type="date" value={mf.fecha} onChange={setm('fecha')}/></Field>
            <Field label="Tipo">
              <select value={mf.tipo} onChange={setm('tipo')}>
                <option>Cambio de aceite</option><option>Mantenimiento preventivo</option>
                <option>Revisión de boquillas</option><option>Limpieza del sistema</option>
                <option>Reparación</option><option>Otro</option>
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Horómetro"><input type="number" step="0.1" value={mf.horometro||''} onChange={setm('horometro')}/></Field>
            <Field label="Costo (COP)"><input type="number" value={mf.costo||''} onChange={setm('costo')}/></Field>
          </div>
          <Field label="Notas" full>
            <textarea rows={2} value={mf.notas||''} onChange={setm('notas')} placeholder="Qué se hizo, repuestos, proveedor..."/>
          </Field>
        </Modal>
      )}
    </div>
  )
}
