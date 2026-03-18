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

// ── KM Logs ───────────────────────────────────────────────────────────────────
export function useKmLogs(vehicleId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!vehicleId) { setLoading(false); return }
    const { data } = await supabase.from('km_logs')
      .select('*').eq('vehicle_id', vehicleId).order('fecha', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [vehicleId])
  return { logs, loading, reload: load }
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
  await supabase.from('vehicles').update({ km_actual: +data.km_fin }).eq('id', vehicleId)
}

// ── Maintenances ──────────────────────────────────────────────────────────────
export function useMaintenances(vehicleId) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!vehicleId) { setLoading(false); return }
    const { data } = await supabase.from('maintenances')
      .select('*').eq('vehicle_id', vehicleId).order('fecha', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [vehicleId])
  return { records, loading, reload: load }
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

// ── Costs ─────────────────────────────────────────────────────────────────────
export function useCosts(vehicleId) {
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!vehicleId) { setLoading(false); return }
    const { data } = await supabase.from('costs')
      .select('*').eq('vehicle_id', vehicleId).order('fecha', { ascending: false })
    setCosts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [vehicleId])
  return { costs, loading, reload: load }
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
