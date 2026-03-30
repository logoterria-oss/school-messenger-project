import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { ContactInfoSection } from '@/components/teacher-admin/ContactInfoSection';
import { SlotsSection } from '@/components/teacher-admin/SlotsSection';
import { LessonFormsSection } from '@/components/teacher-admin/LessonFormsSection';
import { EducationDocsSection } from '@/components/teacher-admin/EducationDocsSection';

type LessonFormsType = 'individual' | 'group' | 'both';

type TeacherInfo = {
  id: string;
  name: string;
  phone: string;
  email: string;
  availableSlots: string[];
  educationDocs: string[];
  lessonForms?: LessonFormsType;
};

type TeacherAdminChatInfoProps = {
  isOpen: boolean;
  onClose: () => void;
  teacherInfo: TeacherInfo;
  onUpdateTeacher: (info: Partial<TeacherInfo>) => void;
  isAdmin?: boolean;
  isArchived?: boolean;
  onArchive?: () => void;
};

export const TeacherAdminChatInfo = ({ isOpen, onClose, teacherInfo, onUpdateTeacher, isAdmin, isArchived, onArchive }: TeacherAdminChatInfoProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 w-full md:w-[380px] bg-card border-l border-border flex flex-col z-50 shadow-lg" style={{ height: 'var(--app-height, 100dvh)' }}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Основное</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <ContactInfoSection
            phone={teacherInfo.phone}
            email={teacherInfo.email}
            onUpdatePhone={(phone) => onUpdateTeacher({ phone })}
            onUpdateEmail={(email) => onUpdateTeacher({ email })}
          />

          <SlotsSection
            availableSlots={teacherInfo.availableSlots}
            onUpdateSlots={(availableSlots) => onUpdateTeacher({ availableSlots })}
          />

          <LessonFormsSection
            lessonForms={teacherInfo.lessonForms}
            onUpdate={(lessonForms) => onUpdateTeacher({ lessonForms })}
          />

          <EducationDocsSection
            educationDocs={teacherInfo.educationDocs}
            onUpdateDocs={(educationDocs) => onUpdateTeacher({ educationDocs })}
          />
        </div>
      </ScrollArea>

      {isAdmin && onArchive && (
        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onArchive}>
            <Icon name={isArchived ? 'ArchiveRestore' : 'Archive'} size={16} className="mr-2" />
            {isArchived ? 'Вернуть из архива' : 'В архив'}
          </Button>
        </div>
      )}
    </div>
  );
};
