import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { isAdminRole } from '@/types/chat.types';

type User = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  password: string;
};

export type ConclusionDraft = {
  diagnosisDate?: string;
  conclusionLink?: string;
  conclusionPdfBase64?: string;
  pdfName?: string;
};

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (groupName: string, selectedUserIds: string[], schedule: string, conclusionLink: string, leadTeachers: string[], leadAdmin?: string, conclusionPdfBase64?: string, conclusions?: ConclusionDraft[]) => Promise<void> | void;
  allUsers: User[];
};

const SUPERVISOR_ID = 'admin';

const CreateGroupDialog = ({ open, onClose, onCreate, allUsers }: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [leadTeachers, setLeadTeachers] = useState<string[]>([]);
  const [leadAdmin, setLeadAdmin] = useState<string>('');
  const [schedule, setSchedule] = useState('');
  const [conclusions, setConclusions] = useState<ConclusionDraft[]>([]);
  const [isAddingConclusion, setIsAddingConclusion] = useState(false);
  const [newDiagnosisDate, setNewDiagnosisDate] = useState('');
  const [newConclusionLink, setNewConclusionLink] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfTargetRef = useRef<number | 'new' | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const teachers = allUsers.filter(u => u.role === 'teacher');
  const admins = allUsers.filter(u => isAdminRole(u.role) && u.id !== SUPERVISOR_ID);
  const parents = allUsers.filter(u => u.role === 'parent');
  const students = allUsers.filter(u => u.role === 'student');

  const filteredParents = parents.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredStudents = students.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!groupName.trim() || isCreating) return;
    const allTeacherIds = teachers.map(t => t.id);
    const adminIds = leadAdmin ? [leadAdmin] : [];
    const finalUsers = [...new Set([...allTeacherIds, ...adminIds, ...selectedUsers])];

    setIsCreating(true);
    try {
      await onCreate(groupName.trim(), finalUsers, schedule.trim(), '', leadTeachers, leadAdmin || undefined, undefined, conclusions.length > 0 ? conclusions : undefined);
      resetForm();
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setGroupName('');
    setSelectedUsers([]);
    setLeadTeachers([]);
    setLeadAdmin('');
    setSchedule('');
    setConclusions([]);
    setIsAddingConclusion(false);
    setNewDiagnosisDate('');
    setNewConclusionLink('');
    setSearchQuery('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleLeadTeacher = (teacherId: string) => {
    setLeadTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  };

  const addConclusionWithLink = () => {
    if (newConclusionLink.trim() || newDiagnosisDate) {
      setConclusions(prev => [...prev, {
        diagnosisDate: newDiagnosisDate || undefined,
        conclusionLink: newConclusionLink.trim() || undefined,
      }]);
      setNewConclusionLink('');
      setNewDiagnosisDate('');
      setIsAddingConclusion(false);
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (target === 'new') {
        setConclusions(prev => [...prev, {
          diagnosisDate: newDiagnosisDate || undefined,
          conclusionLink: newConclusionLink.trim() || undefined,
          conclusionPdfBase64: base64,
          pdfName: file.name,
        }]);
        setNewConclusionLink('');
        setNewDiagnosisDate('');
        setIsAddingConclusion(false);
      } else if (typeof target === 'number') {
        setConclusions(prev => prev.map((c, i) => i === target ? { ...c, conclusionPdfBase64: base64, pdfName: file.name } : c));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeConclusion = (index: number) => {
    setConclusions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] max-sm:top-[2%] max-sm:translate-y-0 max-sm:max-h-[96vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Создать группу</DialogTitle>
        </DialogHeader>
        <div ref={scrollContainerRef} className="space-y-4 py-4 overflow-y-auto flex-1 px-1 -mr-1 pr-2" onFocus={(e) => {
          if (e.target instanceof HTMLInputElement && e.target.type !== 'file' && e.target.type !== 'checkbox') {
            const el = e.target;
            setTimeout(() => { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350);
          }
        }}>
          <div className="space-y-2">
            <Label htmlFor="groupName">Название группы</Label>
            <Input
              id="groupName"
              placeholder="Группа: Иван Петров"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
              <Label>Ведущий администратор</Label>
              <p className="text-xs text-muted-foreground">Все админы добавляются автоматически. Виктория Абраменко — руководитель и видит всё. Выберите ведущего администратора для этой группы</p>
              <div className="border rounded-md p-3 space-y-2">
                {admins.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">Нет других администраторов</p>
                ) : admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => setLeadAdmin(leadAdmin === admin.id ? '' : admin.id)}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      leadAdmin === admin.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    }`}>
                      {leadAdmin === admin.id && <Icon name="Check" size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{admin.name}</p>
                        {leadAdmin === admin.id && (
                          <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">Ведущий</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{admin.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          {teachers.length > 0 && (
            <div className="space-y-2">
              <Label>Ведущие педагоги</Label>
              <p className="text-xs text-muted-foreground">Все педагоги добавляются в группу. Отметьте ведущих — остальные получат группу замьюченной</p>
              <div className="border rounded-md p-3 space-y-2">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent"
                  >
                    <Checkbox
                      id={`lead-${teacher.id}`}
                      checked={leadTeachers.includes(teacher.id)}
                      onCheckedChange={() => toggleLeadTeacher(teacher.id)}
                    />
                    <label
                      htmlFor={`lead-${teacher.id}`}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{teacher.name}</p>
                        {leadTeachers.includes(teacher.id) && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Ведущий</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{teacher.phone}</p>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Ученики и родители ({selectedUsers.length} выбрано)</Label>

            <Input
              placeholder="Поиск по имени и фамилии..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />

            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-3 space-y-4">
                {parents.length === 0 && students.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Icon name="Users" size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Пользователей пока нет</p>
                    <p className="text-xs mt-1">Добавьте учеников и родителей</p>
                  </div>
                ) : (
                  <>
                    {filteredParents.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Родители</h4>
                        <div className="space-y-2">
                          {filteredParents.map((user) => (
                            <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                              <label htmlFor={`user-${user.id}`} className="flex-1 min-w-0 cursor-pointer">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.phone}</p>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredStudents.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Ученики</h4>
                        <div className="space-y-2">
                          {filteredStudents.map((user) => (
                            <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                              <label htmlFor={`user-${user.id}`} className="flex-1 min-w-0 cursor-pointer">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.phone}</p>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Расписание</Label>
            <Textarea
              id="schedule"
              placeholder={"Чт в 18:30 — индивидуальные занятия\nВт, Пт в 15:00 — групповые занятия"}
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              rows={3}
              className="resize-vertical text-sm"
            />
          </div>

          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onPdfSelected}
          />

          <div className="space-y-2">
            <Label>Заключения</Label>

            {conclusions.length === 0 && !isAddingConclusion && (
              <p className="text-sm text-muted-foreground">Заключений пока нет</p>
            )}

            <div className="space-y-3">
              {conclusions.map((c, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Заключение{c.diagnosisDate ? ` от ${formatDate(c.diagnosisDate)}` : ''}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeConclusion(index)}
                    >
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {c.conclusionLink && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon name="Link" size={12} />
                        Ссылка добавлена
                      </span>
                    )}
                    {c.conclusionPdfBase64 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon name="FileText" size={12} />
                        {c.pdfName || 'PDF загружен'}
                      </span>
                    )}
                    {!c.conclusionLink && !c.conclusionPdfBase64 && (
                      <span className="text-xs text-muted-foreground">Только дата</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isAddingConclusion && (
              <div className="border rounded-lg p-3 space-y-2">
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
                    onClick={addConclusionWithLink}
                    disabled={!newConclusionLink.trim() && !newDiagnosisDate}
                    className="flex-1"
                  >
                    Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePdfUpload('new')}
                  >
                    <Icon name="Upload" size={14} className="mr-1" />
                    Загрузить PDF
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

            {!isAddingConclusion && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsAddingConclusion(true)}
              >
                <Icon name="Plus" size={14} className="mr-2" />
                Добавить заключение
              </Button>
            )}
          </div>
          <div className="pb-4 sm:pb-0" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>Отмена</Button>
          <Button onClick={handleCreate} disabled={!groupName.trim() || isCreating} className="bg-primary hover:bg-primary/90">
            {isCreating ? 'Создаю...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;