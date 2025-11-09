-- Add editor tracking to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_edited_at timestamp with time zone;

-- Create trigger to update last_edited_at when task is updated
CREATE OR REPLACE FUNCTION update_task_edit_info()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.* IS DISTINCT FROM NEW.*) THEN
    NEW.last_edited_by = auth.uid();
    NEW.last_edited_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER track_task_edits
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_edit_info();