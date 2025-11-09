-- Allow users to accept their own organization invitations
CREATE POLICY "Users can accept their own invitations"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM organization_invitations 
    WHERE organization_invitations.organization_id = organization_members.organization_id
      AND organization_invitations.employee_id = auth.uid()
      AND organization_invitations.status = 'accepted'
  )
);