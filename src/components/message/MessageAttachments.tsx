import { useCallback, useState } from 'react';
import Icon from '@/components/ui/icon';
import { AttachedFile } from '@/types/chat.types';

const UPLOAD_PROXY = 'https://functions.poehali.dev/c2cd368a-7806-4202-95e7-9cbc1c010979';

function getDownloadUrl(file: AttachedFile): string {
  const url = file.fileUrl || '';
  if (!url || url.startsWith('data:')) return url;
  const match = url.match(/\/bucket\/(.+)$/);
  if (match) {
    const key = match[1];
    const name = file.fileName || 'file';
    return `${UPLOAD_PROXY}?key=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}`;
  }
  return url;
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

const FileItem = ({ file, compact }: { file: AttachedFile; compact: boolean }) => {
  const href = getDownloadUrl(file);
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!href || loading) return;
    setLoading(true);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = href;
    document.body.appendChild(iframe);
    setTimeout(() => {
      setLoading(false);
      try { document.body.removeChild(iframe); } catch (_e) { /* cleanup */ }
    }, 4000);
  }, [href, loading]);

  const iconSize = compact ? 16 : 20;
  const dlIconSize = compact ? 14 : 16;
  const iconBoxClass = compact
    ? 'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0'
    : 'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0';
  const dlBoxClass = compact
    ? 'flex-shrink-0 h-7 w-7 inline-flex items-center justify-center'
    : 'flex-shrink-0 h-8 w-8 inline-flex items-center justify-center';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleDownload}
      className={`flex items-center gap-3 ${compact ? 'p-2' : 'p-2.5'} rounded-lg cursor-pointer transition-colors ${compact ? 'bg-background/60' : 'bg-accent/60'} ${loading ? 'opacity-70' : ''} ${compact ? '' : 'max-w-[calc(100vw-80px)] md:max-w-sm'} active:scale-[0.97] active:brightness-95`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', transition: 'transform 0.1s, opacity 0.2s, filter 0.1s' }}
    >
      <div className={`${iconBoxClass} ${loading ? 'bg-primary/20' : 'bg-primary/10'} transition-colors`}>
        {loading ? (
          <Icon name="Loader2" size={iconSize} className="text-primary animate-spin" />
        ) : (
          <Icon name="FileText" size={iconSize} className="text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate`}>{file.fileName}</p>
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
          {loading ? 'Загрузка...' : file.fileSize}
        </p>
      </div>
      <div className={dlBoxClass}>
        {loading ? (
          <Icon name="Loader2" size={dlIconSize} className="animate-spin text-muted-foreground" />
        ) : (
          <Icon name="Download" size={dlIconSize} />
        )}
      </div>
    </div>
  );
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
            <FileItem key={idx} file={file} compact={compact} />
          ))}
        </div>
      )}
    </>
  );
};

export default MessageAttachments;