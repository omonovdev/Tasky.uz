-- Drop constraints if they exist (cleanup)
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_assigned_by_fkey;

-- Add foreign key relationships between tasks and profiles

-- Add foreign key for assigned_to column
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add foreign key for assigned_by column  
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assigned_by_fkey
FOREIGN KEY (assigned_by)
REFERENCES public.profiles(id)
ON DELETE CASCADE;