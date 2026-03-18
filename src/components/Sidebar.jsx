import React from 'react'

const NAV = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '◈' },
  { id: 'hojavida',      label: 'Hoja de vida',   icon: '◉' },
  { id: 'mantenimiento', label: 'Mantenimiento',  icon: '◧' },
  { id: 'kms',           label: 'Km diarios',     icon: '◫' },
  { id: 'costos',        label: 'Costos',         icon: '◰' },
  { id: 'alertas',       label: 'Alertas',        icon: '◬' },
  { id: 'ia',            label: 'Diagnóstico IA', icon: '◍' },
]

export default function Sidebar({ view, onNav, vehicles, selectedId, onSelect, alertCount, onSignOut }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">TR<span>4</span>K</div>
        <div className="logo-sub">Fleet OS · 2026</div>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Menú</div>
        {NAV.map(n => (
          <div key={n.id} className={`nav-item${view === n.id ? ' active' : ''}`} onClick={() => onNav(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
            {n.id === 'alertas' && alertCount > 0 && (
              <span style={{ marginLeft: 'auto', background: '#E24B4A', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, fontFamily: 'var(--mono)' }}>
                {alertCount}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Vehículos</div>
        <div className="vehicle-pills">
          {vehicles.map(v => (
            <div key={v.id} className={`vehicle-pill${selectedId === v.id ? ' active' : ''}`} onClick={() => onSelect(v.id)}>
              <div className="vehicle-pill-dot" style={{ background: v.color_indicador || '#185FA5' }} />
              <div className="vehicle-pill-info">
                <div className="vehicle-pill-plate">{v.placa || 'Sin placa'}</div>
                <div className="vehicle-pill-brand">{v.marca} {v.modelo}</div>
              </div>
            </div>
          ))}
          <div className="nav-item" style={{ marginTop: 6 }} onClick={() => onNav('hojavida')}>
            <span className="nav-icon">+</span> Nuevo vehículo
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="nav-item" onClick={onSignOut} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          <span className="nav-icon">⎋</span> Cerrar sesión
        </div>
      </div>
    </div>
  )
}
