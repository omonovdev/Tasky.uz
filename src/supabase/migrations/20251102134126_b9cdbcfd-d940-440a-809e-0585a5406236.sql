-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;

-- Create a simpler policy for employees to view organizations they have invitations for
CREATE POLICY "Employees can view organizations with pending invitations"
ON public.organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_invitations
    WHERE organization_invitations.organization_id = organizations.id
      AND organization_invitations.employee_id = auth.uid()
      AND organization_invitations.status = 'pending'
  )
);

-- Create a policy for members to view their organizations
CREATE POLICY "Members can view their member organizations"
ON public.organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
  )
);