import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

type UserToEdit = {
  id: string;
  name: string;
  phone: string;
  password: string;
  role: 'admin' | 'teacher' | 'parent' | 'student';
};

type EditUserDialogProps = {
  open: boolean;
  user: UserToEdit | null;
  onClose: () => void;
  onSave: (userId: string, updates: { name?: string; phone?: string; password?: string }) => Promise<void> | void;
};

const roleLabels: Record<string, string> = {
  admin: 'Админ',
  teacher: 'Педагог',
  parent: 'Родитель',
  student: 'Ученик',
};

export const EditUserDialog = ({ open, user, onClose, onSave }: EditUserDialogProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && open) {
      setName(user.name);
      setPhone(user.phone);
      setPassword(user.password);
      setShowPassword(false);
      setError('');
    }
  }, [user, open]);

  const hasChanges = user && (
    name.trim() !== user.name ||
    phone.trim() !== user.phone ||
    password !== user.password
  );

  const handleSave = async () => {
    if (!user || !name.trim() || !phone.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    const updates: { name?: string; phone?: string; password?: string } = {};
    if (name.trim() !== user.name) updates.name = name.trim();
    if (phone.trim() !== user.phone) updates.phone = phone.trim();
    if (password !== user.password) updates.password = password;

    try {
      await onSave(user.id, updates);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить изменения');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать — {roleLabels[user.role]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Имя и фамилия</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Номер телефона</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">Пароль</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="edit-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
                </button>
              </div>
            </div>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !phone.trim() || !password.trim() || !hasChanges || loading}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
