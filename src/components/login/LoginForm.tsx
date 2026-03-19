import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { login as apiLogin } from '@/services/api';

type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

type LoginFormProps = {
  selectedRole: UserRole;
  roleImage: string;
  roleName: string;
  onLogin: (role: UserRole, name?: string, id?: string) => void;
  onBack: () => void;
  isLoggingIn: boolean;
  setIsLoggingIn: (v: boolean) => void;
};



const LoginForm = ({ selectedRole, roleImage, roleName, onLogin, onBack, isLoggingIn, setIsLoggingIn }: LoginFormProps) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const scrollToInput = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  const handleLogin = async () => {
    setError('');

    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    setIsLoggingIn(true);

    try {
      const user = await apiLogin(login.trim(), password);
      
      setTimeout(() => {
        onLogin(user.role, user.name, user.id);
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      setIsLoggingIn(false);
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className={`w-full max-w-2xl max-lg:max-w-[340px] animate-in fade-in zoom-in duration-500 transition-opacity duration-300 ${isLoggingIn ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-card rounded-xl shadow-xl p-8 border-2 border-border relative max-lg:p-4 max-lg:rounded-lg">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors z-10 max-lg:top-2.5 max-lg:left-2.5"
        >
          <Icon name="ArrowLeft" size={20} className="max-lg:w-3.5 max-lg:h-3.5" />
          <span className="text-sm font-medium max-lg:text-[10px]">Назад</span>
        </button>

        <div className="flex items-start gap-8 mt-8 max-lg:flex-col max-lg:items-center max-lg:gap-3 max-lg:mt-8">
          <div className="w-40 h-40 rounded-full shadow-lg flex-shrink-0 overflow-hidden animate-in zoom-in duration-700 max-lg:w-16 max-lg:h-16">
            <img src={roleImage} alt={roleName} className="w-full h-full object-cover" loading="eager" />
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
                onFocus={scrollToInput}
                className="pl-11 h-12 rounded-xl max-lg:pl-8 max-lg:h-9 max-lg:rounded-lg text-base"
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
                onFocus={scrollToInput}
                className="pl-11 pr-11 h-12 rounded-xl max-lg:pl-8 max-lg:pr-8 max-lg:h-9 max-lg:rounded-lg text-base"
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
  );
};

export default LoginForm;