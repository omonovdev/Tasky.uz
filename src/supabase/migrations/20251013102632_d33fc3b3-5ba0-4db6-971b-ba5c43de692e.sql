-- Add new columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS subheadline TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS motto TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add new columns to organization_members table
ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS added_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_organization_members_added_at ON public.organization_members(added_at);

-- Update RLS policies for organizations
CREATE POLICY "Users can update their own organizations"
ON public.organizations
FOR UPDATE
USING (created_by = auth.uid());

-- Allow employers to delete members from their organizations
CREATE POLICY "Employers can remove organization members"
ON public.organization_members
FOR DELETE
USING (
  has_role(auth.uid(), 'employer'::app_role) 
  AND organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);

-- Update organization_members policies to check positions
CREATE POLICY "Employers can update member positions"
ON public.organization_members
FOR UPDATE
USING (
  has_role(auth.uid(), 'employer'::app_role) 
  AND organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);