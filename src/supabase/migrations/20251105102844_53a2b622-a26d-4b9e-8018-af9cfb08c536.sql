-- Update user_goals table to add description, deadline, and picture_url
ALTER TABLE public.user_goals
ADD COLUMN description TEXT,
ADD COLUMN deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN picture_url TEXT;

-- Create organization_ideas table for public ideas sharing
CREATE TABLE public.organization_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organization_ideas
ALTER TABLE public.organization_ideas ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_ideas
CREATE POLICY "Organization members can view ideas"
ON public.organization_ideas
FOR SELECT
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create ideas"
ON public.organization_ideas
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their own ideas"
ON public.organization_ideas
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas"
ON public.organization_ideas
FOR DELETE
USING (auth.uid() = user_id);