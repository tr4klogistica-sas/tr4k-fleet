import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { useVehicles, useKmLogs, useMaintenances, useCosts, useMachine, useMachineWork, useMachineMaintenances, useChatHistory } from './lib/hooks.js'
import { calcPredictive, daysUntil, docStatus } from './lib/logic.js'
import Sidebar from './components/Sidebar.jsx'
import { Spinner } from './components/UI.jsx'
import { Dashboard, Vehiculos, Mantenimiento } from './pages/Pages1.jsx'
import { KmVelocidad, Costos, Selladora } from './pages/Pages2.jsx'
import { ChatIA } from './pages/Chat.jsx'

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
        <div className="login-logo">TR<span>4</span>K</div>
        <div className="login-sub">Fleet OS · 2026</div>
        <div className="login-desc">Sistema de gestión de flota.<br />Uso interno TR4K Logística S.A.S.</div>
        <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14, marginTop: 8 }}
          onClick={signIn} disabled={loading}>
          {loading ? 'Iniciando...' : '🔐 Entrar con Google'}
        </button>
        {err && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)' }}>{err}</div>}
      </div>
    </div>
  )
}

// ── Per-vehicle data loader ───────────────────────────────────────────────────
function VLoader({ vehicleId, onData }) {
  const { logs }    = useKmLogs(vehicleId)
  const { records } = useMaintenances(vehicleId)
  const { costs }   = useCosts(vehicleId)
  useEffect(() => onData(vehicleId, { logs, records, costs }), [logs, records, costs])
  return null
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined)
  const [view, setView]       = useState('dashboard')
  const [selId, setSelId]     = useState(null)
  const [vData, setVData]     = useState({})

  const { vehicles, loading: vLoad, reload: reloadV } = useVehicles()
  const { machine, reload: reloadM }          = useMachine()
  const { work, reload: reloadW }             = useMachineWork()
  const { records: machineMaints }            = useMachineMaintenances()
  const { messages: chatHistory }             = useChatHistory()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (vehicles.length > 0 && !selId) setSelId(vehicles[0].id)
  }, [vehicles])

  function handleVData(id, data) {
    setVData(prev => {
      if (JSON.stringify(prev[id]) === JSON.stringify(data)) return prev
      return { ...prev, [id]: data }
    })
  }

  async function handleSaved(newId) {
    await reloadV()
    if (newId && typeof newId === 'string') setSelId(newId)
  }

  if (session === undefined) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><Spinner /></div>
  if (!session) return <Login />
  if (vLoad) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><Spinner /></div>

  const allKm    = Object.fromEntries(vehicles.map(v => [v.id, vData[v.id]?.logs    || []]))
  const allMaint = Object.fromEntries(vehicles.map(v => [v.id, vData[v.id]?.records || []]))
  const allCosts = Object.fromEntries(vehicles.map(v => [v.id, vData[v.id]?.costs   || []]))

  const alertCount = vehicles.reduce((a, v) => {
    const pred = calcPredictive(v, allMaint[v.id] || [])
    const docAlerts = [v.soat, v.tecno].filter(d => { const dd = daysUntil(d); return dd !== null && dd < 30 }).length
    return a + pred.filter(p => p.estado !== 'ok').length + docAlerts
  }, 0)

  const selVehicle = vehicles.find(v => v.id === selId)

  function renderView() {
    switch (view) {
      case 'dashboard':     return <Dashboard vehicles={vehicles} allMaint={allMaint} allKm={allKm} onNav={setView} onSel={setSelId} />
      case 'vehiculos':     return <Vehiculos vehicle={selVehicle || null} maintenances={allMaint[selId]||[]} costs={allCosts[selId]||[]} onSaved={handleSaved} />
      case 'mantenimiento': return <Mantenimiento vehicles={vehicles} allMaint={allMaint} selId={selId} />
      case 'kms':           return <KmVelocidad vehicles={vehicles} allKm={allKm} selId={selId} />
      case 'costos':        return <Costos vehicles={vehicles} allMaint={allMaint} allCosts={allCosts} />
      case 'selladora':     return <Selladora machine={machine} work={work} machineMaints={machineMaints} onSaved={() => { reloadM(); reloadW() }} />
      case 'chat':          return <ChatIA vehicles={vehicles} allMaint={allMaint} allKm={allKm} allCosts={allCosts} machine={machine} work={work} machineMaints={machineMaints} chatHistory={chatHistory} />
      default:              return null
    }
  }

  return (
    <div className="app">
      {vehicles.map(v => <VLoader key={v.id} vehicleId={v.id} onData={handleVData} />)}
      <Sidebar
        view={view} onNav={setView}
        vehicles={vehicles} selId={selId}
        onSel={id => { setSelId(id); setView('vehiculos') }}
        alertCount={alertCount}
        onSignOut={() => supabase.auth.signOut()}
      />
      <div className="main">{renderView()}</div>
    </div>
  )
}
