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
  if p_identifier is null
    or btrim(p_identifier) = ''
    or p_purpose is distinct from 'FORGOT_PASSWORD'
    or p_channel is null
    or p_channel not in ('sms', 'email')
    or p_otp_hash is null
    or p_otp_hash !~ '^[0-9a-f]{64}$'
    or p_password_hash is not null
    or p_registration_payload is not null then
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
    null,
    null,
    'pending',
    'not_applicable',
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
    password_hash = null,
    registration_payload = null,
    verification_status = 'pending',
    registration_status = 'not_applicable',
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

revoke all on function public.begin_auth_otp(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.begin_auth_otp(text, text, text, text, text, jsonb) to service_role;
