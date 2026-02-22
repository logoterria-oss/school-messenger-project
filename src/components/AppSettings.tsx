import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { getGlobalSettings, setGlobalSound, setGlobalPush } from '@/utils/notificationSettings';

type AppSettingsProps = {
  onBack: () => void;
};

export const AppSettings = ({ onBack }: AppSettingsProps) => {
  const globalSettings = getGlobalSettings();
  const [notifications, setNotifications] = useState(globalSettings.push);
  const [soundEnabled, setSoundEnabled] = useState(globalSettings.sound);
  const [darkMode, setDarkMode] = useState(false);
  const [autoDownload, setAutoDownload] = useState(false);

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Bell" size={20} className="text-primary" />
              Уведомления
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications" className="font-medium">
                    Включить уведомления
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Получайте уведомления о новых сообщениях
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

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Palette" size={20} className="text-secondary" />
              Внешний вид
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="darkMode" className="font-medium">
                    Тёмная тема
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Использовать тёмное оформление интерфейса
                  </p>
                </div>
                <Switch
                  id="darkMode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Download" size={20} className="text-primary" />
              Медиафайлы
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoDownload" className="font-medium">
                    Автоматическая загрузка
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Автоматически загружать фото и видео
                  </p>
                </div>
                <Switch
                  id="autoDownload"
                  checked={autoDownload}
                  onCheckedChange={setAutoDownload}
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Database" size={20} className="text-destructive" />
              Данные и хранилище
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start rounded-xl">
                <Icon name="Trash2" size={18} className="mr-3" />
                Очистить кэш
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl text-destructive hover:text-destructive">
                <Icon name="Download" size={18} className="mr-3" />
                Экспортировать данные
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Info" size={20} className="text-muted-foreground" />
              О приложении
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Версия</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Последнее обновление</span>
                <span className="font-medium">18.12.2025</span>
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
    </div>
  );
};