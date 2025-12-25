import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatArea } from '@/components/ChatArea';
import { MessageInput } from '@/components/MessageInput';
import { LoginScreen } from '@/components/LoginScreen';
import { ProfileSettings } from '@/components/ProfileSettings';
import { AppSettings } from '@/components/AppSettings';
import { AllUsersView } from '@/components/AllUsersView';
import { AddStudentDialog } from '@/components/AddStudentDialog';
import { AddParentDialog } from '@/components/AddParentDialog';
import { CreateGroupDialog } from '@/components/CreateGroupDialog';
import { ChatInfoSidebar } from '@/components/ChatInfoSidebar';
import { useChatLogic } from '@/hooks/useChatLogic';

const Index = () => {
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

  const {
    isAuthenticated,
    userRole,
    userName,
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
    handleCreateGroup,
    handleDeleteGroup,
  } = useChatLogic();

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
        <AllUsersView users={allUsers} onBack={handleBackToChat} />
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
        onCreateGroup={() => setShowCreateGroup(true)}
        userRole={userRole}
        userName={userName}
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
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

      <CreateGroupDialog
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleCreateGroup}
        allUsers={allUsers}
      />

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
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
          
          return (
            <ChatInfoSidebar
              isOpen={showChatInfo}
              onClose={() => setShowChatInfo(false)}
              userRole={userRole}
              chatInfo={{
                students: allUsers.filter(u => u.role === 'student' && chatParticipants.includes(u.id)),
                parents: allUsers.filter(u => u.role === 'parent' && chatParticipants.includes(u.id)),
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
          );
        })()}
      </div>
    </div>
  );
};

export default Index;