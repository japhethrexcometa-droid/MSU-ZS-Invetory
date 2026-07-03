-- 00005_rotc_officer_access.sql
-- Add missing RLS SELECT policies so ROTC Officers can read data

create policy "All authenticated can view maintenance records"
  on public.maintenance_records for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view system settings"
  on public.system_settings for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view damage reports"
  on public.damage_reports for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view activity log"
  on public.activity_log for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view radio tracking"
  on public.radio_tracking for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view asset documents"
  on public.asset_documents for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view lost report evidence"
  on public.lost_report_evidence for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view damage report photos"
  on public.damage_report_photos for select
  using (auth.role() = 'authenticated');

-- Also, allow ROTC Officers to insert notifications to Logistics Officers
create policy "Authenticated can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');
