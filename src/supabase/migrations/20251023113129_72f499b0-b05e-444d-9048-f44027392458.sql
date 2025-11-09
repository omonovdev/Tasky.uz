-- Create task_assignments junction table for multiple assignees
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Create task_stages table for task progress stages
CREATE TABLE IF NOT EXISTS public.task_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task_reports table for completion reports
CREATE TABLE IF NOT EXISTS public.task_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task_attachments table for file attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_report_id UUID NOT NULL REFERENCES task_reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments for their tasks"
ON public.task_assignments FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.assigned_by = auth.uid())
);

CREATE POLICY "Employers can create task assignments"
ON public.task_assignments FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.assigned_by = auth.uid() AND has_role(auth.uid(), 'employer'::app_role))
);

CREATE POLICY "Employers can delete task assignments"
ON public.task_assignments FOR DELETE
USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.assigned_by = auth.uid() AND has_role(auth.uid(), 'employer'::app_role))
);

-- RLS Policies for task_stages
CREATE POLICY "Users can view stages for their assigned tasks"
ON public.task_stages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = task_stages.task_id AND task_assignments.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_stages.task_id AND tasks.assigned_by = auth.uid())
);

CREATE POLICY "Employees can create stages for their tasks"
ON public.task_stages FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = task_stages.task_id AND task_assignments.user_id = auth.uid())
);

CREATE POLICY "Employees can update stages for their tasks"
ON public.task_stages FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = task_stages.task_id AND task_assignments.user_id = auth.uid())
);

CREATE POLICY "Employers can manage stages for tasks they created"
ON public.task_stages FOR ALL
USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_stages.task_id AND tasks.assigned_by = auth.uid())
);

-- RLS Policies for task_reports
CREATE POLICY "Users can view reports for their tasks"
ON public.task_reports FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_reports.task_id AND tasks.assigned_by = auth.uid())
);

CREATE POLICY "Employees can create reports for their tasks"
ON public.task_reports FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = task_reports.task_id AND task_assignments.user_id = auth.uid())
);

-- RLS Policies for task_attachments
CREATE POLICY "Users can view attachments for their task reports"
ON public.task_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM task_reports 
    WHERE task_reports.id = task_attachments.task_report_id 
    AND (
      task_reports.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_reports.task_id AND tasks.assigned_by = auth.uid())
    )
  )
);

CREATE POLICY "Employees can upload attachments for their reports"
ON public.task_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM task_reports 
    WHERE task_reports.id = task_attachments.task_report_id 
    AND task_reports.user_id = auth.uid()
  )
);

-- Storage policies for task attachments
CREATE POLICY "Users can view their task attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add trigger for task_stages updated_at
CREATE TRIGGER update_task_stages_updated_at
BEFORE UPDATE ON public.task_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();