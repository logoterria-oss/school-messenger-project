import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

type ContactInfoSectionProps = {
  phone: string;
  email: string;
  onUpdatePhone: (phone: string) => void;
  onUpdateEmail: (email: string) => void;
};

export const ContactInfoSection = ({ phone, email, onUpdatePhone, onUpdateEmail }: ContactInfoSectionProps) => {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editPhone, setEditPhone] = useState(phone);
  const [editEmail, setEditEmail] = useState(email);

  useEffect(() => {
    setEditPhone(phone);
    setEditEmail(email);
  }, [phone, email]);

  const handleSavePhone = () => {
    onUpdatePhone(editPhone);
    setIsEditingPhone(false);
  };

  const handleSaveEmail = () => {
    onUpdateEmail(editEmail);
    setIsEditingEmail(false);
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Номер телефона педагога</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditingPhone(true)}
            className="h-8 px-2"
          >
            <Icon name="Pencil" size={14} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{phone}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">E-mail педагога</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditingEmail(true)}
            className="h-8 px-2"
          >
            <Icon name="Pencil" size={14} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <Dialog open={isEditingPhone} onOpenChange={setIsEditingPhone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить номер телефона</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
              <Input
                id="phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+7(xxx)xxx-xx-xx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingPhone(false)}>
              Отмена
            </Button>
            <Button onClick={handleSavePhone}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingEmail} onOpenChange={setIsEditingEmail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить E-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingEmail(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEmail}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactInfoSection;
