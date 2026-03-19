// ─── Intervalos oficiales JMC y JAC ─────────────────────────────────────────
const JMC_INTERVALS = [
  { tipo: 'Cambio de aceite + filtro',      h: 5000,  p: 1, nota: 'Aceite 15W40. JMC oficial: cada 5.000 km' },
  { tipo: 'Filtro de aire',                 h: 10000, p: 2, nota: 'Más frecuente en rutas con polvo' },
  { tipo: 'Filtro de combustible',          h: 10000, p: 2, nota: 'Crítico en motor diésel' },
  { tipo: 'Revisión de frenos',             h: 15000, p: 2, nota: 'Pastillas, discos y líquido' },
  { tipo: 'Alineación y balanceo',          h: 10000, p: 3, nota: 'Rotación de llantas incluida' },
  { tipo: 'Líquido de frenos',              h: 20000, p: 2, nota: 'O cada 2 años, lo primero' },
  { tipo: 'Revisión de suspensión',         h: 20000, p: 2, nota: 'Muelles, amortiguadores, rótulas' },
  { tipo: 'Revisión de batería',            h: 20000, p: 3, nota: 'Limpieza bornes y nivel' },
  { tipo: 'Revisión sistema turbo',         h: 20000, p: 2, nota: 'Dejar correr 3-5 min antes de apagar' },
  { tipo: 'Aceite caja y diferencial',      h: 40000, p: 2, nota: 'Aceite sintético 80W90 GL4' },
  { tipo: 'Líquido refrigerante',           h: 40000, p: 2, nota: 'O cada 2 años' },
  { tipo: 'Cambio de llantas',              h: 45000, p: 3, nota: 'Verificar desgaste en cada alineación' },
  { tipo: 'Correa de distribución',         h: 60000, p: 1, nota: '⚠ CRÍTICO — rotura destruye el motor' },
]

const JAC_INTERVALS = [
  { tipo: 'Cambio de aceite + filtro',      h: 5000,  p: 1, nota: 'Aceite CK-4 5W30 o 15W40. JAC oficial' },
  { tipo: 'Filtro de aire',                 h: 10000, p: 2, nota: 'Motor turbo diésel — filtro limpio crítico' },
  { tipo: 'Filtro de combustible',          h: 10000, p: 2, nota: 'Drenar separadores de agua en cada revisión' },
  { tipo: 'Revisión de frenos',             h: 15000, p: 2, nota: 'Discos delanteros + tambores traseros. 6 llantas' },
  { tipo: 'Alineación y balanceo',          h: 10000, p: 3, nota: 'Rotación de las 6 llantas' },
  { tipo: 'Líquido de frenos',              h: 20000, p: 2, nota: 'O cada 2 años' },
  { tipo: 'Revisión de suspensión',         h: 20000, p: 2, nota: 'Suspensión delantera independiente + muelles' },
  { tipo: 'Revisión de batería',            h: 20000, p: 3, nota: 'Limpieza bornes y alternador' },
  { tipo: 'Revisión sistema turbo',         h: 20000, p: 2, nota: 'Intercooler — dejar enfriar antes de apagar' },
  { tipo: 'Aceite caja y diferencial',      h: 40000, p: 2, nota: 'Diferencial trasero incluido' },
  { tipo: 'Líquido refrigerante',           h: 40000, p: 2, nota: 'O cada 2 años' },
  { tipo: 'Cambio de llantas',              h: 45000, p: 3, nota: '6 llantas — verificar desgaste irregular' },
  { tipo: 'Inspección cadena distribución', h: 80000, p: 2, nota: 'JAC X200 tiene cadena (no correa) — inspección a 80k' },
]

export function getIntervals(vehicle) {
  const m = (vehicle?.marca || '').toUpperCase()
  if (m.includes('JMC')) return JMC_INTERVALS
  if (m.includes('JAC')) return JAC_INTERVALS
  return JMC_INTERVALS
}

