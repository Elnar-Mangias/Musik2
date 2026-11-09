const API_BASE = 'https://inai-col3.fishrungames.com/api';

type TokenResponse = {
  access: string;
};

let accessToken: string | null = null;

function getErrorMessage(data: unknown, status: number): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'detail' in data
  ) {
    return String((data as { detail: unknown }).detail);
  }

  return typeof data === 'string' && data
    ? data
    : `Ошибка сервера (${status})`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, response.status));
  }

  return data as T;
}

// Регистрация и вход
async function authRequest(
  path: '/register/' | '/login/',
  username: string,
  password: string
): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await readResponse<TokenResponse>(response);

  if (!data?.access) {
    throw new Error('Сервер не вернул access token.');
  }

  accessToken = data.access;

  return data;
}

// Обновление access token через refresh cookie
async function refreshAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/token/refresh/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await readResponse<TokenResponse>(response);

  if (!data?.access) {
    throw new Error('Не удалось обновить access token. Войдите снова.');
  }

  accessToken = data.access;

  return accessToken;
}

// Запросы к защищённым endpoint
async function request<T>(
  path: string,
  options: RequestInit = {},
  retryAfterRefresh = true
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  // Если access token истёк — обновляем и повторяем запрос один раз
  if (response.status === 401 && retryAfterRefresh) {
    try {
      await refreshAccessToken();

      return request<T>(path, options, false);
    } catch {
      accessToken = null;

      throw new Error(
        'Сессия истекла. Пожалуйста, войдите снова.'
      );
    }
  }

  return readResponse<T>(response);
}

export type Profile = Record<string, unknown>;

export const api = {
  register: (
    username: string,
    password: string
  ) => authRequest('/register/', username, password),

  login: (
    username: string,
    password: string
  ) => authRequest('/login/', username, password),

  logout: async () => {
    try {
      await request('/logout/', { method: 'POST' }, true);
    } finally {
      accessToken = null;
    }
  },

  getProfile: () => request<Profile>('/profile/'),

  updateProfile: (profile: Profile) =>
  request<Profile>('/profile/', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  }),

getAccessToken: () => accessToken,

};
