-- Add DELETE policy for employers on tasks they created
CREATE POLICY "Employers can delete tasks they created"
ON tasks
FOR DELETE
TO authenticated
USING (
  auth.uid() = assigned_by AND 
  has_role(auth.uid(), 'employer'::app_role)
);