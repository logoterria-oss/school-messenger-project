import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student';
  avatar?: string;
};

type SimpleUser = { id: string; name: string; avatar?: string };

type ChatInfo = {
  students: User[];
  parents: User[];
  teachers: User[];
  schedule?: string;
  conclusionLink?: string;
};

type ChatInfoSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  chatInfo: ChatInfo;
  userRole: 'admin' | 'teacher' | 'parent' | 'student';
  onDeleteGroup?: () => void;
  isTeachersGroup?: boolean;
  allTeachers?: SimpleUser[];
  allStudents?: SimpleUser[];
  allParents?: SimpleUser[];
  participantIds?: string[];
  leadTeacherIds?: string[];
  onUpdateLeadTeachers?: (leadTeachers: string[]) => void;
  onUpdateParticipants?: (participantIds: string[]) => void;
  onUpdateSchedule?: (schedule: string) => void;
  onUpdateConclusionLink?: (link: string) => void;
  chatName?: string;
  onUpdateName?: (name: string) => void;
};

export const ChatInfoSidebar = ({ isOpen, onClose, chatInfo, userRole, onDeleteGroup, isTeachersGroup = false, allTeachers = [], allStudents = [], allParents = [], participantIds = [], leadTeacherIds = [], onUpdateLeadTeachers, onUpdateParticipants, onUpdateSchedule, onUpdateConclusionLink, chatName, onUpdateName }: ChatInfoSidebarProps) => {
  const [isEditingLeads, setIsEditingLeads] = useState(false);
  const [editLeads, setEditLeads] = useState<string[]>([]);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editSchedule, setEditSchedule] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isEditingConclusion, setIsEditingConclusion] = useState(false);
  const [editConclusion, setEditConclusion] = useState('');
  const [isEditingStudents, setIsEditingStudents] = useState(false);
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [isEditingParents, setIsEditingParents] = useState(false);
  const [editParentIds, setEditParentIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  if (!isOpen) return null;

  const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher';
  const isAdmin = userRole === 'admin';

  const startEditLeads = () => { setEditLeads([...leadTeacherIds]); setIsEditingLeads(true); };
  const saveLeads = () => { onUpdateLeadTeachers?.(editLeads); setIsEditingLeads(false); };
  const cancelEditLeads = () => { setIsEditingLeads(false); setEditLeads([]); };
  const toggleLead = (id: string) => setEditLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const startEditSchedule = () => { setEditSchedule(chatInfo.schedule || ''); setIsEditingSchedule(true); };
  const saveSchedule = () => { onUpdateSchedule?.(editSchedule.trim()); setIsEditingSchedule(false); };

  const startEditConclusion = () => { setEditConclusion(chatInfo.conclusionLink || ''); setIsEditingConclusion(true); };
  const saveConclusion = () => { onUpdateConclusionLink?.(editConclusion.trim()); setIsEditingConclusion(false); };

  const currentStudentIds = participantIds.filter(id => allStudents.some(s => s.id === id));
  const currentParentIds = participantIds.filter(id => allParents.some(p => p.id === id));

  const startEditStudents = () => { setEditStudentIds([...currentStudentIds]); setMemberSearch(''); setIsEditingStudents(true); };
  const saveStudents = () => {
    const nonStudentIds = participantIds.filter(id => !allStudents.some(s => s.id === id));
    onUpdateParticipants?.([...nonStudentIds, ...editStudentIds]);
    setIsEditingStudents(false);
  };

  const startEditParents = () => { setEditParentIds([...currentParentIds]); setMemberSearch(''); setIsEditingParents(true); };
  const saveParents = () => {
    const nonParentIds = participantIds.filter(id => !allParents.some(p => p.id === id));
    onUpdateParticipants?.([...nonParentIds, ...editParentIds]);
    setIsEditingParents(false);
  };

  const toggleStudent = (id: string) => setEditStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleParent = (id: string) => setEditParentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredAllStudents = allStudents.filter(s => s.name.toLowerCase().includes(memberSearch.toLowerCase()));
  const filteredAllParents = allParents.filter(p => p.name.toLowerCase().includes(memberSearch.toLowerCase()));

  return (
    <div className="fixed right-0 top-0 h-screen w-[380px] bg-card border-l border-border flex flex-col z-50 shadow-lg">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Информация о чате</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {chatName && !isTeachersGroup && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Icon name="MessageSquare" size={16} />
                  Название группы
                </h4>
                {isAdmin && !isEditingName && onUpdateName && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditName(chatName); setIsEditingName(true); }}>
                    <Icon name="Pencil" size={14} className="mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
              {isEditingName ? (
                <div className="space-y-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Название группы" className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { if (editName.trim()) { onUpdateName?.(editName.trim()); setIsEditingName(false); } }} className="flex-1">Сохранить</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingName(false)} className="flex-1">Отмена</Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-accent/50 text-sm font-medium">{chatName}</div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Icon name="GraduationCap" size={16} />
                Ученики
              </h4>
              {isAdmin && !isTeachersGroup && !isEditingStudents && onUpdateParticipants && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditStudents}>
                  <Icon name="Pencil" size={14} className="mr-1" />
                  Изменить
                </Button>
              )}
            </div>
            {isEditingStudents ? (
              <div className="space-y-3">
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="text-sm"
                />
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  <div className="p-3 space-y-2">
                    {filteredAllStudents.length > 0 ? filteredAllStudents.map((student) => (
                      <div key={student.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                        <Checkbox
                          id={`edit-student-${student.id}`}
                          checked={editStudentIds.includes(student.id)}
                          onCheckedChange={() => toggleStudent(student.id)}
                        />
                        <label htmlFor={`edit-student-${student.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs"><Icon name="User" size={14} /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{student.name}</span>
                        </label>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Учеников не найдено</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveStudents} className="flex-1">Сохранить</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingStudents(false)} className="flex-1">Отмена</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {chatInfo.students.length > 0 ? chatInfo.students.map((student) => (
                  <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary"><Icon name="User" size={18} /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{student.name}</p></div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Нет учеников</p>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Icon name="Users" size={16} />
                Родители
              </h4>
              {isAdmin && !isTeachersGroup && !isEditingParents && onUpdateParticipants && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditParents}>
                  <Icon name="Pencil" size={14} className="mr-1" />
                  Изменить
                </Button>
              )}
            </div>
            {isEditingParents ? (
              <div className="space-y-3">
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="text-sm"
                />
                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  <div className="p-3 space-y-2">
                    {filteredAllParents.length > 0 ? filteredAllParents.map((parent) => (
                      <div key={parent.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                        <Checkbox
                          id={`edit-parent-${parent.id}`}
                          checked={editParentIds.includes(parent.id)}
                          onCheckedChange={() => toggleParent(parent.id)}
                        />
                        <label htmlFor={`edit-parent-${parent.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={parent.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs"><Icon name="User" size={14} /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{parent.name}</span>
                        </label>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Родителей не найдено</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveParents} className="flex-1">Сохранить</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingParents(false)} className="flex-1">Отмена</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {chatInfo.parents.length > 0 ? chatInfo.parents.map((parent) => (
                  <div key={parent.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={parent.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary"><Icon name="User" size={18} /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{parent.name}</p></div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">Нет родителей</p>
                )}
              </div>
            )}
          </div>

          {!isTeachersGroup && (
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
                  <Textarea value={editSchedule} onChange={(e) => setEditSchedule(e.target.value)} placeholder="ПН в 18:00, ЧТ в 15:00..." rows={4} className="resize-none text-sm" />
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
          )}

          {!isTeachersGroup && (
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
                <p className="text-sm text-muted-foreground">Заключение не добавлено</p>
              )}
            </div>
          )}

          {isAdmin && !isTeachersGroup && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm text-muted-foreground">Ведущие педагоги</h4>
                {!isEditingLeads && onUpdateLeadTeachers && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditLeads}>
                    <Icon name="Pencil" size={14} className="mr-1" />
                    Изменить
                  </Button>
                )}
              </div>
              {isEditingLeads ? (
                <div className="space-y-3">
                  <div className="border rounded-md p-3 space-y-2">
                    {allTeachers.map((teacher) => (
                      <div key={teacher.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                        <Checkbox id={`edit-lead-${teacher.id}`} checked={editLeads.includes(teacher.id)} onCheckedChange={() => toggleLead(teacher.id)} />
                        <label htmlFor={`edit-lead-${teacher.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={teacher.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs"><Icon name="User" size={14} /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{teacher.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveLeads} className="flex-1">Сохранить</Button>
                    <Button size="sm" variant="outline" onClick={cancelEditLeads} className="flex-1">Отмена</Button>
                  </div>
                </div>
              ) : (
                <>
                  {chatInfo.teachers.length > 0 ? (
                    <div className="space-y-2">
                      {chatInfo.teachers.map((teacher) => (
                        <div key={teacher.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={teacher.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs"><Icon name="User" size={14} /></AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium">{teacher.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ведущие педагоги не назначены</p>
                  )}
                </>
              )}
            </div>
          )}

          {isAdmin && onDeleteGroup && (
            <div className="pt-4 border-t border-border">
              <Button variant="destructive" className="w-full" onClick={onDeleteGroup}>
                <Icon name="Trash2" size={16} className="mr-2" />
                Удалить группу
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
