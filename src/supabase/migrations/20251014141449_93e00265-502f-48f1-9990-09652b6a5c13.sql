-- Fix infinite recursion in organization_members policies

-- Drop all existing policies on organization_members
DROP POLICY IF EXISTS "Users can view their own membership" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of organizations they belong to" ON organization_members;
DROP POLICY IF EXISTS "Creators can add members" ON organization_members;
DROP POLICY IF EXISTS "Creators can update members" ON organization_members;
DROP POLICY IF EXISTS "Creators can remove members" ON organization_members;

-- Create a security definer function to check organization membership
CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Create simplified, non-recursive policies
CREATE POLICY "Users can view their own memberships"
ON organization_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Employers can add members to their organizations"
ON organization_members
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'employer'::app_role)
  AND EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = organization_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Employers can update members in their organizations"
ON organization_members
FOR UPDATE
USING (
  has_role(auth.uid(), 'employer'::app_role)
  AND EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = organization_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Employers can delete members from their organizations"
ON organization_members
FOR DELETE
USING (
  has_role(auth.uid(), 'employer'::app_role)
  AND EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = organization_id 
    AND created_by = auth.uid()
  )
);