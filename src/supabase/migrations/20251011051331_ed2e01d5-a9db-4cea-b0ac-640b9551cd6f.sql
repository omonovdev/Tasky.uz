-- Add organization_id to profiles table and create organization_members table
ALTER TABLE public.profiles 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create organization_members table to track employees in organizations
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Employers can view members of their organizations
CREATE POLICY "Employers can view organization members"
ON public.organization_members
FOR SELECT
USING (
  has_role(auth.uid(), 'employer'::app_role) AND
  organization_id IN (
    SELECT id FROM public.organizations WHERE id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);

-- Employers can add members to organizations they belong to
CREATE POLICY "Employers can add organization members"
ON public.organization_members
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'employer'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Employees can view their own organization membership
CREATE POLICY "Users can view own organization membership"
ON public.organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- Update profiles RLS to allow viewing organization members
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Allow employers to update organization_id in profiles
CREATE POLICY "Employers can update organization assignments"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'employer'::app_role) AND
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Update organizations policies to allow employers to view their organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);