// Lee desde variables de entorno de Vercel (nunca más el problema de credenciales)
// En Vercel → Settings → Environment Variables agrega:
//   VITE_SUPABASE_URL = https://zmkhrhevguytxnlivpoa.supabase.co
//   VITE_SUPABASE_ANON_KEY = eyJhbGci...
import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_SUPABASE_URL
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY
const GROQ = import.meta.env.VITE_GROQ_API_KEY

if (!URL || !KEY) console.error('⚠ Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')

export const supabase = createClient(URL, KEY)
export const GROQ_KEY = GROQ
