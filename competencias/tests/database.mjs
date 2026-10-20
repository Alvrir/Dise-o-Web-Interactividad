// Prueba local del SQL con PostgreSQL embebido. No verifica Auth ni Realtime de Supabase.
// node competencias/tests/database.mjs RUTA_A_NODE_MODULES_DE_PRUEBA
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(path.join(process.argv[2], '@electric-sql/pglite/dist/index.js')));
const db = new PGlite();
await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid', true), '')::uuid$$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
`);
const sql = await readFile(new URL('../sql/001_initial_schema.sql', import.meta.url), 'utf8');
await db.exec(sql.replace('alter publication supabase_realtime add table public.pw_leaderboard, public.pw_competitions;', '-- Realtime requiere Supabase.'));
const admin = '00000000-0000-4000-8000-000000000001', user = '00000000-0000-4000-8000-000000000002', other = '00000000-0000-4000-8000-000000000003';
await db.query('insert into auth.users values ($1),($2),($3)', [admin, user, other]);
await db.query('insert into public.pw_admins values ($1)', [admin]);
async function as(uid) {
    await db.exec('reset role');
    await db.query("select set_config('test.uid', $1, false)", [uid || '']);
    await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
}
async function scalar(sql, args = []) { return Object.values((await db.query(sql, args)).rows[0])[0]; }
let checks = 0;
async function denied(sql, args = []) { await assert.rejects(db.query(sql, args)); checks++; }
await as(admin);
assert.equal(await scalar('select public.pw_is_admin()'), true); checks++;
const c1 = await scalar("select public.pw_create_competition('Prueba',2)"), c2 = await scalar("select public.pw_create_competition('Otra',2)");
await db.query("select public.pw_set_status($1,'active')", [c1]);
await denied("select public.pw_set_status($1,'active')", [c2]);
await as(user);
assert.equal(await scalar('select public.pw_is_admin()'), false); checks++;
await denied("select public.pw_create_competition('Ataque',2)");
await denied("select public.pw_set_status($1,'closed')", [c1]);
const p1 = await scalar('select public.pw_join($1,$2)', [c1, '<Alva>']);
assert.equal((await scalar('select public.pw_join($1,$2)', [c1, 'Otro nombre'])).id, p1.id); checks++;
assert.equal(await scalar('select completed from public.pw_leaderboard where participant_id=$1', [p1.id]), 0); checks++;
await denied('insert into public.pw_results(game_id,participant_id,competition_id,duration_ms) values(gen_random_uuid(),$1,$2,1)', [p1.id,c1]);
await denied('update public.pw_leaderboard set best_ms=1');
await denied('select * from public.pw_admins');
const g1 = '10000000-0000-4000-8000-000000000001', g2 = '10000000-0000-4000-8000-000000000002', g3 = '10000000-0000-4000-8000-000000000003';
await denied('select public.pw_submit($1,$2,0)', [c1,g1]);
let receipt = await scalar('select public.pw_submit($1,$2,10000)', [c1,g1]);
assert.equal(receipt.summary.completed,1); checks++;
receipt = await scalar('select public.pw_submit($1,$2,10000)', [c1,g1]);
assert.equal(receipt.summary.completed,1); checks++;
await denied('select public.pw_submit($1,$2,999)', [c1,g1]);
await denied('select public.pw_submit($1,$2,9000)', [c1,g2]);
await db.exec('reset role');
await db.query("update public.pw_leaderboard set last_completed_at=now()-interval '21 seconds' where participant_id=$1",[p1.id]);
await as(user);
receipt = await scalar('select public.pw_submit($1,$2,9000)', [c1,g2]);
assert.equal(receipt.summary.completed,2); assert.equal(receipt.summary.best_ms,9000); checks+=2;
await denied('select public.pw_submit($1,$2,8000)', [c1,g3]);
await as(other);
const p2 = await scalar('select public.pw_join($1,$2)', [c1,'<Alva>']);
assert.notEqual(p1.id,p2.id); checks++;
assert.equal((await db.query('select * from public.pw_participants')).rows.length,1); checks++;
await denied('select public.pw_submit($1,$2,10000)', [c1,g1]);
await as(admin); await db.query("select public.pw_set_status($1,'closed')", [c1]);
await as(other); await denied('select public.pw_submit($1,$2,8000)', [c1,g3]);
await as(user); receipt = await scalar('select public.pw_submit($1,$2,10000)',[c1,g1]);
assert.equal(receipt.summary.completed,2); checks++;
await as(admin); await db.query("select public.pw_set_status($1,'active')", [c2]);
assert.equal(await scalar('select count(*)::integer from public.pw_leaderboard where competition_id=$1',[c2]),0); checks++;
assert.equal(await scalar('select count(*)::integer from public.pw_leaderboard where competition_id=$1',[c1]),2); checks++;
await as(null);
await denied('select public.pw_join($1,$2)',[c2,'Intruso']);
await denied('select * from public.pw_participants');
assert.equal((await db.query('select * from public.pw_leaderboard')).rows.length,2); checks++;
console.log(`${checks} verificaciones SQL correctas. Auth real, Realtime y concurrencia de red: pendientes de Supabase.`);
await db.close();
