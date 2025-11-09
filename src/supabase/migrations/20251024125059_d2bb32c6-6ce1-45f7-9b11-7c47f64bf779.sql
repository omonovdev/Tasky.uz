-- Add goal field to tasks table
ALTER TABLE public.tasks
ADD COLUMN goal text;