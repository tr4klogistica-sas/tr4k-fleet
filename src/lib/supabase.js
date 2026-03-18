// ─── REEMPLAZA ESTOS DOS VALORES CON LOS DE TU PROYECTO SUPABASE ────────────
// Ve a: supabase.com → Tu proyecto → Settings → API
const SUPABASE_URL = 'https://zmkhrhevguytxnlivpoa.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpta2hyaGV2Z3V5dHhubGl2cG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjgyNjAsImV4cCI6MjA4OTQ0NDI2MH0.iQmf0zKpPI526RS8apFSLbI3p5Vy8aYwgWKtX9uhZXg'
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── SQL para correr en Supabase → SQL Editor ────────────────────────────────
// Copia y pega esto en Supabase → SQL Editor → Run
/*
-- Vehículos
create table vehicles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  placa text,
  marca text,
  modelo text,
  ano integer,
  color_vehiculo text,
  color_indicador text default '#185FA5',
  km_actual integer default 0,
  km_compra integer default 0,
  photo_url text,
  conductor text,
  conductor_cedula text,
  conductor_tel text,
  salario integer,
  dotacion_fecha date,
  contrato_vence date,
  soat date,
  tecno date,
  seguro date,
  tarjeta_propiedad text
);

-- Km diarios
create table km_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  fecha date not null,
  km_inicio integer,
  km_fin integer,
  km_dia integer,
  conductor text
);

-- Mantenimientos
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
  tipo text,
  descripcion text,
  monto integer
);

-- Storage bucket para fotos
insert into storage.buckets (id, name, public) values ('vehicles', 'vehicles', true);

-- RLS: solo el owner puede acceder (reemplaza con tu email)
alter table vehicles enable row level security;
alter table km_logs enable row level security;
alter table maintenances enable row level security;
alter table costs enable row level security;

create policy "owner_only" on vehicles for all using (auth.email() = 'TU_EMAIL@gmail.com');
create policy "owner_only" on km_logs for all using (auth.email() = 'TU_EMAIL@gmail.com');
create policy "owner_only" on maintenances for all using (auth.email() = 'TU_EMAIL@gmail.com');
create policy "owner_only" on costs for all using (auth.email() = 'TU_EMAIL@gmail.com');

create policy "owner_storage" on storage.objects for all using (auth.email() = 'TU_EMAIL@gmail.com');
*/
