import Icon from '@/components/ui/icon';
import { AttachedFile } from '@/types/chat.types';

// Конвертирует data URL в Blob и запускает скачивание — работает на мобильных браузерах
function downloadDataUrl(dataUrl: string, fileName: string) {
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch {
    // fallback: попытка открыть напрямую
    window.open(dataUrl, '_blank');
  }
}

type MessageAttachmentsProps = {
  images: AttachedFile[];
  files: AttachedFile[];
  onOpenImage: (index: number) => void;
  compact?: boolean;
};

const getGridLayout = (count: number) => {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  return 'grid-cols-2';
};

const getImageSize = (count: number, idx: number) => {
  if (count === 1) return 'aspect-square max-w-xs';
  if (count === 2) return 'aspect-square';
  if (count === 3 && idx === 0) return 'col-span-3 aspect-video';
  return 'aspect-square';
};

export const MessageAttachments = ({ images, files, onOpenImage, compact = false }: MessageAttachmentsProps) => {
  return (
    <>
      {images.length > 0 && (
        <div className={compact ? 'mt-2' : 'mt-2'}>
          <div className={`grid gap-1.5 ${getGridLayout(Math.min(images.length, 4))}${compact ? '' : ' max-w-[calc(100vw-80px)] md:max-w-sm'}`}>
            {images.slice(0, 4).map((img, idx) => (
              <div
                key={idx}
                className={`${getImageSize(Math.min(images.length, 4), idx)} overflow-hidden rounded-lg cursor-pointer relative group/img`}
                onClick={() => onOpenImage(idx)}
              >
                <img
                  src={img.fileUrl}
                  alt={`Изображение ${idx + 1}`}
                  className="w-full h-full object-cover group-hover/img:brightness-90 transition-all"
                  loading="lazy"
                />
                {images.length > 4 && idx === 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-3xl font-medium">+{images.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className={`${compact ? 'mt-2 space-y-1' : 'mt-2 space-y-1'}`}>
          {files.map((file, idx) => (
            compact ? (
              <div key={idx} className="flex items-center gap-3 p-2 bg-background/60 rounded-lg">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="FileText" size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{file.fileSize}</p>
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                  onClick={() => {
                    if (!file.fileUrl) return;
                    if (file.fileUrl.startsWith('data:')) {
                      downloadDataUrl(file.fileUrl, file.fileName || 'file');
                    } else {
                      const link = document.createElement('a');
                      link.href = file.fileUrl;
                      link.download = file.fileName || 'file';
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                >
                  <Icon name="Download" size={14} />
                </button>
              </div>
            ) : (
              <div key={idx} className="flex items-center gap-3 p-2.5 bg-accent/60 rounded-lg max-w-[calc(100vw-80px)] md:max-w-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="FileText" size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">{file.fileSize}</p>
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                  onClick={() => {
                    if (!file.fileUrl) return;
                    if (file.fileUrl.startsWith('data:')) {
                      downloadDataUrl(file.fileUrl, file.fileName || 'file');
                    } else {
                      const link = document.createElement('a');
                      link.href = file.fileUrl;
                      link.download = file.fileName || 'file';
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                >
                  <Icon name="Download" size={16} />
                </button>
              </div>
            )
          ))}
        </div>
      )}
    </>
  );
};

export default MessageAttachments;