# TR4K Fleet OS — Supabase Edition

Sistema de gestión de flota para TR4K Logística S.A.S.
Stack: React + Vite + Supabase (DB + Storage + Auth) + Vercel

---

## ⚡ Setup completo (25 minutos)

### 1. Crea el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Nombre: `tr4k-fleet` · Elige una contraseña segura · Región: `South America (São Paulo)`
3. Espera ~2 minutos mientras se crea

### 2. Crea las tablas (SQL)

En tu proyecto Supabase → **SQL Editor** → **New query** → pega y ejecuta:

```sql
-- Vehículos
create table vehicles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  placa text, marca text, modelo text, ano integer,
  color_vehiculo text, color_indicador text default '#185FA5',
  km_actual integer default 0, km_compra integer default 0,
  photo_url text,
  conductor text, conductor_cedula text, conductor_tel text,
  salario integer, dotacion_fecha date, contrato_vence date,
  soat date, tecno date, seguro date, tarjeta_propiedad text
);

-- Km diarios
create table km_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  fecha date not null,
  km_inicio integer, km_fin integer, km_dia integer, conductor text
);

-- Mantenimientos
create table maintenances (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  fecha date not null,
  tipo text not null, km_al_momento integer,
  costo integer, taller text, notas text
);

-- Costos operativos
create table costs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  fecha date not null,
  tipo text, descripcion text, monto integer
);
```

### 3. Crea el bucket de Storage

En Supabase → **Storage** → **New bucket**
- Nombre: `vehicles`
- Public bucket: ✅ activado
- Clic en **Create bucket**

### 4. Configura Row Level Security (solo tú accedes)

SQL Editor → nueva query → reemplaza el email y ejecuta:

```sql
-- Activa RLS
alter table vehicles enable row level security;
alter table km_logs enable row level security;
alter table maintenances enable row level security;
alter table costs enable row level security;

-- Solo tu email puede leer/escribir (reemplaza con tu email de Google)
create policy "owner" on vehicles for all using (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');
create policy "owner" on km_logs for all using (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');
create policy "owner" on maintenances for all using (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');
create policy "owner" on costs for all using (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');
```

Para Storage → **Storage** → **Policies** → **New policy** → For full customization:
```sql
create policy "owner_storage" on storage.objects for all using (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');
```

### 5. Activa Google Auth en Supabase

1. Supabase → **Authentication** → **Providers** → **Google** → Enable
2. En [console.cloud.google.com](https://console.cloud.google.com):
   - Crea un proyecto → APIs & Services → Credentials → OAuth 2.0 Client
   - Authorized redirect URI: `https://TU_PROJECT.supabase.co/auth/v1/callback`
3. Copia Client ID y Client Secret → pégalos en Supabase → Google provider → Save

### 6. Pega tus credenciales en el código

Abre `src/lib/supabase.js`:

```js
const SUPABASE_URL = 'https://TU_PROJECT.supabase.co'   // ← Project Settings → API
const SUPABASE_ANON_KEY = 'eyJ...'                       // ← anon public key
```

### 7. Sube a GitHub

```bash
cd tr4k-supabase
git init
git add .
git commit -m "TR4K Fleet OS v1 - Supabase"
gh repo create tr4k-fleet --private --push --source=.
```

### 8. Deploy en Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importa `tr4k-fleet`
2. Framework: **Vite** (auto-detectado)
3. **Deploy** → ~1 minuto → tu URL: `tr4k-fleet.vercel.app`

### 9. Agrega tu URL a Supabase

Supabase → **Authentication** → **URL Configuration**:
- Site URL: `https://tr4k-fleet.vercel.app`
- Redirect URLs: `https://tr4k-fleet.vercel.app`

---

## 📱 Uso diario

| Tarea | Cómo |
|-------|------|
| Registrar km conductores | Dashboard o Km diarios → "+ Registrar km" |
| Agregar mantenimiento | Mantenimiento → "+ Registrar mantenimiento" |
| Ver hoja de vida | Sidebar → selecciona vehículo → Hoja de vida |
| Subir foto del carro | Hoja de vida → clic en el área de foto |
| Registrar costo (salario, dotación…) | Hoja de vida → "+ Costo" |
| Ver resumen de gastos | Sidebar → Costos |
| Ver alertas | Sidebar → Alertas (badge rojo) |

---

## 🆓 Plan gratuito Supabase incluye

- Base de datos PostgreSQL: 500MB
- Storage: 1GB (suficiente para muchas fotos de carros)
- Auth: ilimitado
- Edge Functions: 500k invocaciones/mes

Más que suficiente para 2-10 vehículos y varios años de datos.
