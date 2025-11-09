-- Fix infinite recursion in organizations RLS policy
-- Drop the problematic policy that directly queries organization_members
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;

-- Recreate the policy using the existing security definer function
-- This prevents infinite recursion by using a function that's isolated from RLS
CREATE POLICY "Members can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (is_member_of_organization(id));