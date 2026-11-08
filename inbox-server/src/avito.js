let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

  const clientId = process.env.AVITO_CLIENT_ID;
  const clientSecret = process.env.AVITO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('AVITO_CLIENT_ID / AVITO_CLIENT_SECRET не заданы');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const res = await fetch('https://api.avito.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Avito token failed: ${JSON.stringify(data)}`);
  }
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  return cachedToken;
}

async function avitoFetch(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.avito.ru${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Avito ${method} ${path}: ${res.status} ${JSON.stringify(data)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function userId() {
  const id = process.env.AVITO_USER_ID;
  if (!id) throw new Error('AVITO_USER_ID не задан');
  return id;
}

async function subscribeWebhook(url) {
  return avitoFetch('/messenger/v3/webhook', {
    method: 'POST',
    body: { url }
  });
}

async function sendMessage(chatId, text) {
  return avitoFetch(`/messenger/v1/accounts/${userId()}/chats/${chatId}/messages`, {
    method: 'POST',
    body: { message: { text }, type: 'text' }
  });
}

async function markRead(chatId) {
  try {
    return await avitoFetch(
      `/messenger/v1/accounts/${userId()}/chats/${chatId}/read`,
      { method: 'POST', body: {} }
    );
  } catch (e) {
    // Some API versions use different path — ignore soft fail
    console.warn('markRead soft fail', e.message);
    return null;
  }
}

async function getChatById(chatId) {
  return avitoFetch(`/messenger/v2/accounts/${userId()}/chats/${encodeURIComponent(chatId)}`);
}

function extractItemMeta(chatPayload) {
  const chat = chatPayload?.chats?.[0] || chatPayload || {};
  const ctx = chat.context?.value || {};
  const sellerId = Number(userId());
  const users = Array.isArray(chat.users) ? chat.users : [];
  const buyer = users.find((u) => Number(u.id) !== sellerId) || users[0] || {};
  let itemUrl = ctx.url || '';
  if (itemUrl && !/^https?:\/\//i.test(itemUrl)) {
    itemUrl = `https://${itemUrl.replace(/^\/+/, '')}`;
  }
  return {
    itemId: ctx.id ? String(ctx.id) : '',
    itemTitle: ctx.title || '',
    itemPrice: ctx.price_string || '',
    itemUrl,
    itemImage: ctx.images?.main?.['140x105'] || '',
    buyerName: buyer.name || '',
    buyerProfileUrl: buyer.public_user_profile?.url || ''
  };
}

async function enrichChatMeta(chatId) {
  const raw = await getChatById(chatId);
  return extractItemMeta(raw);
}

module.exports = {
  getAccessToken,
  subscribeWebhook,
  sendMessage,
  markRead,
  getChatById,
  enrichChatMeta,
  extractItemMeta,
  userId
};
