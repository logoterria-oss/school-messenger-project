import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

type AddAdminDialogProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, phone: string, password: string) => Promise<void> | void;
};

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const AddAdminDialog = ({ open, onClose, onAdd }: AddAdminDialogProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd(name.trim(), phone.trim(), password);
      setName('');
      setPhone('');
      setPassword(generatePassword());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать админа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setPassword(generatePassword());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить админа</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Имя и фамилия</Label>
            <Input
              id="admin-name"
              placeholder="Имя Фамилия"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-phone">Номер телефона</Label>
            <Input
              id="admin-phone"
              placeholder="+7 999 999 99 99"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Пароль</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  readOnly
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerate}
              >
                <Icon name="RefreshCw" size={16} />
              </Button>
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
          <Button onClick={handleAdd} disabled={!name.trim() || !phone.trim() || loading}>
            {loading ? 'Создание...' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAdminDialog;