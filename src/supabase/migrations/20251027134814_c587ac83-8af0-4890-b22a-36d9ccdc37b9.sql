-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Members can view others in their organization" ON public.organization_members;

-- Create a security definer function to check organization membership
-- This prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_member_of_organization(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
  )
$$;

-- Now create the correct policy using the function
CREATE POLICY "Users can view members in their organizations"
ON public.organization_members
FOR SELECT
TO authenticated
USING (is_member_of_organization(organization_id));