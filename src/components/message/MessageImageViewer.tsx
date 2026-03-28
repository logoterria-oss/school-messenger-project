import { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { AttachedFile } from '@/types/chat.types';

type MessageImageViewerProps = {
  images: AttachedFile[];
  selectedIndex: number | null;
  onClose: () => void;
  onSelect: (index: number | null) => void;
};

export const MessageImageViewer = ({ images, selectedIndex, onClose, onSelect }: MessageImageViewerProps) => {
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        onSelect(selectedIndex < images.length - 1 ? selectedIndex + 1 : selectedIndex);
      }
      if (e.key === 'ArrowLeft') {
        onSelect(selectedIndex > 0 ? selectedIndex - 1 : selectedIndex);
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, images.length, onClose, onSelect]);

  if (selectedIndex === null || !images[selectedIndex]) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] p-0 bg-black/95 border-none">
        <DialogTitle className="sr-only">Просмотр изображения</DialogTitle>
        <div className="relative flex items-center justify-center min-h-[200px] md:min-h-[400px]">
          <img
            src={images[selectedIndex].fileUrl}
            alt={`Изображение ${selectedIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
          />
          {selectedIndex > 0 && (
            <button
              onClick={() => onSelect(selectedIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <Icon name="ChevronLeft" size={24} className="text-white" />
            </button>
          )}
          {selectedIndex < images.length - 1 && (
            <button
              onClick={() => onSelect(selectedIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <Icon name="ChevronRight" size={24} className="text-white" />
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <Icon name="X" size={20} className="text-white" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageImageViewer;
