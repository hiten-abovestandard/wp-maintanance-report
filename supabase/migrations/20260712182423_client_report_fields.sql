alter table public.maintenance_reports
  add column if not exists client_top_note text not null default '',
  add column if not exists client_bottom_note text not null default '',
  add column if not exists client_report_status text not null default 'not_started'
    check (client_report_status in ('not_started', 'draft', 'sent'));
