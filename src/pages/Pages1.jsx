import React, { useState, useRef } from 'react'
import { Modal, Field, Badge, MaintRow, InfoRow, PhotoUpload, Empty, Spinner, StatCard, ProgBar } from '../components/UI.jsx'
import { saveVehicle, uploadPhoto, addMaintenance, updateMaintenance, deleteMaintenance, addCost, deleteCost } from '../lib/hooks.js'
import { calcPredictive, getIntervals, fmtKm, fmtCOP, fmtDate, daysUntil, docStatus, today } from '../lib/logic.js'

const COST_TYPES = ['Salario conductor', 'Dotación', 'Combustible', 'Seguro', 'Parqueadero', 'Peajes', 'Lavado', 'Multa', 'Repuesto', 'Otro']

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export function Dashboard({ vehicles, allMaint, allKm, onNav, onSel }) {
  const totalKmHoy = vehicles.reduce((a, v) => a + ((allKm[v.id] || [])[0]?.km_dia || 0), 0)
  const totalKm    = vehicles.reduce((a, v) => a + (v.km_actual || 0), 0)
  const totalMantCost = Object.values(allMaint).flat().reduce((a, m) => a + (m.costo || 0), 0)
  const allAlerts  = vehicles.flatMap(v => calcPredictive(v, allMaint[v.id] || []).filter(p => p.estado !== 'ok').map(p => ({ ...p, v })))

  return (
    <div className="fade-in">
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      <div className="content">
        <div className="g4 mb4">
          <StatCard label="Km hoy · flota" value={fmtKm(totalKmHoy)} sub="acumulado ambos carros" badge={totalKmHoy > 0 ? '● Operando' : '○ Sin datos'} badgeType={totalKmHoy > 0 ? 'ok' : 'neu'} />
          <StatCard label="Km total flota" value={totalKm.toLocaleString('es-CO')} sub="km acumulados" />
          <StatCard label="Alertas activas" value={allAlerts.length} sub="mantenimientos" badge={allAlerts.length > 0 ? 'Revisar' : 'Todo al día'} badgeType={allAlerts.length > 0 ? 'warn' : 'ok'} />
          <StatCard label="Costo mantenimiento" value={fmtCOP(totalMantCost)} sub="histórico total" />
        </div>

        <div className="g2 mb4">
          {vehicles.map(v => {
            const pred = calcPredictive(v, allMaint[v.id] || [])
            const logs = allKm[v.id] || []
            const soatD = daysUntil(v.soat)
            const tecnoD = daysUntil(v.tecno)
            const danger = pred.filter(p => p.estado === 'danger').length
            const warn   = pred.filter(p => p.estado === 'warn').length
            return (
              <div key={v.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { onSel(v.id); onNav('vehiculos') }}>
                <div className="card-hd">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {v.photo_url
                      ? <img src={v.photo_url} style={{ width: 52, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--b)' }} alt="" />
                      : <div style={{ width: 52, height: 36, background: 'var(--bg3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚛</div>
                    }
                    <div>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 15 }}>{v.placa}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)' }}>{v.marca} · {v.conductor || 'Sin conductor'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {danger > 0 && <Badge type="danger">{danger} urgente{danger > 1 ? 's' : ''}</Badge>}
                    {warn > 0 && <Badge type="warn">{warn} próximo{warn > 1 ? 's' : ''}</Badge>}
                    {danger === 0 && warn === 0 && <Badge type="ok">Al día</Badge>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Km actuales</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: -1, marginTop: 3 }}>{(v.km_actual || 0).toLocaleString('es-CO')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Hoy</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: -1, marginTop: 3 }}>{logs[0]?.km_dia || 0} km</div>
                  </div>
                </div>

                {pred.filter(p => p.estado !== 'ok').slice(0, 2).map(p => (
                  <MaintRow key={p.tipo} item={p} />
                ))}
                {pred.filter(p => p.estado !== 'ok').length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--green)', padding: '8px 0' }}>✓ Todos los mantenimientos al día</div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {soatD !== null && <Badge type={docStatus(soatD)}>SOAT · {soatD > 0 ? `${soatD}d` : 'Vencido'}</Badge>}
                  {tecnoD !== null && <Badge type={docStatus(tecnoD)}>Tecno · {tecnoD > 0 ? `${tecnoD}d` : 'Vencido'}</Badge>}
                </div>
              </div>
            )
          })}
        </div>

        {allAlerts.length > 0 && (
          <div className="card">
            <div className="card-hd">
              <div className="card-tl">Alertas de mantenimiento</div>
              <button className="btn btn-g btn-sm" onClick={() => onNav('mantenimiento')}>Ver todo →</button>
            </div>
            {allAlerts.slice(0, 4).map((a, i) => (
              <div key={i} className={`alert alert-${a.estado}`}>
                <div style={{ fontSize: 16 }}>{a.estado === 'danger' ? '⚠' : '↑'}</div>
                <div className="alert-body">
                  <div className="alert-title">{a.v.placa} · {a.tipo}</div>
                  <div className="alert-sub">{a.remaining > 0 ? `Faltan ${a.remaining.toLocaleString('es-CO')} km` : `Vencido hace ${Math.abs(a.remaining).toLocaleString('es-CO')} km`}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VEHÍCULOS — HOJA DE VIDA
// ══════════════════════════════════════════════════════════════════════════════
export function Vehiculos({ vehicle, maintenances, costs, onSaved }) {
  const isNew = !vehicle?.id
  const empty = { color_indicador: '#0A84FF', km_actual: 0, km_compra: 0 }

  const [editing, setEditing]        = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [addCostM, setAddCostM]      = useState(false)
  const [photoLoading, setPhotoLoad] = useState(false)
  const [saving, setSaving]          = useState(false)
  const [form, setForm]   = useState(vehicle || empty)
  const [cf, setCf]       = useState({ tipo: 'Salario conductor', fecha: today() })

  // Sync form when vehicle changes (e.g. switching between vehicles)
  React.useEffect(() => {
    setForm(vehicle || empty)
    setEditing(false)
    setShowNewForm(false)
  }, [vehicle?.id])

  const set  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setc = k => e => setCf(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    if (!form.placa) return alert('La placa es obligatoria')
    setSaving(true)
    try {
      const id = await saveVehicle(vehicle?.id || null, form)
      setSaving(false)
      setEditing(false)
      setShowNewForm(false)
      onSaved?.(id)
    } catch(e) {
      setSaving(false)
      alert('Error al guardar: ' + e.message)
    }
  }

  async function handlePhoto(file) {
    if (!vehicle?.id) return alert('Guarda el vehículo primero')
    setPhotoLoad(true)
    try { await uploadPhoto(vehicle.id, file); onSaved?.() }
    finally { setPhotoLoad(false) }
  }

  async function handleAddCost() {
    if (!cf.monto) return alert('Ingresa el monto')
    await addCost(vehicle.id, cf)
    setAddCostM(false); setCf({ tipo: 'Salario conductor', fecha: today() })
  }

  // Show new vehicle form
  if (showNewForm) {
    return (
      <div className="fade-in">
        <div className="topbar">
          <div><div className="page-title">Nuevo vehículo</div></div>
          <button className="btn btn-g" onClick={() => setShowNewForm(false)}>← Cancelar</button>
        </div>
        <div className="content">
          <div className="card">
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Datos del vehículo</div>
            <div className="form-row">
              <Field label="Placa *"><input value={form.placa || ''} onChange={set('placa')} placeholder="ej. ABC-123" /></Field>
              <Field label="Marca *"><input value={form.marca || ''} onChange={set('marca')} placeholder="JMC o JAC" /></Field>
            </div>
            <div className="form-row">
              <Field label="Modelo"><input value={form.modelo || ''} onChange={set('modelo')} placeholder="ej. Furgón N-Series" /></Field>
              <Field label="Año"><input type="number" value={form.ano || ''} onChange={set('ano')} placeholder="2022" /></Field>
            </div>
            <div className="form-row">
              <Field label="Km actuales"><input type="number" value={form.km_actual || ''} onChange={set('km_actual')} placeholder="0" /></Field>
              <Field label="Km a la compra"><input type="number" value={form.km_compra || ''} onChange={set('km_compra')} placeholder="0" /></Field>
            </div>
            <div className="hint-box">💡 Ingresa los km a la compra para que el sistema calcule los mantenimientos correctamente desde ahí.</div>
            <div className="form-row">
              <Field label="Color indicador">
                <select value={form.color_indicador || '#0A84FF'} onChange={set('color_indicador')}>
                  <option value="#0A84FF">Azul</option>
                  <option value="#30D158">Verde</option>
                  <option value="#FF9F0A">Ámbar</option>
                  <option value="#FF453A">Rojo</option>
                </select>
              </Field>
              <Field label="Tarjeta de propiedad"><input value={form.tarjeta_propiedad || ''} onChange={set('tarjeta_propiedad')} /></Field>
            </div>
            <div className="divider" />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Conductor</div>
            <div className="form-row">
              <Field label="Nombre"><input value={form.conductor || ''} onChange={set('conductor')} /></Field>
              <Field label="Cédula"><input value={form.conductor_cedula || ''} onChange={set('conductor_cedula')} /></Field>
            </div>
            <div className="form-row">
              <Field label="Teléfono"><input value={form.conductor_tel || ''} onChange={set('conductor_tel')} /></Field>
              <Field label="Salario (COP)"><input type="number" value={form.salario || ''} onChange={set('salario')} /></Field>
            </div>
            <div className="form-row">
              <Field label="Dotación entregada"><input type="date" value={form.dotacion_fecha || ''} onChange={set('dotacion_fecha')} /></Field>
              <Field label="Contrato vence"><input type="date" value={form.contrato_vence || ''} onChange={set('contrato_vence')} /></Field>
            </div>
            <div className="divider" />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Documentos</div>
            <div className="form-row">
              <Field label="SOAT vence"><input type="date" value={form.soat || ''} onChange={set('soat')} /></Field>
              <Field label="Tecnomecánica vence"><input type="date" value={form.tecno || ''} onChange={set('tecno')} /></Field>
            </div>
            <Field label="Seguro todo riesgo vence"><input type="date" value={form.seguro || ''} onChange={set('seguro')} /></Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--b)' }}>
              <button className="btn btn-g" onClick={() => setShowNewForm(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar vehículo'}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!vehicle?.id) return (
    <div className="content">
      <Empty icon="🚛" title="Sin vehículos" sub="Agrega el primer vehículo de tu flota"
        action={<button className="btn btn-p" onClick={() => { setForm(empty); setShowNewForm(true) }}>+ Agregar vehículo</button>} />
    </div>
  )

  const pred = vehicle ? calcPredictive(vehicle, maintenances) : []
  const totalMant = maintenances.reduce((a, m) => a + (m.costo || 0), 0)
  const totalCost = costs.reduce((a, c) => a + (c.monto || 0), 0)
  const soatD  = daysUntil(vehicle?.soat)
  const tecnoD = daysUntil(vehicle?.tecno)
  const ctrD   = daysUntil(vehicle?.contrato_vence)

  return (
    <div className="fade-in">
      <div className="topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {vehicle && <div style={{ width: 9, height: 9, borderRadius: '50%', background: vehicle.color_indicador || '#0A84FF' }} />}
            <div className="page-title">{vehicle ? `${vehicle.placa} · ${vehicle.marca}` : 'Nuevo vehículo'}</div>
          </div>
          {vehicle && <div className="page-sub">{vehicle.modelo} · {vehicle.ano}</div>}
        </div>
        <div className="top-actions">
          <button className="btn btn-g" onClick={() => { setForm({ ...vehicle }); setEditing(true) }}>✏ Editar</button>
          {vehicle?.id && <button className="btn btn-p" onClick={() => setAddCostM(true)}>+ Costo</button>}
        </div>
      </div>

      <div className="content">
        <div className="g2 mb4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PhotoUpload photoUrl={vehicle?.photo_url} onUpload={handlePhoto} loading={photoLoading} />
            <div className="card">
              <div className="card-t" style={{ marginBottom: 12 }}>Datos del vehículo</div>
              <InfoRow label="Placa" value={vehicle?.placa} />
              <InfoRow label="Marca / Modelo" value={vehicle ? `${vehicle.marca} ${vehicle.modelo}` : '—'} />
              <InfoRow label="Año" value={vehicle?.ano} />
              <InfoRow label="Km actuales" value={fmtKm(vehicle?.km_actual)} />
              <InfoRow label="Km a la compra" value={fmtKm(vehicle?.km_compra)} />
              <InfoRow label="Tarjeta propiedad" value={vehicle?.tarjeta_propiedad} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-t" style={{ marginBottom: 12 }}>Conductor</div>
              <InfoRow label="Nombre" value={vehicle?.conductor} />
              <InfoRow label="Cédula" value={vehicle?.conductor_cedula} />
              <InfoRow label="Teléfono" value={vehicle?.conductor_tel} />
              <InfoRow label="Salario" value={fmtCOP(vehicle?.salario)} />
              <InfoRow label="Dotación" value={fmtDate(vehicle?.dotacion_fecha)} />
              <InfoRow label="Contrato vence" value={ctrD !== null ? `${fmtDate(vehicle?.contrato_vence)} · ${ctrD}d` : '—'} badge={ctrD !== null} badgeType={docStatus(ctrD)} />
            </div>
            <div className="card">
              <div className="card-t" style={{ marginBottom: 12 }}>Documentos legales</div>
              <InfoRow label="SOAT" value={soatD !== null ? `${fmtDate(vehicle?.soat)} · ${soatD}d` : '—'} badge={!!vehicle?.soat} badgeType={docStatus(soatD)} />
              <InfoRow label="Tecnomecánica" value={tecnoD !== null ? `${fmtDate(vehicle?.tecno)} · ${tecnoD}d` : '—'} badge={!!vehicle?.tecno} badgeType={docStatus(tecnoD)} />
              <InfoRow label="Seguro" value={fmtDate(vehicle?.seguro)} />
            </div>
          </div>
        </div>

        {vehicle?.id && <>
          <div className="g3 mb4">
            <StatCard label="Costo mantenimientos" value={fmtCOP(totalMant)} sub={`${maintenances.length} registros`} />
            <StatCard label="Costos operativos" value={fmtCOP(totalCost)} sub={`${costs.length} registros`} />
            <StatCard label="Costo total" value={fmtCOP(totalMant + totalCost)} sub="histórico acumulado" />
          </div>

          <div className="card mb4">
            <div className="card-hd"><div className="card-tl">Estado de mantenimiento</div>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>Plan oficial {vehicle.marca}</span></div>
            {pred.map(p => <MaintRow key={p.tipo} item={p} />)}
          </div>

          <div className="card mb4">
            <div className="card-hd">
              <div className="card-tl">Historial de mantenimientos</div>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>{maintenances.length} registros</span>
            </div>
            {maintenances.length === 0
              ? <Empty icon="🔧" title="Sin mantenimientos" sub="Registra desde el módulo Mantenimiento" />
              : <div className="tl">
                  {maintenances.map(m => (
                    <div key={m.id} className="tl-row">
                      <div className="tl-dot" style={{ background: vehicle.color_indicador || '#0A84FF' }} />
                      <div className="tl-body">
                        <div className="tl-title">{m.tipo}</div>
                        <div className="tl-meta">{fmtDate(m.fecha)} · {fmtKm(m.km_al_momento)} · {m.taller || '—'}</div>
                        {m.notas && <div className="tl-meta" style={{ fontStyle: 'italic' }}>{m.notas}</div>}
                        <div className="tl-cost">{fmtCOP(m.costo)}</div>
                      </div>
                      <button className="btn-icon" style={{ fontSize: 11 }} onClick={() => window.confirm('¿Eliminar?') && deleteMaintenance(m.id)}>✕</button>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-tl">Costos operativos</div>
              <button className="btn btn-g btn-sm" onClick={() => setAddCostM(true)}>+ Agregar</button>
            </div>
            {costs.length === 0
              ? <Empty icon="💰" title="Sin costos" sub="Salarios, combustible, peajes..." action={<button className="btn btn-p btn-sm" onClick={() => setAddCostM(true)}>+ Registrar</button>} />
              : <table className="tbl">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th><th></th></tr></thead>
                  <tbody>{costs.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--t3)' }}>{fmtDate(c.fecha)}</td>
                      <td><Badge type="neu">{c.tipo}</Badge></td>
                      <td style={{ color: 'var(--t2)' }}>{c.descripcion || '—'}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmtCOP(c.monto)}</td>
                      <td><button className="btn-icon" style={{ fontSize: 11 }} onClick={() => window.confirm('¿Eliminar?') && deleteCost(c.id)}>✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
            }
          </div>
        </>}
      </div>

      {editing && (
        <Modal title={vehicle?.id ? `Editar · ${vehicle.placa}` : 'Nuevo vehículo'} onClose={() => setEditing(false)} onSave={handleSave} saveLabel={saving ? 'Guardando...' : 'Guardar'} wide>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Vehículo</div>
          <div className="form-row">
            <Field label="Placa"><input value={form.placa || ''} onChange={set('placa')} placeholder="JUZ-621" /></Field>
            <Field label="Marca"><input value={form.marca || ''} onChange={set('marca')} placeholder="JMC" /></Field>
          </div>
          <div className="form-row">
            <Field label="Modelo"><input value={form.modelo || ''} onChange={set('modelo')} placeholder="Furgón N-Series" /></Field>
            <Field label="Año"><input type="number" value={form.ano || ''} onChange={set('ano')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Km actuales"><input type="number" value={form.km_actual || ''} onChange={set('km_actual')} /></Field>
            <Field label="Km a la compra"><input type="number" value={form.km_compra || ''} onChange={set('km_compra')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Color indicador">
              <select value={form.color_indicador || '#0A84FF'} onChange={set('color_indicador')}>
                <option value="#0A84FF">Azul</option>
                <option value="#30D158">Verde</option>
                <option value="#FF9F0A">Ámbar</option>
                <option value="#FF453A">Rojo</option>
              </select>
            </Field>
            <Field label="Tarjeta de propiedad"><input value={form.tarjeta_propiedad || ''} onChange={set('tarjeta_propiedad')} /></Field>
          </div>
          <div className="divider" />
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Conductor</div>
          <div className="form-row">
            <Field label="Nombre"><input value={form.conductor || ''} onChange={set('conductor')} /></Field>
            <Field label="Cédula"><input value={form.conductor_cedula || ''} onChange={set('conductor_cedula')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Teléfono"><input value={form.conductor_tel || ''} onChange={set('conductor_tel')} /></Field>
            <Field label="Salario (COP)"><input type="number" value={form.salario || ''} onChange={set('salario')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Dotación entregada"><input type="date" value={form.dotacion_fecha || ''} onChange={set('dotacion_fecha')} /></Field>
            <Field label="Contrato vence"><input type="date" value={form.contrato_vence || ''} onChange={set('contrato_vence')} /></Field>
          </div>
          <div className="divider" />
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Documentos</div>
          <div className="form-row">
            <Field label="SOAT vence"><input type="date" value={form.soat || ''} onChange={set('soat')} /></Field>
            <Field label="Tecnomecánica vence"><input type="date" value={form.tecno || ''} onChange={set('tecno')} /></Field>
          </div>
          <Field label="Seguro todo riesgo vence"><input type="date" value={form.seguro || ''} onChange={set('seguro')} /></Field>
        </Modal>
      )}

      {addCostM && (
        <Modal title="Registrar costo" onClose={() => setAddCostM(false)} onSave={handleAddCost}>
          <div className="form-row">
            <Field label="Tipo"><select value={cf.tipo} onChange={setc('tipo')}>{COST_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Fecha"><input type="date" value={cf.fecha} onChange={setc('fecha')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Monto (COP)"><input type="number" value={cf.monto || ''} onChange={setc('monto')} /></Field>
            <Field label="Descripción"><input value={cf.descripcion || ''} onChange={setc('descripcion')} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MANTENIMIENTO
// ══════════════════════════════════════════════════════════════════════════════
export function Mantenimiento({ vehicles, allMaint, selId }) {
  const [adding, setAdding]     = useState(false)
  const [editing, setEditing]   = useState(null)
  const [postponing, setPostp]  = useState(null)
  const [postponeKm, setPostKm] = useState(1000)
  const [saving, setSaving]     = useState(false)

  // Siempre inicializa con el primer vehículo disponible si no hay selId
  const defaultVehicleId = selId || vehicles[0]?.id || ''
  const [form, setForm] = useState({ fecha: today(), vehicle_id: defaultVehicleId })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Sync vehicle_id cuando llegan los vehículos o cambia selId
  React.useEffect(() => {
    setForm(p => ({
      ...p,
      vehicle_id: p.vehicle_id || selId || vehicles[0]?.id || ''
    }))
  }, [selId, vehicles.length])

  const selV    = vehicles.find(v => v.id === form.vehicle_id)
  const tipos   = selV ? [...getIntervals(selV).map(i => i.tipo), 'Reparación eléctrica', 'Reparación mecánica', 'Revisión general', 'Otro'] : []
  const selItem = selV ? getIntervals(selV).find(i => i.tipo === form.tipo) : null

  function resetForm() {
    setForm({ fecha: today(), vehicle_id: selId || vehicles[0]?.id || '' })
  }

  async function handleSave() {
    if (!form.vehicle_id) return alert('Selecciona un vehículo')
    if (!form.tipo) return alert('Selecciona el tipo de mantenimiento')
    if (!form.km_al_momento) return alert('Ingresa los km al momento')
    setSaving(true)
    try {
      if (editing) {
        await updateMaintenance(editing, form)
        setEditing(null)
      } else {
        await addMaintenance(form.vehicle_id, form)
        setAdding(false)
      }
      resetForm()
    } catch(e) {
      alert('Error al guardar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(m, vehicleId) {
    setForm({
      vehicle_id: vehicleId,
      fecha: m.fecha,
      tipo: m.tipo,
      km_al_momento: m.km_al_momento,
      costo: m.costo,
      taller: m.taller,
      notas: m.notas,
    })
    setEditing(m.id)
  }

  // Posponer: crea un registro ficticio con km_al_momento = kmActual + postponeKm
  // Esto empuja el próximo mantenimiento X km hacia adelante
  async function handlePostpone() {
    const v = vehicles.find(v => v.id === postponing.vehicleId)
    if (!v) return
    const kmBase = (v.km_actual || 0) + parseInt(postponeKm)
    await addMaintenance(postponing.vehicleId, {
      fecha: today(),
      tipo: postponing.tipo,
      km_al_momento: kmBase,
      notas: `Pospuesto ${postponeKm} km — registrado manualmente a ${kmBase.toLocaleString('es-CO')} km`,
    })
    setPostp(null)
    setPostKm(1000)
  }

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Mantenimiento</div>
          <div className="page-sub">Plan oficial JMC · JAC · Estado de salud de la flota</div></div>
        <button className="btn btn-p" onClick={() => { resetForm(); setEditing(null); setAdding(true) }}>+ Registrar</button>
      </div>
      <div className="content">
        {vehicles.map(v => {
          const pred   = calcPredictive(v, allMaint[v.id] || [])
          const maints = allMaint[v.id] || []
          return (
            <div key={v.id} className="card mb4">
              <div className="card-hd">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: v.color_indicador || '#0A84FF' }} />
                  <div className="card-tl">{v.placa} · {v.marca}</div>
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>{fmtKm(v.km_actual)} actuales</span>
                </div>
              </div>

              {pred.map(p => (
                <div key={p.tipo} style={{ position: 'relative' }}>
                  <MaintRow item={p} />
                  {p.estado !== 'ok' && (
                    <button
                      className="btn btn-g btn-sm"
                      style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 11 }}
                      onClick={() => { setPostp({ vehicleId: v.id, tipo: p.tipo, kmActual: v.km_actual || 0 }); setPostKm(1000) }}
                    >
                      ⏭ Posponer
                    </button>
                  )}
                </div>
              ))}

              {maints.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div className="section-hd"><div className="section-t">Historial de registros</div></div>
                  <table className="tbl">
                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Km</th><th>Taller</th><th>Costo</th><th></th></tr></thead>
                    <tbody>{maints.map(m => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--t3)' }}>{fmtDate(m.fecha)}</td>
                        <td style={{ fontWeight: 500 }}>
                          {m.tipo}
                          {m.notas?.includes('Pospuesto') && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--amber)', background: 'var(--amberbg)', padding: '1px 6px', borderRadius: 99 }}>pospuesto</span>}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{m.km_al_momento?.toLocaleString('es-CO') || '—'}</td>
                        <td style={{ color: 'var(--t2)' }}>{m.taller || '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>{fmtCOP(m.costo)}</td>
                        <td style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-icon" style={{ fontSize: 11 }} title="Editar" onClick={() => openEdit(m, v.id)}>✏</button>
                          <button className="btn-icon" style={{ fontSize: 11 }} title="Eliminar" onClick={() => { if (window.confirm('¿Eliminar este registro?')) deleteMaintenance(m.id) }}>✕</button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal agregar / editar */}
      {(adding || editing) && (
        <Modal
          title={editing ? 'Editar mantenimiento' : 'Registrar mantenimiento'}
          onClose={() => { setAdding(false); setEditing(null); resetForm() }}
          onSave={handleSave}
          saveLabel={saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Registrar')}
        >
          <div className="form-row">
            <Field label="Vehículo">
              <select value={form.vehicle_id} onChange={e => setForm(p => ({ ...p, vehicle_id: e.target.value, tipo: '' }))} disabled={!!editing}>
                <option value="">Seleccionar...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} · {v.marca}</option>)}
              </select>
            </Field>
            <Field label="Fecha"><input type="date" value={form.fecha || ''} onChange={set('fecha')} /></Field>
          </div>
          <div className="form-row">
            <Field label={`Tipo${selV ? ` · ${selV.marca}` : ''}`}>
              <select value={form.tipo || ''} onChange={set('tipo')}>
                <option value="">Seleccionar...</option>
                {tipos.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Km al momento"><input type="number" value={form.km_al_momento || ''} onChange={set('km_al_momento')} /></Field>
          </div>
          {selItem?.nota && <div className="hint-box">💡 <strong>{selV?.marca}:</strong> {selItem.nota}</div>}
          <div className="form-row">
            <Field label="Costo (COP)"><input type="number" value={form.costo || ''} onChange={set('costo')} /></Field>
            <Field label="Taller / Proveedor"><input value={form.taller || ''} onChange={set('taller')} /></Field>
          </div>
          <Field label="Notas" full>
            <textarea rows={3} value={form.notas || ''} onChange={set('notas')} placeholder="Qué se hizo, piezas cambiadas, observaciones..." />
          </Field>
        </Modal>
      )}

      {/* Modal posponer */}
      {postponing && (
        <Modal title={`Posponer · ${postponing.tipo}`} onClose={() => setPostp(null)} onSave={handlePostpone} saveLabel="Posponer">
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.7 }}>
            Este mantenimiento quedará en el radar pero el contador se reinicia desde <strong style={{ color: 'var(--t1)' }}>{(postponing.kmActual + parseInt(postponeKm || 0)).toLocaleString('es-CO')} km</strong>.
          </div>
          <Field label="Posponer cuántos km">
            <select value={postponeKm} onChange={e => setPostKm(e.target.value)}>
              <option value={500}>500 km (~4 días)</option>
              <option value={1000}>1.000 km (~8 días)</option>
              <option value={2000}>2.000 km (~15 días)</option>
              <option value={3000}>3.000 km (~23 días)</option>
              <option value={5000}>5.000 km (~38 días)</option>
            </select>
          </Field>
          <div className="hint-box" style={{ marginTop: 10 }}>
            ⏭ El próximo mantenimiento se calculará desde {(postponing.kmActual + parseInt(postponeKm || 0)).toLocaleString('es-CO')} km. Quedará en amarillo como recordatorio.
          </div>
        </Modal>
      )}
    </div>
  )
}
