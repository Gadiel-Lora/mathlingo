import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn('[auth] Cuidado: faltan credenciales de Supabase en el backend (.env)')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No autorizado. Falta token de autenticacion.' })
      return
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('[auth] Error validando token:', error?.message)
      res.status(401).json({ error: 'Token invalido, manipulado o expirado.' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    console.error('[auth] Error interno de autenticacion:', error)
    res.status(500).json({ error: 'Error interno verificando la sesion.' })
  }
}
