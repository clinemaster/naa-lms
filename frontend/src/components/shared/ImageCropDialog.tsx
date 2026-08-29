"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getCroppedImageFile } from "@/lib/cropImage";

export function ImageCropDialog({
  open,
  imageSrc,
  fileName,
  aspect = 16 / 9,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  imageSrc: string | null;
  fileName: string;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName);
      onConfirm(file);
    } finally {
      setIsSaving(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Position Course Image</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Drag to reposition, use the slider (or scroll/pinch) to zoom. The highlighted area is what students will
          see.
        </p>

        <div className="relative h-80 w-full overflow-hidden rounded-lg bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
            className="flex-1"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving || !croppedAreaPixels}>
            {isSaving ? "Saving…" : "Use This Image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
