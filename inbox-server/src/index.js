require('dotenv').config();

const express = require('express');
const cors = require('cors');
const avito = require('./avito');
const chats = require('./chats');

const app = express();
const PORT = Number(process.env.PORT || 3010);
const BASE = (process.env.BASE_PATH || '/inbox').replace(/\/$/, '') || '';

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

function requireApiKey(req, res, next) {
  const key = process.env.INBOX_API_KEY || '';
  const got = req.header('X-Inbox-Key') || req.query.key || '';
  if (!key || got !== key) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  return next();
}

function managerFromBody(body = {}) {
  return {
    id: String(body.managerId || '').trim(),
    name: String(body.managerName || body.managerId || '').trim(),
    role: String(body.managerRole || 'worker')
  };
}

app.get(`${BASE}/health`, (_req, res) => {
  res.json({
    ok: true,
    service: 'pshub-inbox',
    time: new Date().toISOString(),
    avitoUser: Boolean(process.env.AVITO_USER_ID)
  });
});

// Avito webhook — no API key (Avito calls us)
app.post(`${BASE}/api/avito/webhook`, async (req, res) => {
  try {
    // Always ack fast
    res.status(200).json({ ok: true });

    const parsed = chats.parseAvitoWebhook(req.body);
    if (!parsed) {
      console.log('Avito webhook: unparsed', JSON.stringify(req.body).slice(0, 500));
      return;
    }

    // Pull listing title + Avito URL (like Jivo context link)
    try {
      const meta = await avito.enrichChatMeta(parsed.chatId);
      Object.assign(parsed, {
        buyerName: meta.buyerName || parsed.buyerName,
        itemTitle: meta.itemTitle || parsed.itemTitle,
        itemUrl: meta.itemUrl || '',
        itemPrice: meta.itemPrice || '',
        itemImage: meta.itemImage || '',
        itemId: meta.itemId || '',
        buyerProfileUrl: meta.buyerProfileUrl || ''
      });
    } catch (e) {
      console.warn('enrich soft fail', parsed.chatId, e.message);
    }

    const result = await chats.upsertIncomingMessage(parsed);
    console.log(
      'Avito msg saved',
      result.chatId,
      parsed.itemTitle || '-',
      parsed.direction,
      parsed.text.slice(0, 60)
    );
  } catch (e) {
    console.error('Avito webhook handler error', e.message || e);
  }
});

// Refresh listing title/url for one chat (or all missing)
app.post(`${BASE}/api/inbox/enrich`, requireApiKey, async (req, res) => {
  try {
    const oneId = String(req.body?.chatId || '').trim();
    const all = oneId
      ? { [oneId]: (await chats.getChat(oneId)) || { id: oneId } }
      : (await require('./firebase').get('inboxChats')) || {};
    const ids = Object.keys(all);
    let updated = 0;
    for (const id of ids) {
      try {
        const meta = await avito.enrichChatMeta(id);
        if (!meta.itemTitle && !meta.itemUrl) continue;
        await require('./firebase').update(`inboxChats/${chats.safeKey(id)}`, {
          itemId: meta.itemId || null,
          itemTitle: meta.itemTitle || null,
          itemUrl: meta.itemUrl || null,
          itemPrice: meta.itemPrice || null,
          itemImage: meta.itemImage || null,
          buyerName: meta.buyerName || all[id]?.buyerName || null,
          buyerProfileUrl: meta.buyerProfileUrl || null,
          updatedAt: new Date().toISOString()
        });
        updated += 1;
      } catch (e) {
        console.warn('enrich one fail', id, e.message);
      }
    }
    res.json({ ok: true, updated, total: ids.length });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post(`${BASE}/api/inbox/claim`, requireApiKey, async (req, res) => {
  try {
    const manager = managerFromBody(req.body);
    if (!manager.id) return res.status(400).json({ ok: false, message: 'Нужен managerId' });
    const chat = await chats.claimChat(req.body.chatId, manager);
    res.json({ ok: true, chat });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, message: e.message });
  }
});

app.post(`${BASE}/api/inbox/release`, requireApiKey, async (req, res) => {
  try {
    const manager = managerFromBody(req.body);
    if (!manager.id) return res.status(400).json({ ok: false, message: 'Нужен managerId' });
    const chat = await chats.releaseChat(req.body.chatId, manager);
    res.json({ ok: true, chat });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, message: e.message });
  }
});

app.post(`${BASE}/api/inbox/close`, requireApiKey, async (req, res) => {
  try {
    const manager = managerFromBody(req.body);
    if (!manager.id) return res.status(400).json({ ok: false, message: 'Нужен managerId' });
    const chat = await chats.closeChat(req.body.chatId, manager);
    res.json({ ok: true, chat });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, message: e.message });
  }
});

app.post(`${BASE}/api/inbox/reply`, requireApiKey, async (req, res) => {
  try {
    const manager = managerFromBody(req.body);
    const chatId = String(req.body.chatId || '').trim();
    const text = String(req.body.text || '').trim();
    if (!manager.id || !chatId || !text) {
      return res.status(400).json({ ok: false, message: 'Нужны managerId, chatId, text' });
    }
    const existing = await chats.getChat(chatId);
    if (!existing) return res.status(404).json({ ok: false, message: 'Чат не найден' });
    if (existing.status !== 'assigned' || existing.assigneeId !== manager.id) {
      if (manager.role !== 'admin') {
        return res.status(403).json({ ok: false, message: 'Сначала примите диалог в «Мои»' });
      }
    }
    const sent = await avito.sendMessage(chatId, text);
    const messageId = String(
      sent?.id ||
        sent?.result?.id ||
        sent?.message_id ||
        sent?.message?.id ||
        sent?.result?.message_id ||
        `out_${Date.now()}`
    );
    await chats.appendOutbound(chatId, text, messageId, manager);
    await chats.clearUnread(chatId);
    res.json({ ok: true, sent });
  } catch (e) {
    console.error('reply error', e.message || e);
    res.status(e.status || 500).json({ ok: false, message: e.message });
  }
});

app.post(`${BASE}/api/inbox/read`, requireApiKey, async (req, res) => {
  try {
    const chatId = String(req.body.chatId || '').trim();
    if (!chatId) return res.status(400).json({ ok: false, message: 'Нужен chatId' });
    await chats.clearUnread(chatId);
    try {
      await avito.markRead(chatId);
    } catch (_) {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.post(`${BASE}/api/avito/subscribe`, requireApiKey, async (req, res) => {
  try {
    const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    const url = req.body?.url || `${publicUrl}${BASE}/api/avito/webhook`;
    if (!url.startsWith('https://')) {
      return res.status(400).json({ ok: false, message: 'Нужен https URL webhook' });
    }
    const result = await avito.subscribeWebhook(url);
    res.json({ ok: true, url, result });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`pshub-inbox on :${PORT} base=${BASE || '/'}`);
});
