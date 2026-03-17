import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { getPushStatus, subscribeToPush, type PushStatus } from '@/utils/notificationSound';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type PushBannerProps = {
  userId?: string;
};

export const PushBanner = ({ userId }: PushBannerProps) => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus);
  }, []);

  if (!status || status === 'subscribed' || status === 'unsupported') {
    return null;
  }

  const handleEnable = async () => {
    if (!userId) return;
    setLoading(true);
    const ok = await subscribeToPush(userId);
    if (ok) {
      setStatus('subscribed');
    } else {
      setStatus(await getPushStatus());
    }
    setLoading(false);
  };

  if (status === 'denied') {
    return (
      <>
        <div className="mx-3 mt-2 mb-1 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <Icon name="BellOff" size={20} className="text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">Уведомления заблокированы</p>
              <p className="text-xs text-muted-foreground mt-0.5">Разрешите уведомления в настройках браузера, затем перезагрузите страницу</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs rounded-lg"
                onClick={() => setShowHelp(true)}
              >
                <Icon name="HelpCircle" size={14} className="mr-1" />
                Как это сделать?
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">Как включить уведомления</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="Smartphone" size={18} className="text-primary shrink-0" />
                  <p className="text-sm font-semibold">iPhone / iPad (Safari)</p>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1.5 ml-6 list-decimal">
                  <li>Откройте <span className="font-medium text-foreground">Настройки</span> телефона</li>
                  <li>Перейдите в <span className="font-medium text-foreground">Safari → Дополнения → Уведомления</span></li>
                  <li>Убедитесь, что переключатель <span className="font-medium text-foreground">включён</span></li>
                  <li>Вернитесь в мессенджер и <span className="font-medium text-foreground">перезагрузите страницу</span></li>
                </ol>
                <div className="ml-6 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <Icon name="Info" size={12} className="inline mr-1 -mt-0.5" />
                    На iPhone уведомления работают только если сайт добавлен на главный экран (кнопка «Поделиться» → «На экран Домой»)
                  </p>
                </div>
              </div>

              <div className="border-t" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="Smartphone" size={18} className="text-green-600 shrink-0" />
                  <p className="text-sm font-semibold">Android (Chrome)</p>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1.5 ml-6 list-decimal">
                  <li>Нажмите на <span className="font-medium text-foreground">значок замка</span> (или иконку настроек) слева от адресной строки</li>
                  <li>Найдите пункт <span className="font-medium text-foreground">Уведомления</span></li>
                  <li>Переключите на <span className="font-medium text-foreground">Разрешить</span></li>
                  <li><span className="font-medium text-foreground">Перезагрузите страницу</span></li>
                </ol>
              </div>

              <div className="border-t" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="Monitor" size={18} className="text-blue-600 shrink-0" />
                  <p className="text-sm font-semibold">Компьютер (Chrome / Edge)</p>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1.5 ml-6 list-decimal">
                  <li>Нажмите на <span className="font-medium text-foreground">значок замка</span> слева от адреса сайта</li>
                  <li>В выпадающем меню найдите <span className="font-medium text-foreground">Уведомления</span></li>
                  <li>Измените значение на <span className="font-medium text-foreground">Разрешить</span></li>
                  <li><span className="font-medium text-foreground">Перезагрузите страницу</span></li>
                </ol>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="mx-3 mt-2 mb-1 p-3 bg-primary/10 border border-primary/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <Icon name="BellRing" size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">Включите уведомления</p>
          <p className="text-xs text-muted-foreground mt-0.5">Чтобы не пропускать новые сообщения</p>
          <Button
            size="sm"
            className="mt-2 h-7 text-xs rounded-lg"
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <Icon name="Loader2" size={14} className="animate-spin mr-1" />
            ) : (
              <Icon name="Bell" size={14} className="mr-1" />
            )}
            Включить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PushBanner;
