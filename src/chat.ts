export interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatHandlers {
  onAuthSuccess: (username: string) => void;
  onMessage: (message: ChatMessage) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export function connectChat(
  token: string,
  handlers: ChatHandlers
) {
  const socket = new WebSocket(
    'wss://inai-col3.fishrungames.com/chat/'
  );

  let authorized = false;

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'AUTH',
      payload: { token },
    }));
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'AUTH_SUCCESS') {
        authorized = true;
        handlers.onAuthSuccess(data.payload.username);
      }

      if (data.type === 'NEW_MESSAGE') {
        handlers.onMessage(data.payload);
      }

      if (data.type === 'ERROR') {
        handlers.onError(
          data.payload?.message || 'Ошибка чата'
        );
      }
    } catch {
      handlers.onError('Не удалось обработать сообщение сервера');
    }
  };

  socket.onerror = () => {
    handlers.onError('Ошибка WebSocket-соединения');
  };

  socket.onclose = () => {
    authorized = false;
    handlers.onClose();
  };

  return {
    sendMessage(text: string) {
      if (!authorized || socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        payload: { text },
      }));

      return true;
    },

    close() {
      authorized = false;
      socket.close();
    },
  };
}
