import { useState } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { useChatLogic } from '@/hooks/useChatLogic';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ProfileSettings } from '@/components/ProfileSettings';
import { AppSettings } from '@/components/AppSettings';
import { AllUsersView } from '@/components/AllUsersView';
import ChatMainArea from '@/components/index/ChatMainArea';
import ChatInfoPanel from '@/components/index/ChatInfoPanel';
import IndexDialogs from '@/components/index/IndexDialogs';
import { Message } from '@/types/chat.types';

const SUPERVISOR_ID = 'admin';

const roleLabels: Record<string, string> = {
  admin: 'админ',
  teacher: 'педагог',
  parent: 'родитель',
  student: 'ученик',
  tech_specialist: 'технический специалист',
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
    attachments,
    chats,
    groupTopics,
    messages,
    allUsers,
    typingUsers,
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
    handleEditUser,
    handleUpdateLeadTeachers,
    handleUpdateLeadAdmin,
    handleUpdateParticipants,
    handleUpdateGroupInfo,
    handleAddConclusion,
    handleUpdateConclusion,
    handleDeleteConclusion,
    handleAddAdmin,
    replyTo,
    handleReply,
    handleCancelReply,
    handleForwardMessage,
    handleScheduleMessage,
    handleCancelScheduledMessage,
    handleRetryMessage,
    handleBroadcast,
    muteVersion,
    messagesLoading,
    isSending,
  } = useChatLogic();

  const getPrivateChatDisplayName = (chat: { type: string; name: string; participants?: string[] }) => {
    if (chat.type === 'private' && chat.participants && chat.participants.length === 2) {
      const otherUserId = chat.participants.find(id => id !== userId && id !== 'current');
      if (otherUserId === SUPERVISOR_ID) {
        const sv = allUsers.find(u => u.id === SUPERVISOR_ID);
        return (sv?.name || 'Виктория Абраменко') + ' (руководитель)';
      }
      if (otherUserId) {
        const otherUser = allUsers.find(u => u.id === otherUserId);
        if (otherUser) {
          const role = getRoleLabel(otherUser.role, otherUser.id);
          return role ? `${otherUser.name} (${role})` : otherUser.name;
        }
      }
    }
    return chat.name;
  };

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
    handleSelectChat(null);
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
        <AppSettings onBack={handleBackToChat} userId={userId} />
      </div>
    );
  }

  if (currentView === 'users') {
    return (
      <div className="flex bg-background" style={{ height: 'var(--app-height, 100dvh)' }}>
        <AllUsersView users={allUsers} onBack={handleBackToChat} onDeleteUser={handleDeleteUser} onEditUser={handleEditUser} />
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
          onBroadcast={handleBroadcast}
        />
      </div>

      <IndexDialogs
        showAddStudent={showAddStudent}
        showAddParent={showAddParent}
        showAddTeacher={showAddTeacher}
        showAddAdmin={showAddAdmin}
        showCreateGroup={showCreateGroup}
        forwardMessage={forwardMessage}
        chats={chats}
        allUsers={allUsers}
        groupTopics={groupTopics}
        selectedChat={selectedChat}
        selectedTopic={selectedTopic}
        userId={userId}
        getPrivateChatDisplayName={getPrivateChatDisplayName}
        onCloseAddStudent={() => setShowAddStudent(false)}
        onCloseAddParent={() => setShowAddParent(false)}
        onCloseAddTeacher={() => setShowAddTeacher(false)}
        onCloseAddAdmin={() => setShowAddAdmin(false)}
        onCloseCreateGroup={() => setShowCreateGroup(false)}
        onCloseForward={() => setForwardMessage(null)}
        onAddStudent={handleAddStudent}
        onAddParent={handleAddParent}
        onAddTeacher={handleAddTeacher}
        onAddAdmin={handleAddAdmin}
        onCreateGroup={handleCreateGroup}
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
          <ChatMainArea
            selectedChat={selectedChat}
            selectedChatData={selectedChatData}
            selectedGroup={selectedGroup}
            selectedTopic={selectedTopic}
            messages={messages}
            attachments={attachments}
            groupTopics={groupTopics}
            typingUsers={typingUsers}
            allUsers={allUsers}
            chats={chats}
            userRole={userRole}
            userId={userId}
            replyTo={replyTo}
            scrollToMessageId={scrollToMessageId}
            muteVersion={muteVersion}
            messagesLoading={messagesLoading}
            mobileShowChat={mobileShowChat}
            getPrivateChatDisplayName={getPrivateChatDisplayName}
            onReaction={handleReaction}
            onSelectTopic={handleSelectTopic}
            onOpenChatInfo={() => setShowChatInfo(true)}
            onMobileBack={handleMobileBack}
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
            onScrollComplete={() => setScrollToMessageId(null)}
            onCancelScheduledMessage={handleCancelScheduledMessage}
            onRetryMessage={handleRetryMessage}
            onMessageChange={handleTyping}
            onSendMessage={handleSendMessage}
            onScheduleMessage={handleScheduleMessage}
            onFileUpload={handleFileUpload}
            onImageUpload={handleImageUpload}
            onRemoveAttachment={removeAttachment}
            onCancelReply={handleCancelReply}
            isSending={isSending}
          />
        </div>

        <ChatInfoPanel
          selectedChat={selectedChat}
          chats={chats}
          allUsers={allUsers}
          userRole={userRole}
          userId={userId}
          showChatInfo={showChatInfo}
          isPrivateTeacherAdminChat={!!isPrivateTeacherAdminChat}
          onCloseChatInfo={() => setShowChatInfo(false)}
          onUpdateTeacher={handleUpdateTeacher}
          onArchiveChat={handleArchiveChat}
          onUpdateLeadTeachers={handleUpdateLeadTeachers}
          onUpdateLeadAdmin={handleUpdateLeadAdmin}
          onUpdateParticipants={handleUpdateParticipants}
          onUpdateGroupInfo={handleUpdateGroupInfo}
          onAddConclusion={handleAddConclusion}
          onUpdateConclusion={handleUpdateConclusion}
          onDeleteConclusion={handleDeleteConclusion}
          onDeleteGroup={handleDeleteGroup}
          onCloseMobile={() => setMobileShowChat(false)}
        />
      </div>
    </div>
  );
};

export default Index;