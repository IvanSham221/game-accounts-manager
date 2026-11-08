const DB =
  (process.env.FIREBASE_DATABASE_URL ||
    'https://crm-pshub-default-rtdb.europe-west1.firebasedatabase.app'
  ).replace(/\/$/, '');

function authQuery() {
  const auth = process.env.FIREBASE_AUTH;
  return auth ? `?auth=${encodeURIComponent(auth)}` : '';
}

async function fbFetch(path, { method = 'GET', body } = {}) {
  const url = `${DB}/${path.replace(/^\//, '')}.json${authQuery()}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body != null ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`Firebase ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function get(path) {
  return fbFetch(path, { method: 'GET' });
}

function set(path, value) {
  return fbFetch(path, { method: 'PUT', body: value });
}

function update(path, value) {
  return fbFetch(path, { method: 'PATCH', body: value });
}

function push(path, value) {
  return fbFetch(path, { method: 'POST', body: value });
}

module.exports = { get, set, update, push, DB };
