-- Ejecutar después de 001_initial_schema.sql. Conserva todos los resultados existentes.
begin;
alter table public.pw_results add column if not exists game_password text;
alter table public.pw_results add column if not exists character_count integer;
alter table public.pw_leaderboard add column if not exists game_password text;
alter table public.pw_leaderboard add column if not exists character_count integer;

-- Las versiones anteriores del juego siguen funcionando: al mejorar una marca sin
-- detalles, se limpian los detalles anteriores para no asociarlos al tiempo equivocado.
create or replace function public.pw_submit(p_competition uuid, p_game uuid, p_duration bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.pw_competitions; p public.pw_participants; r public.pw_results; b public.pw_leaderboard;
begin
    if auth.uid() is null then raise exception 'Tu sesión venció. Recargá para recuperarla.'; end if;
    -- El cierre y las victorias se serializan: no se acepta una victoria nueva después del cierre.
    select * into c from public.pw_competitions where id = p_competition for update;
    if not found then raise exception 'Competencia inexistente.'; end if;
    select * into p from public.pw_participants where competition_id = p_competition and user_id = auth.uid() for update;
    if not found then raise exception 'No estás inscripto en esta competencia.'; end if;
    select * into b from public.pw_leaderboard where participant_id = p.id;
    select * into r from public.pw_results where game_id = p_game;
    if found then
        if r.participant_id <> p.id or r.competition_id <> p_competition or r.duration_ms <> p_duration then
            raise exception 'El identificador de partida ya fue utilizado.';
        end if;
        return jsonb_build_object('result', to_jsonb(r), 'summary', to_jsonb(b));
    end if;
    if c.status <> 'active' then raise exception 'La competencia está cerrada. Este resultado no fue registrado.'; end if;
    if b.completed >= c.max_attempts then raise exception 'Ya completaste todos tus intentos competitivos.'; end if;
    if b.last_completed_at > clock_timestamp() - interval '20 seconds' then
        raise exception 'Todavía está activo el cooldown de 20 segundos.';
    end if;
    insert into public.pw_results(game_id, participant_id, competition_id, duration_ms)
        values (p_game, p.id, p_competition, p_duration) returning * into r;
    update public.pw_leaderboard set
        game_password = case when best_ms is null or p_duration < best_ms then null else game_password end,
        character_count = case when best_ms is null or p_duration < best_ms then null else character_count end,
        best_ms = case when best_ms is null or p_duration < best_ms then p_duration else best_ms end,
        best_at = case when best_ms is null or p_duration < best_ms then r.completed_at else best_at end,
        completed = completed + 1, last_completed_at = r.completed_at
        where participant_id = p.id returning * into b;
    return jsonb_build_object('result', to_jsonb(r), 'summary', to_jsonb(b));
end;
$$;

-- Reutiliza la operación original y sus controles de permisos, límite, cierre y cooldown.
create or replace function public.pw_submit_details(p_competition uuid, p_game uuid, p_duration bigint, p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare response jsonb; r public.pw_results; b public.pw_leaderboard; n integer;
begin
    if p_password is null or char_length(p_password) not between 1 and 10000 then
        raise exception 'La contraseña del juego debe tener entre 1 y 10000 caracteres.';
    end if;
    response := public.pw_submit(p_competition, p_game, p_duration);
    select * into r from public.pw_results where game_id = p_game;
    if r.game_password is not null and r.game_password <> p_password then
        raise exception 'La partida ya fue registrada con otra contraseña.';
    end if;
    -- Coincide con String.length del contador original, incluso con emojis (UTF-16).
    select sum(case when ascii(ch) > 65535 then 2 else 1 end)::integer into n
        from regexp_split_to_table(p_password, '') as chars(ch);
    update public.pw_results set game_password = p_password, character_count = n
        where game_id = p_game returning * into r;
    -- La contraseña y el contador siempre pertenecen a la marca que define la posición.
    update public.pw_leaderboard set game_password = p_password, character_count = n
        where participant_id = r.participant_id and best_ms = r.duration_ms and best_at = r.completed_at;
    select * into b from public.pw_leaderboard where participant_id = r.participant_id;
    return jsonb_build_object('result', to_jsonb(r), 'summary', to_jsonb(b));
end;
$$;
revoke all on function public.pw_submit_details(uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.pw_submit_details(uuid, uuid, bigint, text) to authenticated;
commit;
