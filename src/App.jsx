import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { useVehicles, useKmLogs, useMaintenances, useCosts } from './hooks/useSupabase.js'
import { calcPredictive } from './lib/predictive.js'
import Sidebar from './components/Sidebar.jsx'
import { Spinner } from './components/UI.jsx'
import { Dashboard, HojaVida, Mantenimiento, KmDiarios, Costos, Alertas, IAPredict } from './pages/Pages.jsx'

// ── Login ─────────────────────────────────────────────────────────────────────
function Login() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function signIn() {
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setErr(error.message); setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">TR<span style={{ color: 'var(--gold)' }}>4</span>K</div>
        <div className="login-sub">Fleet OS · 2026</div>
        <div className="login-desc">Sistema de gestión de flota.<br />Solo para uso interno de TR4K Logística.</div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14, marginTop: 8 }}
          onClick={signIn} disabled={loading}
        >
          {loading ? 'Iniciando sesión...' : '🔐 Entrar con Google'}
        </button>
        {err && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      </div>
    </div>
  )
}

// ── Per-vehicle data loader ───────────────────────────────────────────────────
function VehicleLoader({ vehicleId, onData }) {
  const { logs } = useKmLogs(vehicleId)
  const { records } = useMaintenances(vehicleId)
  const { costs } = useCosts(vehicleId)
  useEffect(() => { onData(vehicleId, { logs, records, costs }) }, [logs, records, costs])
  return null
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined)
  const [view, setView] = useState('dashboard')
  const [selectedId, setSelectedId] = useState(null)
  const [vehicleData, setVehicleData] = useState({}) // { [vehicleId]: { logs, records, costs } }

  const { vehicles, loading: vLoading, reload: reloadVehicles } = useVehicles()

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Select first vehicle by default
  useEffect(() => {
    if (vehicles.length > 0 && !selectedId) setSelectedId(vehicles[0].id)
  }, [vehicles])

  function handleVehicleData(id, data) {
    setVehicleData(prev => {
      const next = { ...prev, [id]: data }
      return JSON.stringify(next[id]) === JSON.stringify(prev[id]) ? prev : next
    })
  }

  if (session === undefined) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>
  if (!session) return <Login />
  if (vLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>

  const allKmLogs = Object.fromEntries(vehicles.map(v => [v.id, vehicleData[v.id]?.logs || []]))
  const allMaintenances = Object.fromEntries(vehicles.map(v => [v.id, vehicleData[v.id]?.records || []]))
  const allCosts = Object.fromEntries(vehicles.map(v => [v.id, vehicleData[v.id]?.costs || []]))

  const alertCount = vehicles.reduce((a, v) =>
    a + calcPredictive(v, allMaintenances[v.id] || []).filter(p => p.estado !== 'ok').length, 0)

  const selectedVehicle = vehicles.find(v => v.id === selectedId)

  async function handleVehicleSaved(newId) {
    await reloadVehicles()
    if (newId) setSelectedId(newId)
  }

  function renderView() {
    switch (view) {
      case 'dashboard': return <Dashboard vehicles={vehicles} allMaintenances={allMaintenances} allKmLogs={allKmLogs} onNav={setView} />
      case 'hojavida': return <HojaVida vehicle={selectedVehicle} maintenances={allMaintenances[selectedId] || []} costs={allCosts[selectedId] || []} onSaved={handleVehicleSaved} />
      case 'mantenimiento': return <Mantenimiento vehicles={vehicles} allMaintenances={allMaintenances} selectedId={selectedId} />
      case 'kms': return <KmDiarios vehicles={vehicles} allKmLogs={allKmLogs} selectedId={selectedId} />
      case 'costos': return <Costos vehicles={vehicles} allMaintenances={allMaintenances} allCosts={allCosts} />
      case 'alertas': return <Alertas vehicles={vehicles} allMaintenances={allMaintenances} />
      case 'ia': return <IAPredict vehicles={vehicles} allMaintenances={allMaintenances} allKmLogs={allKmLogs} />
      default: return null
    }
  }

  return (
    <div className="app-shell">
      {vehicles.map(v => (
        <VehicleLoader key={v.id} vehicleId={v.id} onData={handleVehicleData} />
      ))}
      <Sidebar
        view={view} onNav={setView}
        vehicles={vehicles} selectedId={selectedId}
        onSelect={id => { setSelectedId(id); setView('hojavida') }}
        alertCount={alertCount}
        onSignOut={() => supabase.auth.signOut()}
      />
      <div className="main">{renderView()}</div>
    </div>
  )
}
