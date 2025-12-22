import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmployeeChipProps {
  name: string;
  email: string;
  onRemove: () => void;
}

export const EmployeeChip = ({ name, email, onRemove }: EmployeeChipProps) => {
  return (
    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm border border-primary/20">
      <span className="font-medium">{name}</span>
      <span className="text-muted-foreground">({email})</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 hover:bg-destructive/20"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};