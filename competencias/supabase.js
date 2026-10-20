import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

let clientPromise;
export function getClient() {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Falta configurar Supabase. Completá competencias/config.js (líneas 2 y 3).');
    }
    clientPromise ??= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm')
        .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { storageKey: 'password-competencias-auth', persistSession: true }
        })).catch(error => { clientPromise = null; throw error; });
    return clientPromise;
}

export async function rpc(name, args = {}) {
    const client = await getClient();
    const { data, error } = await client.rpc(name, args);
    if (error) throw error;
    return data;
}

export async function competition(id) {
    const client = await getClient();
    const { data, error } = await client.from('pw_competitions').select('*').eq('id', id).single();
    if (error) throw new Error('No se pudo encontrar la competencia o conectar con Supabase.');
    return data;
}

export async function board(id) {
    const client = await getClient();
    const { data, error } = await client.from('pw_leaderboard').select('*').eq('competition_id', id)
        .order('best_ms', { ascending: true, nullsFirst: false })
        .order('best_at').order('participant_id');
    if (error) throw error;
    return data;
}
