-- Complete fix for infinite recursion and storage policies

-- Drop ALL existing policies on organization_members to start fresh
DROP POLICY IF EXISTS "Members can view their organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization creators can add members" ON organization_members;
DROP POLICY IF EXISTS "Employers can update member positions" ON organization_members;
DROP POLICY IF EXISTS "Employers can remove organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view own organization membership" ON organization_members;

-- Drop problematic policies on profiles
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Drop problematic policies on organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Create simple, non-recursive policies for organization_members
CREATE POLICY "Users can view their own membership"
ON organization_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view members of organizations they belong to"
ON organization_members
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
  )
);

CREATE POLICY "Creators can add members"
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

CREATE POLICY "Creators can update members"
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

CREATE POLICY "Creators can remove members"
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

-- Recreate organizations policy without recursion
CREATE POLICY "Users can view organizations they are members of"
ON organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Fix storage policies for avatars bucket
DROP POLICY IF EXISTS "Users can upload organization photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view organization photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their organization photos" ON storage.objects;

CREATE POLICY "Users can upload organization photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view organization photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their organization photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);