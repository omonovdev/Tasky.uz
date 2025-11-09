-- Fix RLS to allow employees to see organizations they have invitations for
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;

CREATE POLICY "Members can view their organizations"
ON public.organizations
FOR SELECT
USING (
  is_member_of_organization(id)
  OR EXISTS (
    SELECT 1 FROM public.organization_invitations
    WHERE organization_invitations.organization_id = organizations.id
      AND organization_invitations.employee_id = auth.uid()
      AND organization_invitations.status = 'pending'
  )
);

-- Ensure organization_members table allows inserts from accepted invitations
DROP POLICY IF EXISTS "Users can accept their own invitations" ON public.organization_members;

CREATE POLICY "Users can accept their own invitations"
ON public.organization_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.organization_invitations
    WHERE organization_invitations.organization_id = organization_members.organization_id
      AND organization_invitations.employee_id = auth.uid()
      AND organization_invitations.status = 'accepted'
  )
);