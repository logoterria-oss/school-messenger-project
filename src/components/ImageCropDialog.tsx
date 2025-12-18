import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';

type ImageCropDialogProps = {
  imageUrl: string;
  onSave: (croppedImageUrl: string) => void;
  onCancel: () => void;
};

export const ImageCropDialog = ({ imageUrl, onSave, onCancel }: ImageCropDialogProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      drawImage();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    drawImage();
  }, [scale, position]);

  const drawImage = () => {
    if (!canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);

    const img = imgRef.current;
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.translate(position.x, position.y);
    ctx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    ctx.restore();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const croppedCanvas = document.createElement('canvas');
    const size = 300;
    croppedCanvas.width = size;
    croppedCanvas.height = size;

    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(canvas, 0, 0);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const croppedImageUrl = croppedCanvas.toDataURL('image/png');
    onSave(croppedImageUrl);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogTitle>Редактирование фото</DialogTitle>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="cursor-move border-2 border-border rounded-full"
              style={{ width: '300px', height: '300px' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Icon name="ZoomOut" size={20} className="text-muted-foreground" />
              <Slider
                value={[scale]}
                onValueChange={(value) => setScale(value[0])}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <Icon name="ZoomIn" size={20} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Перетаскивайте изображение и используйте ползунок для масштабирования
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-secondary"
            >
              <Icon name="Check" size={18} className="mr-2" />
              Применить
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="rounded-xl"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
