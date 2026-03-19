import React, { useState } from 'react'
import { Modal, Field, Badge, Empty, StatCard, ProgBar } from '../components/UI.jsx'
import { addKmLog, importSatrackData, addMachineWork, addMachineMaintenance, updateMachine } from '../lib/hooks.js'
import { parseSatrackEmail, calcSelladoPredictive, fmtKm, fmtCOP, fmtDate, fmtH, today } from '../lib/logic.js'

// ══════════════════════════════════════════════════════════════════════════════
// KM & VELOCIDAD
// ══════════════════════════════════════════════════════════════════════════════
export function KmVelocidad({ vehicles, allKm, selId }) {
  const [adding, setAdding]     = useState(false)
  const [importing, setImport]  = useState(false)
  const [emailText, setEmail]   = useState('')
  const [parseResult, setParse] = useState(null)
  const [form, setForm]         = useState({ vehicle_id: selId || '', fecha: today() })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const vehicle = vehicles.find(v => v.id === selId) || vehicles[0]
  const logs    = vehicle ? (allKm[vehicle.id] || []) : []
  const totalKm = logs.reduce((a, l) => a + (l.km_dia || 0), 0)
  const avgKm   = logs.length ? Math.round(totalKm / logs.length) : 0
  const maxKm   = logs.length ? Math.max(...logs.map(l => l.km_dia || 0), 1) : 200
  const totalExcesos = logs.reduce((a, l) => a + (l.excesos || 0), 0)

  async function handleSave() {
    if (!form.vehicle_id || !form.km_dia) return alert('Completa los campos')
    await addKmLog(form.vehicle_id, form)
    setAdding(false); setForm({ vehicle_id: selId || '', fecha: today() })
  }

  function handleParse() {
    const res = parseSatrackEmail(emailText)
    setParse(res)
  }

  async function handleImport() {
    if (!parseResult?.length) return
    await importSatrackData(parseResult)
    setImport(false); setEmail(''); setParse(null)
  }

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Km & velocidad</div>
          <div className="page-sub">Datos SATRACK · {vehicle?.placa || 'Flota'}</div></div>
        <div className="top-actions">
          <button className="btn btn-g" onClick={() => setImport(true)}>📧 Importar email SATRACK</button>
          <button className="btn btn-p" onClick={() => setAdding(true)}>+ Manual</button>
        </div>
      </div>
      <div className="content">
        <div className="g4 mb4">
          <StatCard label="Km hoy" value={logs[0]?.km_dia || 0} sub={logs[0]?.fecha || '—'} />
          <StatCard label="Promedio diario" value={avgKm} sub="km por día" />
          <StatCard label="Total registrado" value={totalKm.toLocaleString('es-CO')} sub={`en ${logs.length} días`} />
          <StatCard label="Excesos velocidad" value={totalExcesos} sub="total histórico" badge={totalExcesos > 0 ? `${totalExcesos} eventos` : 'Sin excesos'} badgeType={totalExcesos > 5 ? 'warn' : totalExcesos > 0 ? 'neu' : 'ok'} />
        </div>

        <div className="g2 mb4">
          <div className="card">
            <div className="card-hd"><div className="card-tl">Km por día</div></div>
            {logs.length === 0 ? <Empty icon="📍" title="Sin registros" sub="Importa el email de SATRACK" /> :
              logs.slice(0, 14).map(l => (
                <div key={l.id} className="bar-row">
                  <div className="bar-date">{l.fecha?.slice(5)}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.max(8, Math.round((l.km_dia / maxKm) * 100))}%`, background: vehicle?.color_indicador || '#0A84FF' }}>
                      {l.km_dia} km
                    </div>
                  </div>
                  {l.excesos > 0 && <Badge type="warn">{l.excesos} exc.</Badge>}
                </div>
              ))
            }
          </div>

          <div className="card">
            <div className="card-hd"><div className="card-tl">Historial completo</div></div>
            <table className="tbl">
              <thead><tr><th>Fecha</th><th>Km día</th><th>Excesos</th></tr></thead>
              <tbody>{logs.map(l => (
                <tr key={l.id}>
                  <td>{fmtDate(l.fecha)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{l.km_dia} km</td>
                  <td>{l.excesos > 0 ? <Badge type="warn">{l.excesos}</Badge> : <Badge type="ok">0</Badge>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

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
            <Field label="Km del día"><input type="number" value={form.km_dia || ''} onChange={set('km_dia')} placeholder="ej. 142" /></Field>
            <Field label="Excesos velocidad"><input type="number" value={form.excesos || ''} onChange={set('excesos')} placeholder="0" /></Field>
          </div>
          <div className="form-row">
            <Field label="Km inicio (odómetro)"><input type="number" value={form.km_inicio || ''} onChange={set('km_inicio')} /></Field>
            <Field label="Km fin (odómetro)"><input type="number" value={form.km_fin || ''} onChange={set('km_fin')} /></Field>
          </div>
        </Modal>
      )}

      {importing && (
        <Modal title="Importar email SATRACK" onClose={() => { setImport(false); setParse(null) }} onSave={handleImport} saveLabel="Importar datos" wide>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.6 }}>
            Copia y pega el texto del email de SATRACK (<strong>noti@satrack.com</strong>) aquí abajo. El sistema detecta automáticamente las placas JUZ621 y QJX706 con sus km y excesos.
          </div>
          <Field label="Texto del email" full>
            <textarea rows={8} value={emailText} onChange={e => setEmail(e.target.value)} placeholder="Pega aquí el contenido del email de SATRACK..." />
          </Field>
          <button className="btn btn-g" style={{ marginTop: 10 }} onClick={handleParse}>🔍 Detectar datos</button>
          {parseResult && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Datos detectados:</div>
              {parseResult.length === 0
                ? <div style={{ color: 'var(--amber)', fontSize: 13 }}>No se detectaron datos. Verifica el formato del email.</div>
                : parseResult.map((r, i) => (
                  <div key={i} className="hint-box" style={{ marginBottom: 6 }}>
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
// COSTOS
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: v.color_indicador || '#0A84FF' }} />
                  <div className="card-tl">{v.placa} · {v.marca}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: -1 }}>{fmtCOP(total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>total acumulado</div>
                </div>
              </div>

              <div className="g3" style={{ marginBottom: 16 }}>
                <div className="card" style={{ background: 'var(--bg3)', border: '1px solid var(--b)' }}>
                  <div className="card-t">Mantenimientos</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', margin: '6px 0 2px' }}>{fmtCOP(tMant)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{maints.length} registros</div>
                </div>
                <div className="card" style={{ background: 'var(--bg3)', border: '1px solid var(--b)' }}>
                  <div className="card-t">Operativos</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', margin: '6px 0 2px' }}>{fmtCOP(tOp)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{costs.length} registros</div>
                </div>
                <div className="card" style={{ background: 'var(--bg3)', border: '1px solid var(--b)' }}>
                  <div className="card-t">Costo por km</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', margin: '6px 0 2px' }}>{fmtCOP(cpkm)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>por km recorrido</div>
                </div>
              </div>

              {Object.keys(byType).length > 0 && (
                <div>
                  <div className="section-hd"><div className="section-t">Por categoría</div></div>
                  {Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([tipo, monto]) => (
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
// SELLADORA
// ══════════════════════════════════════════════════════════════════════════════
export function Selladora({ machine, work, machineMaints, onSaved }) {
  const [addWork, setAddWork]     = useState(false)
  const [addMaint, setAddMaint]   = useState(false)
  const [editMachine, setEditM]   = useState(!machine)
  const [form, setForm]           = useState({ fecha: today() })
  const [mf, setMf]               = useState({ fecha: today(), tipo: 'Cambio de aceite' })
  const [mach, setMach]           = useState(machine || { nombre: 'Selladora de fisuras', horometro_actual: 0 })
  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setm = k => e => setMf(p => ({ ...p, [k]: e.target.value }))

  const pred = calcSelladoPredictive(machine || mach, machineMaints)
  const totalHoras = work.reduce((a, w) => a + (w.horas_trabajadas || 0), 0)
  const totalCajas = work.reduce((a, w) => a + (w.cajas_polibyt || 0), 0)
  const totalKmL   = work.reduce((a, w) => a + (w.km_lineales || 0), 0)
  const rendimiento = totalCajas > 0 && totalKmL > 0 ? (totalKmL / totalCajas).toFixed(1) : null

  // Agrupado por mes para tabla de consumo
  const byMonth = {}
  work.forEach(w => {
    const mes = w.fecha?.slice(0, 7)
    if (!mes) return
    if (!byMonth[mes]) byMonth[mes] = { cajas: 0, km: 0, horas: 0 }
    byMonth[mes].cajas += w.cajas_polibyt || 0
    byMonth[mes].km    += w.km_lineales || 0
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
    setEditM(false); onSaved?.()
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
          <StatCard label="Cajas Polibyt total" value={totalCajas} sub={`${(totalCajas * 21).toLocaleString('es-CO')} kg`} />
          <StatCard label="Km lineales total" value={totalKmL > 0 ? `${totalKmL.toLocaleString('es-CO')} m` : '—'} sub="metros sellados" />
          <StatCard label="Rendimiento" value={rendimiento ? `${rendimiento} m` : '—'} sub="metros por caja" badge={rendimiento ? 'Calculado' : 'Sin datos'} badgeType={rendimiento ? 'ok' : 'neu'} />
        </div>

        <div className="g2 mb4">
          <div className="card">
            <div className="card-hd"><div className="card-tl">Estado de mantenimiento</div></div>
            {pred.map(p => {
              const cls   = { ok: 'maint-ok', warn: 'maint-warn', danger: 'maint-danger' }[p.estado]
              const dotC  = { ok: 'var(--green)', warn: 'var(--amber)', danger: 'var(--red)' }[p.estado]
              const icon  = { ok: '✓', warn: '↑', danger: '⚠' }[p.estado]
              let sub = ''
              if (p.estado === 'ok') sub = `Último a ${p.lastH}h · faltan ${p.remaining}h`
              else if (p.estado === 'warn') sub = `Próximo en ${p.remaining}h`
              else sub = `Vencido hace ${Math.abs(p.remaining)}h`
              return (
                <div key={p.tipo} className={`maint-row ${cls}`}>
                  <div className="maint-dot" style={{ background: dotC }} />
                  <div className="maint-info">
                    <div className="maint-tipo">{icon} {p.tipo}</div>
                    <div className="maint-sub">{sub} · Cada {p.intervalo}h</div>
                    <ProgBar pct={p.pct} estado={p.estado} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card">
            <div className="card-hd"><div className="card-tl">Consumo mensual Polibyt</div></div>
            {Object.keys(byMonth).length === 0
              ? <Empty icon="📦" title="Sin registros" sub="Registra jornadas para ver el consumo" />
              : <table className="tbl">
                  <thead><tr><th>Mes</th><th>Horas</th><th>Cajas</th><th>Kg</th><th>Km</th><th>Rend.</th></tr></thead>
                  <tbody>
                    {Object.entries(byMonth).sort((a,b) => b[0].localeCompare(a[0])).map(([mes, d]) => {
                      const rend = d.cajas > 0 && d.km > 0 ? (d.km / d.cajas).toFixed(1) : '—'
                      return (
                        <tr key={mes}>
                          <td style={{ fontFamily: 'var(--mono)' }}>{mes}</td>
                          <td>{d.horas}h</td>
                          <td style={{ fontWeight: 600 }}>{d.cajas}</td>
                          <td style={{ color: 'var(--t3)' }}>{(d.cajas * 21).toLocaleString('es-CO')}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{d.km > 0 ? `${d.km}m` : '—'}</td>
                          <td>{rend !== '—' ? <Badge type="ok">{rend} m/caja</Badge> : '—'}</td>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Rendimiento promedio</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', margin: '6px 0 2px' }}>{rendimiento ? `${rendimiento}m` : '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>metros por caja de 21kg</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Productividad</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', margin: '6px 0 2px' }}>
                {totalHoras > 0 && totalKmL > 0 ? `${(totalKmL / totalHoras).toFixed(1)}m` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>metros sellados por hora</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Jornadas registradas</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', margin: '6px 0 2px' }}>{work.length}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{totalHoras}h operativas totales</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><div className="card-tl">Historial de jornadas</div></div>
          {work.length === 0
            ? <Empty icon="⏱" title="Sin jornadas" sub="Registra la primera jornada de trabajo" />
            : <table className="tbl">
                <thead><tr><th>Fecha</th><th>Horas</th><th>Horóm.</th><th>Cajas</th><th>Km lineales</th><th>Notas</th></tr></thead>
                <tbody>{work.map(w => (
                  <tr key={w.id}>
                    <td>{fmtDate(w.fecha)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{w.horas_trabajadas}h</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--t3)' }}>{w.horometro_fin || '—'}</td>
                    <td>{w.cajas_polibyt || '—'}</td>
                    <td>{w.km_lineales ? `${w.km_lineales}m` : '—'}</td>
                    <td style={{ color: 'var(--t3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.notas || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
          }
        </div>
      </div>

      {addWork && (
        <Modal title="Registrar jornada selladora" onClose={() => setAddWork(false)} onSave={handleAddWork}>
          <div className="hint-box">Puedes registrar una semana completa sumando las horas, o día a día — como prefieras.</div>
          <div className="form-row">
            <Field label="Fecha (o fin de semana)"><input type="date" value={form.fecha} onChange={set('fecha')} /></Field>
            <Field label="Horas trabajadas"><input type="number" step="0.5" value={form.horas_trabajadas || ''} onChange={set('horas_trabajadas')} placeholder="ej. 8" /></Field>
          </div>
          <div className="form-row">
            <Field label="Horómetro al terminar"><input type="number" step="0.1" value={form.horometro_fin || ''} onChange={set('horometro_fin')} placeholder="ej. 1253.5" /></Field>
            <Field label="Cajas Polibyt usadas"><input type="number" value={form.cajas_polibyt || ''} onChange={set('cajas_polibyt')} placeholder="ej. 8" /></Field>
          </div>
          <div className="form-row">
            <Field label="Km lineales sellados (m)"><input type="number" value={form.km_lineales || ''} onChange={set('km_lineales')} placeholder="ej. 180" /></Field>
            <Field label="Notas"><input value={form.notas || ''} onChange={set('notas')} placeholder="Obra, cliente, condiciones..." /></Field>
          </div>
        </Modal>
      )}

      {addMaint && (
        <Modal title="Mantenimiento selladora" onClose={() => setAddMaint(false)} onSave={handleAddMaint}>
          <div className="form-row">
            <Field label="Fecha"><input type="date" value={mf.fecha} onChange={setm('fecha')} /></Field>
            <Field label="Tipo">
              <select value={mf.tipo} onChange={setm('tipo')}>
                <option>Cambio de aceite</option>
                <option>Mantenimiento preventivo</option>
                <option>Revisión de boquillas</option>
                <option>Limpieza del sistema</option>
                <option>Reparación</option>
                <option>Otro</option>
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Horómetro al momento"><input type="number" step="0.1" value={mf.horometro || ''} onChange={setm('horometro')} /></Field>
            <Field label="Costo (COP)"><input type="number" value={mf.costo || ''} onChange={setm('costo')} /></Field>
          </div>
          <Field label="Notas" full>
            <textarea rows={2} value={mf.notas || ''} onChange={setm('notas')} placeholder="Qué se hizo, repuestos, proveedor..." />
          </Field>
        </Modal>
      )}
    </div>
  )
}
