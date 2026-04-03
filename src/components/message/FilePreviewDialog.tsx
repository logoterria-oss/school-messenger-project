import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

type FilePreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'unsupported';
  onDownload: () => void;
};

function getFileType(fileName: string, fileUrl: string): 'pdf' | 'image' | 'unsupported' {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf') || fileUrl.endsWith('.pdf')) return 'pdf';
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(lower) || /\.(jpe?g|png|gif|webp)$/i.test(fileUrl)) return 'image';
  return 'unsupported';
}

export { getFileType };

export const FilePreviewDialog = ({ open, onClose, fileUrl, fileName, fileType, onDownload }: FilePreviewDialogProps) => {
  const [imgLoading, setImgLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[92vh] p-0 bg-background border flex flex-col gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Просмотр файла</DialogTitle>

        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name={fileType === 'pdf' ? 'FileText' : 'Image'} size={16} className="text-primary" />
            </div>
            <p className="text-sm font-medium truncate">{fileName}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              <Icon name="Download" size={16} className="text-muted-foreground" />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              <Icon name="X" size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
          {fileType === 'image' && (
            <div className="flex items-center justify-center min-h-[300px] p-4">
              {imgLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon name="Loader2" size={32} className="text-primary animate-spin" />
                </div>
              )}
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                onLoad={() => setImgLoading(false)}
                onError={() => setImgLoading(false)}
              />
            </div>
          )}

          {fileType === 'pdf' && !pdfError && (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              className="w-full h-[80vh] border-0"
              title={fileName}
              onError={() => setPdfError(true)}
            />
          )}

          {fileType === 'pdf' && pdfError && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Icon name="FileText" size={32} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">Не удалось отобразить PDF</p>
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                style={{ touchAction: 'manipulation' }}
              >
                <Icon name="Download" size={16} />
                Скачать файл
              </button>
            </div>
          )}

          {fileType === 'unsupported' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Icon name="FileText" size={32} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Предпросмотр этого формата недоступен</p>
              </div>
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                style={{ touchAction: 'manipulation' }}
              >
                <Icon name="Download" size={16} />
                Скачать файл
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
