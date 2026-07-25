import {
  clearStoredSession,
  getAccessToken,
  getStoredSession,
  saveStoredSession,
  type StoredSession,
} from './session';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn('Missing EXPO_PUBLIC_API_URL — API calls will fail.');
}

type ApiEnvelope<T> = { data?: T; error?: string; ok?: boolean };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T> & Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError((json.error as string) ?? 'Request failed', res.status);
  }
  if ('data' in json) return json.data as T;
  return json as T;
}

async function buildHeaders(auth: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet<T>(path: string, auth = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: await buildHeaders(auth),
  });
  return parseResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown, auth = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: await buildHeaders(auth),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

/**
 * Multipart file upload via XMLHttpRequest.
 * Expo's fetch rejects RN `{ uri, name, type }` FormData parts
 * ("Unsupported FormDataPart implementation"); XHR still supports them.
 */
export async function apiPostFormFile<T>(
  path: string,
  fields: Record<string, string>,
  file: { uri: string; name: string; type: string; fieldName?: string }
): Promise<T> {
  if (!API_URL) throw new ApiError('Missing EXPO_PUBLIC_API_URL', 0);

  const token = await getAccessToken();
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append(file.fieldName ?? 'file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      let json: ApiEnvelope<T> & Record<string, unknown> = {};
      try {
        json = JSON.parse(xhr.responseText || '{}') as ApiEnvelope<T> & Record<string, unknown>;
      } catch {
        reject(new ApiError('Invalid server response', xhr.status));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError((json.error as string) ?? 'Request failed', xhr.status));
        return;
      }
      resolve(('data' in json ? json.data : json) as T);
    };
    xhr.onerror = () => reject(new ApiError('Network request failed', 0));
    xhr.send(form);
  });
}

export async function apiPatch<T>(path: string, body?: unknown, auth = true): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: await buildHeaders(auth),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

export async function restoreSession(): Promise<StoredSession | null> {
  return getStoredSession();
}

export async function persistSession(session: StoredSession | null): Promise<void> {
  if (session) {
    await saveStoredSession(session);
  } else {
    await clearStoredSession();
  }
}

export { type StoredSession };
