import { useState } from 'react';
import Icon from '@/components/ui/icon';
import FloatingDecor from '@/components/login/FloatingDecor';
import InstallHintModal from '@/components/login/InstallHintModal';
import LoginForm from '@/components/login/LoginForm';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

type LoginScreenProps = {
  onLogin: (role: UserRole, name?: string, id?: string) => void;
};

const ROLES = [
  { id: 'student' as UserRole, name: 'ученик', image: 'https://cdn.poehali.dev/files/Ученик.jpg', color: 'from-[#52B788] to-[#40916C]' },
  { id: 'parent' as UserRole, name: 'родитель', image: 'https://cdn.poehali.dev/files/Родитель.jpg', color: 'from-[#74C69D] to-[#52B788]' },
  { id: 'teacher' as UserRole, name: 'педагог', image: 'https://cdn.poehali.dev/files/Педагог.jpg', color: 'from-[#40916C] to-[#2D6A4F]' },
  { id: 'admin' as UserRole, name: 'админ', image: 'https://cdn.poehali.dev/files/Админ.jpg', color: 'from-[#2D6A4F] to-[#1B4332]' },
];

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  if (!selectedRole) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 max-lg:p-4 relative touch-none">
        <FloatingDecor />
        <div className="w-full max-w-2xl max-lg:max-w-[min(340px,calc(100vw-32px))] relative z-10">
          <div className="flex items-center justify-center gap-6 mb-8 max-lg:gap-2.5 max-lg:mb-8">
            <img 
              src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
              alt="ЛинэяСкул" 
              className="w-28 h-28 rounded-3xl shadow-xl flex-shrink-0 max-lg:w-12 max-lg:h-12 max-lg:rounded-xl" 
            />
            <div className="flex flex-col">
              <h1 className="text-5xl font-extrabold max-lg:text-2xl" style={{ color: '#3BA662' }}>ЛинэяСкул</h1>
              <p className="text-xl font-normal max-lg:text-xs" style={{ color: '#3BA662' }}>мессенджер</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-lg:gap-2.5">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="group relative bg-card hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 border-2 border-border hover:border-primary/50 overflow-hidden max-lg:px-2.5 max-lg:py-3 max-lg:rounded-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                
                <div className="relative flex items-center gap-6 max-lg:flex-col max-lg:gap-2 max-lg:justify-center">
                  <div className="w-32 h-32 rounded-full shadow-lg flex-shrink-0 overflow-hidden max-lg:w-16 max-lg:h-16">
                    <img src={role.image} alt={role.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  
                  <div className="flex-1 text-left max-lg:text-center">
                    <h3 className="font-bold mb-2 max-lg:mb-0" style={{ color: '#5B7C99' }}>
                      <div className="text-4xl max-lg:text-base max-lg:leading-tight">Я -</div>
                      <div className="text-2xl max-lg:text-sm max-lg:leading-tight">{role.name}</div>
                    </h3>
                    <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 max-lg:hidden">
                      <span className="text-base font-medium">Войти</span>
                      <span className="text-base">→</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowInstallHint(true)}
            className="mt-5 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-[#3BA662] bg-[#3BA662]/10 hover:bg-[#3BA662]/20 transition-colors max-lg:mt-4 max-lg:text-xs max-lg:px-4 max-lg:py-2"
          >
            <Icon name="Download" size={18} className="max-lg:w-4 max-lg:h-4" />
            Добавить на главный экран
          </button>

        </div>

        {showInstallHint && <InstallHintModal onClose={() => setShowInstallHint(false)} />}
      </div>
    );
  }

  const currentRole = ROLES.find(r => r.id === selectedRole)!;

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-4 relative touch-none">
      <FloatingDecor />
      {isLoggingIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <img 
            src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
            alt="ЛинэяСкул" 
            className="rounded-3xl object-cover"
            loading="eager"
            style={{
              animation: 'expand 1.5s ease-in-out forwards'
            }}
          />
          <style>{`
            @keyframes expand {
              0% {
                width: 112px;
                height: 112px;
                opacity: 1;
                transform: scale(1);
              }
              70% {
                width: 112px;
                height: 112px;
                opacity: 0.5;
                transform: scale(15);
              }
              100% {
                width: 112px;
                height: 112px;
                opacity: 0;
                transform: scale(20);
              }
            }
          `}</style>
        </div>
      )}
      
      <div className={`flex items-center justify-center gap-6 mb-8 max-lg:gap-2.5 max-lg:mb-5 transition-opacity duration-300 ${isLoggingIn ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
          alt="ЛинэяСкул" 
          className="w-28 h-28 rounded-3xl shadow-xl flex-shrink-0 max-lg:w-12 max-lg:h-12 max-lg:rounded-xl"
          loading="eager"
        />
        <div className="flex flex-col">
          <h1 className="text-5xl font-extrabold max-lg:text-2xl" style={{ color: '#3BA662' }}>ЛинэяСкул</h1>
          <p className="text-xl font-normal max-lg:text-xs" style={{ color: '#3BA662' }}>мессенджер</p>
        </div>
      </div>

      <LoginForm
        selectedRole={selectedRole}
        roleImage={currentRole.image}
        roleName={currentRole.name}
        onLogin={onLogin}
        onBack={handleBack}
        isLoggingIn={isLoggingIn}
        setIsLoggingIn={setIsLoggingIn}
      />
    </div>
  );
};