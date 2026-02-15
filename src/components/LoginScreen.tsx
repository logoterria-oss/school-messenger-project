import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { login as apiLogin } from '@/services/api';
import { initializeDatabase } from '@/utils/initDatabase';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

type LoginScreenProps = {
  onLogin: (role: UserRole, name?: string) => void;
};

const ROLES = [
  { id: 'student' as UserRole, name: 'ученик', image: 'https://cdn.poehali.dev/files/Ученик.jpg', hoverImage: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/823206a8-0351-4118-831c-a2e0d14c9e3c.jpg', hoverAnim: 'croc-wink', color: 'from-[#52B788] to-[#40916C]' },
  { id: 'parent' as UserRole, name: 'родитель', image: 'https://cdn.poehali.dev/files/Родитель.jpg', hoverImage: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/b6c12c95-4b27-4227-9b8b-ef7460f20d94.jpg', hoverAnim: 'croc-wave', color: 'from-[#74C69D] to-[#52B788]' },
  { id: 'teacher' as UserRole, name: 'педагог', image: 'https://cdn.poehali.dev/files/Педагог.jpg', hoverImage: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/83176b94-903b-4ce5-8c79-3e367776b8a8.jpg', hoverAnim: 'croc-point', color: 'from-[#40916C] to-[#2D6A4F]' },
  { id: 'admin' as UserRole, name: 'админ', image: 'https://cdn.poehali.dev/files/Админ.jpg', hoverImage: 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/de1a5e46-ea11-448e-9c75-d555944245ac.jpg', hoverAnim: 'croc-smile', color: 'from-[#2D6A4F] to-[#1B4332]' },
];

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError('');
    setLogin('');
    setPassword('');
  };

  const handleBack = () => {
    setSelectedRole(null);
    setError('');
    setLogin('');
    setPassword('');
  };

  const handleLogin = async () => {
    setError('');

    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    setIsLoggingIn(true);

    try {
      // Пытаемся войти через API
      const user = await apiLogin(login.trim(), password);
      
      // Успешный вход
      setTimeout(() => {
        onLogin(user.role, user.name);
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      setIsLoggingIn(false);
      setError('Неверный логин или пароль');
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 max-lg:p-4">
        <div className="w-full max-w-2xl max-lg:max-w-[340px]">
          <div className="flex items-center justify-center gap-6 mb-8 max-lg:gap-2.5 max-lg:mb-8">
            <img 
              src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
              alt="LineaSchool" 
              className="w-28 h-28 rounded-3xl shadow-xl flex-shrink-0 max-lg:w-12 max-lg:h-12 max-lg:rounded-xl" 
            />
            <div className="flex flex-col">
              <h1 className="text-5xl font-extrabold max-lg:text-2xl" style={{ color: '#3BA662' }}>LineaSchool</h1>
              <p className="text-xl font-normal max-lg:text-xs" style={{ color: '#3BA662' }}>мессенджер</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-lg:gap-2.5">
            {ROLES.map((role) => {
              const isHovered = hoveredRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  onMouseEnter={() => setHoveredRole(role.id)}
                  onMouseLeave={() => setHoveredRole(null)}
                  className="group relative bg-card hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 border-2 border-border hover:border-primary/50 overflow-hidden max-lg:px-2.5 max-lg:py-3 max-lg:rounded-lg"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  
                  <div className="relative flex items-center gap-6 max-lg:flex-col max-lg:gap-2 max-lg:justify-center">
                    <div className="w-32 h-32 rounded-full shadow-lg flex-shrink-0 overflow-hidden max-lg:w-16 max-lg:h-16 relative">
                      <img
                        src={role.image}
                        alt={role.name}
                        className="w-full h-full object-cover absolute inset-0 transition-opacity duration-500"
                        style={{ opacity: isHovered ? 0 : 1 }}
                        loading="lazy"
                      />
                      <img
                        src={role.hoverImage}
                        alt={`${role.name} animated`}
                        className="w-full h-full object-cover absolute inset-0 transition-opacity duration-500"
                        style={{
                          opacity: isHovered ? 1 : 0,
                          animation: isHovered ? `${role.hoverAnim} 0.8s ease-in-out` : 'none',
                        }}
                        loading="lazy"
                      />
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
              );
            })}
          </div>
          
          <div className="mt-6 text-center max-lg:mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('Initializing database...');
                await initializeDatabase();
              }}
              className="text-xs max-lg:text-[9px] max-lg:h-7 max-lg:px-2"
            >
              <Icon name="Database" size={14} className="mr-2 max-lg:mr-1 max-lg:w-3 max-lg:h-3" />
              Инициализировать БД
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes croc-wink {
            0% { transform: scale(1) rotate(0deg); }
            20% { transform: scale(1.08) rotate(-2deg); }
            40% { transform: scale(1.05) rotate(1deg); }
            60% { transform: scale(1.08) rotate(-1deg); }
            80% { transform: scale(1.03) rotate(0.5deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes croc-wave {
            0% { transform: scale(1) rotate(0deg); }
            15% { transform: scale(1.05) rotate(-5deg); }
            30% { transform: scale(1.05) rotate(5deg); }
            45% { transform: scale(1.05) rotate(-5deg); }
            60% { transform: scale(1.05) rotate(5deg); }
            75% { transform: scale(1.03) rotate(-2deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes croc-point {
            0% { transform: scale(1) translateY(0); }
            25% { transform: scale(1.06) translateY(-4px); }
            50% { transform: scale(1.06) translateY(-6px); }
            75% { transform: scale(1.03) translateY(-2px); }
            100% { transform: scale(1) translateY(0); }
          }
          @keyframes croc-smile {
            0% { transform: scale(1); }
            30% { transform: scale(1.12); }
            50% { transform: scale(1.1); }
            70% { transform: scale(1.12); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  const currentRole = ROLES.find(r => r.id === selectedRole)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-4 relative">
      {isLoggingIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <img 
            src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
            alt="LineaSchool" 
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
          alt="LineaSchool" 
          className="w-28 h-28 rounded-3xl shadow-xl flex-shrink-0 max-lg:w-12 max-lg:h-12 max-lg:rounded-xl"
          loading="eager"
        />
        <div className="flex flex-col">
          <h1 className="text-5xl font-extrabold max-lg:text-2xl" style={{ color: '#3BA662' }}>LineaSchool</h1>
          <p className="text-xl font-normal max-lg:text-xs" style={{ color: '#3BA662' }}>мессенджер</p>
        </div>
      </div>

      <div className={`w-full max-w-2xl max-lg:max-w-[340px] animate-in fade-in zoom-in duration-500 transition-opacity duration-300 ${isLoggingIn ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-card rounded-xl shadow-xl p-8 border-2 border-border relative max-lg:p-4 max-lg:rounded-lg">
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors z-10 max-lg:top-2.5 max-lg:left-2.5"
          >
            <Icon name="ArrowLeft" size={20} className="max-lg:w-3.5 max-lg:h-3.5" />
            <span className="text-sm font-medium max-lg:text-[10px]">Назад</span>
          </button>

          <div className="flex items-start gap-8 mt-8 max-lg:flex-col max-lg:items-center max-lg:gap-3 max-lg:mt-8">
            <div className="w-40 h-40 rounded-full shadow-lg flex-shrink-0 overflow-hidden animate-in zoom-in duration-700 max-lg:w-16 max-lg:h-16">
              <img src={currentRole.image} alt={currentRole.name} className="w-full h-full object-cover" loading="eager" />
            </div>

            <div className="flex-1 space-y-4 animate-in fade-in slide-in-from-right duration-700 max-lg:w-full max-lg:space-y-2.5">
              <div>
              <label className="block text-sm font-medium mb-2 max-lg:text-[10px] max-lg:mb-1">
                Логин (телефон или email)
              </label>
              <div className="relative">
                <Icon name="User" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground max-lg:left-2.5 max-lg:w-3.5 max-lg:h-3.5" />
                <Input
                  type="text"
                  placeholder="Введите логин"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="pl-11 h-12 rounded-xl max-lg:pl-8 max-lg:h-9 max-lg:text-xs max-lg:rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 max-lg:text-[10px] max-lg:mb-1">
                Пароль
              </label>
              <div className="relative">
                <Icon name="Lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground max-lg:left-2.5 max-lg:w-3.5 max-lg:h-3.5" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 rounded-xl max-lg:pl-8 max-lg:pr-8 max-lg:h-9 max-lg:text-xs max-lg:rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors max-lg:right-2.5"
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} className="max-lg:w-3.5 max-lg:h-3.5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2 max-lg:p-1.5 max-lg:gap-1 max-lg:rounded-lg">
                <Icon name="AlertCircle" size={18} className="text-destructive flex-shrink-0 mt-0.5 max-lg:w-3.5 max-lg:h-3.5" />
                <p className="text-sm text-destructive max-lg:text-[10px]">{error}</p>
              </div>
            )}

              <Button
                onClick={handleLogin}
                className="w-full h-12 rounded-xl text-base font-semibold hover:opacity-90 transition-opacity shadow-lg text-white max-lg:h-9 max-lg:text-xs max-lg:rounded-lg"
                style={{ backgroundColor: '#3BA662' }}
              >
                Войти
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};