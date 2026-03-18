import React, { useState } from 'react'
import { Modal, Field, VehiclePhoto, InfoRow, Badge, StatCard, ProgressBar, Empty, SectionHeader } from '../components/UI.jsx'
import { saveVehicle, uploadVehiclePhoto, addMaintenance, addKmLog, addCost } from '../hooks/useSupabase.js'
import { calcPredictive, MAINTENANCE_INTERVALS, fmtKm, fmtCOP, fmtDate, daysUntil, docStatus } from '../lib/predictive.js'

const COST_TYPES = ['Salario conductor', 'Dotación', 'Combustible', 'Seguro', 'Parqueadero', 'Peajes', 'Lavado', 'Multa', 'Otro']
const MANT_TIPOS = [...MAINTENANCE_INTERVALS.map(m => m.tipo), 'Reparación eléctrica', 'Reparación mecánica', 'Otro']

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export function Dashboard({ vehicles, allMaintenances, allKmLogs, onNav }) {
  const totalKmHoy = vehicles.reduce((a, v) => {
    const logs = allKmLogs[v.id] || []
    return a + (logs[0]?.km_dia || 0)
  }, 0)
  const totalKm = vehicles.reduce((a, v) => a + (v.km_actual || 0), 0)
  const allAlerts = vehicles.flatMap(v =>
    calcPredictive(v, allMaintenances[v.id] || []).filter(p => p.estado !== 'ok').map(p => ({ ...p, vehicle: v }))
  )
  const totalCosto = Object.values(allMaintenances).flat().reduce((a, m) => a + (m.costo || 0), 0)

  return (
    <div className="fade-in">
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard · TR4K Logística</div>
          <div className="page-sub">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      <div className="content">
        <div className="grid-4 mb-4">
          <StatCard label="Km hoy · flota" value={fmtKm(totalKmHoy)} sub="recorridos hoy" badge={totalKmHoy > 0 ? '✓ Operando' : '— Sin registro'} badgeEstado={totalKmHoy > 0 ? 'ok' : 'neutral'} />
          <StatCard label="Km total flota" value={totalKm.toLocaleString('es-CO')} sub="km acumulados" />
          <StatCard label="Alertas activas" value={allAlerts.length} sub="mantenimientos pendientes" badge={allAlerts.length > 0 ? 'Requiere atención' : 'Todo al día'} badgeEstado={allAlerts.length > 0 ? 'warn' : 'ok'} />
          <StatCard label="Costo mantenimiento" value={fmtCOP(totalCosto)} sub="total histórico" />
        </div>

        <div className="grid-2 mb-4">
          {vehicles.map(v => {
            const pred = calcPredictive(v, allMaintenances[v.id] || [])
            const logs = allKmLogs[v.id] || []
            const soatDays = daysUntil(v.soat)
            const tecnoDays = daysUntil(v.tecno)
            return (
              <div key={v.id} className="card" style={{ cursor: 'pointer' }} onClick={() => onNav('hojavida')}>
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {v.photo_url
                      ? <img src={v.photo_url} alt="" style={{ width: 52, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                      : <div style={{ width: 52, height: 36, background: 'var(--surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚛</div>
                    }
                    <div>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: 14 }}>{v.placa || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.marca} · {v.conductor || 'Sin conductor'}</div>
                    </div>
                  </div>
                  <Badge estado="ok">Activo</Badge>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>Km actuales</div>
                    <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', marginTop: 2 }}>{(v.km_actual || 0).toLocaleString('es-CO')}</div></div>
                  <div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>Hoy</div>
                    <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', marginTop: 2 }}>{logs[0]?.km_dia || 0} km</div></div>
                </div>
                {pred.slice(0, 3).map(p => (
                  <div key={p.tipo} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-3)' }}>{p.tipo}</span>
                      <span style={{ color: p.estado === 'ok' ? 'var(--green)' : p.estado === 'warn' ? 'var(--amber)' : 'var(--red)', fontWeight: 500 }}>{p.pct}%</span>
                    </div>
                    <ProgressBar pct={p.pct} estado={p.estado} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  {soatDays !== null && <Badge estado={docStatus(soatDays)}>SOAT · {soatDays > 0 ? `${soatDays}d` : 'Vencido'}</Badge>}
                  {tecnoDays !== null && <Badge estado={docStatus(tecnoDays)}>Tecno · {tecnoDays > 0 ? `${tecnoDays}d` : 'Vencido'}</Badge>}
                </div>
              </div>
            )
          })}
        </div>

        {allAlerts.length > 0 && (
          <div className="card">
            <div className="card-header"><div className="card-title-lg">Alertas pendientes</div>
              <button className="btn btn-ghost btn-sm" onClick={() => onNav('alertas')}>Ver todas →</button></div>
            {allAlerts.slice(0, 3).map((a, i) => (
              <div key={i} className={`alert alert-${a.estado}`}>
                <div className="alert-icon">{a.estado === 'danger' ? '⚠' : '↑'}</div>
                <div className="alert-body">
                  <div className="alert-title">{a.vehicle.placa} · {a.tipo}</div>
                  <div className="alert-sub">Faltan {a.kmRestantes.toLocaleString('es-CO')} km · Próximo a {a.proximoKm.toLocaleString('es-CO')} km</div>
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
// HOJA DE VIDA
// ══════════════════════════════════════════════════════════════════════════════
export function HojaVida({ vehicle, maintenances, costs, onSaved }) {
  const [editing, setEditing] = useState(!vehicle)
  const [addingCost, setAddingCost] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const empty = { color_indicador: '#185FA5', km_actual: 0, km_compra: 0 }
  const [form, setForm] = useState(vehicle || empty)
  const [costForm, setCostForm] = useState({ tipo: 'Salario conductor', fecha: today() })

  function today() { return new Date().toISOString().split('T')[0] }
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const setC = k => e => setCostForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    await saveVehicle(vehicle?.id || null, form)
    setSaving(false)
    setEditing(false)
    onSaved?.()
  }

  async function handlePhoto(file) {
    if (!vehicle?.id) return alert('Guarda el vehículo primero')
    setPhotoLoading(true)
    try { await uploadVehiclePhoto(vehicle.id, file) }
    finally { setPhotoLoading(false); onSaved?.() }
  }

  async function handleAddCost() {
    if (!costForm.monto) return alert('Ingresa el monto')
    await addCost(vehicle.id, costForm)
    setAddingCost(false)
    setCostForm({ tipo: 'Salario conductor', fecha: today() })
  }

  if (!vehicle && !editing) return (
    <div className="content"><Empty icon="🚛" title="Selecciona un vehículo" sub="O crea uno nuevo desde el panel lateral" action={<button className="btn btn-primary" onClick={() => setEditing(true)}>+ Nuevo vehículo</button>} /></div>
  )

  const pred = vehicle ? calcPredictive(vehicle, maintenances) : []
  const totalMant = maintenances.reduce((a, m) => a + (m.costo || 0), 0)
  const totalCosts = costs.reduce((a, c) => a + (c.monto || 0), 0)
  const soatDays = daysUntil(vehicle?.soat)
  const tecnoDays = daysUntil(vehicle?.tecno)
  const contratoDays = daysUntil(vehicle?.contrato_vence)

  return (
    <div className="fade-in">
      <div className="topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {vehicle && <div style={{ width: 10, height: 10, borderRadius: '50%', background: vehicle.color_indicador || '#185FA5' }} />}
            <div className="page-title">{vehicle ? `Hoja de vida · ${vehicle.placa}` : 'Nuevo vehículo'}</div>
          </div>
          {vehicle && <div className="page-sub">{vehicle.marca} {vehicle.modelo} · Año {vehicle.ano}</div>}
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => { setForm(vehicle || empty); setEditing(true) }}>✏ Editar</button>
          {vehicle && <button className="btn btn-primary" onClick={() => setAddingCost(true)}>+ Costo</button>}
        </div>
      </div>

      <div className="content">
        <div className="grid-2 mb-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <VehiclePhoto photoUrl={vehicle?.photo_url} onUpload={handlePhoto} loading={photoLoading} />
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Datos del vehículo</div>
              <InfoRow label="Placa" value={vehicle?.placa} />
              <InfoRow label="Marca / Modelo" value={vehicle ? `${vehicle.marca} ${vehicle.modelo}` : '—'} />
              <InfoRow label="Año" value={vehicle?.ano} />
              <InfoRow label="Color" value={vehicle?.color_vehiculo} />
              <InfoRow label="Km actuales" value={fmtKm(vehicle?.km_actual)} />
              <InfoRow label="Km a la compra" value={fmtKm(vehicle?.km_compra)} />
              <InfoRow label="Tarjeta propiedad" value={vehicle?.tarjeta_propiedad} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Conductor asignado</div>
              <InfoRow label="Nombre" value={vehicle?.conductor} />
              <InfoRow label="Cédula" value={vehicle?.conductor_cedula} />
              <InfoRow label="Teléfono" value={vehicle?.conductor_tel} />
              <InfoRow label="Salario mensual" value={fmtCOP(vehicle?.salario)} />
              <InfoRow label="Dotación entregada" value={fmtDate(vehicle?.dotacion_fecha)} />
              <InfoRow label="Contrato vence"
                value={contratoDays !== null ? `${fmtDate(vehicle?.contrato_vence)} · ${contratoDays}d` : '—'}
                badge={contratoDays !== null} badgeEstado={docStatus(contratoDays)} />
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Documentos legales</div>
              <InfoRow label="SOAT vence"
                value={vehicle?.soat ? `${fmtDate(vehicle.soat)} · ${soatDays}d` : '—'}
                badge={!!vehicle?.soat} badgeEstado={docStatus(soatDays)} />
              <InfoRow label="Tecnomecánica vence"
                value={vehicle?.tecno ? `${fmtDate(vehicle.tecno)} · ${tecnoDays}d` : '—'}
                badge={!!vehicle?.tecno} badgeEstado={docStatus(tecnoDays)} />
              <InfoRow label="Seguro vence" value={fmtDate(vehicle?.seguro)} />
            </div>
          </div>
        </div>

        {vehicle && <>
          <div className="grid-3 mb-4">
            <StatCard label="Costo mantenimientos" value={fmtCOP(totalMant)} sub={`${maintenances.length} intervenciones`} />
            <StatCard label="Costos operativos" value={fmtCOP(totalCosts)} sub={`${costs.length} registros`} />
            <StatCard label="Costo total" value={fmtCOP(totalMant + totalCosts)} sub="histórico acumulado" />
          </div>

          <div className="card mb-4">
            <div className="card-header"><div className="card-title-lg">Mantenimiento predictivo</div></div>
            <table className="table">
              <thead><tr><th>Tipo</th><th>Último km</th><th>Próximo km</th><th>Faltan</th><th>Progreso</th><th>Estado</th></tr></thead>
              <tbody>
                {pred.map(p => (
                  <tr key={p.tipo}>
                    <td style={{ fontWeight: 500 }}>{p.tipo}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{p.lastKm ? p.lastKm.toLocaleString('es-CO') : '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{p.proximoKm.toLocaleString('es-CO')}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: p.estado === 'ok' ? 'var(--green)' : p.estado === 'warn' ? 'var(--amber)' : 'var(--red)' }}>
                      {p.kmRestantes > 0 ? p.kmRestantes.toLocaleString('es-CO') + ' km' : '⚠ Vencido'}
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <ProgressBar pct={p.pct} estado={p.estado} />
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{p.pct}%</div>
                    </td>
                    <td><Badge estado={p.estado}>{p.estado === 'ok' ? '✓ Al día' : p.estado === 'warn' ? '↑ Próximo' : '⚠ Vencido'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mb-4">
            <div className="card-header"><div className="card-title-lg">Historial de mantenimientos</div>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{maintenances.length} registros</span></div>
            {maintenances.length === 0
              ? <Empty icon="🔧" title="Sin mantenimientos" sub="Registra el primer mantenimiento en la sección Mantenimiento" />
              : <div className="timeline">{maintenances.map(m => (
                <div key={m.id} className="tl-row">
                  <div className="tl-dot" style={{ background: vehicle.color_indicador || '#185FA5' }} />
                  <div className="tl-body">
                    <div className="tl-title">{m.tipo}</div>
                    <div className="tl-meta">{fmtDate(m.fecha)} · {fmtKm(m.km_al_momento)} · {m.taller || '—'}</div>
                    {m.notas && <div className="tl-meta" style={{ fontStyle: 'italic', marginTop: 2 }}>{m.notas}</div>}
                    <div className="tl-cost">{fmtCOP(m.costo)}</div>
                  </div>
                </div>
              ))}</div>
            }
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title-lg">Costos operativos</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddingCost(true)}>+ Agregar</button></div>
            {costs.length === 0
              ? <Empty icon="💰" title="Sin costos registrados" sub="Salarios, dotaciones, combustible, peajes..." action={<button className="btn btn-primary btn-sm" onClick={() => setAddingCost(true)}>+ Registrar</button>} />
              : <table className="table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th></tr></thead>
                <tbody>{costs.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-3)' }}>{fmtDate(c.fecha)}</td>
                    <td><Badge estado="neutral">{c.tipo}</Badge></td>
                    <td style={{ color: 'var(--text-2)' }}>{c.descripcion || '—'}</td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{fmtCOP(c.monto)}</td>
                  </tr>
                ))}</tbody>
              </table>
            }
          </div>
        </>}
      </div>

      {editing && (
        <Modal title={vehicle ? `Editar · ${vehicle.placa}` : 'Nuevo vehículo'} onClose={() => setEditing(false)} onSave={handleSave} saveLabel={saving ? 'Guardando...' : 'Guardar'} wide>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Vehículo</div>
          <div className="form-row">
            <Field label="Placa"><input value={form.placa || ''} onChange={set('placa')} placeholder="JUZ-621" /></Field>
            <Field label="Marca"><input value={form.marca || ''} onChange={set('marca')} placeholder="JMC" /></Field>
          </div>
          <div className="form-row">
            <Field label="Modelo"><input value={form.modelo || ''} onChange={set('modelo')} placeholder="Furgón N-Series" /></Field>
            <Field label="Año"><input type="number" value={form.ano || ''} onChange={set('ano')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Color del vehículo"><input value={form.color_vehiculo || ''} onChange={set('color_vehiculo')} placeholder="Blanco" /></Field>
            <Field label="Color indicador">
              <select value={form.color_indicador || '#185FA5'} onChange={set('color_indicador')}>
                <option value="#185FA5">Azul</option>
                <option value="#0F6E56">Verde</option>
                <option value="#854F0B">Ámbar</option>
                <option value="#A32D2D">Rojo</option>
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Km actuales"><input type="number" value={form.km_actual || ''} onChange={set('km_actual')} /></Field>
            <Field label="Km a la compra"><input type="number" value={form.km_compra || ''} onChange={set('km_compra')} /></Field>
          </div>
          <Field label="Tarjeta de propiedad"><input value={form.tarjeta_propiedad || ''} onChange={set('tarjeta_propiedad')} /></Field>

          <div style={{ height: 1, background: 'var(--border)', margin: '18px 0 14px' }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Conductor</div>
          <div className="form-row">
            <Field label="Nombre completo"><input value={form.conductor || ''} onChange={set('conductor')} /></Field>
            <Field label="Cédula"><input value={form.conductor_cedula || ''} onChange={set('conductor_cedula')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Teléfono"><input value={form.conductor_tel || ''} onChange={set('conductor_tel')} /></Field>
            <Field label="Salario mensual (COP)"><input type="number" value={form.salario || ''} onChange={set('salario')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Dotación entregada"><input type="date" value={form.dotacion_fecha || ''} onChange={set('dotacion_fecha')} /></Field>
            <Field label="Contrato vence"><input type="date" value={form.contrato_vence || ''} onChange={set('contrato_vence')} /></Field>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '18px 0 14px' }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Documentos</div>
          <div className="form-row">
            <Field label="SOAT vence"><input type="date" value={form.soat || ''} onChange={set('soat')} /></Field>
            <Field label="Tecnomecánica vence"><input type="date" value={form.tecno || ''} onChange={set('tecno')} /></Field>
          </div>
          <Field label="Seguro todo riesgo vence"><input type="date" value={form.seguro || ''} onChange={set('seguro')} /></Field>
        </Modal>
      )}

      {addingCost && (
        <Modal title="Registrar costo operativo" onClose={() => setAddingCost(false)} onSave={handleAddCost}>
          <div className="form-row">
            <Field label="Tipo"><select value={costForm.tipo} onChange={setC('tipo')}>{COST_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Fecha"><input type="date" value={costForm.fecha} onChange={setC('fecha')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Monto (COP)"><input type="number" value={costForm.monto || ''} onChange={setC('monto')} placeholder="0" /></Field>
            <Field label="Descripción"><input value={costForm.descripcion || ''} onChange={setC('descripcion')} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MANTENIMIENTO
// ══════════════════════════════════════════════════════════════════════════════
export function Mantenimiento({ vehicles, allMaintenances, selectedId }) {
  const [adding, setAdding] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ tipo: MANT_TIPOS[0], fecha: today, vehicle_id: selectedId || '' })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    if (!form.vehicle_id) return alert('Selecciona un vehículo')
    if (!form.km_al_momento) return alert('Ingresa los km actuales')
    await addMaintenance(form.vehicle_id, form)
    setAdding(false)
    setForm({ tipo: MANT_TIPOS[0], fecha: today, vehicle_id: selectedId || '' })
  }

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Mantenimiento predictivo</div>
          <div className="page-sub">Basado en km · Se actualiza con cada registro</div></div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Registrar mantenimiento</button>
      </div>
      <div className="content">
        {vehicles.map(v => {
          const maints = allMaintenances[v.id] || []
          const pred = calcPredictive(v, maints)
          return (
            <div key={v.id} className="card mb-4">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color_indicador || '#185FA5' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{v.placa} · {v.marca}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtKm(v.km_actual)} actuales</div>
                  </div>
                </div>
              </div>
              <table className="table">
                <thead><tr><th>Tipo</th><th>Último km</th><th>Próximo km</th><th>Faltan</th><th>Progreso</th><th>Estado</th></tr></thead>
                <tbody>{pred.map(p => (
                  <tr key={p.tipo}>
                    <td style={{ fontWeight: 500 }}>{p.tipo}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{p.lastKm ? p.lastKm.toLocaleString('es-CO') : '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{p.proximoKm.toLocaleString('es-CO')}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: p.estado === 'ok' ? 'var(--green)' : p.estado === 'warn' ? 'var(--amber)' : 'var(--red)' }}>
                      {p.kmRestantes > 0 ? p.kmRestantes.toLocaleString('es-CO') + ' km' : '⚠ Vencido'}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <ProgressBar pct={p.pct} estado={p.estado} />
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{p.pct}%</div>
                    </td>
                    <td><Badge estado={p.estado}>{p.estado === 'ok' ? '✓ Al día' : p.estado === 'warn' ? '↑ Próximo' : '⚠ Vencido'}</Badge></td>
                  </tr>
                ))}</tbody>
              </table>
              {maints.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <SectionHeader title="Últimos registros" />
                  <table className="table">
                    <thead><tr><th>Fecha</th><th>Tipo</th><th>Km</th><th>Taller</th><th>Notas</th><th>Costo</th></tr></thead>
                    <tbody>{maints.slice(0, 6).map(m => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--text-3)' }}>{fmtDate(m.fecha)}</td>
                        <td style={{ fontWeight: 500 }}>{m.tipo}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{m.km_al_momento?.toLocaleString('es-CO') || '—'}</td>
                        <td style={{ color: 'var(--text-2)' }}>{m.taller || '—'}</td>
                        <td style={{ color: 'var(--text-3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.notas || '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>{fmtCOP(m.costo)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adding && (
        <Modal title="Registrar mantenimiento" onClose={() => setAdding(false)} onSave={handleSave}>
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
            <Field label="Tipo">
              <select value={form.tipo} onChange={set('tipo')}>
                {MANT_TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Km al momento"><input type="number" value={form.km_al_momento || ''} onChange={set('km_al_momento')} /></Field>
          </div>
          <div className="form-row">
            <Field label="Costo (COP)"><input type="number" value={form.costo || ''} onChange={set('costo')} /></Field>
            <Field label="Taller / Proveedor"><input value={form.taller || ''} onChange={set('taller')} /></Field>
          </div>
          <Field label="Notas — qué se hizo exactamente" full>
            <textarea rows={3} value={form.notas || ''} onChange={set('notas')} placeholder="Describe qué se hizo, qué piezas se cambiaron, observaciones importantes..." />
          </Field>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// KM DIARIOS
// ══════════════════════════════════════════════════════════════════════════════
export function KmDiarios({ vehicles, allKmLogs, selectedId }) {
  const [adding, setAdding] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ vehicle_id: selectedId || '', fecha: today })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const vehicle = vehicles.find(v => v.id === selectedId) || vehicles[0]
  const logs = vehicle ? (allKmLogs[vehicle.id] || []) : []
  const totalKm = logs.reduce((a, l) => a + (l.km_dia || 0), 0)
  const avgKm = logs.length > 0 ? Math.round(totalKm / logs.length) : 0
  const maxKm = logs.length > 0 ? Math.max(...logs.map(l => l.km_dia || 0), 1) : 200

  async function handleSave() {
    if (!form.vehicle_id) return alert('Selecciona un vehículo')
    if (!form.km_inicio || !form.km_fin) return alert('Ingresa km inicio y fin')
    if (+form.km_fin <= +form.km_inicio) return alert('Km fin debe ser mayor que km inicio')
    await addKmLog(form.vehicle_id, form)
    setAdding(false)
    setForm({ vehicle_id: selectedId || '', fecha: today })
  }

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Km diarios{vehicle ? ` · ${vehicle.placa}` : ''}</div>
          <div className="page-sub">Registro odómetro · Conductores WhatsApp</div></div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Registrar km</button>
      </div>
      <div className="content">
        <div className="grid-3 mb-4">
          <StatCard label="Km hoy" value={logs[0]?.km_dia || 0} sub={logs[0]?.conductor || '—'} />
          <StatCard label="Promedio diario" value={avgKm} sub="km por día" />
          <StatCard label="Total registrado" value={totalKm.toLocaleString('es-CO')} sub={`en ${logs.length} días`} />
        </div>
        <div className="card mb-4">
          <div className="card-header"><div className="card-title-lg">Km por día</div></div>
          {logs.length === 0 ? <Empty icon="📍" title="Sin registros" sub="Registra el primer km del día" /> :
            logs.slice(0, 14).map(l => (
              <div key={l.id} className="bar-row">
                <div className="bar-date">{l.fecha?.slice(5)}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(8, Math.round((l.km_dia / maxKm) * 100))}%`, background: vehicle?.color_indicador || '#185FA5' }}>
                    {l.km_dia} km
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', width: 100, flexShrink: 0 }}>{l.conductor}</div>
              </div>
            ))
          }
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title-lg">Historial completo</div></div>
          <table className="table">
            <thead><tr><th>Fecha</th><th>Km inicio</th><th>Km fin</th><th>Recorrido</th><th>Conductor</th></tr></thead>
            <tbody>{logs.map(l => (
              <tr key={l.id}>
                <td>{fmtDate(l.fecha)}</td>
                <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{l.km_inicio?.toLocaleString('es-CO')}</td>
                <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{l.km_fin?.toLocaleString('es-CO')}</td>
                <td><strong style={{ fontFamily: 'var(--mono)' }}>{l.km_dia} km</strong></td>
                <td style={{ color: 'var(--text-2)' }}>{l.conductor}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {adding && (
        <Modal title="Registrar km del día" onClose={() => setAdding(false)} onSave={handleSave}>
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
            <Field label="Km inicio (odómetro)"><input type="number" value={form.km_inicio || ''} onChange={set('km_inicio')} placeholder="ej. 45820" /></Field>
            <Field label="Km fin (odómetro)"><input type="number" value={form.km_fin || ''} onChange={set('km_fin')} placeholder="ej. 45967" /></Field>
          </div>
          <Field label="Conductor"><input value={form.conductor || ''} onChange={set('conductor')} placeholder="Nombre del conductor" /></Field>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ALERTAS
// ══════════════════════════════════════════════════════════════════════════════
export function Alertas({ vehicles, allMaintenances }) {
  const alerts = []
  vehicles.forEach(v => {
    calcPredictive(v, allMaintenances[v.id] || [])
      .filter(p => p.estado !== 'ok')
      .forEach(p => alerts.push({ tipo: 'mant', vehicle: v, pred: p, pri: p.estado === 'danger' ? 0 : 1 }))
    const checks = [
      { key: 'soat', label: 'SOAT' },
      { key: 'tecno', label: 'Tecnomecánica' },
      { key: 'contrato_vence', label: 'Contrato conductor' },
      { key: 'seguro', label: 'Seguro' },
    ]
    checks.forEach(({ key, label }) => {
      const days = daysUntil(v[key])
      if (days !== null && days < 60)
        alerts.push({ tipo: 'doc', vehicle: v, label, days, pri: days < 0 ? 0 : days < 30 ? 1 : 2 })
    })
  })
  alerts.sort((a, b) => a.pri - b.pri)

  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Alertas</div>
          <div className="page-sub">{alerts.length} alertas activas · Flota completa</div></div>
      </div>
      <div className="content">
        {alerts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Todo al día</div>
            <div style={{ color: 'var(--text-3)' }}>No hay alertas activas en este momento</div>
          </div>
        ) : alerts.map((a, i) => a.tipo === 'mant' ? (
          <div key={i} className={`alert alert-${a.pred.estado}`}>
            <div className="alert-icon">{a.pred.estado === 'danger' ? '⚠' : '↑'}</div>
            <div className="alert-body">
              <div className="alert-title">{a.vehicle.placa} · {a.pred.tipo}</div>
              <div className="alert-sub">
                {a.pred.kmRestantes > 0
                  ? `Faltan ${a.pred.kmRestantes.toLocaleString('es-CO')} km · Próximo a ${a.pred.proximoKm.toLocaleString('es-CO')} km`
                  : `Vencido hace ${Math.abs(a.pred.kmRestantes).toLocaleString('es-CO')} km`}
              </div>
            </div>
            <Badge estado={a.pred.estado}>{a.pred.estado === 'danger' ? 'Vencido' : 'Próximo'}</Badge>
          </div>
        ) : (
          <div key={i} className={`alert alert-${a.days < 30 ? 'danger' : 'warn'}`}>
            <div className="alert-icon">📄</div>
            <div className="alert-body">
              <div className="alert-title">{a.vehicle.placa} · {a.label}</div>
              <div className="alert-sub">{a.days < 0 ? `Vencido hace ${Math.abs(a.days)} días` : `Vence en ${a.days} días`}</div>
            </div>
            <Badge estado={a.days < 30 ? 'danger' : 'warn'}>{a.days < 0 ? 'Vencido' : `${a.days}d`}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COSTOS (resumen consolidado)
// ══════════════════════════════════════════════════════════════════════════════
export function Costos({ vehicles, allMaintenances, allCosts }) {
  return (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">Costos · Resumen consolidado</div>
          <div className="page-sub">Mantenimientos + operativos · Ambos vehículos</div></div>
      </div>
      <div className="content">
        {vehicles.map(v => {
          const maints = allMaintenances[v.id] || []
          const costs = allCosts[v.id] || []
          const totalMant = maints.reduce((a, m) => a + (m.costo || 0), 0)
          const totalOp = costs.reduce((a, c) => a + (c.monto || 0), 0)
          const byCostType = COST_TYPES.map(t => ({
            tipo: t,
            total: costs.filter(c => c.tipo === t).reduce((a, c) => a + (c.monto || 0), 0)
          })).filter(t => t.total > 0)

          return (
            <div key={v.id} className="card mb-4">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.color_indicador || '#185FA5' }} />
                  <div className="card-title-lg">{v.placa} · {v.marca}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)' }}>{fmtCOP(totalMant + totalOp)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>total acumulado</div>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <div className="card-title" style={{ marginBottom: 10 }}>Mantenimientos</div>
                  {maints.slice(0, 5).map(m => (
                    <div key={m.id} className="cost-pill">
                      <span className="cost-pill-label">{fmtDate(m.fecha)} · {m.tipo}</span>
                      <span className="cost-pill-val">{fmtCOP(m.costo)}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total mantenimientos</span><span style={{ fontFamily: 'var(--mono)' }}>{fmtCOP(totalMant)}</span>
                  </div>
                </div>
                <div>
                  <div className="card-title" style={{ marginBottom: 10 }}>Costos operativos por tipo</div>
                  {byCostType.length === 0
                    ? <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Sin registros aún</div>
                    : byCostType.map(t => (
                      <div key={t.tipo} className="cost-pill">
                        <span className="cost-pill-label">{t.tipo}</span>
                        <span className="cost-pill-val">{fmtCOP(t.total)}</span>
                      </div>
                    ))
                  }
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total operativos</span><span style={{ fontFamily: 'var(--mono)' }}>{fmtCOP(totalOp)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
