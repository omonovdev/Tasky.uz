-- Create subgroups table
CREATE TABLE public.subgroups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subgroup members table
CREATE TABLE public.subgroup_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subgroup_id UUID NOT NULL REFERENCES public.subgroups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subgroup assignments table for tasks
CREATE TABLE public.task_subgroup_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  subgroup_id UUID NOT NULL REFERENCES public.subgroups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroup_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subgroup_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for subgroups
CREATE POLICY "Organization members can view subgroups"
  ON public.subgroups FOR SELECT
  USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Employers can create subgroups"
  ON public.subgroups FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'employer'::app_role) AND
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Employers can update subgroups"
  ON public.subgroups FOR UPDATE
  USING (
    has_role(auth.uid(), 'employer'::app_role) AND
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Employers can delete subgroups"
  ON public.subgroups FOR DELETE
  USING (
    has_role(auth.uid(), 'employer'::app_role) AND
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_id AND created_by = auth.uid()
    )
  );

-- Policies for subgroup members
CREATE POLICY "Organization members can view subgroup members"
  ON public.subgroup_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subgroups
      WHERE id = subgroup_id AND is_organization_member(auth.uid(), organization_id)
    )
  );

CREATE POLICY "Employers can manage subgroup members"
  ON public.subgroup_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM subgroups
      WHERE id = subgroup_id AND
      EXISTS (
        SELECT 1 FROM organizations
        WHERE id = subgroups.organization_id AND created_by = auth.uid()
      )
    )
  );

-- Policies for task subgroup assignments
CREATE POLICY "Users can view task subgroup assignments"
  ON public.task_subgroup_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_id AND (assigned_by = auth.uid() OR assigned_to = auth.uid())
    )
  );

CREATE POLICY "Employers can manage task subgroup assignments"
  ON public.task_subgroup_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_id AND assigned_by = auth.uid() AND has_role(auth.uid(), 'employer'::app_role)
    )
  );