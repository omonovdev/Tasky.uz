-- Drop the problematic policies causing infinite recursion
DROP POLICY IF EXISTS "Members can view their member organizations" ON public.organizations;
DROP POLICY IF EXISTS "Employees can view organizations with pending invitations" ON public.organizations;

-- Recreate using the existing security definer function to bypass RLS
-- This prevents circular RLS checks that cause infinite recursion
CREATE POLICY "Members can view their organizations"
ON public.organizations
FOR SELECT
USING (
  -- Use security definer function to bypass RLS and prevent recursion
  is_member_of_organization(id)
);

-- Create a security definer function for invitation check to avoid recursion
CREATE OR REPLACE FUNCTION public.has_pending_invitation(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_invitations
    WHERE organization_id = _org_id
      AND employee_id = _user_id
      AND status = 'pending'
  )
$$;

-- Create policy for employees to view organizations with pending invitations
CREATE POLICY "Employees can view orgs with pending invitations"
ON public.organizations
FOR SELECT
USING (
  has_pending_invitation(id, auth.uid())
);