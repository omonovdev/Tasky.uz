-- Fix RLS policies to allow user discovery for collaboration

-- Drop the restrictive profile view policy
DROP POLICY IF EXISTS "Members can view organization profiles" ON profiles;

-- Add a policy that allows all authenticated users to view basic profile info
-- This is necessary for:
-- 1. Employers to search and add members to organizations
-- 2. Employees to see who they're working with
-- 3. General collaboration features
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Keep organizations viewable by all authenticated users (already exists)
-- This allows employees to search and join organizations

-- Add policy to allow employees to view all organizations to join them
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;

CREATE POLICY "All authenticated users can view organizations"
  ON organizations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);