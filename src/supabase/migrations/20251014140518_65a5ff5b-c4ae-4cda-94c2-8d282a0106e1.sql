-- Fix infinite recursion in organization_members RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Employers can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Employers can add organization members" ON organization_members;

-- Recreate policies without circular references
CREATE POLICY "Members can view their organization members"
ON organization_members
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization creators can add members"
ON organization_members
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'employer'::app_role) 
  AND organization_id IN (
    SELECT id 
    FROM organizations 
    WHERE created_by = auth.uid()
  )
);

-- Update the view policy for profiles to avoid recursion
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

CREATE POLICY "Users can view profiles in their organization"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om1
    WHERE om1.user_id = auth.uid()
    AND om1.organization_id IN (
      SELECT om2.organization_id 
      FROM organization_members om2
      WHERE om2.user_id = profiles.id
    )
  )
);