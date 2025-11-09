-- Add unique constraint to prevent duplicate organization memberships
ALTER TABLE organization_members 
ADD CONSTRAINT organization_members_org_user_unique 
UNIQUE (organization_id, user_id);