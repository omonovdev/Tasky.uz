-- Add contract duration to invitations
ALTER TABLE public.organization_invitations 
ADD COLUMN IF NOT EXISTS contract_duration text,
ADD COLUMN IF NOT EXISTS invitation_message text;

-- Add agreement versioning to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS agreement_version integer DEFAULT 1;

-- Add agreement acceptance tracking to organization members
ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS agreement_version_accepted integer;

-- Create function to update agreement version
CREATE OR REPLACE FUNCTION public.increment_agreement_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agreement_text IS DISTINCT FROM OLD.agreement_text AND NEW.agreement_text IS NOT NULL THEN
    NEW.agreement_version = COALESCE(OLD.agreement_version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-increment agreement version
DROP TRIGGER IF EXISTS update_agreement_version ON public.organizations;
CREATE TRIGGER update_agreement_version
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.increment_agreement_version();