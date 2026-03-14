import { useState, Suspense } from 'react';
import Icon from '@/components/ui/icon';
import { LoginScreen } from '@/components/LoginScreen';
import { useChatLogic } from '@/hooks/useChatLogic';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { MessageInput } from '@/components/MessageInput';
import { ProfileSettings } from '@/components/ProfileSettings';
import { AppSettings } from '@/components/AppSettings';
import { AllUsersView } from '@/components/AllUsersView';
import { AddStudentDialog } from '@/components/AddStudentDialog';
import { AddParentDialog } from '@/components/AddParentDialog';
import { AddTeacherDialog } from '@/components/AddTeacherDialog';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import { ChatInfoSidebar } from '@/components/ChatInfoSidebar';
import { TeacherAdminChatInfo } from '@/components/TeacherAdminChatInfo';
import { AddAdminDialog } from '@/components/AddAdminDialog';
import ForwardMessageDialog from '@/components/ForwardMessageDialog';
import { Message } from '@/types/chat.types';

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

const Index = () => {
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);

  const {
    isAuthenticated,
    userRole,
    userName,
    userId,
    currentView,
    selectedChat,
    selectedGroup,
    selectedTopic,
    messageText,
    attachments,
    chats,
    groupTopics,
    messages,
    allUsers,
    typingUsers,
    setMessageText,
    handleTyping,
    handleSelectChat,
    handleSelectTopic,
    handleSendMessage,
    handleFileUpload,
    handleImageUpload,
    removeAttachment,
    handleLogin,
    handleLogout,
    handleOpenProfile,
    handleOpenSettings,
    handleOpenUsers,
    handleBackToChat,
    handleReaction,
    handleDeleteMessage,
    handleAddStudent,
    handleAddParent,
    handleAddTeacher,
    handleCreateGroup,
    handleDeleteGroup,
    handleArchiveChat,
    handleDeleteUser,
    handleUpdateTeacher,
    handleUpdateLeadTeachers,
    handleUpdateLeadAdmin,
    handleUpdateParticipants,
    handleUpdateGroupInfo,
    handleAddAdmin,
    replyTo,
    handleReply,
    handleCancelReply,
    handleForwardMessage,
  } = useChatLogic();

  const selectedChatData = chats.find(c => c.id === selectedChat);
  const isPrivateTeacherAdminChat = selectedChatData?.type === 'private' && 
    selectedChatData?.participants?.includes('admin') && 
    (userRole === 'admin' || userRole === 'teacher');

  const handleSelectChatMobile = (chatId: string) => {
    handleSelectChat(chatId);
    setMobileShowChat(true);
  };

  const handleMobileBack = () => {
    setMobileShowChat(false);
  };

  if (!isAuthenticated || !userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentView === 'profile') {
    return (
      <div className="flex bg-background" style={{ height: 'var(--app-height, 100dvh)' }}>
        <ProfileSettings userRole={userRole} onBack={handleBackToChat} />
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="flex bg-background" style={{ height: 'var(--app-height, 100dvh)' }}>
        <AppSettings onBack={handleBackToChat} />
      </div>
    );
  }

  if (currentView === 'users') {
    return (
      <div className="flex bg-background" style={{ height: 'var(--app-height, 100dvh)' }}>
        <AllUsersView users={allUsers} onBack={handleBackToChat} onDeleteUser={handleDeleteUser} />
      </div>
    );
  }

  return (
    <div className="flex bg-background" style={{ height: 'var(--app-height, 100dvh)' }}>
      <div className={`${mobileShowChat ? 'hidden' : 'flex'} md:flex flex-shrink-0 w-full md:w-auto`}>
        <ChatSidebar
          onLogout={handleLogout}
          onOpenProfile={handleOpenProfile}
          onOpenSettings={handleOpenSettings}
          onOpenUsers={handleOpenUsers}
          onAddStudent={() => setShowAddStudent(true)}
          onAddParent={() => setShowAddParent(true)}
          onAddTeacher={() => setShowAddTeacher(true)}
          onCreateGroup={() => setShowCreateGroup(true)}
          onAddAdmin={() => setShowAddAdmin(true)}
          userRole={userRole}
          userName={userName}
          userId={userId}
          chats={chats}
          allUsers={allUsers}
          selectedChat={selectedChat}
          selectedTopic={selectedTopic}
          groupTopics={groupTopics}
          onSelectChat={handleSelectChatMobile}
          onTopicSelect={handleSelectTopic}
          onArchiveChat={handleArchiveChat}
        />
      </div>

      <AddStudentDialog
        open={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        onAdd={handleAddStudent}
      />

      <AddParentDialog
        open={showAddParent}
        onClose={() => setShowAddParent(false)}
        onAdd={handleAddParent}
      />

      <AddTeacherDialog
        open={showAddTeacher}
        onClose={() => setShowAddTeacher(false)}
        onAdd={handleAddTeacher}
      />

      <CreateGroupDialog
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleCreateGroup}
        allUsers={allUsers}
      />

      <AddAdminDialog
        open={showAddAdmin}
        onClose={() => setShowAddAdmin(false)}
        onAdd={handleAddAdmin}
      />

      <ForwardMessageDialog
        open={forwardMessage !== null}
        onClose={() => setForwardMessage(null)}
        message={forwardMessage}
        chats={chats.map(c => ({ id: c.id, name: c.name, type: c.type }))}
        topics={groupTopics}
        currentChatId={selectedChat}
        currentTopicId={selectedTopic}
        chatMentionableUsers={
          Object.fromEntries(
            chats
              .filter(c => c.type === 'group' && c.participants?.length)
              .map(c => [
                c.id,
                (c.participants || [])
                  .filter(pid => pid !== userId)
                  .map(pid => {
                    if (pid === 'admin') return { id: 'admin', name: 'Виктория Абраменко', role: roleLabels['admin'], avatar: 'https://cdn.poehali.dev/files/Админ.jpg' };
                    const u = allUsers.find(u => u.id === pid);
                    return u ? { id: u.id, name: u.name, role: roleLabels[u.role] || u.role, avatar: u.avatar } : null;
                  })
                  .filter(Boolean) as { id: string; name: string; role?: string; avatar?: string }[]
              ])
          )
        }
        onForward={async (targetChatId, targetTopicId, comment) => {
          if (forwardMessage) {
            const msgId = await handleForwardMessage(forwardMessage, targetChatId, targetTopicId, comment);
            setForwardMessage(null);
            handleSelectChat(targetChatId);
            if (targetTopicId) {
              handleSelectTopic(targetTopicId);
            }
            setMobileShowChat(true);
            setScrollToMessageId(msgId);
          }
        }}
      />

      <div className={`flex-1 flex min-w-0 min-h-0 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {selectedChat && selectedChatData ? (
            <>
              <ChatArea 
                messages={messages}
                onReaction={handleReaction}
                chatName={chats.find(c => c.id === selectedChat)?.name || ''}
                isGroup={selectedGroup !== null}
                topics={selectedGroup ? groupTopics[selectedGroup] : undefined}
                selectedTopic={selectedTopic || undefined}
                onTopicSelect={handleSelectTopic}
                typingUsers={typingUsers}
                userRole={userRole}
                onOpenChatInfo={() => setShowChatInfo(true)}
                chatId={selectedChat}
                onMobileBack={handleMobileBack}
                userId={userId}
                onLogout={handleLogout}
                onOpenProfile={handleOpenProfile}
                onOpenSettings={handleOpenSettings}
                onOpenUsers={handleOpenUsers}
                onAddStudent={() => setShowAddStudent(true)}
                onAddParent={() => setShowAddParent(true)}
                onAddTeacher={() => setShowAddTeacher(true)}
                onCreateGroup={() => setShowCreateGroup(true)}
                onAddAdmin={() => setShowAddAdmin(true)}
                onReply={handleReply}
                onForward={(msg) => setForwardMessage(msg)}
                onDeleteMessage={handleDeleteMessage}
                allUsers={allUsers}
                scrollToMessageId={scrollToMessageId}
                onScrollComplete={() => setScrollToMessageId(null)}
                participantsCount={(() => {
                  const c = chats.find(c => c.id === selectedChat);
                  if (!c?.participants) return 0;
                  if (c.leadTeachers && c.leadTeachers.length > 0) {
                    const nonLeadTeachers = allUsers.filter(u => u.role === 'teacher' && !c.leadTeachers!.includes(u.id)).map(u => u.id);
                    return c.participants.filter(id => !nonLeadTeachers.includes(id)).length;
                  }
                  return c.participants.length;
                })()}
              />
              <MessageInput 
                messageText={messageText}
                attachments={attachments}
                onMessageChange={handleTyping}
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                onImageUpload={handleImageUpload}
                onRemoveAttachment={removeAttachment}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
                disabled={selectedTopic?.endsWith('-important') && userRole !== 'admin'}
                disabledMessage="Только админ может писать в раздел «Важное»"
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
                        return (selectedChatData.participants || [])
                          .filter(pid => pid !== userId)
                          .map(pid => {
                            if (pid === 'admin') return { id: 'admin', name: 'Виктория Абраменко', role: getRoleLabel('admin', 'admin'), avatar: 'https://cdn.poehali.dev/files/Админ.jpg', isPrimary: true };
                            const u = allUsers.find(u => u.id === pid);
                            return u ? { id: u.id, name: u.name, role: getRoleLabel(u.role, u.id), avatar: u.avatar, isPrimary: isPrimaryUser(u.id, u.role) } : null;
                          })
                          .filter(Boolean) as { id: string; name: string; role?: string; avatar?: string; isPrimary?: boolean }[];
                      })()
                    : undefined
                }
              />
            </>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <svg className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] opacity-[0.08]" viewBox="0 0 400 400" fill="none" style={{ animation: 'floatA 18s ease-in-out infinite' }}>
                  <path d="M50 200 Q100 50 200 100 Q300 150 250 250 Q200 350 100 300 Q0 250 50 200Z" fill="#52B788" />
                  <path d="M120 180 Q160 80 220 130 Q280 180 240 260 Q200 340 140 290 Q80 240 120 180Z" fill="#74C69D" />
                </svg>
                <svg className="absolute top-[10%] right-[-3%] w-[25%] h-[25%] opacity-[0.07]" viewBox="0 0 300 300" fill="none" style={{ animation: 'floatB 22s ease-in-out infinite' }}>
                  <path d="M150 20 Q250 60 230 150 Q210 240 120 260 Q30 280 50 180 Q70 80 150 20Z" fill="#40916C" />
                </svg>
                <svg className="absolute bottom-[-5%] left-[5%] w-[30%] h-[30%] opacity-[0.07]" viewBox="0 0 350 350" fill="none" style={{ animation: 'floatC 20s ease-in-out infinite' }}>
                  <path d="M175 30 Q300 80 280 175 Q260 280 160 300 Q60 310 40 210 Q20 110 175 30Z" fill="#74C69D" />
                  <circle cx="80" cy="250" r="40" fill="#95D5B2" opacity="0.5" />
                </svg>
                <svg className="absolute bottom-[10%] right-[2%] w-[20%] h-[20%] opacity-[0.06]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatD 16s ease-in-out infinite' }}>
                  <path d="M30 100 Q60 20 120 40 Q180 60 170 130 Q160 190 90 180 Q20 170 30 100Z" fill="#52B788" />
                </svg>
                <svg className="absolute top-[40%] left-[2%] w-[15%] h-[15%] opacity-[0.05]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatE 25s ease-in-out infinite' }}>
                  <circle cx="100" cy="100" r="80" fill="#95D5B2" />
                </svg>
                {[
                  { top: '15%', left: '20%', size: 6, delay: '0s', dur: '14s' },
                  { top: '25%', left: '75%', size: 8, delay: '2s', dur: '18s' },
                  { top: '70%', left: '15%', size: 5, delay: '4s', dur: '16s' },
                  { top: '80%', left: '60%', size: 7, delay: '1s', dur: '20s' },
                  { top: '45%', left: '85%', size: 4, delay: '3s', dur: '15s' },
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
          )}
        </div>

        {selectedChat && (() => {
          const currentChat = chats.find(c => c.id === selectedChat);
          const chatParticipants = currentChat?.participants || [];
          
          if (isPrivateTeacherAdminChat) {
            let teacherData;
            
            if (userRole === 'admin') {
              // Админ видит информацию о педагоге
              const teacherId = chatParticipants.find(id => id !== 'admin');
              teacherData = allUsers.find(u => u.id === teacherId);
            } else if (userRole === 'teacher') {
              // Педагог видит свою собственную информацию
              teacherData = allUsers.find(u => u.id === userId);
            }

            if (teacherData) {
              return (
                <Suspense fallback={null}>
                  <TeacherAdminChatInfo
                    key={`teacher-info-${teacherData.id}-${teacherData.phone}-${teacherData.email}-${teacherData.availableSlots?.length || 0}`}
                    isOpen={showChatInfo}
                    onClose={() => setShowChatInfo(false)}
                    teacherInfo={{
                      id: teacherData.id,
                      name: teacherData.name,
                      phone: teacherData.phone,
                      email: teacherData.email || '',
                      availableSlots: teacherData.availableSlots || [],
                      educationDocs: teacherData.educationDocs || [],
                    }}
                    onUpdateTeacher={(updates) => handleUpdateTeacher(teacherData.id, updates)}
                    isAdmin={userRole === 'admin'}
                    isArchived={currentChat?.isArchived}
                    onArchive={() => {
                      if (selectedChat) {
                        handleArchiveChat(selectedChat, !currentChat?.isArchived);
                        setShowChatInfo(false);
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
                onClose={() => setShowChatInfo(false)}
                userRole={userRole}
                isTeachersGroup={currentChat?.id === 'teachers-group'}
                chatInfo={{
                  students: allUsers.filter(u => u.role === 'student' && chatParticipants.includes(u.id)),
                  parents: allUsers.filter(u => u.role === 'parent' && chatParticipants.includes(u.id)),
                  teachers: currentChat?.leadTeachers && currentChat.leadTeachers.length > 0
                    ? allUsers.filter(u => u.role === 'teacher' && currentChat.leadTeachers!.includes(u.id))
                    : allUsers.filter(u => u.role === 'teacher' && chatParticipants.includes(u.id)),
                  schedule: currentChat?.schedule || 'ПН в 18:00, ЧТ в 15:00 - групповые: нейропсихолог (пед. Нонна Мельникова): развитие регуляторных функций\n\nСБ в 12:00 - индивидуальные: логопед (пед. Валерия): развитие фонематических процессов (в т.ч. фонематического восприятия), коррекция ЛГНР, позднее - коррекция дизорфографии',
                  conclusionLink: currentChat?.conclusionLink || 'https://example.com/conclusion.pdf',
                }}
                allTeachers={allUsers.filter(u => u.role === 'teacher').map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
                allAdmins={allUsers.filter(u => u.role === 'admin' && u.id !== 'admin').map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
                allStudents={allUsers.filter(u => u.role === 'student').map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
                allParents={allUsers.filter(u => u.role === 'parent').map(u => ({ id: u.id, name: u.name, avatar: u.avatar }))}
                participantIds={chatParticipants}
                leadTeacherIds={currentChat?.leadTeachers || []}
                leadAdminId={currentChat?.leadAdmin}
                onUpdateLeadTeachers={(leads) => selectedChat && handleUpdateLeadTeachers(selectedChat, leads)}
                onUpdateLeadAdmin={(admin) => selectedChat && handleUpdateLeadAdmin(selectedChat, admin)}
                onUpdateParticipants={(ids) => selectedChat && handleUpdateParticipants(selectedChat, ids)}
                chatName={currentChat?.name}
                onUpdateName={(name) => selectedChat && handleUpdateGroupInfo(selectedChat, { name })}
                onUpdateSchedule={(schedule) => selectedChat && handleUpdateGroupInfo(selectedChat, { schedule })}
                onUpdateConclusionLink={(link) => selectedChat && handleUpdateGroupInfo(selectedChat, { conclusionLink: link })}
                onDeleteGroup={() => {
                  if (selectedChat && confirm('Вы уверены, что хотите удалить эту группу? Это действие нельзя отменить.')) {
                    handleDeleteGroup(selectedChat);
                    setShowChatInfo(false);
                    setMobileShowChat(false);
                  }
                }}
                isArchived={currentChat?.isArchived}
                onArchive={() => {
                  if (selectedChat) {
                    handleArchiveChat(selectedChat, !currentChat?.isArchived);
                    setShowChatInfo(false);
                    setMobileShowChat(false);
                  }
                }}
              />
            </Suspense>
          );
        })()}
      </div>
    </div>
  );
};

export default Index;