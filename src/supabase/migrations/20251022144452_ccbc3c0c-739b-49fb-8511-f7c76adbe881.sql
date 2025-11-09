-- Fix PUBLIC_DATA_EXPOSURE: Restrict profile visibility
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Add policy for viewing own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Add policy for organization members to view each other
CREATE POLICY "Members can view organization profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
      AND om2.user_id = profiles.id
  )
);

-- Fix INPUT_VALIDATION: Add database-level constraints
-- Add length constraints to organizations table
ALTER TABLE public.organizations
ADD CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100);

ALTER TABLE public.organizations
ADD CONSTRAINT subheadline_length CHECK (subheadline IS NULL OR char_length(subheadline) <= 200);

ALTER TABLE public.organizations
ADD CONSTRAINT description_length CHECK (description IS NULL OR char_length(description) <= 2000);

ALTER TABLE public.organizations
ADD CONSTRAINT motto_length CHECK (motto IS NULL OR char_length(motto) <= 200);

-- Add length constraints to tasks table
ALTER TABLE public.tasks
ADD CONSTRAINT title_length CHECK (char_length(title) > 0 AND char_length(title) <= 200);

ALTER TABLE public.tasks
ADD CONSTRAINT description_length CHECK (description IS NULL OR char_length(description) <= 5000);

-- Add length constraint to organization_members table
ALTER TABLE public.organization_members
ADD CONSTRAINT position_length CHECK (position IS NULL OR char_length(position) <= 100);