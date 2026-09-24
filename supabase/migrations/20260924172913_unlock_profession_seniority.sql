-- Seniority is always user-controlled, including roles whose title already
-- contains Senior, Lead or Supervisor.
update public.monitored_professions
set seniority_locked = false,
    updated_at = now()
where seniority_locked = true;
