import React, { useState, useRef, useEffect } from 'react'
import { GROQ_KEY } from '../lib/supabase.js'
import { saveMessage } from '../lib/hooks.js'
import { fmtKm, fmtCOP, calcPredictive } from '../lib/logic.js'

const TOPICS = [
  { id: 'general',      label: 'General' },
  { id: 'flota',        label: 'Flota & km' },
  { id: 'mantenimiento',label: 'Mantenimiento' },
  { id: 'costos',       label: 'Costos' },
  { id: 'selladora',    label: 'Selladora' },
  { id: 'documentos',   label: 'Documentos' },
]

function buildContext(vehicles, allMaint, allKm, allCosts, machine, work, machineMaints) {
  const lines = ['Eres el asistente experto de TR4K Logística S.A.S. Conoces toda la flota, los mantenimientos, km, costos y la selladora. Responde en español, de forma clara y directa. Usa los datos reales para responder.', '']

  lines.push('=== FLOTA ===')
  vehicles.forEach(v => {
    const km = allKm[v.id] || []
    const maints = allMaint[v.id] || []
    const costs = allCosts[v.id] || []
    const pred = calcPredictive(v, maints)
    const avgKm = km.length ? Math.round(km.slice(0,30).reduce((a,l) => a+(l.km_dia||0),0) / Math.min(km.length,30)) : 0
    const urgent = pred.filter(p => p.estado !== 'ok')

    lines.push(`Vehículo: ${v.placa} · ${v.marca} ${v.modelo} ${v.ano}`)
    lines.push(`  Km actuales: ${v.km_actual?.toLocaleString('es-CO')} km`)
    lines.push(`  Conductor: ${v.conductor || 'No asignado'}`)
    lines.push(`  Km promedio diario: ${avgKm} km/día`)
    lines.push(`  SOAT vence: ${v.soat || 'No registrado'}`)
    lines.push(`  Tecnomecánica: ${v.tecno || 'No registrada'}`)
    if (urgent.length) {
      lines.push(`  Mantenimientos pendientes:`)
      urgent.forEach(p => lines.push(`    - ${p.tipo}: ${p.remaining > 0 ? `en ${p.remaining.toLocaleString('es-CO')} km` : `VENCIDO hace ${Math.abs(p.remaining).toLocaleString('es-CO')} km`}`))
    } else {
      lines.push(`  Mantenimientos: todos al día`)
    }
    if (maints.length) {
      lines.push(`  Últimos mantenimientos: ${maints.slice(0,3).map(m => `${m.tipo} (${m.fecha}, ${m.km_al_momento?.toLocaleString('es-CO')} km, $${m.costo?.toLocaleString('es-CO')})`).join(' | ')}`)
    }
    const totalCosts = costs.reduce((a,c) => a+(c.monto||0),0) + maints.reduce((a,m) => a+(m.costo||0),0)
    lines.push(`  Costo total acumulado: $${totalCosts.toLocaleString('es-CO')} COP`)
    if (km.length) lines.push(`  Último registro km: ${km[0]?.fecha} · ${km[0]?.km_dia} km · ${km[0]?.excesos || 0} excesos`)
    lines.push('')
  })

  if (machine) {
    lines.push('=== SELLADORA ===')
    lines.push(`Horómetro actual: ${machine.horometro_actual}h`)
    const totalCajas = work.reduce((a,w) => a+(w.cajas_polibyt||0), 0)
    const totalKmL   = work.reduce((a,w) => a+(w.km_lineales||0), 0)
    const rend = totalCajas > 0 && totalKmL > 0 ? (totalKmL/totalCajas).toFixed(1) : null
    lines.push(`Cajas Polibyt usadas total: ${totalCajas} (${totalCajas*21} kg)`)
    lines.push(`Km lineales sellados total: ${totalKmL}m`)
    if (rend) lines.push(`Rendimiento promedio: ${rend} metros por caja de 21kg`)
    if (machineMaints.length) lines.push(`Último mantenimiento: ${machineMaints[0]?.tipo} (${machineMaints[0]?.fecha}, ${machineMaints[0]?.horometro}h)`)
    lines.push(`Mantenimientos predictivos:`)
    const sp = calcPredictive ? [] : [] // uses calcSelladoPredictive from logic
    lines.push('')
  }

  lines.push('Fecha actual: ' + new Date().toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }))
  return lines.join('\n')
}

export function ChatIA({ vehicles, allMaint, allKm, allCosts, machine, work, machineMaints, chatHistory }) {
  const [msgs, setMsgs]       = useState(chatHistory || [])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [topic, setTopic]     = useState('general')
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  useEffect(() => { setMsgs(chatHistory || []) }, [chatHistory])

  const context = buildContext(vehicles, allMaint, allKm, allCosts, machine, work, machineMaints)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text, topic, created_at: new Date().toISOString() }
    setMsgs(p => [...p, userMsg])
    await saveMessage('user', text, topic)
    setLoading(true)

    const history = msgs.slice(-10).map(m => ({ role: m.role, content: m.content }))

    try {
      const key = GROQ_KEY || ''
      if (!key) throw new Error('NO_KEY')

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          max_tokens: 800,
          messages: [
            { role: 'system', content: context },
            ...history,
            { role: 'user', content: text }
          ]
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const reply = data.choices?.[0]?.message?.content || 'Sin respuesta'
      const aiMsg = { role: 'assistant', content: reply, topic, created_at: new Date().toISOString() }
      setMsgs(p => [...p, aiMsg])
      await saveMessage('assistant', reply, topic)

    } catch (e) {
      const errMsg = e.message === 'NO_KEY'
        ? 'Falta la clave GROQ. Agrega VITE_GROQ_API_KEY en Vercel → Settings → Environment Variables. Consíguela gratis en console.groq.com'
        : `Error: ${e.message}`
      setMsgs(p => [...p, { role: 'assistant', content: errMsg, topic, created_at: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  const filteredMsgs = topic === 'general' ? msgs : msgs.filter(m => !m.topic || m.topic === topic || m.topic === 'general')

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)' }}>
      <div className="topbar">
        <div>
          <div className="page-title">Chat IA · TR4K Expert</div>
          <div className="page-sub">Llama 3.1 70B via Groq · Sabe todo de tu flota · Historial persistente</div>
        </div>
        <button className="btn btn-g btn-sm" onClick={() => setMsgs([])}>Limpiar vista</button>
      </div>

      <div className="chat-topics">
        <span style={{ fontSize: 11, color: 'var(--t3)', alignSelf: 'center', marginRight: 4 }}>Tema:</span>
        {TOPICS.map(t => (
          <button key={t.id} className={`topic-btn${topic === t.id ? ' on' : ''}`} onClick={() => setTopic(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="chat-msgs">
        {filteredMsgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>Chat IA · TR4K Expert</div>
            <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
              Pregúntame cualquier cosa sobre tu flota.<br />Sé el km del último aceite, los excesos de velocidad, cuánto has gastado en cada carro y mucho más.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                '¿Cuándo le toca el aceite al JUZ621?',
                '¿Cuántos excesos ha tenido el QJX706?',
                '¿Cuánto he gastado en mantenimiento este año?',
                '¿Cuánto rinde una caja de Polibyt?',
                '¿Qué mantenimientos están vencidos?',
              ].map(s => (
                <button key={s} className="btn btn-g btn-sm" onClick={() => setInput(s)} style={{ fontSize: 11 }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {filteredMsgs.map((m, i) => (
          <div key={i} className={`msg msg-${m.role === 'user' ? 'user' : 'ai'}`}>
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="msg msg-ai">
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)', animation: 'pulse 1s infinite' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)', animation: 'pulse 1s infinite .2s' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)', animation: 'pulse 1s infinite .4s' }} />
            </div>
          </div>
        )}
        <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-wrap">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Pregunta sobre tu flota, mantenimientos, costos, selladora..."
          rows={1}
        />
        <button className="btn btn-p" onClick={send} disabled={loading || !input.trim()}>
          {loading ? '...' : '↑'}
        </button>
      </div>
    </div>
  )
}
