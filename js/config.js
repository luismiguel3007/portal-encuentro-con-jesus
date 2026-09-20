// js/config.js
// Configuración e inicialización de Supabase y Cloudflare R2

const SUPABASE_URL = 'https://uwfdsuhrfuqlcsucbtts.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IFDwx-p7yBjRTfdAyllJYg_tiDvZ4jX';

if (typeof window.supabase === 'undefined') {
  console.error('El script del SDK de Supabase no ha sido cargado.');
}

// Inicialización del cliente Supabase
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Exposición global segura
window.db = db;
window.SUPABASE_CONFIG = {
  url: SUPABASE_URL
};

// CONFIGURACIÓN CLOUDFLARE R2 (Segura: autenticación gestionada vía Bearer JWT de Supabase)
window.R2_CONFIG = {
  workerUrl: 'https://r2-iglesia-api.luismi-lmas75.workers.dev',
  publicUrl: 'https://pub-9b1857fb52164101a7bcecbfeb41ef8f.r2.dev'
};