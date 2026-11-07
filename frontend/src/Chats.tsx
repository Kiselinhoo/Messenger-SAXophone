import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, request } from './api'
import type { User } from './api'
import { useAuth } from './auth'
import { Button } from './components/ui'

type Contact = Pick<User, 'id' | 'username' | 'display_name'>
type History = { peer: Contact; messages: { id: string; sender_id: string; body: string }[] }

export function Dialogs() {
  const [contacts, setContacts] = useState<Contact[]>()
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    request<Contact[]>('/chats', { signal: controller.signal })
      .then(setContacts)
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [])
  return <div className="chat-page">
    <h1>Собеседники</h1>
    {error ? <p role="alert">Не удалось загрузить список. Обновите страницу.</p>
      : !contacts ? <p role="status">Загружаем список…</p>
      : contacts.length === 0 ? <p>Пока нет собеседников. Зарегистрируйте второй аккаунт.</p>
      : <nav className="settings-list" aria-label="Собеседники">
        {contacts.map(peer => <Link key={peer.id} to={`/chat/${peer.id}`}>
          {peer.display_name} (@{peer.username})
        </Link>)}
      </nav>}
  </div>
}

export function ChatPage() {
  const { userId = '' } = useParams()
  return <Conversation key={userId} peerId={userId} />
}

function Conversation({ peerId }: { peerId: string }) {
  const { user } = useAuth()
  const [history, setHistory] = useState<History>()
  const [body, setBody] = useState('')
  const [loadingError, setLoadingError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(false)
  const messageArea = useRef<HTMLDivElement>(null)
  const path = `/chats/${peerId}`

  useEffect(() => {
    const controller = new AbortController()
    let timer: number
    async function load() {
      try {
        const next = await request<History>(path, { signal: controller.signal, cache: 'no-store' })
        if (controller.signal.aborted) return
        setHistory(next)
        setLoadingError('')
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 404) {
          setLoadingError('Собеседник не найден.')
          return
        }
        setLoadingError('Не удалось загрузить сообщения. Повторяем попытку…')
      }
      timer = window.setTimeout(load, 2000)
    }
    void load()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [path])

  const lastMessage = history?.messages.at(-1)?.id
  useEffect(() => {
    const area = messageArea.current
    if (area) area.scrollTop = area.scrollHeight
  }, [lastMessage])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    setSendError(false)
    try {
      await request(path, { method: 'POST', body: JSON.stringify({ body }) })
      setBody('')
    } catch { setSendError(true) }
    finally { setSending(false) }
  }

  return <div className="chat-page">
    <h1>{history ? `${history.peer.display_name} (@${history.peer.username})` : 'Переписка'}</h1>
    {loadingError && <p role="alert">{loadingError}</p>}
    <div className="message-area" ref={messageArea}>
      {history?.messages.map(message => <p key={message.id}>
        <strong>{message.sender_id === user?.id ? 'Вы' : history.peer.display_name}:</strong> {message.body}
      </p>)}
      {history?.messages.length === 0 && <p>Сообщений пока нет.</p>}
      {!history && !loadingError && <p>Загружаем переписку…</p>}
    </div>
    <form className="message-input" onSubmit={send}>
      <label htmlFor="message">Сообщение</label>
      <textarea id="message" rows={3} maxLength={4000} value={body} disabled={sending}
        onChange={event => setBody(event.target.value)} />
      <Button type="submit" disabled={!history || sending || !body.trim()}>Отправить</Button>
      {sendError && <p role="alert">Не удалось отправить сообщение. Попробуйте ещё раз.</p>}
    </form>
  </div>
}
