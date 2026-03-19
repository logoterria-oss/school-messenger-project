import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { getGlobalSettings, setGlobalSound, setGlobalPush } from '@/utils/notificationSettings';
import { getPushStatus, subscribeToPush, unsubscribeFromPush, type PushStatus } from '@/utils/notificationSound';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AppSettingsProps = {
  onBack: () => void;
  userId?: string;
};

export const AppSettings = ({ onBack, userId }: AppSettingsProps) => {
  const globalSettings = getGlobalSettings();
  const [notifications, setNotifications] = useState(globalSettings.push);
  const [soundEnabled, setSoundEnabled] = useState(globalSettings.sound);
  const [pushStatus, setPushStatus] = useState<PushStatus>('prompt');
  const [pushLoading, setPushLoading] = useState(false);
  const [showScheduledHelp, setShowScheduledHelp] = useState(false);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    getPushStatus().then(setPushStatus);
  }, []);

  const handlePushToggle = async () => {
    if (!userId) return;
    setPushLoading(true);

    if (pushStatus === 'subscribed') {
      const ok = await unsubscribeFromPush(userId);
      if (ok) setPushStatus('unsubscribed');
    } else {
      const ok = await subscribeToPush(userId);
      setPushStatus(ok ? 'subscribed' : 'denied');
    }
    setPushLoading(false);
  };

  const pushLabel = () => {
    switch (pushStatus) {
      case 'subscribed': return 'Push-уведомления включены';
      case 'denied': return 'Push-уведомления заблокированы';
      case 'unsupported': return 'Push-уведомления не поддерживаются';
      default: return 'Push-уведомления отключены';
    }
  };

  const pushDescription = () => {
    switch (pushStatus) {
      case 'subscribed': return 'Вы будете получать уведомления даже когда приложение свёрнуто';
      case 'denied': return 'Разблокируйте уведомления в настройках браузера';
      case 'unsupported': return 'Ваш браузер не поддерживает push-уведомления';
      default: return 'Включите, чтобы получать уведомления о новых сообщениях';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background" style={{ height: 'var(--app-height, 100dvh)' }}>
      <div className="bg-card border-b border-border px-4 md:px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-xl hover:bg-muted"
          >
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Настройки приложения</h1>
            <p className="text-sm text-muted-foreground">Управление параметрами системы</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Bell" size={20} className="text-primary" />
              Уведомления
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="font-medium">{pushLabel()}</Label>
                  <p className="text-sm text-muted-foreground">{pushDescription()}</p>
                </div>
                {pushStatus !== 'unsupported' && pushStatus !== 'denied' && (
                  <Button
                    variant={pushStatus === 'subscribed' ? 'outline' : 'default'}
                    size="sm"
                    className="rounded-xl shrink-0"
                    onClick={handlePushToggle}
                    disabled={pushLoading}
                  >
                    {pushLoading ? (
                      <Icon name="Loader2" size={16} className="animate-spin" />
                    ) : pushStatus === 'subscribed' ? (
                      'Отключить'
                    ) : (
                      'Включить'
                    )}
                  </Button>
                )}
              </div>

              {pushStatus === 'subscribed' && isIOS && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-2.5">
                    <Icon name="Clock" size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">Уведомления приходят с задержкой?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Возможно, включена «Сводка по расписанию» — уведомления группируются и доставляются не сразу</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                        onClick={() => setShowScheduledHelp(true)}
                      >
                        <Icon name="HelpCircle" size={14} className="mr-1" />
                        Как починить?
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications" className="font-medium">
                    Уведомления в приложении
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Показывать счётчики непрочитанных
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={(val) => { setNotifications(val); setGlobalPush(val); }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sound" className="font-medium">
                    Звуковые уведомления
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Воспроизводить звук при получении сообщений
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={(val) => { setSoundEnabled(val); setGlobalSound(val); }}
                  disabled={!notifications}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={onBack}
            variant="outline"
            className="w-full rounded-xl"
          >
            Назад
          </Button>
        </div>
      </div>

      <Dialog open={showScheduledHelp} onOpenChange={setShowScheduledHelp}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Как получать уведомления сразу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <Icon name="Info" size={12} className="inline mr-1 -mt-0.5" />
                Если вы выбрали «Сводка по расписанию», уведомления приходят не сразу, а группируются и показываются в определённое время
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon name="Smartphone" size={18} className="text-primary shrink-0" />
                <p className="text-sm font-semibold">iPhone / iPad</p>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1.5 ml-6 list-decimal">
                <li>Откройте <span className="font-medium text-foreground">Настройки</span> телефона</li>
                <li>Перейдите в <span className="font-medium text-foreground">Уведомления</span></li>
                <li>Найдите приложение <span className="font-medium text-foreground">ЛинэяСкул</span> (или Safari)</li>
                <li>В разделе <span className="font-medium text-foreground">«Доставка уведомлений»</span> выберите <span className="font-medium text-foreground">«Немедленная доставка»</span></li>
                <li>Убедитесь, что включён <span className="font-medium text-foreground">«Допуск уведомлений»</span></li>
              </ol>
            </div>
            <div className="border-t" />
            <p className="text-xs text-muted-foreground">
              После изменения настроек вернитесь в приложение — уведомления начнут приходить мгновенно.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};