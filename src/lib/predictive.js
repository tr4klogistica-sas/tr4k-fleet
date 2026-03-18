// ─── Intervalos por marca — fuentes: JMC Colombia (jmc.com.co/posventa),
//     JAC Colombia (jacmotors.com.co), uso severo de carga urbana ──────────────
export const INTERVALS_BY_BRAND = {
  // JMC N-Series 2022 — motor diésel/gasolina, uso de carga
  JMC: [
    { tipo: 'Cambio de aceite + filtro',      intervalo: 5000,  prioridad: 1, nota: 'Aceite 15W40 o según especificación. JMC oficial: cada 5.000 km' },
    { tipo: 'Filtro de aire',                 intervalo: 10000, prioridad: 2, nota: 'Más frecuente en rutas con polvo' },
    { tipo: 'Filtro de combustible',          intervalo: 10000, prioridad: 2, nota: 'Crítico en motor diésel' },
    { tipo: 'Revisión de frenos',             intervalo: 15000, prioridad: 2, nota: 'Pastillas, discos y líquido. Incluido en revisión JMC' },
    { tipo: 'Alineación y balanceo',          intervalo: 10000, prioridad: 3, nota: 'Rotación de llantas incluida' },
    { tipo: 'Líquido de frenos',              intervalo: 20000, prioridad: 2, nota: 'Cambiar también si el color oscurece antes' },
    { tipo: 'Revisión de suspensión',         intervalo: 20000, prioridad: 2, nota: 'Muelles, amortiguadores, rótulas — uso carga' },
    { tipo: 'Revisión de batería',            intervalo: 20000, prioridad: 3, nota: 'Limpieza bornes y nivel de agua' },
    { tipo: 'Revisión sistema turbo',         intervalo: 20000, prioridad: 2, nota: 'Dejar correr el motor 3-5 min antes de apagar' },
    { tipo: 'Aceite de caja y diferencial',   intervalo: 40000, prioridad: 2, nota: 'Aceite sintético 80W90 GL4' },
    { tipo: 'Líquido refrigerante',           intervalo: 40000, prioridad: 2, nota: 'O cada 2 años, lo primero que ocurra' },
    { tipo: 'Cambio de llantas',              intervalo: 45000, prioridad: 3, nota: 'Depende desgaste real — verificar en cada alineación' },
    { tipo: 'Correa de distribución',         intervalo: 60000, prioridad: 1, nota: 'CRÍTICO — rotura puede destruir el motor. JMC: cambio obligatorio a 60.000 km' },
  ],
  // JAC X200 2023+ — motor 2.0L turbo diésel, cadena de distribución (no correa)
  JAC: [
    { tipo: 'Cambio de aceite + filtro',      intervalo: 5000,  prioridad: 1, nota: 'Aceite CK-4 5W30 o 15W40. JAC oficial: cada 5.000 km' },
    { tipo: 'Filtro de aire',                 intervalo: 10000, prioridad: 2, nota: 'Motor turbo diésel — filtro limpio es crítico' },
    { tipo: 'Filtro de combustible',          intervalo: 10000, prioridad: 2, nota: 'Drenar separadores de agua en cada revisión' },
    { tipo: 'Revisión de frenos',             intervalo: 15000, prioridad: 2, nota: 'Discos delanteros + tambores traseros. 6 llantas' },
    { tipo: 'Alineación y balanceo',          intervalo: 10000, prioridad: 3, nota: 'Incluye rotación de las 6 llantas (4 posteriores)' },
    { tipo: 'Líquido de frenos',              intervalo: 20000, prioridad: 2, nota: 'Cambiar también si el color oscurece antes' },
    { tipo: 'Revisión de suspensión',         intervalo: 20000, prioridad: 2, nota: 'Suspensión delantera independiente + muelles traseros' },
    { tipo: 'Revisión de batería',            intervalo: 20000, prioridad: 3, nota: 'Limpieza bornes y estado del alternador' },
    { tipo: 'Revisión sistema turbo',         intervalo: 20000, prioridad: 2, nota: 'Intercooler 2.8L — dejar enfriar antes de apagar' },
    { tipo: 'Aceite de caja y diferencial',   intervalo: 40000, prioridad: 2, nota: 'Aceite sintético 80W90 GL4. Diferencial trasero incluido' },
    { tipo: 'Líquido refrigerante',           intervalo: 40000, prioridad: 2, nota: 'O cada 2 años, lo primero que ocurra' },
    { tipo: 'Cambio de llantas',              intervalo: 45000, prioridad: 3, nota: '6 llantas — verificar desgaste irregular por carga' },
    // JAC X200 tiene CADENA de distribución — no necesita cambio periódico programado
    // Se incluye como inspección a alto kilometraje
    { tipo: 'Inspección cadena distribución', intervalo: 80000, prioridad: 2, nota: 'JAC X200 tiene cadena (no correa) — inspección visual a los 80.000 km' },
  ],
  // Genérico — para vehículos sin marca específica identificada
  DEFAULT: [
    { tipo: 'Cambio de aceite + filtro',      intervalo: 5000,  prioridad: 1, nota: 'Cada 5.000 km para vehículos de carga' },
    { tipo: 'Filtro de aire',                 intervalo: 10000, prioridad: 2, nota: '' },
    { tipo: 'Filtro de combustible',          intervalo: 10000, prioridad: 2, nota: '' },
    { tipo: 'Revisión de frenos',             intervalo: 15000, prioridad: 2, nota: '' },
    { tipo: 'Alineación y balanceo',          intervalo: 10000, prioridad: 3, nota: '' },
    { tipo: 'Líquido de frenos',              intervalo: 20000, prioridad: 2, nota: '' },
    { tipo: 'Revisión de suspensión',         intervalo: 20000, prioridad: 2, nota: '' },
    { tipo: 'Revisión de batería',            intervalo: 20000, prioridad: 3, nota: '' },
    { tipo: 'Aceite de caja y diferencial',   intervalo: 40000, prioridad: 2, nota: '' },
    { tipo: 'Cambio de llantas',              intervalo: 45000, prioridad: 3, nota: '' },
    { tipo: 'Correa / cadena distribución',   intervalo: 60000, prioridad: 1, nota: '' },
  ]
}

// Devuelve los intervalos correctos según la marca del vehículo
export function getIntervalsForVehicle(vehicle) {
  const marca = (vehicle?.marca || '').toUpperCase()
  if (marca.includes('JMC')) return INTERVALS_BY_BRAND.JMC
  if (marca.includes('JAC')) return INTERVALS_BY_BRAND.JAC
  return INTERVALS_BY_BRAND.DEFAULT
}

// Mantener compatibilidad con código que usa MAINTENANCE_INTERVALS directamente
export const MAINTENANCE_INTERVALS = INTERVALS_BY_BRAND.DEFAULT

export function calcPredictive(vehicle, maintenances = []) {
  const kmActual = vehicle.km_actual || 0
  const intervals = getIntervalsForVehicle(vehicle)

  return intervals.map(item => {
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
