// js/config.js
// Configuración e inicialización del cliente de Supabase para la Asociación Cristiana Un Encuentro con Jesús

const SUPABASE_URL = 'https://uwfdsuhrfuqlcsucbtts.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IFDwx-p7yBjRTfdAyllJYg_tiDvZ4jX';
const STORAGE_BUCKET = 'archivos-iglesia';

if (typeof window.supabase === 'undefined') {
  console.error('El script del SDK de Supabase no ha sido cargado. Asegúrate de incluir la librería CDN de Supabase.');
}

// Inicialización del cliente Supabase
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Exposición global segura
window.db = db;
window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  bucket: STORAGE_BUCKET
};

