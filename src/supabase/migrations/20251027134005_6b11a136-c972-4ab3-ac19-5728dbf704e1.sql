-- Add policy for employees to view members in their organizations
-- This allows employees to see their coworkers but not manage them
CREATE POLICY "Members can view others in their organization"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
  )
);

-- Ensure only employers can view all organization data
-- Update the organizations table policy to be more restrictive
DROP POLICY IF EXISTS "All authenticated users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON public.organizations;

-- Only members of an organization can view it
CREATE POLICY "Members can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
  )
);

-- Add policy to allow organization deletion only by creators
CREATE POLICY "Creators can delete their organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND has_role(auth.uid(), 'employer'::app_role));