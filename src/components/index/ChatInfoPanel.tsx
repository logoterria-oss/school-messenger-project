import { Suspense } from 'react';
import { ChatInfoSidebar } from '@/components/ChatInfoSidebar';
import { TeacherAdminChatInfo } from '@/components/TeacherAdminChatInfo';
import { Chat, User, isAdminRole } from '@/types/chat.types';

type ChatInfoPanelProps = {
  selectedChat: string | null;
  chats: Chat[];
  allUsers: User[];
  userRole: string;
  userId: string | null;
  showChatInfo: boolean;
  isPrivateTeacherAdminChat: boolean;
  onCloseChatInfo: () => void;
  onUpdateTeacher: (teacherId: string, updates: Record<string, unknown>) => void;
  onArchiveChat: (chatId: string, archive: boolean) => void;
  onUpdateLeadTeachers: (chatId: string, leads: string[]) => void;
  onUpdateLeadAdmin: (chatId: string, admin: string) => void;
  onUpdateParticipants: (chatId: string, ids: string[]) => void;
  onUpdateGroupInfo: (chatId: string, updates: Record<string, unknown>) => void;
  onAddConclusion: (chatId: string, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => void;
  onUpdateConclusion: (chatId: string, conclusionId: number, data: { conclusionLink?: string; conclusionPdfBase64?: string; diagnosisDate?: string }) => void;
  onDeleteConclusion: (chatId: string, conclusionId: number) => void;
  onDeleteGroup: (chatId: string) => void;
  onCloseMobile: () => void;
};

const ChatInfoPanel = ({
  selectedChat,
  chats,
  allUsers,
  userRole,
  userId,
  showChatInfo,
  isPrivateTeacherAdminChat,
  onCloseChatInfo,
  onUpdateTeacher,
  onArchiveChat,
  onUpdateLeadTeachers,
  onUpdateLeadAdmin,
  onUpdateParticipants,
  onUpdateGroupInfo,
  onAddConclusion,
  onUpdateConclusion,
  onDeleteConclusion,
  onDeleteGroup,
  onCloseMobile,
}: ChatInfoPanelProps) => {
  if (!selectedChat) return null;

  const currentChat = chats.find(c => c.id === selectedChat);
  const chatParticipants = currentChat?.participants || [];

  const hasAdminParticipant = chatParticipants.some(pid => {
    const pUser = allUsers.find(u => u.id === pid);
    return isAdminRole(pUser?.role);
  });

  const isPrivateTeacherTeacherChat = currentChat?.type === 'private' && 
    !hasAdminParticipant &&
    (userRole === 'teacher' || isAdminRole(userRole));

  let partnerSlotsData: { name: string; slots: string[] } | undefined;
  let partnerLessonFormsData: { name: string; lessonForms?: 'individual' | 'group' | 'both' } | undefined;
  if (isPrivateTeacherTeacherChat) {
    const partnerId = chatParticipants.find(id => id !== userId);
    const partner = partnerId ? allUsers.find(u => u.id === partnerId) : undefined;
    if (partner && partner.role === 'teacher') {
      partnerSlotsData = { name: partner.name, slots: partner.availableSlots || [] };
      partnerLessonFormsData = { name: partner.name, lessonForms: partner.lessonForms };
    }
  }

  if (isPrivateTeacherAdminChat) {
    let teacherData;

    if (isAdminRole(userRole)) {
      const teacherId = chatParticipants.find(id => id !== userId);
      teacherData = allUsers.find(u => u.id === teacherId && u.role === 'teacher');
    } else if (userRole === 'teacher') {
      teacherData = allUsers.find(u => u.id === userId);
    }

    if (teacherData) {
      return (
        <Suspense fallback={null}>
          <TeacherAdminChatInfo
            key={`teacher-info-${teacherData.id}-${teacherData.phone}-${teacherData.email}-${teacherData.availableSlots?.length || 0}-${teacherData.lessonForms || ''}`}
            isOpen={showChatInfo}
            onClose={onCloseChatInfo}
            teacherInfo={{
              id: teacherData.id,
              name: teacherData.name,
              phone: teacherData.phone,
              email: teacherData.email || '',
              availableSlots: teacherData.availableSlots || [],
              educationDocs: teacherData.educationDocs || [],
              lessonForms: teacherData.lessonForms,
            }}
            onUpdateTeacher={(updates) => onUpdateTeacher(teacherData.id, updates)}
            isAdmin={isAdminRole(userRole)}
            isArchived={currentChat?.isArchived}
            onArchive={() => {
              if (selectedChat) {
                onArchiveChat(selectedChat, !currentChat?.isArchived);
                onCloseChatInfo();
              }
            }}
          />
        </Suspense>
      );
    }
  }

  return (
    <Suspense fallback={null}>
      <ChatInfoSidebar
        isOpen={showChatInfo}
        onClose={onCloseChatInfo}
        userRole={userRole}
        isTeachersGroup={currentChat?.id === 'teachers-group'}
        chatInfo={{
          students: allUsers.filter(u => u.role === 'student' && chatParticipants.includes(u.id)),
          parents: allUsers.filter(u => u.role === 'parent' && chatParticipants.includes(u.id)),
          teachers: currentChat?.leadTeachers && currentChat.leadTeachers.length > 0
            ? allUsers.filter(u => u.role === 'teacher' && currentChat.leadTeachers!.includes(u.id))
            : [],
          schedule: currentChat?.type === 'group' ? (currentChat?.schedule || 'ПН в 18:00, ЧТ в 15:00 - групповые: нейропсихолог (пед. Нонна Мельникова): развитие регуляторных функций\n\nСБ в 12:00 - индивидуальные: логопед (пед. Валерия): развитие фонематических процессов (в т.ч. фонематического восприятия), коррекция ЛГНР, позднее - коррекция дизорфографии') : currentChat?.schedule,
          conclusions: currentChat?.conclusions || [],
        }}
        partnerSlots={partnerSlotsData}
        partnerLessonForms={partnerLessonFormsData}
        isPrivateTeacherChat={isPrivateTeacherTeacherChat && !!partnerSlotsData}
        allTeachers={allUsers.filter(u => u.role === 'teacher').map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
        allAdmins={allUsers.filter(u => isAdminRole(u.role) && chatParticipants.includes(u.id)).map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
        allStudents={allUsers.filter(u => u.role === 'student').map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
        allParents={allUsers.filter(u => u.role === 'parent').map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
        participantIds={chatParticipants}
        leadTeacherIds={currentChat?.leadTeachers || []}
        leadAdminId={currentChat?.leadAdmin}
        onUpdateLeadTeachers={(leads) => selectedChat && onUpdateLeadTeachers(selectedChat, leads)}
        onUpdateLeadAdmin={(admin) => selectedChat && onUpdateLeadAdmin(selectedChat, admin)}
        onUpdateParticipants={(ids) => selectedChat && onUpdateParticipants(selectedChat, ids)}
        chatName={currentChat?.name}
        onUpdateName={(name) => selectedChat && onUpdateGroupInfo(selectedChat, { name })}
        onUpdateSchedule={(schedule) => selectedChat && onUpdateGroupInfo(selectedChat, { schedule })}
        onAddConclusion={(data) => selectedChat && onAddConclusion(selectedChat, data)}
        onUpdateConclusion={(conclusionId, data) => selectedChat && onUpdateConclusion(selectedChat, conclusionId, data)}
        onDeleteConclusion={(conclusionId) => selectedChat && onDeleteConclusion(selectedChat, conclusionId)}
        onDeleteGroup={() => {
          if (selectedChat && confirm('Вы уверены, что хотите удалить эту группу? Это действие нельзя отменить.')) {
            onDeleteGroup(selectedChat);
            onCloseChatInfo();
            onCloseMobile();
          }
        }}
        isArchived={currentChat?.isArchived}
        onArchive={() => {
          if (selectedChat) {
            onArchiveChat(selectedChat, !currentChat?.isArchived);
            onCloseChatInfo();
            onCloseMobile();
          }
        }}
      />
    </Suspense>
  );
};

export default ChatInfoPanel;