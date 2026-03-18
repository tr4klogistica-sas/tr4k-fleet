import React, { useRef } from 'react'

export function Modal({ title, onClose, onSave, saveLabel = 'Guardar', children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { width: 620 } : {}}>
        <div className="modal-title">{title}</div>
        {children}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children, full }) {
  return (
    <div className={`field${full ? ' form-full' : ''}`}>
      {label && <label>{label}</label>}
      {children}
    </div>
  )
}

export function ProgressBar({ pct, estado }) {
  const cls = estado === 'ok' ? 'fill-ok' : estado === 'warn' ? 'fill-warn' : 'fill-danger'
  return (
    <div className="progress">
      <div className={`progress-fill ${cls}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

export function Badge({ estado, children }) {
  const cls = { ok: 'badge-ok', warn: 'badge-warn', danger: 'badge-danger', neutral: 'badge-neutral' }[estado] || 'badge-neutral'
  return <span className={`badge ${cls}`}>{children}</span>
}

export function StatCard({ label, value, sub, badge, badgeEstado }) {
  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div className="stat-val">{value}</div>
      {sub && <div className="stat-label">{sub}</div>}
      {badge && <div style={{ marginTop: 6 }}><Badge estado={badgeEstado}>{badge}</Badge></div>}
    </div>
  )
}

export function VehiclePhoto({ photoUrl, onUpload, loading }) {
  const ref = useRef()
  return (
    <div className="vehicle-photo-wrap" onClick={() => ref.current?.click()}>
      {photoUrl
        ? <img src={photoUrl} alt="Vehículo" />
        : <div className="photo-placeholder">
            <span style={{ fontSize: 36 }}>🚛</span>
            <span style={{ fontSize: 12 }}>Subir foto del vehículo</span>
          </div>
      }
      <div className="photo-upload-overlay">{loading ? 'Subiendo...' : '📷 Cambiar foto'}</div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
    </div>
  )
}

export function InfoRow({ label, value, badge, badgeEstado }) {
  return (
    <div className="info-row">
      <span className="info-key">{label}</span>
      {badge
        ? <Badge estado={badgeEstado}>{value}</Badge>
        : <span className="info-val">{value || '—'}</span>
      }
    </div>
  )
}

export function Empty({ icon = '📋', title, sub, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, marginBottom: 16 }}>{sub}</div>}
      {action}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--border)',
        borderTopColor: 'var(--gold)', borderRadius: '50%',
        animation: 'spin .7s linear infinite'
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      {action}
    </div>
  )
}
