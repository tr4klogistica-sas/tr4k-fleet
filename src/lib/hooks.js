import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

function useTable(table, query, deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: rows, error } = await query()
    if (!error) setData(rows || [])
    setLoading(false)
  }, deps)

  useEffect(() => {
    load()
    const ch = supabase.channel(`${table}_${JSON.stringify(deps)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, load)
      .subscribe()
    return () => ch.unsubscribe()
  }, [load])

  return { data, loading, reload: load }
}

// ── Vehicles ──────────────────────────────────────────────────────────────────
export function useVehicles() {
  const { data: vehicles, loading, reload } = useTable(
    'vehicles',
    () => supabase.from('vehicles').select('*').order('created_at'),
    []
  )
  return { vehicles, loading, reload }
}

export async function saveVehicle(id, d) {
  const row = {
    placa: d.placa, marca: d.marca, modelo: d.modelo, ano: d.ano,
    color_vehiculo: d.color_vehiculo, color_indicador: d.color_indicador || '#0A84FF',
    km_actual: +d.km_actual || 0, km_compra: +d.km_compra || 0,
    conductor: d.conductor, conductor_cedula: d.conductor_cedula,
    conductor_tel: d.conductor_tel, salario: d.salario ? +d.salario : null,
    dotacion_fecha: d.dotacion_fecha || null, contrato_vence: d.contrato_vence || null,
    soat: d.soat || null, tecno: d.tecno || null, seguro: d.seguro || null,
    tarjeta_propiedad: d.tarjeta_propiedad,
  }
  if (id) {
    await supabase.from('vehicles').update(row).eq('id', id)
    return id
  }
  const { data } = await supabase.from('vehicles').insert(row).select().single()
  return data.id
}

export async function uploadPhoto(vehicleId, file) {
  const path = `${vehicleId}/photo-${Date.now()}`
  await supabase.storage.from('vehicles').upload(path, file, { upsert: true })
  const { data } = supabase.storage.from('vehicles').getPublicUrl(path)
  await supabase.from('vehicles').update({ photo_url: data.publicUrl }).eq('id', vehicleId)
  return data.publicUrl
}

// ── KM Logs (from SATRACK) ────────────────────────────────────────────────────
export function useKmLogs(vehicleId) {
  const { data: logs, loading, reload } = useTable(
    'km_logs',
    () => vehicleId
      ? supabase.from('km_logs').select('*').eq('vehicle_id', vehicleId).order('fecha', { ascending: false })
      : Promise.resolve({ data: [] }),
    [vehicleId]
  )
  return { logs, loading, reload }
}

export async function addKmLog(vehicleId, d) {
  await supabase.from('km_logs').insert({
    vehicle_id: vehicleId, fecha: d.fecha,
    km_dia: +d.km_dia, excesos: +d.excesos || 0,
    km_inicio: d.km_inicio ? +d.km_inicio : null,
    km_fin: d.km_fin ? +d.km_fin : null,
  })
  if (d.km_fin) {
    await supabase.from('vehicles').update({ km_actual: +d.km_fin }).eq('id', vehicleId)
  }
}

export async function importSatrackData(rows) {
  // rows = [{ fecha, placa, km_dia, excesos }]
  for (const row of rows) {
    const { data: veh } = await supabase.from('vehicles').select('id,km_actual').eq('placa', row.placa.replace('-','')).maybeSingle()
    if (!veh) continue
    await supabase.from('km_logs').upsert({
      vehicle_id: veh.id, fecha: row.fecha,
      km_dia: row.km_dia, excesos: row.excesos,
    }, { onConflict: 'vehicle_id,fecha' })
  }
}

// ── Maintenances ──────────────────────────────────────────────────────────────
export function useMaintenances(vehicleId) {
  const { data: records, loading, reload } = useTable(
    'maintenances',
    () => vehicleId
      ? supabase.from('maintenances').select('*').eq('vehicle_id', vehicleId).order('fecha', { ascending: false })
      : Promise.resolve({ data: [] }),
    [vehicleId]
  )
  return { records, loading, reload }
}

export async function addMaintenance(vehicleId, d) {
  await supabase.from('maintenances').insert({
    vehicle_id: vehicleId, fecha: d.fecha, tipo: d.tipo,
    km_al_momento: d.km_al_momento ? +d.km_al_momento : null,
    costo: d.costo ? +d.costo : null,
    taller: d.taller, notas: d.notas,
  })
}

export async function deleteMaintenance(id) {
  await supabase.from('maintenances').delete().eq('id', id)
}

// ── Costs ─────────────────────────────────────────────────────────────────────
export function useCosts(vehicleId) {
  const { data: costs, loading, reload } = useTable(
    'costs',
    () => vehicleId
      ? supabase.from('costs').select('*').eq('vehicle_id', vehicleId).order('fecha', { ascending: false })
      : Promise.resolve({ data: [] }),
    [vehicleId]
  )
  return { costs, loading, reload }
}

export async function addCost(vehicleId, d) {
  await supabase.from('costs').insert({
    vehicle_id: vehicleId, fecha: d.fecha,
    tipo: d.tipo, descripcion: d.descripcion, monto: +d.monto || 0,
  })
}

export async function deleteCost(id) {
  await supabase.from('costs').delete().eq('id', id)
}

// ── Selladora ─────────────────────────────────────────────────────────────────
export function useMachine() {
  const { data, loading, reload } = useTable(
    'machines',
    () => supabase.from('machines').select('*').limit(1),
    []
  )
  return { machine: data[0] || null, loading, reload }
}

export async function updateMachine(id, d) {
  if (id) {
    await supabase.from('machines').update(d).eq('id', id)
  } else {
    await supabase.from('machines').insert(d)
  }
}

export function useMachineWork() {
  const { data: work, loading, reload } = useTable(
    'machine_work',
    () => supabase.from('machine_work').select('*').order('fecha', { ascending: false }),
    []
  )
  return { work, loading, reload }
}

export async function addMachineWork(d) {
  const row = {
    fecha: d.fecha,
    horas_trabajadas: +d.horas_trabajadas || 0,
    horometro_fin: d.horometro_fin ? +d.horometro_fin : null,
    cajas_polibyt: d.cajas_polibyt ? +d.cajas_polibyt : null,
    km_lineales: d.km_lineales ? +d.km_lineales : null,
    notas: d.notas,
  }
  await supabase.from('machine_work').insert(row)
  if (row.horometro_fin) {
    const { data } = await supabase.from('machines').select('id').limit(1).single()
    if (data) await supabase.from('machines').update({ horometro_actual: row.horometro_fin }).eq('id', data.id)
  }
}

export function useMachineMaintenances() {
  const { data: records, loading, reload } = useTable(
    'machine_maintenances',
    () => supabase.from('machine_maintenances').select('*').order('fecha', { ascending: false }),
    []
  )
  return { records, loading, reload }
}

export async function addMachineMaintenance(d) {
  await supabase.from('machine_maintenances').insert({
    fecha: d.fecha, tipo: d.tipo,
    horometro: d.horometro ? +d.horometro : null,
    costo: d.costo ? +d.costo : null, notas: d.notas,
  })
}

// ── Chat history ──────────────────────────────────────────────────────────────
export function useChatHistory() {
  const { data: messages, loading, reload } = useTable(
    'chat_messages',
    () => supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200),
    []
  )
  return { messages, loading, reload }
}

export async function saveMessage(role, content, topic = 'general') {
  await supabase.from('chat_messages').insert({ role, content, topic })
}
