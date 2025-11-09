-- Drop all problematic policies
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view members in their organizations" ON public.organization_members;

-- Create a more efficient security definer function that doesn't cause recursion
-- This function will be used to check both organization and member access
CREATE OR REPLACE FUNCTION public.can_view_organization(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = _user_id
  );
END;
$$;

-- Now create clean policies without recursion
-- For organizations table
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (can_view_organization(id, auth.uid()));

-- For organization_members table - users can see members in organizations they belong to
CREATE POLICY "Users can view organization members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (can_view_organization(organization_id, auth.uid()));