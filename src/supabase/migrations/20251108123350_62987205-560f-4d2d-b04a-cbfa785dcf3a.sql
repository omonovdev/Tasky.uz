-- Fix infinite recursion in organization_members RLS policies
-- Step 1: Recreate can_view_organization with better security context

CREATE OR REPLACE FUNCTION public.can_view_organization(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  -- This function runs with definer's privileges, fully bypassing RLS
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = _user_id
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Step 2: Recreate is_organization_member with same approach

CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  -- This function runs with definer's privileges, fully bypassing RLS
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Step 3: Recreate is_member_of_organization with same approach

CREATE OR REPLACE FUNCTION public.is_member_of_organization(_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Step 4: Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.can_view_organization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_organization(uuid) TO authenticated;