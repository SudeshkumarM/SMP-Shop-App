create table if not exists public.registration_captcha_challenges (
  id uuid primary key,
  answer_hash text not null check (answer_hash ~ '^[0-9a-f]{64}$'),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists registration_captcha_expiry_idx
  on public.registration_captcha_challenges (expires_at);

alter table public.registration_captcha_challenges enable row level security;
revoke all on public.registration_captcha_challenges from public, anon, authenticated;
grant all on public.registration_captcha_challenges to service_role;

create or replace function public.create_registration_captcha(
  p_challenge_id uuid,
  p_answer_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_challenge_id is null
    or p_answer_hash is null
    or p_answer_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid CAPTCHA challenge.';
  end if;

  delete from public.registration_captcha_challenges
   where expires_at < now() - interval '1 day';

  insert into public.registration_captcha_challenges (
    id,
    answer_hash,
    expires_at
  ) values (
    p_challenge_id,
    p_answer_hash,
    now() + interval '2 minutes'
  );

  return p_challenge_id;
end;
$$;

create or replace function public.verify_registration_captcha(
  p_challenge_id uuid,
  p_answer_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.registration_captcha_challenges%rowtype;
  next_attempts smallint;
begin
  select *
    into current_record
    from public.registration_captcha_challenges
   where id = p_challenge_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if current_record.consumed_at is not null then
    return 'consumed';
  end if;

  if current_record.expires_at <= now() then
    update public.registration_captcha_challenges
       set consumed_at = now(),
           answer_hash = repeat('0', 64)
     where id = p_challenge_id;
    return 'expired';
  end if;

  if current_record.attempts >= 5 then
    update public.registration_captcha_challenges
       set consumed_at = now(),
           answer_hash = repeat('0', 64)
     where id = p_challenge_id;
    return 'locked';
  end if;

  if p_answer_hash is distinct from current_record.answer_hash then
    next_attempts := current_record.attempts + 1;
    update public.registration_captcha_challenges
       set attempts = next_attempts,
           consumed_at = case when next_attempts >= 5 then now() else null end,
           answer_hash = case when next_attempts >= 5 then repeat('0', 64) else answer_hash end
     where id = p_challenge_id;
    return case when next_attempts >= 5 then 'locked' else 'invalid' end;
  end if;

  update public.registration_captcha_challenges
     set consumed_at = now(),
         answer_hash = repeat('0', 64)
   where id = p_challenge_id;

  return 'verified';
end;
$$;

revoke all on function public.create_registration_captcha(uuid, text) from public, anon, authenticated;
revoke all on function public.verify_registration_captcha(uuid, text) from public, anon, authenticated;
grant execute on function public.create_registration_captcha(uuid, text) to service_role;
grant execute on function public.verify_registration_captcha(uuid, text) to service_role;
