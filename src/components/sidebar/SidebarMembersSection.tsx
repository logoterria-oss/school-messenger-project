import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student' | 'admin';
  avatar?: string;
};

type SimpleUser = { id: string; name: string; avatar?: string };

type SidebarMembersSectionProps = {
  chatInfo: {
    students: User[];
    parents: User[];
    teachers: User[];
  };
  isAdmin: boolean;
  isTeachersGroup: boolean;
  allTeachers: SimpleUser[];
  allStudents: SimpleUser[];
  allParents: SimpleUser[];
  allAdmins: SimpleUser[];
  participantIds: string[];
  leadTeacherIds: string[];
  leadAdminId?: string;
  onUpdateLeadTeachers?: (leadTeachers: string[]) => void;
  onUpdateLeadAdmin?: (leadAdmin: string | undefined) => void;
  onUpdateParticipants?: (participantIds: string[]) => void;
};

export const SidebarMembersSection = ({
  chatInfo,
  isAdmin,
  isTeachersGroup,
  allTeachers,
  allStudents,
  allParents,
  allAdmins,
  participantIds,
  leadTeacherIds,
  leadAdminId,
  onUpdateLeadTeachers,
  onUpdateLeadAdmin,
  onUpdateParticipants,
}: SidebarMembersSectionProps) => {
  const [isEditingLeads, setIsEditingLeads] = useState(false);
  const [editLeads, setEditLeads] = useState<string[]>([]);
  const [isEditingLeadAdmin, setIsEditingLeadAdmin] = useState(false);
  const [editLeadAdmin, setEditLeadAdmin] = useState<string>('');
  const [isEditingStudents, setIsEditingStudents] = useState(false);
  const [editStudentIds, setEditStudentIds] = useState<string[]>([]);
  const [isEditingParents, setIsEditingParents] = useState(false);
  const [editParentIds, setEditParentIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const startEditLeads = () => { setEditLeads([...leadTeacherIds]); setIsEditingLeads(true); };
  const saveLeads = () => { onUpdateLeadTeachers?.(editLeads); setIsEditingLeads(false); };
  const cancelEditLeads = () => { setIsEditingLeads(false); setEditLeads([]); };
  const toggleLead = (id: string) => setEditLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

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
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm text-muted-foreground">Ученики</h4>
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
          <div className="space-y-1">
            {chatInfo.students.length > 0 ? chatInfo.students.map((student) => (
              <p key={student.id} className="text-sm py-0.5 truncate">{student.name}</p>
            )) : (
              <p className="text-sm text-muted-foreground">Нет учеников</p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm text-muted-foreground">Родители</h4>
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
          <div className="space-y-1">
            {chatInfo.parents.length > 0 ? chatInfo.parents.map((parent) => (
              <p key={parent.id} className="text-sm py-0.5 truncate">{parent.name}</p>
            )) : (
              <p className="text-sm text-muted-foreground">Нет родителей</p>
            )}
          </div>
        )}
      </div>

      {!isTeachersGroup && allAdmins.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Icon name="Shield" size={16} />
              Ведущий админ
            </h4>
            {isAdmin && !isEditingLeadAdmin && onUpdateLeadAdmin && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditLeadAdmin(leadAdminId || ''); setIsEditingLeadAdmin(true); }}>
                <Icon name="Pencil" size={14} className="mr-1" />
                Изменить
              </Button>
            )}
          </div>
          {isEditingLeadAdmin ? (
            <div className="space-y-3">
              <div className="border rounded-md p-3 space-y-2">
                {allAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => setEditLeadAdmin(editLeadAdmin === admin.id ? '' : admin.id)}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      editLeadAdmin === admin.id ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    }`}>
                      {editLeadAdmin === admin.id && <Icon name="Check" size={12} className="text-white" />}
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={admin.avatar} />
                      <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs"><Icon name="Shield" size={14} /></AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{admin.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onUpdateLeadAdmin?.(editLeadAdmin || undefined); setIsEditingLeadAdmin(false); }} className="flex-1">Сохранить</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingLeadAdmin(false)} className="flex-1">Отмена</Button>
              </div>
            </div>
          ) : (
            <>
              {leadAdminId ? (
                <div className="space-y-1">
                  {(() => {
                    const admin = allAdmins.find(a => a.id === leadAdminId);
                    if (!admin) return <p className="text-sm text-muted-foreground">Ведущий админ не найден</p>;
                    return <p className="text-sm py-0.5">{admin.name}</p>;
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ведущий админ не назначен</p>
              )}
            </>
          )}
        </div>
      )}

      {!isTeachersGroup && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm text-muted-foreground">Ведущие педагоги</h4>
            {isAdmin && !isEditingLeads && onUpdateLeadTeachers && (
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
                <div className="space-y-1">
                  {chatInfo.teachers.map((teacher) => (
                    <p key={teacher.id} className="text-sm py-0.5">{teacher.name}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ведущие педагоги не назначены</p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SidebarMembersSection;