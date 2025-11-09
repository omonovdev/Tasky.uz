-- Allow any organization member to create invitations (not just the creator)
DROP POLICY IF EXISTS "Organization creators can create invitations" ON public.organization_invitations;

CREATE POLICY "Organization members can create invitations"
ON public.organization_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
  )
);

-- Allow any organization member to view invitations
DROP POLICY IF EXISTS "Organization creators can view invitations" ON public.organization_invitations;

CREATE POLICY "Organization members can view invitations"
ON public.organization_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
  )
);