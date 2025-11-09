-- Create user_goals table for weekly, monthly, yearly goals
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weekly', 'monthly', 'yearly')),
  goal_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Users can view their own goals
CREATE POLICY "Users can view own goals"
  ON public.user_goals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own goals
CREATE POLICY "Users can insert own goals"
  ON public.user_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update own goals"
  ON public.user_goals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own goals
CREATE POLICY "Users can delete own goals"
  ON public.user_goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Organization members can view goals
CREATE POLICY "Organization members can view goals"
  ON public.user_goals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      INNER JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() 
      AND om2.user_id = user_goals.user_id
    )
  );

-- Add custom_goal column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_goal TEXT;