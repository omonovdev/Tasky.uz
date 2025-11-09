-- Add agreement_text column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS agreement_text TEXT;

-- Create organization_invitations table
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, employee_id)
);

-- Enable RLS on organization_invitations
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Employers can create invitations for their organizations
CREATE POLICY "Employers can create invitations"
ON public.organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'employer'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_invitations.organization_id
    AND created_by = auth.uid()
  )
);

-- Employers can view invitations for their organizations
CREATE POLICY "Employers can view their invitations"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_invitations.organization_id
    AND created_by = auth.uid()
  )
);

-- Employees can view their own invitations
CREATE POLICY "Employees can view their invitations"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Employees can update their own invitations (accept/decline)
CREATE POLICY "Employees can update their invitations"
ON public.organization_invitations
FOR UPDATE
TO authenticated
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- Fix delete policy for task_stages to allow employees to delete
DROP POLICY IF EXISTS "Employers can manage stages for tasks they created" ON public.task_stages;

CREATE POLICY "Employers can manage stages for tasks they created"
ON public.task_stages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = task_stages.task_id
    AND assigned_by = auth.uid()
  )
);

CREATE POLICY "Employees can delete stages for their tasks"
ON public.task_stages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignments
    WHERE task_id = task_stages.task_id
    AND user_id = auth.uid()
  )
);