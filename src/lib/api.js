const API = '';
const ADMIN_TOKEN_KEY = 'bdo_admin_token';

function adminToken() {
  let token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!token) {
    token = prompt('Admin token for saving/deleting logs:') || '';
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  return token;
}

export async function apiGet(path) {
  const response = await fetch(API + path);

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function apiWrite(path, method, body) {
  const response = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-admin-token': adminToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    throw new Error('Invalid admin token');
  }

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return text ? JSON.parse(text) : { ok: true };
}

export async function apiDeleteLog(log) {
  const source = log._src || {};

  const payload = {
    id:
      log.apiId ||
      log.id ||
      source.id ||
      source._id ||
      source.log_id ||
      source.key ||
      source.objectKey ||
      source.filename ||
      source.fileName ||
      source.path ||
      source.slug,
    date: log.date,
    name: log.name,
    hash: log.hash,
  };

  const id = payload.id ? encodeURIComponent(String(payload.id)) : '';

  const attempts = [
    id && ['/api/logs/' + id, 'DELETE'],
    ['/api/logs', 'DELETE', payload],
    ['/api/logs/delete', 'POST', payload],
    ['/api/logs', 'POST', { ...payload, action: 'delete', _method: 'DELETE' }],
  ].filter(Boolean);

  let lastError = null;

  for (const attempt of attempts) {
    try {
      return await apiWrite(attempt[0], attempt[1], attempt[2]);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    'Delete endpoint not found or not implemented. Add DELETE /api/logs/:id or POST /api/logs/delete on the backend. Last error: ' +
      String(lastError?.message || lastError || ''),
  );
}
