import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { getHealth } from './api'
import { AuthProvider, useAuth } from './auth'
import { AuthPage, Protected } from './AuthPages'
import { ProfilePage } from './ProfilePage'
import { ChatPage, Dialogs } from './Chats'
import { Button, Card } from './components/ui'
import { Icon } from './components/Icon'

const REQUEST_TIMEOUT_MS = 5000

// Проверка доступности сервера не зависит от авторизации пользователя.
function ServerStatus() {
  const [state, setState] = useState('Проверяем соединение…')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    // Прерываем зависший запрос по таймауту и отменяем его при повторной проверке или размонтировании.
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    setState('Проверяем соединение…')
    getHealth(controller.signal)
      .then(() => setState('Сервер доступен'))
      .catch(() => setState('Нет соединения с сервером'))
    // Убираем запрос и таймер предыдущей проверки перед запуском новой.
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [attempt]) // Изменение счётчика запускает проверку по кнопке повтора.
  return <div className="server" data-state={state === 'Сервер доступен' ? 'online' : state === 'Проверяем соединение…' ? 'checking' : 'offline'}><span className="status-dot" aria-hidden="true" /><span role="status">{state}</span>
    <button aria-label="Повторить проверку соединения" onClick={() => setAttempt(x => x + 1)}><Icon name="refresh" width="16" height="16" /></button>
  </div>
}

function AppShell() {
  const auth = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  // При ошибке выхода оставляем сессию и даём пользователю повторить действие.
  async function logout() {
    setLoggingOut(true); setLogoutError('')
    try { await auth.logout() } catch { setLogoutError('Не удалось выйти. Проверьте соединение и повторите.') }
    finally { setLoggingOut(false) }
  }
  const profile = useLocation().pathname === '/profile'
  return <div className="app-shell">
    <aside className="sidebar">
      <Link to="/dialogs" className="brand"><span className="brand-symbol" aria-hidden="true"><span /><span /><span /></span>SAXophone<span className="brand-period">.</span></Link>
      <nav className="primary-nav" aria-label="Основная навигация"><NavLink to="/dialogs"><Icon name="chat" />Диалоги</NavLink><NavLink to="/profile"><Icon name="user" />Профиль</NavLink></nav>
      <div className="sidebar-title">
        {profile && <Link to="/dialogs" className="close-settings" aria-label="Закрыть настройки"><Icon name="close" /></Link>}
        <h2>{profile ? 'Настройки и профиль' : 'Чаты'}</h2>
      </div>
      {profile ? <nav className="settings-list"><a href="#profile-data">Данные аккаунта</a></nav>
        : <div className="sidebar-empty"><span className="sidebar-empty-icon"><Icon name="chat" width="26" height="26" /></span><p>{auth.user ? 'Выберите собеседника' : 'Пока нет чатов'}</p><p>{auth.user ? `Вы вошли как ${auth.user.display_name}` : 'Войдите в аккаунт, чтобы начать общение.'}</p></div>}
      <div className="sidebar-footer">
        <NavLink to="/profile" className="account-link"><span className="account-avatar" aria-hidden="true">{auth.user?.display_name.trim().charAt(0).toUpperCase() || 'S'}</span><span><strong>{auth.user ? auth.user.display_name : 'Ваш аккаунт'}</strong><small>Настройки и профиль</small></span></NavLink>
        {auth.user ? <Button onClick={logout} disabled={loggingOut}><Icon name="logout" />{loggingOut ? 'Выходим…' : 'Выйти'}</Button> : <NavLink to="/login">Войти</NavLink>}
        {logoutError && <p role="alert">{logoutError}</p>}
      </div>
    </aside>
    <main>
      <header className="topbar"><div className="topbar-title"><span className="topbar-brand">SAXophone</span><span>Мессенджер</span></div><ServerStatus /></header>
      {/* Protected проверяет сессию перед открытием личных страниц. */}
      <Routes>
        <Route path="/" element={<AuthPage key="login" user={auth.user} loading={auth.loading} onLogin={auth.login} />} />
        <Route path="/dialogs" element={<Protected><Dialogs /></Protected>} />
        <Route path="/chat/:userId" element={<Protected><ChatPage /></Protected>} />
        <Route path="/login" element={<AuthPage key="login" user={auth.user} loading={auth.loading} onLogin={auth.login} />} />
        <Route path="/register" element={<AuthPage key="register" user={auth.user} loading={auth.loading} onLogin={auth.login} register />} />
        <Route path="/profile" element={<Protected>{auth.user && <ProfilePage user={auth.user} />}</Protected>} />
        <Route path="*" element={<div className="page"><Card><h1>Страница не найдена</h1><Link to="/dialogs">К диалогам</Link></Card></div>} />
      </Routes>
    </main>
  </div>
}

export function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
