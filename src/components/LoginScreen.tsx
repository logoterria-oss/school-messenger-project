import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

type LoginScreenProps = {
  onLogin: (role: UserRole) => void;
};

const ROLES = [
  { id: 'student' as UserRole, name: 'ученик', image: 'https://cdn.poehali.dev/files/Ученик.jpg', color: 'from-[#52B788] to-[#40916C]' },
  { id: 'parent' as UserRole, name: 'родитель', image: 'https://cdn.poehali.dev/files/Родитель.jpg', color: 'from-[#74C69D] to-[#52B788]' },
  { id: 'teacher' as UserRole, name: 'педагог', image: 'https://cdn.poehali.dev/files/Педагог.jpg', color: 'from-[#40916C] to-[#2D6A4F]' },
  { id: 'admin' as UserRole, name: 'админ', image: 'https://cdn.poehali.dev/files/Админ.jpg', color: 'from-[#2D6A4F] to-[#1B4332]' },
];

const ADMIN_LOGINS = ['79236251611', '89236251611', '9236251611', 'abram.viktoriya.00@mail.ru'];
const ADMIN_PASSWORD = 'Barabulka.2000';

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

  const handleLogin = () => {
    setError('');

    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    if (selectedRole === 'admin') {
      const normalizedLogin = login.trim().toLowerCase();
      const isValidLogin = ADMIN_LOGINS.some(adminLogin => 
        adminLogin.toLowerCase() === normalizedLogin
      );

      if (isValidLogin && password === ADMIN_PASSWORD) {
        setIsLoggingIn(true);
        setTimeout(() => {
          onLogin('admin');
        }, 1500);
      } else {
        setError('Неверный логин или пароль');
      }
    } else {
      setError('Функция авторизации для этой роли находится в разработке');
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center gap-6 mb-8">
            <img 
              src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
              alt="LineaSchool" 
              className="w-28 h-28 rounded-3xl shadow-xl flex-shrink-0" 
            />
            <div className="flex flex-col">
              <h1 className="text-5xl font-extrabold" style={{ color: '#3BA662' }}>LineaSchool</h1>
              <p className="text-xl font-normal" style={{ color: '#3BA662' }}>мессенджер</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="group relative bg-card hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 border-2 border-border hover:border-primary/50 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                
                <div className="relative flex items-center gap-6">
                  <div className="w-32 h-32 rounded-full shadow-lg flex-shrink-0 overflow-hidden">
                    <img src={role.image} alt={role.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <h3 className="font-bold mb-2" style={{ color: '#5B7C99' }}>
                      <div className="text-4xl">Я -</div>
                      <div className="text-2xl">{role.name}</div>
                    </h3>
                    <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
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
      {isLoggingIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <img 
            src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
            alt="LineaSchool" 
            className="rounded-3xl animate-[expand_1.5s_ease-in-out_forwards]"
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
              }
              70% {
                width: 100vw;
                height: 100vh;
                opacity: 0.5;
              }
              100% {
                width: 100vw;
                height: 100vh;
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}
      
      <div className={`flex items-center justify-center gap-6 mb-8 transition-opacity duration-300 ${isLoggingIn ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src="https://cdn.poehali.dev/files/WhatsApp Image 2025-11-04 at 17.17.39.jpeg" 
          alt="LineaSchool" 
          className="w-28 h-28 rounded-3xl shadow-xl flex-shrink-0" 
        />
        <div className="flex flex-col">
          <h1 className="text-5xl font-extrabold" style={{ color: '#3BA662' }}>LineaSchool</h1>
          <p className="text-xl font-normal" style={{ color: '#3BA662' }}>мессенджер</p>
        </div>
      </div>

      <div className={`w-full max-w-2xl animate-in fade-in zoom-in duration-500 transition-opacity duration-300 ${isLoggingIn ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-card rounded-xl shadow-xl p-8 border-2 border-border relative">
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <Icon name="ArrowLeft" size={20} />
            <span className="text-sm font-medium">Назад</span>
          </button>

          <div className="flex items-start gap-8 mt-8">
            <div className="w-40 h-40 rounded-full shadow-lg flex-shrink-0 overflow-hidden animate-in zoom-in duration-700">
              <img src={currentRole.image} alt={currentRole.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 space-y-4 animate-in fade-in slide-in-from-right duration-700">
              <div>
              <label className="block text-sm font-medium mb-2">
                Логин (телефон или email)
              </label>
              <div className="relative">
                <Icon name="User" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Введите логин"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="pl-11 h-12 rounded-xl"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Пароль
              </label>
              <div className="relative">
                <Icon name="Lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 rounded-xl"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
                <Icon name="AlertCircle" size={18} className="text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

              <Button
                onClick={handleLogin}
                className="w-full h-12 rounded-xl text-base font-semibold hover:opacity-90 transition-opacity shadow-lg text-white"
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