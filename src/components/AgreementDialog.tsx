import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

interface AgreementDialogProps {
  organizationId: string;
  agreementText: string | null;
  isCreator: boolean;
  onAgreementUpdated: () => void;
}

export default function AgreementDialog({ 
  organizationId, 
  agreementText, 
  isCreator,
  onAgreementUpdated 
}: AgreementDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(agreementText || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setText(agreementText || "");
  }, [agreementText]);

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.organizations.update(organizationId, { agreementText: text });

      toast({
        title: "Success",
        description: "Agreement updated successfully",
      });

      setOpen(false);
      onAgreementUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update agreement";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isCreator) return null;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="w-4 h-4 mr-2" />
        {agreementText ? "Edit Agreement" : "Create Agreement"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Organization Agreement</DialogTitle>
            <DialogDescription>
              Create an agreement that employees must accept before joining your organization
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter agreement text here... (e.g., terms and conditions, code of conduct, etc.)"
            className="min-h-[300px]"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Agreement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
