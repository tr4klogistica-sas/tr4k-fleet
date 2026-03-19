# TR4K Fleet OS v2.0 — README

## Stack
React + Vite · Supabase (DB + Storage + Auth) · Groq IA (gratis) · Vercel

---

## 1. Variables de entorno en Vercel (NUNCA más el problema de credenciales)

En Vercel → tu proyecto → Settings → Environment Variables → agrega:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://zmkhrhevguytxnlivpoa.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (tu anon key) |
| `VITE_GROQ_API_KEY` | tu clave de groq (ver paso 4) |

Luego en Vercel → Deployments → Redeploy.

---

## 2. SQL — corre en Supabase → SQL Editor

```sql
-- Vehículos
create table vehicles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  placa text, marca text, modelo text, ano integer,
  color_vehiculo text, color_indicador text default '#0A84FF',
  km_actual integer default 0, km_compra integer default 0,
  photo_url text,
  conductor text, conductor_cedula text, conductor_tel text,
  salario integer, dotacion_fecha date, contrato_vence date,
  soat date, tecno date, seguro date, tarjeta_propiedad text
);

-- Km diarios (SATRACK)
create table km_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  fecha date not null,
  km_dia integer default 0,
  excesos integer default 0,
  km_inicio integer,
  km_fin integer,
  unique(vehicle_id, fecha)
);

-- Mantenimientos flota
create table maintenances (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  fecha date not null,
  tipo text not null,
  km_al_momento integer,
  costo integer,
  taller text,
  notas text
);

-- Costos operativos
create table costs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  fecha date not null,
  tipo text, descripcion text, monto integer
);

-- Selladora — máquina
create table machines (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  nombre text default 'Selladora de fisuras',
  horometro_actual numeric(10,1) default 0
);

-- Selladora — jornadas de trabajo
create table machine_work (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  fecha date not null,
  horas_trabajadas numeric(6,1) default 0,
  horometro_fin numeric(10,1),
  cajas_polibyt integer,
  km_lineales numeric(10,1),
  notas text
);

-- Selladora — mantenimientos
create table machine_maintenances (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  fecha date not null,
  tipo text not null,
  horometro numeric(10,1),
  costo integer,
  notas text
);

-- Chat IA — historial persistente
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  role text not null,
  content text not null,
  topic text default 'general'
);
```

---

## 3. Storage bucket

Supabase → Storage → New bucket → Nombre: `vehicles` → Public: ✅

---

## 4. RLS — solo tr4klogistica@gmail.com accede

```sql
alter table vehicles enable row level security;
alter table km_logs enable row level security;
alter table maintenances enable row level security;
alter table costs enable row level security;
alter table machines enable row level security;
alter table machine_work enable row level security;
alter table machine_maintenances enable row level security;
alter table chat_messages enable row level security;

create policy "owner" on vehicles for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
create policy "owner" on km_logs for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
create policy "owner" on maintenances for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
create policy "owner" on costs for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
create policy "owner" on machines for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
create policy "owner" on machine_work for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
create policy "owner" on machine_maintenances for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
create policy "owner" on chat_messages for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
```

Storage → Policies → new policy:
```sql
create policy "owner_storage" on storage.objects for all using (auth.jwt() ->> 'email' = 'tr4klogistica@gmail.com');
```

---

## 5. Groq API (IA gratis)

1. Ve a [console.groq.com](https://console.groq.com)
2. Crea cuenta gratis
3. API Keys → Create API Key → copia la clave
4. Agrégala en Vercel como `VITE_GROQ_API_KEY`

Groq es gratis: 6.000 tokens/minuto con Llama 3.1 70B. Sin tarjeta de crédito.

---

## 6. Gmail → reenvío automático SATRACK

1. Gmail → Settings → Filters → Create filter
2. From: `noti@satrack.com`
3. Forward to: tu email (o un webhook futuro)
4. Por ahora: copia el texto del email y usa "Importar email SATRACK" en la app

---

## 7. Subir a GitHub y Vercel

```bash
cd tr4k-final
git init && git add . && git commit -m "TR4K Fleet OS v2"
gh repo create tr4k-fleet --private --push --source=.
```

Vercel → Import → tr4k-fleet → Deploy
