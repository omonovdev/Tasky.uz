-- Create table for tracking notification read status
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'invitation' or 'task'
  notification_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Users can read their own notification read status
CREATE POLICY "Users can view their own notification reads"
ON public.notification_reads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own notification reads
CREATE POLICY "Users can insert their own notification reads"
ON public.notification_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification ON public.notification_reads(user_id, notification_type, notification_id);