-- Content-origin attestation for published sets.
--
-- Every set published through Discover is redistributed by Qudoro, so the
-- publisher has to declare where the content came from. The client blocks
-- publishing without one (see src/utils/publishGuard.ts); this stores it and
-- keeps the shape honest at the database level.

alter table public.shared_sets
  add column if not exists attestation jsonb;

-- Legacy rows predate attestation and stay null — the UI renders those as
-- "unverified" rather than hiding them. But any attestation that *is* present
-- must carry a valid origin and an explicit confirmation.
alter table public.shared_sets
  drop constraint if exists shared_sets_attestation_shape;

alter table public.shared_sets
  add constraint shared_sets_attestation_shape check (
    attestation is null
    or (
      attestation ? 'origin'
      and attestation ->> 'origin' in ('original', 'licensed', 'public-domain', 'adapted')
      and (attestation ->> 'confirmed')::boolean is true
      -- Any origin other than "I wrote it" has to name its source.
      and (
        attestation ->> 'origin' = 'original'
        or coalesce(btrim(attestation ->> 'sourceNote'), '') <> ''
      )
    )
  );

-- Moderation queue: public sets shared without a declared origin are the
-- population most likely to be someone else's content.
create index if not exists idx_shared_sets_unattested
  on public.shared_sets (created_at desc)
  where visibility = 'public' and attestation is null;

comment on column public.shared_sets.attestation is
  'Publisher-declared content origin: { origin, sourceNote?, confirmed, attestedAt }. Null on sets published before attestation existed.';
