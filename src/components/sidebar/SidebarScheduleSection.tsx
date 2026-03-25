import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { Conclusion } from '@/types/chat.types';

type SidebarScheduleSectionProps = {
  chatInfo: {
    schedule?: string;
    conclusions?: Conclusion[];
  };
  isAdminOrTeacher: boolean;
  isTeachersGroup: boolean;
  onUpdateSchedule?: (schedule: string) => void;
  onAddConclusion?: (data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => void;
  onUpdateConclusion?: (conclusionId: number, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => void;
  onDeleteConclusion?: (conclusionId: number) => void;
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

export const SidebarScheduleSection = ({
  chatInfo,
  isAdminOrTeacher,
  isTeachersGroup,
  onUpdateSchedule,
  onAddConclusion,
  onUpdateConclusion,
  onDeleteConclusion,
}: SidebarScheduleSectionProps) => {
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editSchedule, setEditSchedule] = useState('');
  const [editingConclusionId, setEditingConclusionId] = useState<number | null>(null);
  const [editConclusionLink, setEditConclusionLink] = useState('');
  const [isAddingConclusion, setIsAddingConclusion] = useState(false);
  const [newConclusionLink, setNewConclusionLink] = useState('');
  const [newDiagnosisDate, setNewDiagnosisDate] = useState('');
  const [editDiagnosisDate, setEditDiagnosisDate] = useState('');
  const [uploadingForId, setUploadingForId] = useState<number | 'new' | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfTargetRef = useRef<number | 'new' | null>(null);

  const conclusions = chatInfo.conclusions || [];

  const startEditSchedule = () => { setEditSchedule(chatInfo.schedule || ''); setIsEditingSchedule(true); };
  const saveSchedule = () => { onUpdateSchedule?.(editSchedule.trim()); setIsEditingSchedule(false); };

  const startEditConclusion = (c: Conclusion) => {
    setEditingConclusionId(c.id);
    setEditConclusionLink(c.conclusionLink || '');
    setEditDiagnosisDate(c.diagnosisDate || '');
  };

  const saveEditConclusion = () => {
    if (editingConclusionId !== null) {
      onUpdateConclusion?.(editingConclusionId, {
        conclusionLink: editConclusionLink.trim() || undefined,
        diagnosisDate: editDiagnosisDate || undefined,
      });
      setEditingConclusionId(null);
    }
  };

  const handlePdfUpload = (target: number | 'new') => {
    pdfTargetRef.current = target;
    pdfInputRef.current?.click();
  };

  const onPdfSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const target = pdfTargetRef.current;
    setUploadingForId(target);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (target === 'new') {
        onAddConclusion?.({ conclusionPdfBase64: base64, conclusionLink: newConclusionLink.trim() || undefined, diagnosisDate: newDiagnosisDate || undefined });
        setNewConclusionLink('');
        setNewDiagnosisDate('');
        setIsAddingConclusion(false);
      } else if (typeof target === 'number') {
        onUpdateConclusion?.(target, { conclusionPdfBase64: base64 });
        setEditingConclusionId(null);
      }
      setUploadingForId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddWithLink = () => {
    if (newConclusionLink.trim() || newDiagnosisDate) {
      onAddConclusion?.({ conclusionLink: newConclusionLink.trim() || undefined, diagnosisDate: newDiagnosisDate || undefined });
      setNewConclusionLink('');
      setNewDiagnosisDate('');
      setIsAddingConclusion(false);
    }
  };

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

      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={onPdfSelected}
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Icon name="FileText" size={16} />
            Заключения
          </h4>
        </div>

        {conclusions.length === 0 && !isAddingConclusion && (
          <p className="text-sm text-muted-foreground">Заключений пока нет</p>
        )}

        <div className="space-y-4">
          {conclusions.map((c) => (
            <div key={c.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Заключение{c.diagnosisDate ? ` от ${formatDate(c.diagnosisDate)}` : ''}
                </p>
                {isAdminOrTeacher && editingConclusionId !== c.id && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditConclusion(c)}>
                      <Icon name="Pencil" size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => {
                      if (confirm('Удалить это заключение?')) onDeleteConclusion?.(c.id);
                    }}>
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                )}
              </div>

              {editingConclusionId === c.id ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Дата диагностики</label>
                    <Input
                      value={editDiagnosisDate}
                      onChange={(e) => setEditDiagnosisDate(e.target.value)}
                      type="date"
                      className="text-sm"
                    />
                  </div>
                  <Input
                    value={editConclusionLink}
                    onChange={(e) => setEditConclusionLink(e.target.value)}
                    placeholder="Ссылка на заключение"
                    type="url"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEditConclusion} className="flex-1">Сохранить</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={uploadingForId === c.id}
                      onClick={() => handlePdfUpload(c.id)}
                    >
                      {uploadingForId === c.id ? 'Загрузка...' : 'Заменить PDF'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingConclusionId(null)}>
                      <Icon name="X" size={14} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {c.conclusionLink && (
                    <a href={c.conclusionLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Icon name="ExternalLink" size={14} className="mr-1" />
                        Открыть
                      </Button>
                    </a>
                  )}
                  {c.conclusionPdf && (
                    <a href={c.conclusionPdf} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Icon name="FileDown" size={14} className="mr-1" />
                        Скачать
                      </Button>
                    </a>
                  )}
                  {!c.conclusionLink && !c.conclusionPdf && (
                    <p className="text-xs text-muted-foreground">Нет файлов</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {isAddingConclusion && (
          <div className="border rounded-lg p-3 space-y-2 mt-4">
            <p className="text-sm font-medium">Новое заключение</p>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Дата диагностики</label>
              <Input
                value={newDiagnosisDate}
                onChange={(e) => setNewDiagnosisDate(e.target.value)}
                type="date"
                className="text-sm"
              />
            </div>
            <Input
              value={newConclusionLink}
              onChange={(e) => setNewConclusionLink(e.target.value)}
              placeholder="Ссылка на заключение (необязательно)"
              type="url"
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddWithLink}
                disabled={!newConclusionLink.trim() && !newDiagnosisDate}
                className="flex-1"
              >
                Сохранить
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={uploadingForId === 'new'}
                onClick={() => handlePdfUpload('new')}
              >
                <Icon name="Upload" size={14} className="mr-1" />
                {uploadingForId === 'new' ? 'Загрузка...' : 'Загрузить PDF'}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs"
              onClick={() => { setIsAddingConclusion(false); setNewConclusionLink(''); setNewDiagnosisDate(''); }}
            >
              Отмена
            </Button>
          </div>
        )}

        {isAdminOrTeacher && !isAddingConclusion && onAddConclusion && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => setIsAddingConclusion(true)}
          >
            <Icon name="Plus" size={14} className="mr-2" />
            Добавить заключение
          </Button>
        )}
      </div>
    </>
  );
};

export default SidebarScheduleSection;