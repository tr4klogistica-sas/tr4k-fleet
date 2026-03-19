import React, { useRef } from 'react'

export function Modal({ title, onClose, onSave, saveLabel = 'Guardar', children, wide }) {
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`}>
        <div className="modal-title">{title}</div>
        {children}
        <div className="modal-footer">
          <button className="btn btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn btn-p" onClick={onSave}>{saveLabel}</button>
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

export function Badge({ type = 'neu', children }) {
  return <span className={`badge b-${type}`}>{children}</span>
}

export function ProgBar({ pct, estado }) {
  const cls = { ok: 'pf-ok', warn: 'pf-warn', danger: 'pf-danger' }[estado] || 'pf-ok'
  return (
    <div className="prog">
      <div className={`prog-fill ${cls}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

export function MaintRow({ item, color }) {
  const cls = { ok: 'maint-ok', warn: 'maint-warn', danger: 'maint-danger' }[item.estado]
  const dotColor = { ok: 'var(--green)', warn: 'var(--amber)', danger: 'var(--red)' }[item.estado]
  const icon = { ok: '✓', warn: '↑', danger: '⚠' }[item.estado]

  let sub = ''
  if (item.estado === 'ok') {
    sub = item.lastKm ? `Último a ${item.lastKm.toLocaleString('es-CO')} km · faltan ${item.remaining.toLocaleString('es-CO')} km` : `En ${item.remaining.toLocaleString('es-CO')} km`
  } else if (item.estado === 'warn') {
    sub = `Próximo en ${item.remaining.toLocaleString('es-CO')} km`
  } else {
    sub = `Vencido hace ${Math.abs(item.remaining).toLocaleString('es-CO')} km`
  }

  return (
    <div className={`maint-row ${cls}`}>
      <div className="maint-dot" style={{ background: dotColor }} />
      <div className="maint-info">
        <div className="maint-tipo">{icon} {item.tipo}</div>
        <div className="maint-sub">{sub}</div>
        {item.lastKm > 0 && <ProgBar pct={item.pct} estado={item.estado} />}
      </div>
    </div>
  )
}

export function InfoRow({ label, value, badge, badgeType }) {
  return (
    <div className="info-row">
      <span className="info-key">{label}</span>
      {badge
        ? <Badge type={badgeType}>{value}</Badge>
        : <span className="info-val">{value || '—'}</span>
      }
    </div>
  )
}

export function PhotoUpload({ photoUrl, onUpload, loading }) {
  const ref = useRef()
  return (
    <div className="photo-wrap" onClick={() => ref.current?.click()}>
      {photoUrl
        ? <img src={photoUrl} alt="Vehículo" />
        : <div className="photo-ph"><span>🚛</span>Subir foto</div>
      }
      <div className="photo-ov">{loading ? 'Subiendo...' : '📷 Cambiar foto'}</div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
    </div>
  )
}

export function Empty({ icon = '📋', title, sub, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action}
    </div>
  )
}

export function Spinner() {
  return <div className="spinner"><div className="spin" /></div>
}

export function StatCard({ label, value, sub, badge, badgeType }) {
  return (
    <div className="card">
      <div className="card-t">{label}</div>
      <div className="kpi-val">{value}</div>
      {sub && <div className="kpi-label">{sub}</div>}
      {badge && <div style={{ marginTop: 6 }}><Badge type={badgeType}>{badge}</Badge></div>}
    </div>
  )
}
