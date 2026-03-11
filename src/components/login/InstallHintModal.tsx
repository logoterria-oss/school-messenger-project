import { useState } from 'react';
import Icon from '@/components/ui/icon';

type InstallHintModalProps = {
  onClose: () => void;
};

const InstallHintModal = ({ onClose }: InstallHintModalProps) => {
  const [tab, setTab] = useState<'ios' | 'android'>('ios');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border-2 border-border max-lg:rounded-xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3 max-lg:p-4 max-lg:pb-2">
          <h2 className="text-lg font-bold max-lg:text-base" style={{ color: '#3BA662' }}>
            Добавить на главный экран
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={22} />
          </button>
        </div>

        <div className="flex gap-2 px-5 mb-4 max-lg:px-4">
          <button
            onClick={() => setTab('ios')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all max-lg:text-xs max-lg:py-2 ${
              tab === 'ios' 
                ? 'bg-[#3BA662] text-white shadow-md' 
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            <Icon name="Smartphone" size={16} className="inline mr-1.5 -mt-0.5 max-lg:w-3.5 max-lg:h-3.5" />
            iPhone / iPad
          </button>
          <button
            onClick={() => setTab('android')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all max-lg:text-xs max-lg:py-2 ${
              tab === 'android' 
                ? 'bg-[#3BA662] text-white shadow-md' 
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            <Icon name="Smartphone" size={16} className="inline mr-1.5 -mt-0.5 max-lg:w-3.5 max-lg:h-3.5" />
            Android
          </button>
        </div>

        <div className="px-5 pb-5 max-lg:px-4 max-lg:pb-4">
          {tab === 'ios' ? (
            <div className="space-y-4 max-lg:space-y-3">
              <p className="text-sm text-muted-foreground max-lg:text-xs">
                Откройте эту страницу в браузере <strong>Safari</strong>, затем:
              </p>
              <div className="space-y-3 max-lg:space-y-2.5">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#3BA662] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 max-lg:w-6 max-lg:h-6 max-lg:text-xs">1</div>
                  <div className="pt-1 max-lg:pt-0.5">
                    <p className="text-sm font-medium max-lg:text-xs">Нажмите <Icon name="Ellipsis" size={14} className="inline -mt-0.5" /> внизу справа, затем «Поделиться» <Icon name="Share" size={14} className="inline -mt-0.5" /></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Или сразу <Icon name="Share" size={14} className="inline -mt-0.5" />, если кнопка видна на панели</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#3BA662] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 max-lg:w-6 max-lg:h-6 max-lg:text-xs">2</div>
                  <div className="pt-1 max-lg:pt-0.5">
                    <p className="text-sm font-medium max-lg:text-xs">Пролистайте вниз и выберите</p>
                    <p className="text-xs text-muted-foreground mt-0.5">«На экран Домой» <Icon name="PlusSquare" size={14} className="inline -mt-0.5" /></p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#3BA662] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 max-lg:w-6 max-lg:h-6 max-lg:text-xs">3</div>
                  <div className="pt-1 max-lg:pt-0.5">
                    <p className="text-sm font-medium max-lg:text-xs">Нажмите «Добавить»</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Иконка появится на главном экране</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-lg:space-y-3">
              <p className="text-sm text-muted-foreground max-lg:text-xs">
                Откройте эту страницу в <strong>Chrome</strong> или <strong>Яндекс Браузере</strong>, затем:
              </p>
              <div className="space-y-3 max-lg:space-y-2.5">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#3BA662] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 max-lg:w-6 max-lg:h-6 max-lg:text-xs">1</div>
                  <div className="pt-1 max-lg:pt-0.5">
                    <p className="text-sm font-medium max-lg:text-xs">Нажмите меню браузера</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Три точки <Icon name="MoreVertical" size={14} className="inline -mt-0.5" /> в правом верхнем углу</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#3BA662] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 max-lg:w-6 max-lg:h-6 max-lg:text-xs">2</div>
                  <div className="pt-1 max-lg:pt-0.5">
                    <p className="text-sm font-medium max-lg:text-xs">Выберите «Добавить на главный экран»</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Или «Установить приложение»</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#3BA662] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 max-lg:w-6 max-lg:h-6 max-lg:text-xs">3</div>
                  <div className="pt-1 max-lg:pt-0.5">
                    <p className="text-sm font-medium max-lg:text-xs">Подтвердите добавление</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Иконка появится на главном экране</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 p-3 bg-[#3BA662]/10 rounded-xl max-lg:mt-4 max-lg:p-2.5">
            <p className="text-xs text-[#2D6A4F] max-lg:text-[10px]">
              <Icon name="Info" size={14} className="inline mr-1 -mt-0.5" />
              После добавления мессенджер будет открываться как приложение — в полноэкранном режиме, без адресной строки.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallHintModal;