import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

type SidebarScheduleSectionProps = {
  chatInfo: {
    schedule?: string;
    conclusionLink?: string;
    conclusionPdf?: string;
  };
  isAdminOrTeacher: boolean;
  isTeachersGroup: boolean;
  onUpdateSchedule?: (schedule: string) => void;
  onUpdateConclusionLink?: (link: string) => void;
  onUpdateConclusionPdf?: (base64: string) => void;
};

export const SidebarScheduleSection = ({
  chatInfo,
  isAdminOrTeacher,
  isTeachersGroup,
  onUpdateSchedule,
  onUpdateConclusionLink,
  onUpdateConclusionPdf,
}: SidebarScheduleSectionProps) => {
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editSchedule, setEditSchedule] = useState('');
  const [isEditingConclusion, setIsEditingConclusion] = useState(false);
  const [editConclusion, setEditConclusion] = useState('');
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const startEditSchedule = () => { setEditSchedule(chatInfo.schedule || ''); setIsEditingSchedule(true); };
  const saveSchedule = () => { onUpdateSchedule?.(editSchedule.trim()); setIsEditingSchedule(false); };

  const startEditConclusion = () => { setEditConclusion(chatInfo.conclusionLink || ''); setIsEditingConclusion(true); };
  const saveConclusion = () => { onUpdateConclusionLink?.(editConclusion.trim()); setIsEditingConclusion(false); };

  if (isTeachersGroup) return null;

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="Calendar" size={16} />
            Расписание
          </h4>
          {isAdminOrTeacher && !isEditingSchedule && onUpdateSchedule && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditSchedule}>
              <Icon name="Pencil" size={14} className="mr-1" />
              Изменить
            </Button>
          )}
        </div>
        {isEditingSchedule ? (
          <div className="space-y-3">
            <Textarea value={editSchedule} onChange={(e) => setEditSchedule(e.target.value)} placeholder={"Чт в 18:30 — индивидуальные занятия\nВт, Пт в 15:00 — групповые занятия"} rows={6} className="resize-vertical text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveSchedule} className="flex-1">Сохранить</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingSchedule(false)} className="flex-1">Отмена</Button>
            </div>
          </div>
        ) : chatInfo.schedule ? (
          <div className="p-3 rounded-lg bg-accent/50 text-sm whitespace-pre-line">{chatInfo.schedule}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Расписание не задано</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="FileText" size={16} />
            Заключение
          </h4>
          {isAdminOrTeacher && !isEditingConclusion && onUpdateConclusionLink && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditConclusion}>
              <Icon name="Pencil" size={14} className="mr-1" />
              Изменить
            </Button>
          )}
        </div>
        {isEditingConclusion ? (
          <div className="space-y-3">
            <Input value={editConclusion} onChange={(e) => setEditConclusion(e.target.value)} placeholder="https://example.com/conclusion.pdf" type="url" className="text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveConclusion} className="flex-1">Сохранить</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingConclusion(false)} className="flex-1">Отмена</Button>
            </div>
          </div>
        ) : chatInfo.conclusionLink ? (
          <a href={chatInfo.conclusionLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-sm text-primary">
            <Icon name="ExternalLink" size={16} />
            Открыть заключение
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">Ссылка на заключение не добавлена</p>
        )}

        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file || !onUpdateConclusionPdf) return;
            setIsUploadingPdf(true);
            const reader = new FileReader();
            reader.onload = (ev) => {
              onUpdateConclusionPdf(ev.target?.result as string);
              setIsUploadingPdf(false);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
        <div className="mt-3">
          {chatInfo.conclusionPdf ? (
            <div className="space-y-2">
              <a href={chatInfo.conclusionPdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-sm text-primary">
                <Icon name="FileDown" size={16} />
                Скачать PDF заключение
              </a>
              {isAdminOrTeacher && onUpdateConclusionPdf && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs w-full"
                  disabled={isUploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <Icon name="RefreshCw" size={14} className="mr-1" />
                  {isUploadingPdf ? 'Загрузка...' : 'Заменить PDF'}
                </Button>
              )}
            </div>
          ) : isAdminOrTeacher && onUpdateConclusionPdf ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isUploadingPdf}
              onClick={() => pdfInputRef.current?.click()}
            >
              <Icon name="Upload" size={14} className="mr-2" />
              {isUploadingPdf ? 'Загрузка...' : 'Загрузить PDF заключение'}
            </Button>
          ) : (
            !chatInfo.conclusionPdf && <p className="text-sm text-muted-foreground">PDF не прикреплён</p>
          )}
        </div>
      </div>
    </>
  );
};

export default SidebarScheduleSection;