export function calcPredictive(vehicle, maintenances = []) {
  const km = vehicle?.km_actual || 0
  return getIntervals(vehicle).map(item => {
    const last = maintenances
      .filter(m => m.tipo === item.tipo)
      .sort((a, b) => (b.km_al_momento || 0) - (a.km_al_momento || 0))[0]
    const lastKm  = last?.km_al_momento || 0
    const nextKm  = lastKm + item.h
    const remaining = nextKm - km
    const pct     = Math.min(100, Math.round((km - lastKm) / item.h * 100))
    const estado  = remaining <= 0 ? 'danger' : remaining <= item.h * 0.15 ? 'warn' : 'ok'
    return { ...item, lastKm, nextKm, remaining, pct, estado }
  })
}

// ─── Selladora predictivo ─────────────────────────────────────────────────────
export function calcSelladoPredictive(machine, maintenances = []) {
  const hActual = machine?.horometro_actual || 0
  const items = [
    { tipo: 'Cambio de aceite',         intervalo: 100,  unidad: 'h',    p: 1 },
    { tipo: 'Mantenimiento preventivo', intervalo: 4380, unidad: 'h',    p: 1, nota: 'Cada 6 meses (~4.380h calendario)' },
    { tipo: 'Revisión de boquillas',    intervalo: 200,  unidad: 'h',    p: 2 },
    { tipo: 'Limpieza del sistema',     intervalo: 50,   unidad: 'h',    p: 3 },
  ]
  return items.map(item => {
    const last = maintenances
      .filter(m => m.tipo === item.tipo)
      .sort((a, b) => (b.horometro || 0) - (a.horometro || 0))[0]
    const lastH   = last?.horometro || 0
    const nextH   = lastH + item.intervalo
    const remaining = nextH - hActual
    const pct     = Math.min(100, Math.round((hActual - lastH) / item.intervalo * 100))
    const estado  = remaining <= 0 ? 'danger' : remaining <= item.intervalo * 0.15 ? 'warn' : 'ok'
    return { ...item, lastH, nextH, remaining, pct, estado }
  })
}

// ─── SATRACK email parser ─────────────────────────────────────────────────────
export function parseSatrackEmail(text) {
  const results = []
  const dateMatch = text.match(/(\d{1,2})\s+de\s+(\w+)\s+(\d{4})/)
  let fecha = new Date().toISOString().split('T')[0]
  if (dateMatch) {
    const meses = { enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12 }
    const m = meses[dateMatch[2].toLowerCase()]
    if (m) fecha = `${dateMatch[3]}-${String(m).padStart(2,'0')}-${String(dateMatch[1]).padStart(2,'0')}`
  }

  // Extrae km por placa: "JUZ621   84.0" o "QJX706   58.8"
  const kmMatches = text.matchAll(/([A-Z]{3}\d{3})\s+([\d.]+)/g)
  const kmData = {}
  for (const m of kmMatches) {
    if (!kmData[m[1]]) kmData[m[1]] = { km: parseFloat(m[2]) }
    else kmData[m[1]].excesos = parseInt(m[2])
  }

  for (const [placa, data] of Object.entries(kmData)) {
    results.push({ fecha, placa, km_dia: data.km || 0, excesos: data.excesos || 0 })
  }
  return results
}

// ─── Formatters ──────────────────────────────────────────────────────────────
export const fmtKm  = n => n == null ? '—' : n.toLocaleString('es-CO') + ' km'
export const fmtCOP = n => n == null ? '—' : '$ ' + Number(n).toLocaleString('es-CO')
export const fmtH   = n => n == null ? '—' : n.toLocaleString('es-CO') + ' h'
export const fmtDate = s => {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
}
export const daysUntil = s => s ? Math.round((new Date(s) - new Date()) / 86400000) : null
export const docStatus = d => d == null ? 'neutral' : d < 30 ? 'danger' : d < 90 ? 'warn' : 'ok'
export const today = () => new Date().toISOString().split('T')[0]
