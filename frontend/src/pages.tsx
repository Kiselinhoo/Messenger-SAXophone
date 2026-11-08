import { useState } from 'react';
import { Button, Input, Card } from './components';

// Мелкая правка: добавил тип для пропсов, чтобы TypeScript не ругался
interface AuthPageProps {
  onLogin: (login: string, password: string) => Promise<void>;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  // Создаю состояния для полей ввода, текста ошибки и индикатора загрузки.
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ПЗ №5 (Extract Method): Вынес проверку полей в отдельную функцию.
  // Это уменьшило размер handleSubmit и улучшило читаемость кода.
  const validateFields = (): boolean => {
    // Проверяю, что пользователь ввел хоть какие-то данные.
    if (!login || !password) {
      setError('Заполните все поля');
      return false;
    }
    return true;
  };

  // Главная функция, которая срабатывает при нажатии на кнопку "Войти" или Enter.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Очищаю старые ошибки
    
    // Вызываю функцию валидации. Если поля пустые, она вернет false и прервет отправку.
    if (!validateFields()) return;

    setLoading(true); // Включаю загрузку (кнопка блокируется)
    
    // Отправляю данные на сервер через функцию onLogin, которую передали сверху.
    try {
      await onLogin(login, password);
    } catch (err) {
      console.log(err);
      // Правка по ревью: разделяем ошибки. Если 401 — неверный пароль, иначе — проблема с сетью/сервером.
      if (err instanceof Error && err.message.includes('401')) {
        setError('Неверный логин или пароль');
      } else {
        setError('Ошибка соединения. Проверьте сеть и попробуйте позже.');
      }
    } finally {
      // В любом случае выключаю загрузку, чтобы кнопка снова стала активной.
      setLoading(false);
    }
  };

  return (
    <Card>
      <h1>Вход</h1>
      <form onSubmit={handleSubmit}>
        {/* Поле для ввода логина. Связываю его со стейтом login. */}
        <Input label="Логин" value={login} onChange={(e) => setLogin(e.target.value)} />
        
        {/* Поле для пароля. Тип password скрывает символы точками. */}
        <Input label="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        
        {/* Если в стейте error есть текст, показываю красный блок с ошибкой (стили из styles.css). */}
        {error && <div className="form-error" role="alert">{error}</div>}
        
        {/* Кнопка "Войти". Если идет загрузка, она меняет текст и становится неактивной. */}
        <Button text={loading ? 'Загрузка...' : 'Войти'} disabled={loading} />
      </form>
    </Card>
  );
}
