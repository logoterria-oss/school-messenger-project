import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import type { UserRole } from '@/types/chat.types';
import type { Chat } from './sidebar/types';

type Topic = 'important' | 'zoom' | 'homework' | 'reports' | 'payment' | 'cancellation' | 'admin-contact';

type TopicOption = {
  id: Topic;
  label: string;
  icon: string;
};

const ALL_TOPICS: TopicOption[] = [
  { id: 'important', label: 'Важное', icon: 'Star' },
  { id: 'zoom', label: 'Zoom', icon: 'Video' },
  { id: 'homework', label: 'ДЗ', icon: 'BookOpen' },
  { id: 'reports', label: 'Отчеты', icon: 'FileText' },
  { id: 'payment', label: 'Оплата', icon: 'CreditCard' },
  { id: 'cancellation', label: 'Перенос/отмена', icon: 'CalendarX' },
  { id: 'admin-contact', label: 'Связь с админом', icon: 'Headphones' },
];

const TEACHER_TOPICS: Topic[] = ['zoom', 'homework', 'reports'];

type BroadcastDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: UserRole;
  groups: Chat[];
  onSend: (groupIds: string[], topic: Topic, message: string) => void;
};

export const BroadcastDialog = ({
  open,
  onOpenChange,
  userRole,
  groups,
  onSend,
}: BroadcastDialogProps) => {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [message, setMessage] = useState('');
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupsOpen, setGroupsOpen] = useState(false);

  const availableTopics =
    userRole === 'admin'
      ? ALL_TOPICS
      : ALL_TOPICS.filter((t) => TEACHER_TOPICS.includes(t.id));

  const studentGroups = groups.filter(
    (g) => g.type === 'group' && g.id !== 'teachers-group'
  );

  const filteredGroups = groupSearch.trim()
    ? studentGroups.filter((g) =>
        g.name.toLowerCase().includes(groupSearch.trim().toLowerCase())
      )
    : studentGroups;

  const allSelected = selectedGroups.length === studentGroups.length && studentGroups.length > 0;

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedGroups([]);
    } else {
      setShowConfirmAll(true);
    }
  };

  const confirmSelectAll = () => {
    setSelectedGroups(studentGroups.map((g) => g.id));
    setShowConfirmAll(false);
  };

  const handleSend = () => {
    if (!selectedTopic || !message.trim() || selectedGroups.length === 0) return;
    onSend(selectedGroups, selectedTopic, message.trim());
    setSelectedGroups([]);
    setSelectedTopic(null);
    setMessage('');
    onOpenChange(false);
  };

  const canSend =
    selectedGroups.length > 0 && selectedTopic !== null && message.trim().length > 0;

  // Track visible viewport for mobile keyboard handling
  const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open) return;
    const updateViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // On mobile, when keyboard is open, visualViewport shrinks
      // We reposition the dialog to stay within the visible area
      const maxH = Math.floor(vv.height * 0.92);
      const offsetTop = vv.offsetTop + vv.pageTop;
      setViewportStyle({
        maxHeight: `${maxH}px`,
        top: `${offsetTop + vv.height / 2}px`,
        transform: 'translate(-50%, -50%)',
      });
    };
    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
      setViewportStyle({});
    };
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg w-full flex flex-col gap-0 p-0 max-h-[92dvh]"
          style={viewportStyle}
        >
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name="Megaphone" size={17} className="text-primary" />
              </div>
              Отправить рассылку
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Группы */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Группы получателей</p>
                {groupsOpen && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {allSelected ? 'Снять все' : 'Выбрать все'}
                  </button>
                )}
              </div>

              {/* Триггер-кнопка */}
              <button
                type="button"
                onClick={() => setGroupsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border/60 bg-background hover:bg-accent/50 transition-colors text-sm"
              >
                <span className={selectedGroups.length === 0 ? 'text-muted-foreground' : 'text-foreground'}>
                  {selectedGroups.length === 0
                    ? 'Выберите группы...'
                    : selectedGroups.length === studentGroups.length
                    ? 'Все группы'
                    : `Выбрано групп: ${selectedGroups.length}`}
                </span>
                <Icon name={groupsOpen ? 'ChevronUp' : 'ChevronDown'} size={15} className="text-muted-foreground flex-shrink-0" />
              </button>

              {groupsOpen && (
                <div className="mt-1.5 rounded-lg border border-border/60 overflow-hidden">
                  <div className="p-2 border-b border-border/40">
                    <div className="relative">
                      <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Поиск группы..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-border/40">
                    {studentGroups.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-3.5 py-2.5">Нет доступных групп</p>
                    ) : filteredGroups.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-3.5 py-2.5">Группы не найдены</p>
                    ) : (
                      filteredGroups.map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedGroups.includes(group.id)}
                            onCheckedChange={() => toggleGroup(group.id)}
                            id={`group-${group.id}`}
                          />
                          <div className="flex items-center gap-2.5 min-w-0">
                            {group.avatar ? (
                              <img
                                src={group.avatar}
                                alt=""
                                className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon name="Users" size={14} className="text-primary" />
                              </div>
                            )}
                            <span className="text-sm truncate">{group.name}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Раздел */}
            <div>
              <p className="text-sm font-medium mb-2.5">Раздел</p>
              <div className="flex flex-wrap gap-2">
                {availableTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() =>
                      setSelectedTopic(selectedTopic === topic.id ? null : topic.id)
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      selectedTopic === topic.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border/60 hover:bg-accent text-foreground'
                    }`}
                  >
                    <Icon name={topic.icon} size={14} />
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Сообщение */}
            <div>
              <Label htmlFor="broadcast-msg" className="text-sm font-medium mb-2.5 block">
                Сообщение
              </Label>
              <Textarea
                id="broadcast-msg"
                placeholder="Введите текст рассылки..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border/60 flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="gap-2"
            >
              <Icon name="Send" size={15} />
              Отправить
              {selectedGroups.length > 0 && (
                <span className="ml-0.5 opacity-80">
                  · {selectedGroups.length}{' '}
                  {selectedGroups.length === 1 ? 'группа' : selectedGroups.length < 5 ? 'группы' : 'групп'}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmAll} onOpenChange={setShowConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отправить всем ученикам?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь отправить сообщение во все {studentGroups.length}{' '}
              {studentGroups.length === 1 ? 'группу' : studentGroups.length < 5 ? 'группы' : 'групп'}{' '}
              школы. Убедитесь, что сообщение актуально для всех.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelectAll}>
              Да, выбрать все группы
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BroadcastDialog;