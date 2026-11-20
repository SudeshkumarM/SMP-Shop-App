create table if not exists public.auth_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  purpose text not null check (purpose in ('REGISTRATION', 'FORGOT_PASSWORD')),
  channel text not null check (channel in ('sms', 'email')),
  otp_hash text not null,
  password_hash text,
  registration_payload jsonb,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'consumed', 'expired')),
  registration_status text not null default 'not_applicable'
    check (registration_status in ('pending', 'completed', 'not_applicable')),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  resend_count smallint not null default 0 check (resend_count between 0 and 4),
  last_sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identifier, purpose)
);

create index if not exists auth_otp_expiry_idx
  on public.auth_otp_verifications (expires_at);

alter table public.auth_otp_verifications enable row level security;
revoke all on public.auth_otp_verifications from public, anon, authenticated;
grant all on public.auth_otp_verifications to service_role;

create or replace function public.begin_auth_otp(
  p_identifier text,
  p_purpose text,
  p_channel text,
  p_otp_hash text,
  p_password_hash text default null,
  p_registration_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.auth_otp_verifications%rowtype;
  next_id uuid;
  next_resend_count smallint;
begin
  if p_purpose not in ('REGISTRATION', 'FORGOT_PASSWORD')
    or p_channel not in ('sms', 'email')
    or (p_purpose = 'REGISTRATION' and (p_channel <> 'sms' or p_password_hash is null or p_registration_payload is null))
    or (p_purpose = 'FORGOT_PASSWORD' and p_channel not in ('sms', 'email')) then
    raise exception using errcode = '22023', message = 'Invalid OTP request.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_identifier || ':' || p_purpose, 0)
  );

  select *
    into current_record
    from public.auth_otp_verifications
   where identifier = p_identifier and purpose = p_purpose
   for update;

  if found
    and current_record.expires_at > now()
    and current_record.verification_status in ('pending', 'verified') then
    if current_record.last_sent_at > now() - interval '45 seconds' then
      raise exception using
        errcode = 'P0001',
        message = 'OTP_RESEND_COOLDOWN:' ||
          ceil(extract(epoch from (current_record.last_sent_at + interval '45 seconds' - now())))::text;
    end if;

    if current_record.resend_count >= 4 then
      raise exception using errcode = 'P0001', message = 'OTP_RESEND_LIMIT';
    end if;

    next_resend_count := current_record.resend_count + 1;
  else
    next_resend_count := 0;
  end if;

  insert into public.auth_otp_verifications (
    identifier,
    purpose,
    channel,
    otp_hash,
    password_hash,
    registration_payload,
    verification_status,
    registration_status,
    attempts,
    resend_count,
    last_sent_at,
    expires_at,
    verified_at,
    completed_at
  ) values (
    p_identifier,
    p_purpose,
    p_channel,
    p_otp_hash,
    p_password_hash,
    p_registration_payload,
    'pending',
    case when p_purpose = 'REGISTRATION' then 'pending' else 'not_applicable' end,
    0,
    next_resend_count,
    now(),
    now() + interval '5 minutes',
    null,
    null
  )
  on conflict (identifier, purpose) do update set
    channel = excluded.channel,
    otp_hash = excluded.otp_hash,
    password_hash = excluded.password_hash,
    registration_payload = excluded.registration_payload,
    verification_status = 'pending',
    registration_status = excluded.registration_status,
    attempts = 0,
    resend_count = excluded.resend_count,
    last_sent_at = excluded.last_sent_at,
    expires_at = excluded.expires_at,
    verified_at = null,
    completed_at = null,
    updated_at = now()
  returning id into next_id;

  return next_id;
end;
$$;

create or replace function public.verify_auth_otp(
  p_otp_id uuid,
  p_otp_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.auth_otp_verifications%rowtype;
  next_attempts smallint;
begin
  select *
    into current_record
    from public.auth_otp_verifications
   where id = p_otp_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if current_record.verification_status = 'consumed' then
    return 'consumed';
  end if;

  if current_record.verification_status = 'expired' or current_record.expires_at <= now() then
    update public.auth_otp_verifications
       set verification_status = 'expired', updated_at = now()
     where id = p_otp_id;
    return 'expired';
  end if;

  if current_record.verification_status not in ('pending', 'verified') then
    return 'not_found';
  end if;

  if current_record.attempts >= 5 then
    update public.auth_otp_verifications
       set verification_status = 'expired', updated_at = now()
     where id = p_otp_id;
    return 'locked';
  end if;

  if current_record.otp_hash <> p_otp_hash then
    next_attempts := current_record.attempts + 1;
    update public.auth_otp_verifications
       set attempts = next_attempts,
           verification_status = case
             when next_attempts >= 5 then 'expired'
             else current_record.verification_status
           end,
           updated_at = now()
     where id = p_otp_id;
    return case when next_attempts >= 5 then 'locked' else 'invalid' end;
  end if;

  update public.auth_otp_verifications
     set verification_status = 'verified',
         verified_at = coalesce(verified_at, now()),
         updated_at = now()
   where id = p_otp_id;

  return 'verified';
end;
$$;

revoke all on function public.begin_auth_otp(text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.verify_auth_otp(uuid, text) from public, anon, authenticated;
grant execute on function public.begin_auth_otp(text, text, text, text, text, jsonb) to service_role;
grant execute on function public.verify_auth_otp(uuid, text) to service_role;
