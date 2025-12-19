import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

type User = {
  id: string;
  name: string;
  role: 'teacher' | 'parent' | 'student';
  phone: string;
  email?: string;
  password: string;
};

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (groupName: string, selectedUserIds: string[]) => void;
  allUsers: User[];
};

const roleLabels = {
  teacher: 'Педагог',
  parent: 'Родитель',
  student: 'Ученик',
};

export const CreateGroupDialog = ({ open, onClose, onCreate, allUsers }: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleCreate = () => {
    if (!groupName.trim()) {
      return;
    }
    onCreate(groupName.trim(), selectedUsers);
    setGroupName('');
    setSelectedUsers([]);
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedUsers([]);
    onClose();
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Создать группу</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Название группы</Label>
            <Input
              id="groupName"
              placeholder="Группа: Иван Петров"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Участники группы ({selectedUsers.length} выбрано)</Label>
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-3 space-y-2">
                {allUsers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Icon name="Users" size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Пользователей пока нет</p>
                    <p className="text-xs mt-1">Добавьте учеников и родителей</p>
                  </div>
                ) : (
                  allUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent"
                    >
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <label
                        htmlFor={`user-${user.id}`}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <p className="font-medium text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {roleLabels[user.role]} • {user.phone}
                        </p>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button onClick={handleCreate} disabled={!groupName.trim()}>
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};