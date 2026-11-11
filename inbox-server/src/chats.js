const fb = require('./firebase');

function safeKey(id) {
  return String(id || '')
    .replace(/[.#$/\[\]]/g, '_')
    .slice(0, 120);
}

function nowIso() {
  return new Date().toISOString();
}

async function getChat(chatId) {
  return fb.get(`inboxChats/${safeKey(chatId)}`);
}

async function upsertIncomingMessage({
  chatId,
  messageId,
  text,
  direction = 'in',
  buyerName = '',
  itemTitle = '',
  itemUrl = '',
  itemPrice = '',
  itemImage = '',
  itemId = '',
  buyerProfileUrl = '',
  authorName = '',
  authorId = '',
  createdAt
}) {
  const id = safeKey(chatId);
  const msgId = safeKey(messageId || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const existing = (await getChat(chatId)) || {};
  const wasClosed = existing.status === 'closed';
  const assigned = existing.status === 'assigned' && existing.assigneeId;

  let status = existing.status || 'open';
  let assigneeId = existing.assigneeId || null;
  let assigneeName = existing.assigneeName || null;

  // New buyer message after close → back to incoming queue
  if (direction === 'in' && (wasClosed || !existing.status)) {
    status = 'open';
    assigneeId = null;
    assigneeName = null;
  }

  const unreadBump = direction === 'in' ? 1 : 0;
  const chatPatch = {
    id,
    channel: 'avito',
    status,
    assigneeId,
    assigneeName,
    buyerName: buyerName || existing.buyerName || 'Покупатель Авито',
    buyerProfileUrl: buyerProfileUrl || existing.buyerProfileUrl || '',
    itemId: itemId || existing.itemId || '',
    itemTitle: itemTitle || existing.itemTitle || '',
    itemUrl: itemUrl || existing.itemUrl || '',
    itemPrice: itemPrice || existing.itemPrice || '',
    itemImage: itemImage || existing.itemImage || '',
    lastMessage: text || existing.lastMessage || '',
    lastDirection: direction,
    updatedAt: nowIso(),
    unread: direction === 'in' ? (Number(existing.unread) || 0) + unreadBump : Number(existing.unread) || 0
  };
  if (!existing.createdAt) chatPatch.createdAt = nowIso();
  if (wasClosed && direction === 'in') {
    chatPatch.closedAt = null;
    chatPatch.closedBy = null;
    chatPatch.claimedAt = null;
  }
  // Keep assignment if still assigned and message is outbound echo
  if (assigned && !wasClosed) {
    chatPatch.status = 'assigned';
    chatPatch.assigneeId = existing.assigneeId;
    chatPatch.assigneeName = existing.assigneeName;
  }

  await fb.update(`inboxChats/${id}`, chatPatch);

  const sellerId = String(process.env.AVITO_USER_ID || '');
  const aid = String(authorId || '');
  const fromBuyer = Boolean(aid && sellerId && aid !== sellerId && /^\d+$/.test(aid));

  const msgPatch = {
    id: msgId,
    text: text || '',
    direction: fromBuyer ? 'in' : direction,
    createdAt: createdAt || nowIso(),
    channel: 'avito'
  };
  if (fromBuyer) {
    msgPatch.authorName = buyerName || existing.buyerName || authorName || 'Покупатель';
    msgPatch.authorId = aid;
  } else if (msgPatch.direction === 'out') {
    // Only an explicit CRM send passes the manager name. A webhook must not stamp the current assignee.
    msgPatch.authorName = authorName || 'Менеджер';
    if (aid) msgPatch.authorId = aid;
  } else if (authorName) {
    msgPatch.authorName = authorName;
    if (aid) msgPatch.authorId = aid;
  } else {
    msgPatch.authorName = buyerName || existing.buyerName || 'Покупатель';
    if (aid) msgPatch.authorId = aid;
  }

  try {
    const prev = await fb.get(`inboxMessages/${id}/${msgId}`);
    if (fromBuyer) {
      if (prev?.createdAt) msgPatch.createdAt = prev.createdAt;
    } else if (prev) {
      if (prev.direction) msgPatch.direction = prev.direction;
      if (prev.authorName) msgPatch.authorName = prev.authorName;
      if (prev.authorId) msgPatch.authorId = prev.authorId;
      if (prev.createdAt) msgPatch.createdAt = prev.createdAt;
      if (
        authorName &&
        msgPatch.direction === 'out' &&
        (!prev.authorName || prev.authorName === 'Менеджер')
      ) {
        msgPatch.authorName = authorName;
        if (aid) msgPatch.authorId = aid;
      }
    }
  } catch (_) {}

  await fb.set(`inboxMessages/${id}/${msgId}`, msgPatch);

  return { chatId: id, messageId: msgId, status: chatPatch.status };
}

async function claimChat(chatId, manager) {
  const id = safeKey(chatId);
  const existing = (await getChat(chatId)) || null;
  if (!existing) {
    const err = new Error('Чат не найден');
    err.status = 404;
    throw err;
  }
  if (existing.status === 'assigned' && existing.assigneeId && existing.assigneeId !== manager.id) {
    const err = new Error(`Уже принял: ${existing.assigneeName || existing.assigneeId}`);
    err.status = 409;
    throw err;
  }
  // open → mine, or archive (closed) → mine
  const patch = {
    status: 'assigned',
    assigneeId: manager.id,
    assigneeName: manager.name || manager.id,
    claimedAt: nowIso(),
    updatedAt: nowIso(),
    closedAt: null,
    closedBy: null,
    closedByName: null
  };
  await fb.update(`inboxChats/${id}`, patch);
  return { ...existing, ...patch };
}

async function releaseChat(chatId, manager, { force = false } = {}) {
  const id = safeKey(chatId);
  const existing = (await getChat(chatId)) || null;
  if (!existing) {
    const err = new Error('Чат не найден');
    err.status = 404;
    throw err;
  }
  const isOwner = existing.assigneeId === manager.id;
  const isAdmin = manager.role === 'admin';
  if (!force && !isOwner && !isAdmin) {
    const err = new Error('Можно вернуть только свой диалог');
    err.status = 403;
    throw err;
  }
  const patch = {
    status: 'open',
    assigneeId: null,
    assigneeName: null,
    claimedAt: null,
    updatedAt: nowIso()
  };
  await fb.update(`inboxChats/${id}`, patch);
  return { ...existing, ...patch };
}

async function closeChat(chatId, manager) {
  const id = safeKey(chatId);
  const existing = (await getChat(chatId)) || null;
  if (!existing) {
    const err = new Error('Чат не найден');
    err.status = 404;
    throw err;
  }
  const isOwner = existing.assigneeId === manager.id;
  const isAdmin = manager.role === 'admin';
  if (!isOwner && !isAdmin) {
    const err = new Error('Можно завершить только свой диалог');
    err.status = 403;
    throw err;
  }
  const patch = {
    status: 'closed',
    closedAt: nowIso(),
    closedBy: manager.id,
    closedByName: manager.name || manager.id,
    updatedAt: nowIso(),
    unread: 0
  };
  await fb.update(`inboxChats/${id}`, patch);
  return { ...existing, ...patch };
}

async function clearUnread(chatId) {
  const id = safeKey(chatId);
  await fb.update(`inboxChats/${id}`, { unread: 0, updatedAt: nowIso() });
}

async function appendOutbound(chatId, text, messageId, manager = {}) {
  return upsertIncomingMessage({
    chatId,
    messageId: messageId || `out_${Date.now()}`,
    text,
    direction: 'out',
    authorName: manager.name || manager.id || 'Менеджер',
    authorId: manager.id || ''
  });
}

/**
 * Normalize Avito webhook payloads (formats differ by webhook version).
 */
function parseAvitoWebhook(payload) {
  const root = payload || {};
  const payloadObj = root.payload || root;
  const value = payloadObj.value || payloadObj.message || payloadObj;

  const chatId =
    value.chat_id ||
    value.chatId ||
    payloadObj.chat_id ||
    root.chat_id ||
    value.id;

  const message =
    value.content ||
    value.message ||
    value;

  const text =
    (typeof message === 'string' ? message : null) ||
    message?.text ||
    message?.content?.text ||
    value.text ||
    '';

  const messageId =
    value.message_id ||
    value.id ||
    message?.id ||
    `${chatId}_${value.created || Date.now()}`;

  const createdAt = value.created
    ? new Date(Number(value.created) * (Number(value.created) < 1e12 ? 1000 : 1)).toISOString()
    : nowIso();

  const directionRaw = String(
    value.direction || message?.direction || value.flow || ''
  ).toLowerCase();
  const authorId = String(
    value.author_id ||
      value.authorId ||
      value.author?.id ||
      message?.author_id ||
      ''
  );
  const sellerId = String(process.env.AVITO_USER_ID || '');
  let direction = 'in';
  // Our seller account → always outbound, even if Avito marks the echo oddly
  if (sellerId && authorId && authorId === sellerId) {
    direction = 'out';
  } else if (
    directionRaw === 'out' ||
    directionRaw === 'outgoing' ||
    directionRaw === '1'
  ) {
    direction = 'out';
  }

  const buyerName =
    direction === 'in'
      ? value.author?.name ||
        value.user?.name ||
        value.opponent?.name ||
        ''
      : '';

  // Outbound: leave author empty so upsert uses assigneeName / preserved CRM name
  // (Avito author is usually the shop account, not the manager)
  const authorName =
    direction === 'out'
      ? ''
      : value.author?.name || value.user?.name || value.opponent?.name || '';

  const itemTitle =
    value.item?.title ||
    value.context?.value?.title ||
    value.advert?.title ||
    '';

  if (!chatId) return null;
  // Ignore pure system noise without text when possible
  return {
    chatId: String(chatId),
    messageId: String(messageId),
    text: String(text || '').trim() || '[сообщение без текста]',
    direction,
    buyerName,
    authorName,
    authorId,
    itemTitle,
    createdAt
  };
}

module.exports = {
  upsertIncomingMessage,
  claimChat,
  releaseChat,
  closeChat,
  clearUnread,
  appendOutbound,
  parseAvitoWebhook,
  getChat,
  safeKey
};
