-- open select policies to unblock UI

drop policy if exists org_members_select on public.organization_members;
create policy org_members_select on public.organization_members for select using (true);

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select using (true);

drop policy if exists task_assign_select on public.task_assignments;
create policy task_assign_select on public.task_assignments for select using (true);

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (true);
