export const MAINTENANCE_INTERVALS = [
  { tipo: 'Cambio de aceite',       intervalo: 5000,  prioridad: 1 },
  { tipo: 'Cambio de filtros',      intervalo: 10000, prioridad: 2 },
  { tipo: 'Revisión de frenos',     intervalo: 15000, prioridad: 2 },
  { tipo: 'Alineación y balanceo',  intervalo: 10000, prioridad: 3 },
  { tipo: 'Cambio de llantas',      intervalo: 40000, prioridad: 3 },
  { tipo: 'Revisión de batería',    intervalo: 20000, prioridad: 3 },
  { tipo: 'Cambio de correa',       intervalo: 60000, prioridad: 1 },
  { tipo: 'Revisión de suspensión', intervalo: 20000, prioridad: 2 },
]

export function calcPredictive(vehicle, maintenances = []) {
  const kmActual = vehicle.km_actual || 0
  return MAINTENANCE_INTERVALS.map(item => {
    const lastRecord = maintenances
      .filter(m => m.tipo === item.tipo)
      .sort((a, b) => (b.km_al_momento || 0) - (a.km_al_momento || 0))[0]
    const lastKm = lastRecord?.km_al_momento || 0
    const proximoKm = lastKm + item.intervalo
    const kmRestantes = proximoKm - kmActual
    const pct = Math.min(100, Math.round((kmActual - lastKm) / item.intervalo * 100))
    let estado = 'ok'
    if (kmRestantes <= 0) estado = 'danger'
    else if (kmRestantes <= item.intervalo * 0.15) estado = 'warn'
    return { ...item, lastKm, proximoKm, kmRestantes, pct, estado }
  })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.round((new Date(dateStr) - new Date()) / 86400000)
}

export function docStatus(days) {
  if (days === null) return 'neutral'
  if (days < 30) return 'danger'
  if (days < 90) return 'warn'
  return 'ok'
}

export function fmtKm(n) {
  if (n == null) return '—'
  return n.toLocaleString('es-CO') + ' km'
}

export function fmtCOP(n) {
  if (n == null) return '—'
  return '$ ' + Number(n).toLocaleString('es-CO')
}

export function fmtDate(str) {
  if (!str) return '—'
  return new Date(str + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}
