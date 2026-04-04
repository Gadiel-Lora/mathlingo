import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[auth] Cuidado: Faltan credenciales de Supabase en el .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado. Falta token de autenticación.' });
    }

    const token = authHeader.split(' ')[1];
    
    // getUser valida remotamente el JWT contra Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[auth] Error validando token:', error?.message);
      return res.status(401).json({ error: 'Token inválido, manipulado o expirado.' });
    }

    // Guardamos la información del usuario en la request
    req.user = user;
    next();
  } catch (error) {
    console.error('[auth] Error interno de autenticación:', error);
    res.status(500).json({ error: 'Error interno verificando la sesión.' });
  }
};
