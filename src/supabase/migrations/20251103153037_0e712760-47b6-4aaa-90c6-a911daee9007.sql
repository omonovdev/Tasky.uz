-- Add new columns to tasks table for enhanced tracking
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS estimated_completion_hours integer,
ADD COLUMN IF NOT EXISTS decline_reason text,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS actual_completed_at timestamp with time zone;

-- Update RLS policies to allow anyone to create tasks (not just employers)
DROP POLICY IF EXISTS "Employers can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Employers can update tasks they created" ON public.tasks;
DROP POLICY IF EXISTS "Employers can delete tasks they created" ON public.tasks;
DROP POLICY IF EXISTS "Employers can view all tasks they created" ON public.tasks;

-- Create new unified policies for tasks
CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Task creators can update their tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = assigned_by);

CREATE POLICY "Task creators can delete their tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (auth.uid() = assigned_by);

CREATE POLICY "Task creators can view tasks they created"
ON public.tasks
FOR SELECT
TO authenticated
USING (auth.uid() = assigned_by);

-- Update task assignments policies
DROP POLICY IF EXISTS "Employers can create task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Employers can delete task assignments" ON public.task_assignments;

CREATE POLICY "Task creators can create assignments"
ON public.task_assignments
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks
  WHERE tasks.id = task_assignments.task_id
  AND tasks.assigned_by = auth.uid()
));

CREATE POLICY "Task creators can delete assignments"
ON public.task_assignments
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks
  WHERE tasks.id = task_assignments.task_id
  AND tasks.assigned_by = auth.uid()
));

-- Update organization policies to remove employer role checks
DROP POLICY IF EXISTS "Employers can add members to their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Employers can delete members from their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Employers can update members in their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Employers can view members in their organizations" ON public.organization_members;

CREATE POLICY "Organization creators can manage members"
ON public.organization_members
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizations
  WHERE organizations.id = organization_members.organization_id
  AND organizations.created_by = auth.uid()
));

-- Update organization invitations policies
DROP POLICY IF EXISTS "Employers can create invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Employers can view their invitations" ON public.organization_invitations;

CREATE POLICY "Organization creators can create invitations"
ON public.organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM organizations
  WHERE organizations.id = organization_invitations.organization_id
  AND organizations.created_by = auth.uid()
));

CREATE POLICY "Organization creators can view invitations"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizations
  WHERE organizations.id = organization_invitations.organization_id
  AND organizations.created_by = auth.uid()
));

-- Update subgroups policies
DROP POLICY IF EXISTS "Employers can create subgroups" ON public.subgroups;
DROP POLICY IF EXISTS "Employers can delete subgroups" ON public.subgroups;
DROP POLICY IF EXISTS "Employers can update subgroups" ON public.subgroups;

CREATE POLICY "Organization creators can create subgroups"
ON public.subgroups
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM organizations
  WHERE organizations.id = subgroups.organization_id
  AND organizations.created_by = auth.uid()
));

CREATE POLICY "Organization creators can delete subgroups"
ON public.subgroups
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizations
  WHERE organizations.id = subgroups.organization_id
  AND organizations.created_by = auth.uid()
));

CREATE POLICY "Organization creators can update subgroups"
ON public.subgroups
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM organizations
  WHERE organizations.id = subgroups.organization_id
  AND organizations.created_by = auth.uid()
));

-- Update subgroup_members policies
DROP POLICY IF EXISTS "Employers can manage subgroup members" ON public.subgroup_members;

CREATE POLICY "Organization creators can manage subgroup members"
ON public.subgroup_members
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM subgroups
  WHERE subgroups.id = subgroup_members.subgroup_id
  AND EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = subgroups.organization_id
    AND organizations.created_by = auth.uid()
  )
));

-- Update task_subgroup_assignments policies
DROP POLICY IF EXISTS "Employers can manage task subgroup assignments" ON public.task_subgroup_assignments;

CREATE POLICY "Task creators can manage task subgroup assignments"
ON public.task_subgroup_assignments
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks
  WHERE tasks.id = task_subgroup_assignments.task_id
  AND tasks.assigned_by = auth.uid()
));

-- Update task_stages policies
DROP POLICY IF EXISTS "Employers can manage stages for tasks they created" ON public.task_stages;

CREATE POLICY "Task creators can manage stages"
ON public.task_stages
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks
  WHERE tasks.id = task_stages.task_id
  AND tasks.assigned_by = auth.uid()
));