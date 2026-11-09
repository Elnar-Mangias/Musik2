import { useEffect, useRef, useState } from 'react';
import { LogOut, Send, MessageCircle } from 'lucide-react';
import { api } from './api';
import { connectChat } from './chat';
import type { ChatMessage } from './chat';

interface ChatProps {
  onLogout: () => void;
}

export default function Chat({ onLogout }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('Подключение...');
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');

  const connection = useRef<ReturnType<typeof connectChat> | null>(null);

  useEffect(() => {
    const token = api.getAccessToken();

    if (!token) {
      setError('Нет access token. Войдите снова.');
      return;
    }

    const chat = connectChat(token, {
      onAuthSuccess: (name) => {
        setUsername(name);
        setAuthorized(true);
        setStatus('Подключено');
        setError('');
      },

      onMessage: (message) => {
        setMessages((previous) => [...previous, message]);
      },

      onError: (message) => {
        setError(message);
      },

      onClose: () => {
        setAuthorized(false);
        setStatus('Соединение закрыто');
      },
    });

    connection.current = chat;

    return () => {
      chat.close();
      connection.current = null;
    };
  }, []);

  function handleSend(event: React.FormEvent) {
    event.preventDefault();

    const message = text.trim();

    if (!message || !authorized) return;

    const sent = connection.current?.sendMessage(message);

    if (sent) {
      setText('');
    }
  }

  return (
    <section className="chat-section">
      <div className="chat-header">
        <div>
          <h2>Общий чат</h2>
          <p>{username} · {status}</p>
        </div>

        <button className="logout-button" onClick={onLogout}>
          <LogOut size={16} />
          Выйти
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <MessageCircle size={36} />
            <p>
              {authorized
                ? 'Чат подключён. Напишите первое сообщение!'
                : 'Ожидание авторизации...'}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div className="chat-message" key={index}>
            <strong>{message.sender}</strong>
            <p>{message.text}</p>
            <time>
              {new Date(message.timestamp).toLocaleTimeString()}
            </time>
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={handleSend}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={authorized ? 'Ваше сообщение...' : 'Ожидание подключения...'}
          disabled={!authorized}
        />

        <button type="submit" disabled={!authorized || !text.trim()}>
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}
