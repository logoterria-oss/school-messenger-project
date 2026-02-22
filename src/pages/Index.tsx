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

const Index = () => {
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

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
    handleAddStudent,
    handleAddParent,
    handleAddTeacher,
    handleCreateGroup,
    handleDeleteGroup,
    handleDeleteUser,
    handleUpdateTeacher,
    handleUpdateLeadTeachers,
    handleUpdateLeadAdmin,
    handleUpdateParticipants,
    handleUpdateGroupInfo,
    handleAddAdmin,
  } = useChatLogic();

  const selectedChatData = chats.find(c => c.id === selectedChat);
  const isPrivateTeacherAdminChat = selectedChatData?.type === 'private' && 
    selectedChatData?.participants?.includes('admin') && 
    (userRole === 'admin' || userRole === 'teacher');

  if (!isAuthenticated || !userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentView === 'profile') {
    return (
      <div className="flex h-screen bg-background">
        <ProfileSettings userRole={userRole} onBack={handleBackToChat} />
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="flex h-screen bg-background">
        <AppSettings onBack={handleBackToChat} />
      </div>
    );
  }

  if (currentView === 'users') {
    return (
      <div className="flex h-screen bg-background">
        <AllUsersView users={allUsers} onBack={handleBackToChat} onDeleteUser={handleDeleteUser} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
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
        onSelectChat={handleSelectChat}
        onTopicSelect={handleSelectTopic}
      />

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

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
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
                disabled={selectedTopic?.endsWith('-important') && userRole !== 'admin'}
                disabledMessage="Только админ может писать в раздел «Важное»"
                mentionableUsers={
                  selectedChatData?.type === 'group'
                    ? (selectedChatData.participants || [])
                        .filter(pid => pid !== userId)
                        .map(pid => {
                          if (pid === 'admin') return { id: 'admin', name: 'Виктория Абраменко', avatar: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/861e809f-c7d5-4832-a853-e636d1e28f3f.jpg' };
                          const u = allUsers.find(u => u.id === pid);
                          return u ? { id: u.id, name: u.name, avatar: u.avatar } : null;
                        })
                        .filter(Boolean) as { id: string; name: string; avatar?: string }[]
                    : undefined
                }
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
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