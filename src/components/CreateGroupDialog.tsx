import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (groupName: string) => void;
};

export const CreateGroupDialog = ({ open, onClose, onCreate }: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');

  const handleCreate = () => {
    if (!groupName.trim()) {
      return;
    }
    onCreate(groupName.trim());
    setGroupName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
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
