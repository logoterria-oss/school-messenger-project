import { Suspense } from 'react';
import Icon from '@/components/ui/icon';
import { ChatArea } from '@/components/ChatArea';
import { MessageInput } from '@/components/MessageInput';
import { Message, Chat, User } from '@/types/chat.types';
import { MentionableUser } from '@/components/MessageInput';

const SUPERVISOR_ID = 'admin';

const roleLabels: Record<string, string> = {
  admin: 'админ',
  teacher: 'педагог',
  parent: 'родитель',
  student: 'ученик',
};

const getRoleLabel = (role: string, userId?: string) => {
  if (role === 'admin' && userId === SUPERVISOR_ID) return 'руководитель';
  return roleLabels[role] || role;
};

type ChatMainAreaProps = {
  selectedChat: string | null;
  selectedChatData: Chat | undefined;
  selectedGroup: string | null;
  selectedTopic: string | null;
  messages: Message[];
  messageText: string;
  attachments: Array<{ name: string; type: string; url: string }>;
  groupTopics: Record<string, Array<{ id: string; name: string; icon: string }>>;
  typingUsers: Array<{ userId: string; userName: string }>;
  allUsers: User[];
  chats: Chat[];
  userRole: string;
  userId: string | null;
  replyTo: Message | null;
  scrollToMessageId: string | null;
  muteVersion: number;
  messagesLoading: boolean;
  mobileShowChat: boolean;
  getPrivateChatDisplayName: (chat: { type: string; name: string; participants?: string[] }) => string;
  onReaction: (messageId: string, emoji: string) => void;
  onSelectTopic: (topicId: string | null) => void;
  onOpenChatInfo: () => void;
  onMobileBack: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenUsers: () => void;
  onAddStudent: () => void;
  onAddParent: () => void;
  onAddTeacher: () => void;
  onCreateGroup: () => void;
  onAddAdmin: () => void;
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onScrollComplete: () => void;
  onCancelScheduledMessage: (messageId: string) => void;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onScheduleMessage: (date: Date) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onCancelReply: () => void;
};

