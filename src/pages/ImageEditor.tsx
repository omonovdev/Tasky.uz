import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ZoomIn, ZoomOut, RotateCw, Save, X, FlipHorizontal, FlipVertical, Crop } from "lucide-react";
import { Label } from "@/components/ui/label";

const ImageEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  // Load image from location state
  useEffect(() => {
    if (location.state?.imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImage(img);
        drawCanvas(img, zoom, rotation, flipH, flipV, position);
      };
      img.src = location.state.imageUrl;
    }
  }, []);

  const drawCanvas = (
    img: HTMLImageElement | null,
    z: number,
    r: number,
    fh: boolean,
    fv: boolean,
    pos: { x: number; y: number }
  ) => {
    if (!img || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 400;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((r * Math.PI) / 180);
    ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
    ctx.scale(z, z);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale + pos.x;
    const y = (canvas.height / 2) - (img.height / 2) * scale + pos.y;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    ctx.restore();
  };

  const handleZoomChange = (value: number[]) => {
    const newZoom = value[0];
    setZoom(newZoom);
    drawCanvas(image, newZoom, rotation, flipH, flipV, position);
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    drawCanvas(image, zoom, newRotation, flipH, flipV, position);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    setPosition(newPosition);
    drawCanvas(image, zoom, rotation, flipH, flipV, newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current?.toBlob((b) => resolve(b!), "image/jpeg", 0.9);
      });

      const fileExt = "jpg";
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });

      navigate("/profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 pb-24">
      <div className="container max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Profile Picture</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="border rounded-lg cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Zoom</Label>
                <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-4">
                <ZoomOut className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleRotate} variant="outline" size="sm">
                <RotateCw className="w-4 h-4 mr-2" />
                Rotate
              </Button>
              <Button 
                onClick={() => {
                  setFlipH(!flipH);
                  drawCanvas(image, zoom, rotation, !flipH, flipV, position);
                }} 
                variant="outline" 
                size="sm"
              >
                <FlipHorizontal className="w-4 h-4 mr-2" />
                Flip H
              </Button>
              <Button 
                onClick={() => {
                  setFlipV(!flipV);
                  drawCanvas(image, zoom, rotation, flipH, !flipV, position);
                }} 
                variant="outline" 
                size="sm"
              >
                <FlipVertical className="w-4 h-4 mr-2" />
                Flip V
              </Button>
              <Button 
                onClick={handleSave} 
                size="sm"
                disabled={saving || !image}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ImageEditor;
