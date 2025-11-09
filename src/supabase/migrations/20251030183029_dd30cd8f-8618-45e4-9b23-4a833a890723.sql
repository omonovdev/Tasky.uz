-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Employers can create organizations" ON public.organizations;

-- Create new INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Update SELECT policy to be simpler
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their own organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Update UPDATE policy (already simple, but recreate for consistency)
DROP POLICY IF EXISTS "Users can update their own organizations" ON public.organizations;
CREATE POLICY "Users can update their own organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Update DELETE policy to be simpler
DROP POLICY IF EXISTS "Creators can delete their organizations" ON public.organizations;
CREATE POLICY "Users can delete their own organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);