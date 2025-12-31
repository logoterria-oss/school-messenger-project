import { useState, lazy, Suspense } from 'react';
import Icon from '@/components/ui/icon';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { MessageInput } from '@/components/MessageInput';
import { LoginScreen } from '@/components/LoginScreen';
import { useChatLogic } from '@/hooks/useChatLogic';

const ProfileSettings = lazy(() => import('@/components/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const AppSettings = lazy(() => import('@/components/AppSettings').then(m => ({ default: m.AppSettings })));
const AllUsersView = lazy(() => import('@/components/AllUsersView').then(m => ({ default: m.AllUsersView })));
const AddStudentDialog = lazy(() => import('@/components/AddStudentDialog').then(m => ({ default: m.AddStudentDialog })));
const AddParentDialog = lazy(() => import('@/components/AddParentDialog').then(m => ({ default: m.AddParentDialog })));
const AddTeacherDialog = lazy(() => import('@/components/AddTeacherDialog').then(m => ({ default: m.AddTeacherDialog })));
const CreateGroupDialog = lazy(() => import('@/components/CreateGroupDialog').then(m => ({ default: m.CreateGroupDialog })));
const ChatInfoSidebar = lazy(() => import('@/components/ChatInfoSidebar').then(m => ({ default: m.ChatInfoSidebar })));
const TeacherAdminChatInfo = lazy(() => import('@/components/TeacherAdminChatInfo').then(m => ({ default: m.TeacherAdminChatInfo })));

const Index = () => {
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
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
    handleUpdateTeacher,
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
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Icon name="Loader2" className="animate-spin" size={32} /></div>}>
          <ProfileSettings userRole={userRole} onBack={handleBackToChat} />
        </Suspense>
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="flex h-screen bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Icon name="Loader2" className="animate-spin" size={32} /></div>}>
          <AppSettings onBack={handleBackToChat} />
        </Suspense>
      </div>
    );
  }

  if (currentView === 'users') {
    return (
      <div className="flex h-screen bg-background">
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Icon name="Loader2" className="animate-spin" size={32} /></div>}>
          <AllUsersView users={allUsers} onBack={handleBackToChat} />
        </Suspense>
      </div>
    );
  }

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
        userRole={userRole}
        userName={userName}
        userId={userId}
        chats={chats}
        allUsers={allUsers}
        selectedChat={selectedChat}
        onSelectChat={(chatId) => {
          handleSelectChat(chatId);
          setIsMobileSidebarOpen(false);
        }}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <Suspense fallback={null}>
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
      </Suspense>

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
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                chatId={selectedChat}
              />
              <MessageInput 
                messageText={messageText}
                attachments={attachments}
                onMessageChange={handleTyping}
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                onImageUpload={handleImageUpload}
                onRemoveAttachment={removeAttachment}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-accent/20">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Icon name="MessageSquare" size={36} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-medium mb-1">
                    Выберите чат
                  </h2>
                  <p className="text-sm text-muted-foreground">
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
                  teachers: allUsers.filter(u => u.role === 'teacher' && chatParticipants.includes(u.id)),
                  schedule: currentChat?.schedule || 'ПН в 18:00, ЧТ в 15:00 - групповые: нейропсихолог (пед. Нонна Мельникова): развитие регуляторных функций\n\nСБ в 12:00 - индивидуальные: логопед (пед. Валерия): развитие фонематических процессов (в т.ч. фонематического восприятия), коррекция ЛГНР, позднее - коррекция дизорфографии',
                  conclusionLink: currentChat?.conclusionLink || 'https://example.com/conclusion.pdf',
                }}
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