-- Review workflow statuses for Paper Power 9 submissions.

update public.paper_power_nine_submissions
set status = 'submitted'
where status not in ('submitted', 'shortlisted', 'featured', 'declined');

alter table public.paper_power_nine_submissions
  drop constraint if exists paper_power_nine_submissions_status_check;
alter table public.paper_power_nine_submissions
  add constraint paper_power_nine_submissions_status_check
  check (status in ('submitted', 'shortlisted', 'featured', 'declined'));