const ChatMainArea = ({
  selectedChat,
  selectedChatData,
  selectedGroup,
  selectedTopic,
  messages,
  messageText,
  attachments,
  groupTopics,
  typingUsers,
  allUsers,
  chats,
  userRole,
  userId,
  replyTo,
  scrollToMessageId,
  muteVersion,
  messagesLoading,
  mobileShowChat,
  getPrivateChatDisplayName,
  onReaction,
  onSelectTopic,
  onOpenChatInfo,
  onMobileBack,
  onLogout,
  onOpenProfile,
  onOpenSettings,
  onOpenUsers,
  onAddStudent,
  onAddParent,
  onAddTeacher,
  onCreateGroup,
  onAddAdmin,
  onReply,
  onForward,
  onDeleteMessage,
  onScrollComplete,
  onCancelScheduledMessage,
  onMessageChange,
  onSendMessage,
  onScheduleMessage,
  onFileUpload,
  onImageUpload,
  onRemoveAttachment,
  onCancelReply,
}: ChatMainAreaProps) => {
  if (selectedChat && selectedChatData) {
    return (
      <>
        <ChatArea
          messages={messages}
          onReaction={onReaction}
          chatName={selectedChatData ? getPrivateChatDisplayName(selectedChatData) : ''}
          isGroup={selectedGroup !== null}
          topics={selectedGroup ? groupTopics[selectedGroup] : undefined}
          selectedTopic={selectedTopic || undefined}
          onTopicSelect={onSelectTopic}
          typingUsers={typingUsers}
          userRole={userRole}
          onOpenChatInfo={onOpenChatInfo}
          chatId={selectedChat}
          onMobileBack={onMobileBack}
          userId={userId}
          onLogout={onLogout}
          onOpenProfile={onOpenProfile}
          onOpenSettings={onOpenSettings}
          onOpenUsers={onOpenUsers}
          onAddStudent={onAddStudent}
          onAddParent={onAddParent}
          onAddTeacher={onAddTeacher}
          onCreateGroup={onCreateGroup}
          onAddAdmin={onAddAdmin}
          onReply={onReply}
          onForward={onForward}
          onDeleteMessage={onDeleteMessage}
          allUsers={allUsers}
          scrollToMessageId={scrollToMessageId}
          onScrollComplete={onScrollComplete}
          onCancelScheduledMessage={onCancelScheduledMessage}
          muteVersion={muteVersion}
          messagesLoading={messagesLoading}
          participantsCount={(() => {
            const c = chats.find(c => c.id === selectedChat);
            if (!c?.participants) return 0;
            const nonLeadTeachers = allUsers
              .filter(u => u.role === 'teacher' && !(c.leadTeachers && c.leadTeachers.includes(u.id)))
              .map(u => u.id);
            return c.participants.filter(id => !nonLeadTeachers.includes(id)).length;
          })()}
        />
        <MessageInput
          messageText={messageText}
          attachments={attachments}
          onMessageChange={onMessageChange}
          onSendMessage={onSendMessage}
          onScheduleMessage={onScheduleMessage}
          onFileUpload={onFileUpload}
          onImageUpload={onImageUpload}
          onRemoveAttachment={onRemoveAttachment}
          replyTo={replyTo}
          onCancelReply={onCancelReply}
          disabled={
            (selectedTopic?.endsWith('-important') && userRole !== 'admin') ||
            (selectedTopic?.endsWith('-payment') && userRole === 'teacher')
          }
          disabledMessage={
            selectedTopic?.endsWith('-payment') && userRole === 'teacher'
              ? 'Педагогам недоступна отправка сообщений в раздел «Оплата»'
              : 'Только админ может писать в раздел «Важное»'
          }
          hintMessage={
            selectedTopic && (userRole === 'parent' || userRole === 'student' || userRole === 'teacher') &&
            ['-zoom', '-homework', '-reports', '-cancellation'].some(s => selectedTopic.endsWith(s))
              ? 'Админам не приходят уведомления из этого раздела. Если нужна помощь — упомяните "@админ"'
              : undefined
          }
          mentionableUsers={
            selectedChatData?.type === 'group'
              ? (() => {
                  const leadTeachers = selectedChatData.leadTeachers || [];
                  const leadAdminId = selectedChatData.leadAdmin;
                  const isPrimaryUser = (pid: string, role?: string) => {
                    if (pid === SUPERVISOR_ID) return true;
                    if (role === 'parent' || role === 'student') return true;
                    if (role === 'teacher' && leadTeachers.includes(pid)) return true;
                    if (role === 'admin' && pid === leadAdminId) return true;
                    return false;
                  };
                  const users = (selectedChatData.participants || [])
                    .filter(pid => pid !== userId)
                    .map(pid => {
                      if (pid === 'admin') return { id: 'admin', name: 'Виктория Абраменко', role: getRoleLabel('admin', 'admin'), avatar: 'https://cdn.poehali.dev/files/Админ.jpg', isPrimary: true };
                      const u = allUsers.find(u => u.id === pid);
                      return u ? { id: u.id, name: u.name, role: getRoleLabel(u.role, u.id), avatar: u.avatar, isPrimary: isPrimaryUser(u.id, u.role) } : null;
                    })
                    .filter(Boolean) as { id: string; name: string; role?: string; avatar?: string; isPrimary?: boolean }[];
                  const hasAdmins = (selectedChatData.participants || []).some(pid => {
                    if (pid === 'admin') return true;
                    const u = allUsers.find(u => u.id === pid);
                    return u?.role === 'admin';
                  });
                  if (hasAdmins) {
                    users.unshift({ id: '__admin_group__', name: 'админ', role: 'все админы', isPrimary: true });
                  }
                  return users;
                })()
              : undefined
          }
        />
      </>
    );
  }

  return (
    <div className="hidden md:flex flex-1 items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute top-[8%] right-[10%] w-[28%] h-[28%] opacity-[0.07]" viewBox="0 0 400 400" fill="none" style={{ animation: 'floatA 20s ease-in-out infinite' }}>
          <path d="M200 60 Q320 100 300 220 Q280 340 160 320 Q40 300 60 180 Q80 60 200 60Z" fill="#52B788" />
        </svg>
        <svg className="absolute bottom-[12%] left-[8%] w-[24%] h-[24%] opacity-[0.06]" viewBox="0 0 300 300" fill="none" style={{ animation: 'floatB 24s ease-in-out infinite' }}>
          <path d="M150 30 Q260 70 240 160 Q220 250 130 260 Q40 270 30 170 Q20 70 150 30Z" fill="#74C69D" />
        </svg>
        <svg className="absolute top-[50%] left-[15%] w-[18%] h-[18%] opacity-[0.05]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatE 22s ease-in-out infinite' }}>
          <circle cx="100" cy="100" r="80" fill="#95D5B2" />
        </svg>
        <svg className="absolute bottom-[20%] right-[15%] w-[14%] h-[14%] opacity-[0.06]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatD 18s ease-in-out infinite' }}>
          <path d="M100 20 Q170 50 160 120 Q150 190 80 180 Q10 170 20 100 Q30 30 100 20Z" fill="#40916C" />
        </svg>
        {[
          { top: '20%', left: '30%', size: 5, delay: '0s', dur: '16s' },
          { top: '35%', left: '70%', size: 6, delay: '3s', dur: '20s' },
          { top: '65%', left: '45%', size: 4, delay: '1s', dur: '14s' },
          { top: '75%', left: '25%', size: 5, delay: '5s', dur: '18s' },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#74C69D]"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              opacity: 0.12,
              animation: `floatDot ${dot.dur} ease-in-out ${dot.delay} infinite`,
            }}
          />
        ))}
      </div>
      <div className="text-center space-y-4 relative z-10">
        <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mx-auto">
          <Icon name="MessageSquare" size={24} className="text-muted-foreground/60" />
        </div>
        <div>
          <h2 className="text-base font-medium text-foreground/80 mb-1">
            Выберите чат
          </h2>
          <p className="text-xs text-muted-foreground/60">
            Начните общение с педагогами и родителями
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMainArea;