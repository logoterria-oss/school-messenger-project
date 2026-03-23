import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student' | 'admin';
  phone: string;
  email?: string;
  password: string;
};

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (groupName: string, selectedUserIds: string[], schedule: string, conclusionLink: string, leadTeachers: string[], leadAdmin?: string, conclusionPdfBase64?: string) => Promise<void> | void;
  allUsers: User[];
};

const SUPERVISOR_ID = 'admin';

const CreateGroupDialog = ({ open, onClose, onCreate, allUsers }: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [leadTeachers, setLeadTeachers] = useState<string[]>([]);
  const [leadAdmin, setLeadAdmin] = useState<string>('');
  const [schedule, setSchedule] = useState('');
  const [conclusionLink, setConclusionLink] = useState('');
  const [conclusionPdf, setConclusionPdf] = useState<string | null>(null);
  const [conclusionPdfName, setConclusionPdfName] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const teachers = allUsers.filter(u => u.role === 'teacher');
  const admins = allUsers.filter(u => u.role === 'admin' && u.id !== SUPERVISOR_ID);
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
      await onCreate(groupName.trim(), finalUsers, schedule.trim(), conclusionLink.trim(), leadTeachers, leadAdmin || undefined, conclusionPdf || undefined);
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
    setConclusionLink('');
    setConclusionPdf(null);
    setConclusionPdfName('');
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Создать группу</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1 px-1">
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
              <p className="text-xs text-muted-foreground">Все педагоги добавляются в группу, но отметьте ведущих — они будут видны в участниках</p>
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
            <Input
              id="schedule"
              placeholder="Пн, Ср, Пт — 15:00"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conclusionLink">Ссылка на заключение</Label>
            <Input
              id="conclusionLink"
              placeholder="https://..."
              value={conclusionLink}
              onChange={(e) => setConclusionLink(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Заключение (PDF)</Label>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setConclusionPdfName(file.name);
                const reader = new FileReader();
                reader.onload = (ev) => setConclusionPdf(ev.target?.result as string);
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            {conclusionPdf ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-accent/30">
                <Icon name="FileText" size={18} className="text-primary flex-shrink-0" />
                <span className="text-sm truncate flex-1">{conclusionPdfName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => { setConclusionPdf(null); setConclusionPdfName(''); }}
                >
                  <Icon name="X" size={14} />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => pdfInputRef.current?.click()}
              >
                <Icon name="Upload" size={16} className="mr-2" />
                Загрузить PDF
              </Button>
            )}
          </div>
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