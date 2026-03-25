import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { SidebarMembersSection } from '@/components/sidebar/SidebarMembersSection';
import { SidebarScheduleSection } from '@/components/sidebar/SidebarScheduleSection';
import { SidebarActions } from '@/components/sidebar/SidebarActions';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student' | 'admin';
  avatar?: string;
};

type SimpleUser = { id: string; name: string; avatar?: string };

type Conclusion = {
  id: number;
  conclusionLink?: string;
  conclusionPdf?: string;
  createdDate: string;
};

type ChatInfo = {
  students: User[];
  parents: User[];
  teachers: User[];
  schedule?: string;
  conclusions?: Conclusion[];
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
  leadAdminId?: string;
  allAdmins?: SimpleUser[];
  onUpdateLeadTeachers?: (leadTeachers: string[]) => void;
  onUpdateLeadAdmin?: (leadAdmin: string | undefined) => void;
  onUpdateParticipants?: (participantIds: string[]) => void;
  onUpdateSchedule?: (schedule: string) => void;
  onAddConclusion?: (data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => void;
  onUpdateConclusion?: (conclusionId: number, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => void;
  onDeleteConclusion?: (conclusionId: number) => void;
  chatName?: string;
  onUpdateName?: (name: string) => void;
  isArchived?: boolean;
  onArchive?: () => void;
};

export const ChatInfoSidebar = ({ isOpen, onClose, chatInfo, userRole, onDeleteGroup, isTeachersGroup = false, allTeachers = [], allAdmins = [], allStudents = [], allParents = [], participantIds = [], leadTeacherIds = [], leadAdminId, onUpdateLeadTeachers, onUpdateLeadAdmin, onUpdateParticipants, onUpdateSchedule, onAddConclusion, onUpdateConclusion, onDeleteConclusion, chatName, onUpdateName, isArchived, onArchive }: ChatInfoSidebarProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher';
  const isAdmin = userRole === 'admin';

  return (
    <div className="fixed right-0 top-0 w-full md:w-[380px] bg-card border-l border-border flex flex-col z-50 shadow-lg" style={{ height: 'var(--app-height, 100dvh)' }}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Общая информация</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {chatName && !isTeachersGroup && isAdminOrTeacher && (
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

          <SidebarMembersSection
            chatInfo={chatInfo}
            isAdmin={isAdmin}
            isTeachersGroup={isTeachersGroup}
            allTeachers={allTeachers}
            allStudents={allStudents}
            allParents={allParents}
            allAdmins={allAdmins}
            participantIds={participantIds}
            leadTeacherIds={leadTeacherIds}
            leadAdminId={leadAdminId}
            onUpdateLeadTeachers={onUpdateLeadTeachers}
            onUpdateLeadAdmin={onUpdateLeadAdmin}
            onUpdateParticipants={onUpdateParticipants}
          />

          <SidebarScheduleSection
            chatInfo={chatInfo}
            isAdminOrTeacher={isAdminOrTeacher}
            isTeachersGroup={isTeachersGroup}
            onUpdateSchedule={onUpdateSchedule}
            onAddConclusion={onAddConclusion}
            onUpdateConclusion={onUpdateConclusion}
            onDeleteConclusion={onDeleteConclusion}
          />

          <SidebarActions
            isAdmin={isAdmin}
            isTeachersGroup={isTeachersGroup}
            isArchived={isArchived}
            onArchive={onArchive}
            onDeleteGroup={onDeleteGroup}
          />
        </div>
      </div>
    </div>
  );
};