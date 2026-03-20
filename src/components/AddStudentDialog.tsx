import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

type AddStudentDialogProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, phone: string, password: string) => Promise<void> | void;
};

const DEFAULT_PASSWORD = 'stu1';

export const AddStudentDialog = ({ open, onClose, onAdd }: AddStudentDialogProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
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
      setPassword(DEFAULT_PASSWORD);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать ученика');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setPassword(DEFAULT_PASSWORD);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить ученика</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя и фамилия</Label>
            <Input
              id="name"
              placeholder="Иван Иванов"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Номер телефона</Label>
            <Input
              id="phone"
              placeholder="+7 999 999 99 99"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
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