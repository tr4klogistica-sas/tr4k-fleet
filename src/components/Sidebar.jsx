import React from 'react'

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',        icon: '◈' },
  { id: 'vehiculos',    label: 'Vehículos',         icon: '◉' },
  { id: 'mantenimiento',label: 'Mantenimiento',     icon: '◧' },
  { id: 'kms',          label: 'Km & velocidad',    icon: '◫' },
  { id: 'costos',       label: 'Costos',            icon: '◰' },
  { id: 'selladora',    label: 'Selladora',         icon: '◎' },
  { id: 'chat',         label: 'Chat IA',           icon: '◍' },
]

export default function Sidebar({ view, onNav, vehicles, selId, onSel, alertCount, onSignOut }) {
  return (
    <div className="sb">
      <div className="sb-logo">
        <div className="sb-mark">TR<span>4</span>K</div>
        <div className="sb-sub">Fleet OS · 2026</div>
      </div>

      <div className="sb-section">
        <div className="sb-label">Menú</div>
        {NAV.map(n => (
          <div key={n.id} className={`sb-item${view === n.id ? ' on' : ''}`} onClick={() => onNav(n.id)}>
            <span className="sb-icon">{n.icon}</span>
            {n.label}
            {n.id === 'chat' && (
              <span style={{ marginLeft: 'auto', background: 'var(--gold)', color: '#000', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, fontFamily: 'var(--mono)' }}>IA</span>
            )}
            {n.id === 'dashboard' && alertCount > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, fontFamily: 'var(--mono)' }}>{alertCount}</span>
            )}
          </div>
        ))}
      </div>

      <div className="sb-section">
        <div className="sb-label">Vehículos</div>
        {vehicles.map(v => (
          <div key={v.id} className={`vp${selId === v.id ? ' on' : ''}`} onClick={() => onSel(v.id)}>
            <div className="vp-dot" style={{ background: v.color_indicador || '#0A84FF' }} />
            <div>
              <div className="vp-plate">{v.placa || '—'}</div>
              <div className="vp-brand">{v.marca} {v.modelo}</div>
            </div>
          </div>
        ))}
        <div className="sb-item" style={{ marginTop: 4, opacity: .6 }} onClick={() => { onNav('vehiculos') }}>
          <span className="sb-icon">+</span> Nuevo vehículo
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: '1px solid var(--b)' }}>
        <div className="sb-item" style={{ opacity: .5 }} onClick={onSignOut}>
          <span className="sb-icon">⎋</span> Salir
        </div>
      </div>
    </div>
  )
}
