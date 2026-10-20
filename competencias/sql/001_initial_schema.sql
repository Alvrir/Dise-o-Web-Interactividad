-- Ejecutar una vez en Supabase > SQL Editor. No contiene claves ni contraseñas.
begin;

create table public.pw_admins (
    user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.pw_admins enable row level security;

create function public.pw_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists(select 1 from public.pw_admins where user_id = auth.uid());
$$;

create table public.pw_competitions (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 1 and 100),
    status text not null default 'draft' check (status in ('draft','active','closed')),
    max_attempts integer not null default 2 check (max_attempts between 1 and 20),
    created_at timestamptz not null default now(),
    closed_at timestamptz,
    check ((status = 'closed') = (closed_at is not null))
);
create unique index pw_one_active on public.pw_competitions ((status)) where status = 'active';

create table public.pw_participants (
    id uuid primary key default gen_random_uuid(),
    competition_id uuid not null references public.pw_competitions(id),
    user_id uuid not null references auth.users(id),
    name text not null check (char_length(btrim(name)) between 1 and 40 and name !~ '[[:cntrl:]]'),
    created_at timestamptz not null default now(),
    unique (competition_id, user_id),
    unique (id, competition_id)
);

create table public.pw_results (
    game_id uuid primary key,
    participant_id uuid not null,
    competition_id uuid not null,
    duration_ms bigint not null check (duration_ms between 1 and 604800000),
    completed_at timestamptz not null default clock_timestamp(),
    foreign key (participant_id, competition_id) references public.pw_participants(id, competition_id)
);
create index pw_results_participant on public.pw_results(participant_id, duration_ms, completed_at);
create index pw_results_competition on public.pw_results(competition_id);

-- Proyección pública. Nunca incluye el ID de Auth, tokens ni el texto del juego.
create table public.pw_leaderboard (
    participant_id uuid primary key,
    competition_id uuid not null,
    name text not null,
    best_ms bigint,
    best_at timestamptz,
    completed integer not null default 0,
    last_completed_at timestamptz,
    foreign key (participant_id, competition_id) references public.pw_participants(id, competition_id)
);
create index pw_board_order on public.pw_leaderboard(competition_id, best_ms, best_at, participant_id);

alter table public.pw_competitions enable row level security;
alter table public.pw_participants enable row level security;
alter table public.pw_results enable row level security;
alter table public.pw_leaderboard enable row level security;
create policy pw_competitions_read on public.pw_competitions for select to anon, authenticated using (true);
create policy pw_board_read on public.pw_leaderboard for select to anon, authenticated using (true);
create policy pw_participant_own on public.pw_participants for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.pw_admins, public.pw_competitions, public.pw_participants, public.pw_results, public.pw_leaderboard from anon, authenticated;
grant select on public.pw_competitions, public.pw_leaderboard to anon, authenticated;
grant select on public.pw_participants to authenticated;

create function public.pw_create_competition(p_name text, p_max integer default 2) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
    if not public.pw_is_admin() then raise exception 'Operación reservada al administrador.'; end if;
    insert into public.pw_competitions(name, max_attempts) values (btrim(p_name), p_max) returning id into v_id;
    return v_id;
end;
$$;

create function public.pw_set_status(p_competition uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.pw_competitions;
begin
    if not public.pw_is_admin() then raise exception 'Operación reservada al administrador.'; end if;
    select * into c from public.pw_competitions where id = p_competition for update;
    if not found then raise exception 'Competencia inexistente.'; end if;
    if c.status = p_status then return; end if;
    if c.status = 'closed' or p_status not in ('active','closed') or p_status is null then
        raise exception 'No se puede realizar ese cambio de estado.';
    end if;
    update public.pw_competitions set status = p_status,
        closed_at = case when p_status = 'closed' then clock_timestamp() else null end
    where id = p_competition;
exception when unique_violation then
    raise exception 'Ya hay una competencia activa. Finalizala antes de activar otra.';
end;
$$;

create function public.pw_join(p_competition uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.pw_competitions; p public.pw_participants;
begin
    if auth.uid() is null then raise exception 'Se necesita una sesión para participar.'; end if;
    select * into c from public.pw_competitions where id = p_competition for update;
    if not found then raise exception 'Competencia inexistente.'; end if;
    select * into p from public.pw_participants where competition_id = p_competition and user_id = auth.uid();
    if found then return to_jsonb(p) - 'user_id'; end if;
    if c.status <> 'active' then raise exception 'Esta competencia no está abierta.'; end if;
    insert into public.pw_participants(competition_id, user_id, name)
        values (p_competition, auth.uid(), btrim(p_name)) returning * into p;
    insert into public.pw_leaderboard(participant_id, competition_id, name) values (p.id, p_competition, p.name);
    return to_jsonb(p) - 'user_id';
end;
$$;

create function public.pw_submit(p_competition uuid, p_game uuid, p_duration bigint) returns jsonb
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
        best_ms = case when best_ms is null or p_duration < best_ms then p_duration else best_ms end,
        best_at = case when best_ms is null or p_duration < best_ms then r.completed_at else best_at end,
        completed = completed + 1, last_completed_at = r.completed_at
        where participant_id = p.id returning * into b;
    return jsonb_build_object('result', to_jsonb(r), 'summary', to_jsonb(b));
end;
$$;

revoke all on function public.pw_is_admin(), public.pw_create_competition(text, integer), public.pw_set_status(uuid, text), public.pw_join(uuid, text), public.pw_submit(uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function public.pw_is_admin(), public.pw_create_competition(text, integer), public.pw_set_status(uuid, text), public.pw_join(uuid, text), public.pw_submit(uuid, uuid, bigint) to authenticated;

alter publication supabase_realtime add table public.pw_leaderboard, public.pw_competitions;
commit;
