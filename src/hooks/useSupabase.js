import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// ── Vehicles ──────────────────────────────────────────────────────────────────
export function useVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('vehicles').select('*').order('created_at')
    setVehicles(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, load)
      .subscribe()
    return () => sub.unsubscribe()
  }, [])

  return { vehicles, loading, reload: load }
}

export async function saveVehicle(id, data) {
  // snake_case mapping
  const row = {
    placa: data.placa, marca: data.marca, modelo: data.modelo,
    ano: data.ano, color_vehiculo: data.color_vehiculo,
    color_indicador: data.color_indicador,
    km_actual: data.km_actual, km_compra: data.km_compra,
    conductor: data.conductor, conductor_cedula: data.conductor_cedula,
    conductor_tel: data.conductor_tel, salario: data.salario,
    dotacion_fecha: data.dotacion_fecha || null,
    contrato_vence: data.contrato_vence || null,
    soat: data.soat || null, tecno: data.tecno || null,
    seguro: data.seguro || null, tarjeta_propiedad: data.tarjeta_propiedad,
  }
  if (id) {
    await supabase.from('vehicles').update(row).eq('id', id)
    return id
  } else {
    const { data: d } = await supabase.from('vehicles').insert(row).select().single()
    return d.id
  }
}

export async function uploadVehiclePhoto(vehicleId, file) {
  const path = `${vehicleId}/photo-${Date.now()}`
  const { error } = await supabase.storage.from('vehicles').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('vehicles').getPublicUrl(path)
  await supabase.from('vehicles').update({ photo_url: data.publicUrl }).eq('id', vehicleId)
  return data.publicUrl
}

// ── Helper: hook con realtime para cualquier tabla filtrada por vehicle_id ─────
function useVehicleTable(table, vehicleId, orderCol = 'fecha', ascending = false) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!vehicleId) { setData([]); setLoading(false); return }
    const { data: rows } = await supabase
      .from(table).select('*')
      .eq('vehicle_id', vehicleId)
      .order(orderCol, { ascending })
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Realtime: recarga cuando hay cualquier cambio en la tabla
    const channel = supabase.channel(`${table}_${vehicleId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table,
        filter: `vehicle_id=eq.${vehicleId}`
      }, () => load())
      .subscribe()
    return () => channel.unsubscribe()
  }, [vehicleId])

  return { data, loading, reload: load }
}

// ── KM Logs ───────────────────────────────────────────────────────────────────
export function useKmLogs(vehicleId) {
  const { data: logs, loading, reload } = useVehicleTable('km_logs', vehicleId)
  return { logs, loading, reload }
}

export async function addKmLog(vehicleId, data) {
  await supabase.from('km_logs').insert({
    vehicle_id: vehicleId,
    fecha: data.fecha,
    km_inicio: +data.km_inicio,
    km_fin: +data.km_fin,
    km_dia: +data.km_fin - +data.km_inicio,
    conductor: data.conductor,
  })
  // Actualiza km_actual del vehículo
  await supabase.from('vehicles').update({ km_actual: +data.km_fin }).eq('id', vehicleId)
}

// ── Maintenances ──────────────────────────────────────────────────────────────
export function useMaintenances(vehicleId) {
  const { data: records, loading, reload } = useVehicleTable('maintenances', vehicleId)
  return { records, loading, reload }
}

export async function addMaintenance(vehicleId, data) {
  await supabase.from('maintenances').insert({
    vehicle_id: vehicleId,
    fecha: data.fecha,
    tipo: data.tipo,
    km_al_momento: data.km_al_momento ? +data.km_al_momento : null,
    costo: data.costo ? +data.costo : null,
    taller: data.taller,
    notas: data.notas,
  })
}

export async function deleteMaintenance(id) {
  await supabase.from('maintenances').delete().eq('id', id)
}

// ── Costs ─────────────────────────────────────────────────────────────────────
export function useCosts(vehicleId) {
  const { data: costs, loading, reload } = useVehicleTable('costs', vehicleId)
  return { costs, loading, reload }
}

export async function addCost(vehicleId, data) {
  await supabase.from('costs').insert({
    vehicle_id: vehicleId,
    fecha: data.fecha,
    tipo: data.tipo,
    descripcion: data.descripcion,
    monto: data.monto ? +data.monto : null,
  })
}

export async function deleteCost(id) {
  await supabase.from('costs').delete().eq('id', id)
}
