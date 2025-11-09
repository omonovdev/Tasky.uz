-- Senior-level fix for invitation accept flow
-- 1) Remove recursive SELECT policy on organization_members causing infinite recursion
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
      AND policyname = 'Users can view organization members'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view organization members" ON public.organization_members';
  END IF;
END $$;

-- 2) Create atomic, secure function to accept an invitation and add membership
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invitation_id uuid)
RETURNS TABLE (membership_id uuid, organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  mem_id uuid;
BEGIN
  -- Validate pending invitation for current user
  SELECT * INTO inv
  FROM public.organization_invitations
  WHERE id = accept_organization_invitation.invitation_id
    AND employee_id = auth.uid()
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or not pending for this user' USING ERRCODE = '22023';
  END IF;

  -- Mark accepted
  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = inv.id;

  -- Insert membership if not exists
  SELECT id INTO mem_id
  FROM public.organization_members
  WHERE organization_id = inv.organization_id AND user_id = inv.employee_id;

  IF mem_id IS NULL THEN
    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      added_by,
      agreement_version_accepted,
      agreement_accepted_at
    )
    VALUES (
      inv.organization_id,
      inv.employee_id,
      inv.employee_id,
      NULL,
      NULL
    )
    RETURNING id INTO mem_id;
  END IF;

  membership_id := mem_id;
  organization_id := inv.organization_id;
  RETURN NEXT;
END;
$$;

-- 3) Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;