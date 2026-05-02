const API = '';
const ADMIN_TOKEN_KEY = 'bdo_admin_token';

function getAdminToken() {
  let token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!token) {
    token = prompt('Admin token for saving/deleting logs:') || '';

    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  }

  return token;
}

function safeJsonParse(text) {
  if (!text) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

export async function apiGet(path) {
  const response = await fetch(API + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      text || `GET ${path} failed: ${response.status} ${response.statusText}`,
    );
  }

  return safeJsonParse(text);
}

export async function apiWrite(path, method, body) {
  const response = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-admin-token': getAdminToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  if (response.status === 401) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    throw new Error(text || 'Invalid admin token');
  }

  if (!response.ok) {
    throw new Error(
      text ||
        `${method} ${path} failed: ${response.status} ${response.statusText}`,
    );
  }

  return safeJsonParse(text);
}

export async function apiDeleteLog(log) {
  const source = log._src || {};

  const possibleId =
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
    source.slug;

  const payload = {
    id: possibleId,
    date: log.date,
    name: log.name,
    hash: log.hash,
  };

  const attempts = [];

  if (possibleId) {
    attempts.push([
      `/api/logs/${encodeURIComponent(String(possibleId))}`,
      'DELETE',
      undefined,
    ]);
  }

  attempts.push(
    ['/api/logs', 'DELETE', payload],
    ['/api/logs/delete', 'POST', payload],
    ['/api/logs', 'POST', { ...payload, action: 'delete', _method: 'DELETE' }],
  );

  let lastError = null;

  for (const [path, method, body] of attempts) {
    try {
      return await apiWrite(path, method, body);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    'Delete failed. Backend did not accept any delete route. Last error: ' +
      String(lastError?.message || lastError || 'unknown error'),
  );
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
