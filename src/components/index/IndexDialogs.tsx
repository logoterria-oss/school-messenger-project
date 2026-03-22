import { AddStudentDialog } from '@/components/AddStudentDialog';
import { AddParentDialog } from '@/components/AddParentDialog';
import { AddTeacherDialog } from '@/components/AddTeacherDialog';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import { AddAdminDialog } from '@/components/AddAdminDialog';
import ForwardMessageDialog from '@/components/ForwardMessageDialog';
import { Message, Chat, User } from '@/types/chat.types';
import { MentionableUser } from '@/components/MessageInput';

const roleLabels: Record<string, string> = {
  admin: 'админ',
  teacher: 'педагог',
  parent: 'родитель',
  student: 'ученик',
};

type IndexDialogsProps = {
  showAddStudent: boolean;
  showAddParent: boolean;
  showAddTeacher: boolean;
  showAddAdmin: boolean;
  showCreateGroup: boolean;
  forwardMessage: Message | null;
  chats: Chat[];
  allUsers: User[];
  groupTopics: Record<string, Array<{ id: string; name: string; icon: string }>>;
  selectedChat: string | null;
  selectedTopic: string | null;
  userId: string | null;
  getPrivateChatDisplayName: (chat: { type: string; name: string; participants?: string[] }) => string;
  onCloseAddStudent: () => void;
  onCloseAddParent: () => void;
  onCloseAddTeacher: () => void;
  onCloseAddAdmin: () => void;
  onCloseCreateGroup: () => void;
  onCloseForward: () => void;
  onAddStudent: (data: { name: string; groupId: string }) => void;
  onAddParent: (data: { name: string; phone: string; groupId: string }) => void;
  onAddTeacher: (data: { name: string; phone: string }) => void;
  onAddAdmin: (data: { name: string; phone: string }) => void;
  onCreateGroup: (data: { name: string; students: string[]; parents: string[]; teachers: string[]; leadTeachers: string[]; leadAdmin?: string }) => void;
  onForward: (targetChatId: string, targetTopicId?: string, comment?: string) => void;
};

const IndexDialogs = ({
  showAddStudent,
  showAddParent,
  showAddTeacher,
  showAddAdmin,
  showCreateGroup,
  forwardMessage,
  chats,
  allUsers,
  groupTopics,
  selectedChat,
  selectedTopic,
  userId,
  getPrivateChatDisplayName,
  onCloseAddStudent,
  onCloseAddParent,
  onCloseAddTeacher,
  onCloseAddAdmin,
  onCloseCreateGroup,
  onCloseForward,
  onAddStudent,
  onAddParent,
  onAddTeacher,
  onAddAdmin,
  onCreateGroup,
  onForward,
}: IndexDialogsProps) => {
  return (
    <>
      <AddStudentDialog
        open={showAddStudent}
        onClose={onCloseAddStudent}
        onAdd={onAddStudent}
      />

      <AddParentDialog
        open={showAddParent}
        onClose={onCloseAddParent}
        onAdd={onAddParent}
      />

      <AddTeacherDialog
        open={showAddTeacher}
        onClose={onCloseAddTeacher}
        onAdd={onAddTeacher}
      />

      <CreateGroupDialog
        open={showCreateGroup}
        onClose={onCloseCreateGroup}
        onCreate={onCreateGroup}
        allUsers={allUsers}
      />

      <AddAdminDialog
        open={showAddAdmin}
        onClose={onCloseAddAdmin}
        onAdd={onAddAdmin}
      />

      <ForwardMessageDialog
        open={forwardMessage !== null}
        onClose={onCloseForward}
        message={forwardMessage}
        chats={chats.map(c => ({ id: c.id, name: getPrivateChatDisplayName(c), type: c.type }))}
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
        onForward={onForward}
      />
    </>
  );
};

export default IndexDialogs;
