import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { login as apiLogin } from '@/services/api';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

type LoginScreenProps = {
  onLogin: (role: UserRole, name?: string) => void;
};

const ROLES = [
  { id: 'student' as UserRole, name: 'ученик', image: 'https://cdn.poehali.dev/files/Ученик.jpg', color: 'from-[#52B788] to-[#40916C]' },
  { id: 'parent' as UserRole, name: 'родитель', image: 'https://cdn.poehali.dev/files/Родитель.jpg', color: 'from-[#74C69D] to-[#52B788]' },
  { id: 'teacher' as UserRole, name: 'педагог', image: 'https://cdn.poehali.dev/files/Педагог.jpg', color: 'from-[#40916C] to-[#2D6A4F]' },
  { id: 'admin' as UserRole, name: 'админ', image: 'https://cdn.poehali.dev/files/Админ.jpg', color: 'from-[#2D6A4F] to-[#1B4332]' },
];

const FloatingDecor = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <svg className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] opacity-[0.12]" viewBox="0 0 400 400" fill="none" style={{ animation: 'floatA 18s ease-in-out infinite' }}>
      <path d="M50 200 Q100 50 200 100 Q300 150 250 250 Q200 350 100 300 Q0 250 50 200Z" fill="#52B788" />
      <path d="M120 180 Q160 80 220 130 Q280 180 240 260 Q200 340 140 290 Q80 240 120 180Z" fill="#74C69D" />
    </svg>

    <svg className="absolute top-[10%] right-[-3%] w-[25%] h-[25%] opacity-[0.1]" viewBox="0 0 300 300" fill="none" style={{ animation: 'floatB 22s ease-in-out infinite' }}>
      <path d="M150 20 Q250 60 230 150 Q210 240 120 260 Q30 280 50 180 Q70 80 150 20Z" fill="#40916C" />
    </svg>

    <svg className="absolute bottom-[-5%] left-[5%] w-[30%] h-[30%] opacity-[0.1]" viewBox="0 0 350 350" fill="none" style={{ animation: 'floatC 20s ease-in-out infinite' }}>
      <path d="M175 30 Q300 80 280 175 Q260 280 160 300 Q60 310 40 210 Q20 110 175 30Z" fill="#74C69D" />
      <circle cx="80" cy="250" r="40" fill="#95D5B2" opacity="0.5" />
    </svg>

    <svg className="absolute bottom-[10%] right-[2%] w-[20%] h-[20%] opacity-[0.08]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatD 16s ease-in-out infinite' }}>
      <path d="M30 100 Q60 20 120 40 Q180 60 170 130 Q160 190 90 180 Q20 170 30 100Z" fill="#52B788" />
    </svg>

    <svg className="absolute top-[40%] left-[2%] w-[15%] h-[15%] opacity-[0.07]" viewBox="0 0 200 200" fill="none" style={{ animation: 'floatE 25s ease-in-out infinite' }}>
      <circle cx="100" cy="100" r="80" fill="#95D5B2" />
    </svg>

    <svg className="absolute top-[60%] right-[10%] w-[12%] h-[12%] opacity-[0.09]" viewBox="0 0 150 150" fill="none" style={{ animation: 'floatA 19s ease-in-out infinite reverse' }}>
      <path d="M75 10 Q140 40 130 90 Q120 140 65 140 Q10 140 15 85 Q20 30 75 10Z" fill="#52B788" />
    </svg>

    {/* Маленькие точки-листочки */}
    {[
      { top: '15%', left: '20%', size: 6, delay: '0s', dur: '14s' },
      { top: '25%', left: '75%', size: 8, delay: '2s', dur: '18s' },
      { top: '70%', left: '15%', size: 5, delay: '4s', dur: '16s' },
      { top: '80%', left: '60%', size: 7, delay: '1s', dur: '20s' },
      { top: '45%', left: '85%', size: 4, delay: '3s', dur: '15s' },
      { top: '55%', left: '40%', size: 5, delay: '5s', dur: '17s' },
    ].map((dot, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-[#74C69D]"
        style={{
          top: dot.top,
          left: dot.left,
          width: dot.size,
          height: dot.size,
          opacity: 0.15,
          animation: `floatDot ${dot.dur} ease-in-out ${dot.delay} infinite`,
        }}
      />
    ))}

    <style>{`
      @keyframes floatA {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(15px, -20px) rotate(3deg); }
        50% { transform: translate(-10px, 15px) rotate(-2deg); }
        75% { transform: translate(20px, 10px) rotate(4deg); }
      }
      @keyframes floatB {
        0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        33% { transform: translate(-20px, 15px) rotate(-5deg) scale(1.05); }
        66% { transform: translate(15px, -10px) rotate(3deg) scale(0.95); }
      }
      @keyframes floatC {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        30% { transform: translate(20px, -15px) rotate(4deg); }
        60% { transform: translate(-15px, -25px) rotate(-3deg); }
      }
      @keyframes floatD {
        0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        50% { transform: translate(-12px, -18px) rotate(6deg) scale(1.1); }
      }
      @keyframes floatE {
        0%, 100% { transform: translate(0, 0) scale(1); }
        40% { transform: translate(10px, -12px) scale(1.15); }
        70% { transform: translate(-8px, 8px) scale(0.9); }
      }
      @keyframes floatDot {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
        50% { transform: translate(8px, -10px) scale(1.5); opacity: 0.25; }
      }
    `}</style>
  </div>
);

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 max-lg:p-4 relative">
        <FloatingDecor />
        <div className="w-full max-w-2xl max-lg:max-w-[340px] relative z-10">
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

        </div>
      </div>
    );
  }

  const currentRole = ROLES.find(r => r.id === selectedRole)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-4 relative">
      <FloatingDecor />
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