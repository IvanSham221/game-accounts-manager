(() => {
  const INBOX_API = 'https://147.45.149.39.sslip.io/inbox';
  // Same key for everyone; keep localStorage only as fallback for already configured browsers
  const INBOX_KEY =
    localStorage.getItem('inbox_api_key') || '67aa80dd8b6bad25640d8a95db167506';

  const state = {
    tab: 'incoming',
    composeMode: 'reply',
    query: '',
    chats: {},
    messages: {},
    notes: {},
    selectedId: null,
    unsubMessages: null,
    unsubNotes: null,
    timelineSig: '',
    timelineChatId: null,
    recentOutbound: [],
    pendingChatId: null,
    accountQuery: '',
    accountHits: [],
    accountSearchTimer: null,
    accountsReady: false,
    gamesReady: false,
    selectedGame: null,
    gameHits: [],
    snippets: {},
    localSnippets: {},
    suggestHits: [],
    suggestIndex: -1,
    unsubSnippets: null
  };

  const els = {
    shell: document.querySelector('.inbox-shell'),
    tabs: document.getElementById('inboxTabs'),
    layout: document.getElementById('inboxLayout'),
    list: document.getElementById('inboxList'),
    search: document.getElementById('inboxSearch'),
    back: document.getElementById('inboxBack'),
    thread: document.getElementById('inboxThread'),
    empty: document.getElementById('inboxEmpty'),
    meta: document.getElementById('inboxMeta'),
    messages: document.getElementById('inboxMessages'),
    composer: document.getElementById('inboxComposer'),
    modeTabs: document.getElementById('inboxModeTabs'),
    composeText: document.getElementById('inboxComposeText'),
    composeHint: document.getElementById('inboxComposeHint'),
    btnComposeSend: document.getElementById('inboxComposeSend'),
    suggest: document.getElementById('inboxSuggest'),
    claimBar: document.getElementById('inboxClaimBar'),
    claimHint: document.getElementById('inboxClaimHint'),
    btnClaim: document.getElementById('inboxClaim'),
    btnRelease: document.getElementById('inboxRelease'),
    btnClose: document.getElementById('inboxClose'),
    btnRead: document.getElementById('inboxRead'),
    toggleInfo: document.getElementById('inboxToggleInfo'),
    infoEmpty: document.getElementById('inboxInfoEmpty'),
    infoBody: document.getElementById('inboxInfoBody'),
    infoAvatar: document.getElementById('inboxInfoAvatar'),
    infoName: document.getElementById('inboxInfoName'),
    infoChannel: document.getElementById('inboxInfoChannel'),
    infoStatus: document.getElementById('inboxInfoStatus'),
    infoAssignee: document.getElementById('inboxInfoAssignee'),
    infoPrice: document.getElementById('inboxInfoPrice'),
    infoItem: document.getElementById('inboxInfoItem'),
    infoThumb: document.getElementById('inboxInfoThumb'),
    infoTitle: document.getElementById('inboxInfoTitle'),
    infoMessenger: document.getElementById('inboxInfoMessenger'),
    infoCopyLink: document.getElementById('inboxInfoCopyLink'),
    infoCopy: document.getElementById('inboxInfoCopy'),
    accountLinked: document.getElementById('inboxAccountLinked'),
    accountSearchWrap: document.getElementById('inboxAccountSearchWrap'),
    accountSearch: document.getElementById('inboxAccountSearch'),
    gameDropdown: document.getElementById('inboxGameDropdown'),
    selectedGame: document.getElementById('inboxSelectedGame'),
    accountResults: document.getElementById('inboxAccountResults'),
    counts: {
      incoming: document.getElementById('countIncoming'),
      mine: document.getElementById('countMine'),
      closed: document.getElementById('countClosed')
    }
  };

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return String(iso).replace('T', ' ').slice(0, 16);
    }
    return d.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatClock(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDayLabel(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function dayKey(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
  }

  function formatListTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
      d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) ===
      now.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
    if (sameDay) {
      return d.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return d.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function user() {
    return (
      (window.security && security.getCurrentUser && security.getCurrentUser()) ||
      JSON.parse(localStorage.getItem('currentUser') || 'null')
    );
  }

  function me() {
    const u = user();
    return {
      id: u?.id || u?.username || 'unknown',
      name: u?.name || u?.username || 'Менеджер',
      role: u?.role || 'worker'
    };
  }

  async function api(path, body) {
    const res = await fetch(`${INBOX_API.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Inbox-Key': INBOX_KEY
      },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Ошибка ${res.status}`);
    return data;
  }

  async function saveChatPatch(chatId, patch) {
    if (!chatId || !firebase?.database) throw new Error('Нет доступа к базе');
    await firebase.database().ref(`inboxChats/${chatId}`).update(patch);
    const prev = state.chats[chatId] || { id: chatId };
    state.chats[chatId] = { ...prev, ...patch, id: chatId };
    return state.chats[chatId];
  }

  function toast(text, type = 'info') {
    if (typeof showNotification === 'function') showNotification(text, type);
    else console.log(text);
  }

  function chatList() {
    return Object.values(state.chats || {}).filter(Boolean);
  }

  function filtered() {
    const m = me();
    const q = state.query.trim().toLowerCase();
    return chatList()
      .filter((c) => {
        if (state.tab === 'incoming') return c.status === 'open';
        if (state.tab === 'mine') return c.status === 'assigned' && c.assigneeId === m.id;
        if (state.tab === 'closed') return c.status === 'closed';
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        const hay = [c.buyerName, c.itemTitle, c.lastMessage, c.itemPrice, c.assigneeName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  function syncMobilePane() {
    els.shell?.classList.toggle('chat-open', Boolean(state.selectedId));
  }

  function autoGrowCompose() {
    const el = els.composeText;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function updateCounts() {
    const m = me();
    const all = chatList();
    if (els.counts.incoming) {
      els.counts.incoming.textContent = String(all.filter((c) => c.status === 'open').length);
    }
    if (els.counts.mine) {
      els.counts.mine.textContent = String(
        all.filter((c) => c.status === 'assigned' && c.assigneeId === m.id).length
      );
    }
    if (els.counts.closed) {
      els.counts.closed.textContent = String(all.filter((c) => c.status === 'closed').length);
    }
  }

  function initials(name) {
    const parts = String(name || 'П')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return 'П';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function selectedChat() {
    return state.selectedId ? state.chats[state.selectedId] : null;
  }

  function messengerUrl(chat) {
    return chat?.id
      ? `https://www.avito.ru/profile/messenger/channel/${encodeURIComponent(chat.id)}`
      : '';
  }

  function chatDeepLink(chatId) {
    if (!chatId) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('chat', String(chatId));
    return url.toString();
  }

  function readChatIdFromUrl() {
    try {
      const q = new URLSearchParams(window.location.search).get('chat');
      if (q) return String(q);
      const hash = String(window.location.hash || '');
      const m = hash.match(/chat=([^&]+)/i);
      return m ? decodeURIComponent(m[1]) : null;
    } catch (_) {
      return null;
    }
  }

  function syncUrlWithChat(chatId) {
    try {
      const url = new URL(window.location.href);
      if (chatId) url.searchParams.set('chat', String(chatId));
      else url.searchParams.delete('chat');
      history.replaceState(null, '', `${url.pathname}${url.search}`);
    } catch (_) {}
  }

  function switchTab(tab) {
    if (!tab || state.tab === tab) return;
    state.tab = tab;
    els.tabs?.querySelectorAll('[data-tab]').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
  }

  function tabForChat(chat) {
    const m = me();
    if (chat?.status === 'closed') return 'closed';
    if (chat?.status === 'assigned' && chat.assigneeId === m.id) return 'mine';
    if (chat?.status === 'open') return 'incoming';
    if (chat?.status === 'assigned') return 'mine';
    return state.tab;
  }

  function tryOpenPendingChat() {
    const id = state.pendingChatId;
    if (!id) return false;
    const chat = state.chats[id];
    if (!chat) return false;
    switchTab(tabForChat(chat));
    selectChat(id);
    state.pendingChatId = null;
    return true;
  }

  function statusLabel(status) {
    if (status === 'open') return { text: 'В очереди', cls: 'open' };
    if (status === 'assigned') return { text: 'В работе', cls: 'assigned' };
    if (status === 'closed') return { text: 'Решён', cls: 'closed' };
    return { text: status || '—', cls: 'open' };
  }

  function previewText(c) {
    const raw = String(c.lastMessage || '').trim();
    if (!raw) return c.status === 'open' ? 'Новое обращение' : 'Нет сообщений';
    if (c.lastDirection === 'out') return `Вы: ${raw}`;
    return raw;
  }

  function renderList() {
    updateCounts();
    const list = filtered();
    if (!list.length) {
      els.list.innerHTML = `<div class="inbox-empty-list">${
        state.query ? 'Ничего не найдено' : 'Пока пусто'
      }</div>`;
      return;
    }
    els.list.innerHTML = list
      .map((c) => {
        const unreadCount = Number(c.unread) || 0;
        const active = c.id === state.selectedId ? ' active' : '';
        const unreadCls = unreadCount > 0 ? ' has-unread' : '';
        const unread =
          unreadCount > 0 ? `<span class="inbox-unread">${unreadCount}</span>` : '';
        const when = formatListTime(c.updatedAt);
        const buyer = c.buyerName || 'Покупатель';
        const title = c.itemTitle || buyer;
        const sub =
          c.itemTitle && c.itemTitle !== buyer
            ? `<div class="inbox-item-sub">${escapeHtml(buyer)}${
                c.itemPrice ? ` · ${escapeHtml(c.itemPrice)}` : ''
              }</div>`
            : c.itemPrice
              ? `<div class="inbox-item-sub">${escapeHtml(c.itemPrice)}</div>`
              : '';
        return `
        <button type="button" class="inbox-item${active}${unreadCls}" data-id="${escapeHtml(c.id)}">
          <div class="inbox-avatar" aria-hidden="true">${escapeHtml(initials(buyer))}</div>
          <div class="inbox-item-body">
            <div class="inbox-item-top">
              <strong>${escapeHtml(title)}</strong>
              <span>${unread}${when ? `<span class="inbox-list-time">${escapeHtml(when)}</span>` : ''}</span>
            </div>
            ${sub}
            <div class="inbox-item-msg">${escapeHtml(previewText(c))}</div>
          </div>
        </button>`;
      })
      .join('');
  }

  function renderInfo(chat) {
    if (!chat) {
      els.infoEmpty?.classList.remove('hidden');
      els.infoBody?.classList.add('hidden');
      return;
    }
    els.infoEmpty?.classList.add('hidden');
    els.infoBody?.classList.remove('hidden');

    const buyer = chat.buyerName || 'Покупатель';
    if (els.infoAvatar) els.infoAvatar.textContent = initials(buyer);
    if (els.infoName) els.infoName.textContent = buyer;
    if (els.infoChannel) els.infoChannel.textContent = 'Авито';
    if (els.infoAssignee) {
      els.infoAssignee.textContent =
        chat.status === 'assigned'
          ? chat.assigneeName || 'Менеджер'
          : chat.status === 'closed'
            ? chat.closedByName || chat.assigneeName || '—'
            : 'Не назначен';
    }
    if (els.infoPrice) els.infoPrice.textContent = chat.itemPrice || '—';

    const st = statusLabel(chat.status);
    if (els.infoStatus) {
      els.infoStatus.innerHTML = `<span class="inbox-tag ${st.cls}">${escapeHtml(st.text)}</span>`;
    }

    const title = chat.itemTitle || 'Объявление Авито';
    if (els.infoTitle) els.infoTitle.textContent = title;
    if (els.infoItem) {
      if (chat.itemUrl) {
        els.infoItem.href = chat.itemUrl;
        els.infoItem.style.pointerEvents = '';
      } else {
        els.infoItem.removeAttribute('href');
        els.infoItem.style.pointerEvents = 'none';
      }
    }
    if (els.infoThumb) {
      if (chat.itemImage) {
        els.infoThumb.src = chat.itemImage;
        els.infoThumb.classList.remove('hidden');
      } else {
        els.infoThumb.removeAttribute('src');
        els.infoThumb.classList.add('hidden');
      }
    }

    const mUrl = messengerUrl(chat);
    if (els.infoMessenger) {
      if (mUrl) {
        els.infoMessenger.href = mUrl;
        els.infoMessenger.classList.remove('hidden');
      } else {
        els.infoMessenger.classList.add('hidden');
      }
    }

    renderAccountPanel(chat);
  }

  function accountsList() {
    return (
      (typeof accounts !== 'undefined' && Array.isArray(accounts) && accounts) ||
      window.accounts ||
      []
    );
  }

  function gamesList() {
    return (
      (typeof games !== 'undefined' && Array.isArray(games) && games) ||
      window.games ||
      []
    );
  }

  async function ensureAccountsLoaded() {
    if (state.accountsReady && accountsList().length) return accountsList();
    if (typeof window.loadAccountsOnDemand === 'function') {
      const list = await window.loadAccountsOnDemand();
      state.accountsReady = true;
      return list || accountsList();
    }
    state.accountsReady = true;
    return accountsList();
  }

  async function ensureGamesLoaded() {
    if (state.gamesReady && gamesList().length) return gamesList();
    if (typeof window.loadGamesOnDemand === 'function') {
      const list = await window.loadGamesOnDemand();
      state.gamesReady = true;
      return list || gamesList();
    }
    state.gamesReady = true;
    return gamesList();
  }

  function findAccountById(id) {
    if (id == null || id === '') return null;
    return accountsList().find((a) => String(a.id) === String(id)) || null;
  }

  function idsEqual(a, b) {
    if (typeof sameId === 'function') return sameId(a, b);
    return String(a) === String(b);
  }

  function isSlotSold(accountId, positionType, positionIndex) {
    if (typeof getPositionSaleInfo === 'function') {
      return !!getPositionSaleInfo(accountId, positionType, positionIndex);
    }
    const list = window.sales || (typeof sales !== 'undefined' ? sales : []) || [];
    return list.some(
      (sale) =>
        idsEqual(sale.accountId, accountId) &&
        sale.positionType === positionType &&
        Number(sale.positionIndex) === Number(positionIndex) &&
        !sale.isTransplanted
    );
  }

  function getLinkedAccountEntries(chat) {
    const raw = Array.isArray(chat?.linkedAccounts) ? chat.linkedAccounts : [];
    const list = raw.filter(Boolean).map((x) => ({
      id: x.id,
      psnLogin: x.psnLogin || '',
      gameName: x.gameName || '',
      email: x.email || '',
      linkedAt: x.linkedAt || '',
      linkedBy: x.linkedBy || '',
      linkedByName: x.linkedByName || ''
    }));
    if (!list.length && chat?.linkedAccountId) {
      list.push({
        id: chat.linkedAccountId,
        psnLogin: chat.linkedPsnLogin || '',
        gameName: chat.linkedGameName || '',
        email: chat.linkedEmail || '',
        linkedAt: chat.linkedAt || '',
        linkedBy: chat.linkedBy || '',
        linkedByName: chat.linkedByName || ''
      });
    }
    const seen = new Set();
    return list.filter((item) => {
      const key = String(item.id ?? '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isAccountLinkedToChat(chat, accountId) {
    return getLinkedAccountEntries(chat).some((x) => idsEqual(x.id, accountId));
  }

  function linkedAccountsPatch(entries) {
    const first = entries[0] || null;
    return {
      linkedAccounts: entries.length ? entries : null,
      linkedAccountId: first ? first.id : null,
      linkedPsnLogin: first ? first.psnLogin || null : null,
      linkedGameName: first ? first.gameName || null : null,
      linkedEmail: first ? first.email || null : null,
      linkedAt: first ? first.linkedAt || null : null,
      linkedBy: first ? first.linkedBy || null : null,
      linkedByName: first ? first.linkedByName || null : null,
      updatedAt: new Date().toISOString()
    };
  }

  function formatCompactSaleDate(saleInfo) {
    if (!saleInfo) return '';
    const raw = saleInfo.datetime || saleInfo.date || '';
    if (!raw) return '';
    try {
      if (saleInfo.date && /^\d{4}-\d{2}-\d{2}/.test(String(saleInfo.date))) {
        const [, , m, d] = String(saleInfo.date).match(/(\d{4})-(\d{2})-(\d{2})/) || [];
        if (d && m) return `${d}.${m}`;
      }
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return '';
      return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch (_) {
      return '';
    }
  }

  function getSlotSaleInfo(accountId, positionType, positionIndex) {
    if (typeof getPositionSaleInfo === 'function') {
      return getPositionSaleInfo(accountId, positionType, positionIndex) || null;
    }
    const list = window.sales || (typeof sales !== 'undefined' ? sales : []) || [];
    return (
      list.find(
        (sale) =>
          idsEqual(sale.accountId, accountId) &&
          sale.positionType === positionType &&
          Number(sale.positionIndex) === Number(positionIndex) &&
          !sale.isTransplanted
      ) || null
    );
  }

  function renderMiniSlots(account, positionType, label) {
    const count = Number(account?.positions?.[positionType]) || 0;
    if (!count) return '';
    const bits = [];
    for (let i = 1; i <= count; i++) {
      const saleInfo = getSlotSaleInfo(account.id, positionType, i);
      const sold = !!saleInfo;
      const dateStr = sold ? formatCompactSaleDate(saleInfo) : '';
      const tip = sold
        ? `Продано${dateStr ? `: ${dateStr}` : ''}${
            saleInfo?.soldByName ? ` · ${saleInfo.soldByName}` : ''
          }`
        : 'Продать и отправить клиенту';
      bits.push(
        `<span class="inbox-mini-slot-wrap">
          <button type="button" class="inbox-mini-slot ${sold ? 'sold' : 'free'}"
            data-slot-action="${sold ? 'view' : 'sell'}"
            data-account-id="${escapeHtml(String(account.id))}"
            data-pos-type="${escapeHtml(positionType)}"
            data-pos-index="${i}"
            title="${escapeHtml(tip)}">
            ${i}<small>${label}</small>
          </button>
          ${dateStr ? `<span class="inbox-mini-slot-date">${escapeHtml(dateStr)}</span>` : ''}
        </span>`
      );
    }
    return bits.join('');
  }

  function renderMiniAccountCard(account, { linked = false, alreadyLinked = false } = {}) {
    const game =
      gamesList().find((g) => idsEqual(g.id, account.gameId)) || null;
    const cover = game?.imageUrl
      ? `<img class="inbox-mini-cover" src="${escapeHtml(game.imageUrl)}" alt="" />`
      : `<div class="inbox-mini-cover fallback">🎮</div>`;
    const ps4 =
      renderMiniSlots(account, 'p2_ps4', 'П2') +
      renderMiniSlots(account, 'p3_ps4', 'П3');
    const ps5 =
      renderMiniSlots(account, 'p2_ps5', 'П2') +
      renderMiniSlots(account, 'p3_ps5', 'П3');

    let actions = '';
    if (linked) {
      actions = `
        <a class="inbox-info-action" href="manager.html?login=${encodeURIComponent(
          account.psnLogin || ''
        )}" target="_blank" rel="noopener">Открыть в базе</a>
        <button type="button" class="inbox-info-action is-danger" data-unlink-account="${escapeHtml(
          String(account.id)
        )}">Отвязать</button>`;
    } else if (alreadyLinked) {
      actions = `<div class="inbox-mini-already">Уже привязан к диалогу</div>`;
    } else {
      actions = `
        <button type="button" class="inbox-info-action inbox-mini-link-btn" data-link-account="${escapeHtml(
          String(account.id)
        )}">Привязать к диалогу</button>
        <a class="inbox-info-action" href="manager.html?login=${encodeURIComponent(
          account.psnLogin || ''
        )}" target="_blank" rel="noopener">В базе</a>`;
    }

    return `
      <div class="inbox-mini-card ${linked ? 'is-linked' : ''}" data-account-id="${escapeHtml(
        String(account.id)
      )}">
        <div class="inbox-mini-head">
          ${cover}
          <div class="inbox-mini-head-text">
            <strong>${escapeHtml(account.psnLogin || '—')}</strong>
            <span>${escapeHtml(account.gameName || game?.name || 'Игра')}</span>
          </div>
        </div>
        <div class="inbox-mini-platforms">
          ${
            ps4
              ? `<div class="inbox-mini-platform"><div class="inbox-mini-platform-title">PS4</div><div class="inbox-mini-slots">${ps4}</div></div>`
              : ''
          }
          ${
            ps5
              ? `<div class="inbox-mini-platform"><div class="inbox-mini-platform-title">PS5</div><div class="inbox-mini-slots">${ps5}</div></div>`
              : ''
          }
          ${!ps4 && !ps5 ? `<div class="inbox-mini-empty">Нет посадок</div>` : ''}
        </div>
        <div class="inbox-mini-hint">Клик по слоту — продажа ${
          linked || alreadyLinked ? '+ автоотправка в чат' : ''
        }</div>
        <div class="inbox-mini-actions">${actions}</div>
      </div>`;
  }

  function matchGames(query) {
    const q = String(query || '').trim().toLowerCase();
    const list = gamesList();
    if (!q) return list.slice(0, 8);
    return list
      .filter((g) => String(g.name || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const an = String(a.name || '').toLowerCase();
        const bn = String(b.name || '').toLowerCase();
        const as = an.startsWith(q) ? 0 : 1;
        const bs = bn.startsWith(q) ? 0 : 1;
        return as - bs || an.localeCompare(bn);
      })
      .slice(0, 10);
  }

  function guessGameFromChat(chat) {
    const title = String(chat?.itemTitle || '').toLowerCase();
    if (!title) return null;
    const list = gamesList();
    let best = null;
    let bestScore = 0;
    list.forEach((g) => {
      const name = String(g.name || '').toLowerCase();
      if (!name) return;
      let score = 0;
      if (title.includes(name) || name.includes(title)) score = 100 + name.length;
      else {
        const words = name.split(/\s+/).filter((w) => w.length > 2);
        const hits = words.filter((w) => title.includes(w)).length;
        if (hits) score = hits * 20 + name.length / 10;
      }
      if (score > bestScore) {
        bestScore = score;
        best = g;
      }
    });
    return bestScore >= 20 ? best : null;
  }

  function renderGameDropdown(hits) {
    if (!els.gameDropdown) return;
    if (!hits?.length) {
      els.gameDropdown.classList.add('hidden');
      els.gameDropdown.innerHTML = `<div class="inbox-game-empty">Игры не найдены</div>`;
      els.gameDropdown.classList.remove('hidden');
      return;
    }
    els.gameDropdown.classList.remove('hidden');
    els.gameDropdown.innerHTML = hits
      .map((g) => {
        const count = accountsList().filter((a) => idsEqual(a.gameId, g.id)).length;
        const img = g.imageUrl
          ? `<img src="${escapeHtml(g.imageUrl)}" alt="" />`
          : `<span class="inbox-game-fallback">🎮</span>`;
        return `<button type="button" class="inbox-game-item" data-pick-game="${escapeHtml(
          String(g.id)
        )}">
          <span class="inbox-game-thumb">${img}</span>
          <span class="inbox-game-meta">
            <strong>${escapeHtml(g.name || '—')}</strong>
            <small>${count ? `${count} акк.` : 'нет аккаунтов'}</small>
          </span>
        </button>`;
      })
      .join('');
  }

  function hideGameDropdown() {
    els.gameDropdown?.classList.add('hidden');
  }

  function renderSelectedGameBar(game) {
    if (!els.selectedGame) return;
    if (!game) {
      els.selectedGame.classList.add('hidden');
      els.selectedGame.innerHTML = '';
      return;
    }
    els.selectedGame.classList.remove('hidden');
    els.selectedGame.innerHTML = `
      <div class="inbox-selected-game-inner">
        <strong>${escapeHtml(game.name || 'Игра')}</strong>
        <button type="button" class="inbox-selected-game-clear" data-clear-game title="Сбросить">×</button>
      </div>`;
  }

  function renderAccountPanel(chat) {
    if (!els.accountLinked || !els.accountSearchWrap) return;

    const linkedEntries = getLinkedAccountEntries(chat);
    els.accountSearchWrap.classList.remove('hidden');

    if (linkedEntries.length) {
      els.accountLinked.classList.remove('hidden');
      const cards = linkedEntries
        .map((entry) => {
          const live = findAccountById(entry.id);
          if (live) return renderMiniAccountCard(live, { linked: true });
          return `
            <div class="inbox-mini-card is-linked" data-account-id="${escapeHtml(String(entry.id))}">
              <div class="inbox-mini-head-text">
                <strong>${escapeHtml(entry.psnLogin || 'Аккаунт')}</strong>
                <span>${escapeHtml(entry.gameName || '')}</span>
              </div>
              <div class="inbox-mini-actions">
                <a class="inbox-info-action" href="manager.html?login=${encodeURIComponent(
                  entry.psnLogin || ''
                )}" target="_blank" rel="noopener">Открыть в базе</a>
                <button type="button" class="inbox-info-action is-danger" data-unlink-account="${escapeHtml(
                  String(entry.id)
                )}">Отвязать</button>
              </div>
            </div>`;
        })
        .join('');
      els.accountLinked.innerHTML = `
        <div class="inbox-linked-title">Привязано: ${linkedEntries.length}</div>
        ${cards}`;
    } else {
      els.accountLinked.classList.add('hidden');
      els.accountLinked.innerHTML = '';
    }

    renderSelectedGameBar(state.selectedGame);
    if (state.accountHits.length) renderMiniResults(state.accountHits);
  }

  function renderMiniResults(hits) {
    if (!els.accountResults) return;
    const chat = selectedChat();
    if (!hits?.length) {
      els.accountResults.classList.remove('hidden');
      els.accountResults.innerHTML = `<div class="inbox-mini-empty-list">По этой игре аккаунтов нет</div>`;
      return;
    }
    els.accountResults.classList.remove('hidden');
    els.accountResults.innerHTML = hits
      .map((acc) =>
        renderMiniAccountCard(acc, {
          alreadyLinked: isAccountLinkedToChat(chat, acc.id)
        })
      )
      .join('');
  }

  async function runGameSuggest(query) {
    state.accountQuery = query;
    try {
      await Promise.all([ensureGamesLoaded(), ensureAccountsLoaded()]);
      state.gameHits = matchGames(query);
      renderGameDropdown(state.gameHits);
    } catch (e) {
      toast(e.message || 'Не удалось загрузить игры', 'error');
    }
  }

  async function selectGameForInbox(gameId) {
    await Promise.all([ensureGamesLoaded(), ensureAccountsLoaded()]);
    const game = gamesList().find((g) => idsEqual(g.id, gameId));
    if (!game) {
      toast('Игра не найдена', 'error');
      return;
    }
    state.selectedGame = game;
    hideGameDropdown();
    if (els.accountSearch) els.accountSearch.value = game.name || '';
    renderSelectedGameBar(game);
    if (els.accountResults) {
      els.accountResults.classList.remove('hidden');
      els.accountResults.innerHTML = `<div class="inbox-mini-empty-list">Загрузка аккаунтов…</div>`;
    }
    try {
      if (typeof window.loadSalesOnDemand === 'function') {
        await window.loadSalesOnDemand(game.id);
      }
      const hits = accountsList().filter((a) => idsEqual(a.gameId, game.id));
      state.accountHits = hits;
      renderMiniResults(hits);
    } catch (e) {
      toast(e.message || 'Ошибка загрузки', 'error');
    }
  }

  async function maybeAutofillGameFromChat(chat) {
    if (!chat || state.selectedGame) return;
    try {
      await Promise.all([ensureGamesLoaded(), ensureAccountsLoaded()]);
      const guessed = guessGameFromChat(chat);
      if (guessed) await selectGameForInbox(guessed.id);
    } catch (_) {}
  }

  async function linkAccountToChat(accountId) {
    const chat = selectedChat();
    if (!chat?.id || !firebase?.database) return;
    await ensureAccountsLoaded();
    const acc = findAccountById(accountId);
    if (!acc) {
      toast('Аккаунт не найден', 'error');
      return;
    }
    const current = getLinkedAccountEntries(chat);
    if (current.some((x) => idsEqual(x.id, acc.id))) {
      toast('Этот аккаунт уже привязан', 'info');
      return;
    }
    const m = me();
    const entry = {
      id: acc.id,
      psnLogin: acc.psnLogin || '',
      gameName: acc.gameName || '',
      email: acc.email || '',
      linkedAt: new Date().toISOString(),
      linkedBy: m.id,
      linkedByName: m.name
    };
    const linkedAccounts = [...current, entry];
    const patch = linkedAccountsPatch(linkedAccounts);
    await firebase.database().ref(`inboxChats/${chat.id}`).update(patch);
    state.chats[chat.id] = { ...chat, ...patch };
    hideGameDropdown();
    if (state.accountHits.length) renderMiniResults(state.accountHits);
    renderInfo(state.chats[chat.id]);
    toast(`Аккаунт привязан (${linkedAccounts.length})`, 'success');
  }

  async function unlinkAccountFromChat(accountId) {
    const chat = selectedChat();
    if (!chat?.id || !firebase?.database) return;
    const linkedAccounts = getLinkedAccountEntries(chat).filter(
      (x) => !idsEqual(x.id, accountId)
    );
    const patch = linkedAccountsPatch(linkedAccounts);
    await firebase.database().ref(`inboxChats/${chat.id}`).update(patch);
    state.chats[chat.id] = { ...chat, ...patch };
    if (state.accountHits.length) renderMiniResults(state.accountHits);
    renderInfo(state.chats[chat.id]);
    toast(
      linkedAccounts.length ? `Отвязан · осталось ${linkedAccounts.length}` : 'Аккаунт отвязан',
      'info'
    );
  }

  function startInboxSale(accountId, positionType, positionIndex) {
    if (!state.selectedId) {
      toast('Сначала выбери диалог', 'warning');
      return;
    }
    const chat = selectedChat();
    const m = me();
    const canWrite =
      (chat?.status === 'assigned' && chat.assigneeId === m.id) || m.role === 'admin';
    if (!canWrite) {
      toast('Сначала прими диалог в «Мои»', 'warning');
      return;
    }
    if (typeof openSaleModal !== 'function') {
      toast('Модалка продажи недоступна', 'error');
      return;
    }
    const positionName =
      typeof getPositionName === 'function'
        ? getPositionName(positionType)
        : positionType;
    const chatLink = chatDeepLink(state.selectedId);
    window.inboxSaleContext = {
      chatId: state.selectedId,
      autoSend: true,
      linkAccount: true,
      chatLink
    };
    openSaleModal(accountId, positionType, positionName, positionIndex);
    setTimeout(() => {
      const sel = document.getElementById('saleMarketplace');
      if (sel) {
        sel.value = 'avito';
        if (typeof updateCommission === 'function') updateCommission();
      }
      const notes = document.getElementById('saleNotes');
      if (notes && chatLink) {
        notes.value = chatLink;
        notes.placeholder = 'Ссылка на чат подставится сама';
      }
    }, 30);
  }

  function handleInboxSlotClick(btn) {
    const accountId = btn.dataset.accountId;
    const positionType = btn.dataset.posType;
    const positionIndex = Number(btn.dataset.posIndex);
    if (!accountId || !positionType || !positionIndex) return;
    if (btn.dataset.slotAction === 'view') {
      if (typeof handlePositionClick === 'function') {
        const name =
          typeof getPositionName === 'function'
            ? getPositionName(positionType)
            : positionType;
        handlePositionClick(accountId, positionType, name, positionIndex);
      }
      return;
    }
    startInboxSale(accountId, positionType, positionIndex);
  }

  function syncComposeMode() {
    const mode = state.composeMode;
    els.composer?.classList.toggle('mode-note', mode === 'note');
    els.modeTabs?.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (els.composeText) {
      els.composeText.placeholder =
        mode === 'note' ? 'Внутренний комментарий…' : 'Введите ваше сообщение';
    }
    if (els.composeHint) {
      els.composeHint.textContent =
        mode === 'note' ? 'Только для менеджеров' : 'Уйдёт клиенту в Авито';
    }
    if (els.btnComposeSend) {
      els.btnComposeSend.textContent = mode === 'note' ? 'Комментарий' : 'Отправить';
    }
  }

  function messageDirection(msg) {
    const raw = String(msg?.direction || '').toLowerCase();
    if (raw === 'out' || raw === 'outgoing' || raw === '1') return 'out';
    if (raw === 'in' || raw === 'incoming' || raw === '0') return 'in';
    if (String(msg?.id || '').startsWith('out_')) return 'out';
    return 'in';
  }

  function managerLabel(chat) {
    return (
      chat?.assigneeName ||
      chat?.closedByName ||
      me().name ||
      'Менеджер'
    );
  }

  function looksLikeOurEcho(msg) {
    if (messageDirection(msg) === 'out') return true;
    const text = String(msg?.text || '').trim();
    if (!text) return false;
    const recent = state.recentOutbound || [];
    if (recent.some((r) => r.text === text && Date.now() - r.at < 120000)) {
      return true;
    }
    const authorId = String(msg?.authorId || '');
    const myId = String(me().id || '');
    return Boolean(myId && authorId && authorId === myId);
  }

  function buildTimeline(chat) {
    const buyer = chat.buyerName || 'Покупатель';
    const mgr = managerLabel(chat);
    const msgs = Object.values(state.messages || {}).map((msg) => {
      let direction = messageDirection(msg);
      if (looksLikeOurEcho(msg)) direction = 'out';
      const storedAuthor = String(msg.authorName || '').trim();
      const author = direction === 'out' ? storedAuthor || mgr : storedAuthor || buyer;
      return {
        kind: 'message',
        createdAt: msg.createdAt || '',
        direction,
        text: msg.text || '',
        author
      };
    });
    const notes = Object.values(state.notes || {}).map((note) => ({
      kind: 'note',
      createdAt: note.createdAt || '',
      text: note.text || '',
      author: note.authorName || 'Менеджер'
    }));
    return [...msgs, ...notes].sort((a, b) =>
      String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    );
  }

  function renderMessagesHtml(timeline) {
    if (!timeline.length) {
      return '<div class="inbox-empty-list">Сообщений пока нет</div>';
    }
    let lastDay = '';
    return timeline
      .map((item) => {
        const day = dayKey(item.createdAt);
        let dayHtml = '';
        if (day && day !== lastDay) {
          lastDay = day;
          dayHtml = `<div class="inbox-day">${escapeHtml(formatDayLabel(item.createdAt))}</div>`;
        }
        if (item.kind === 'note') {
          return `${dayHtml}<div class="inbox-msg note">
            <div class="inbox-msg-avatar">${escapeHtml(initials(item.author))}</div>
            <div class="inbox-msg-card">
              <div class="inbox-msg-head">
                <strong>${escapeHtml(item.author)} · комментарий</strong>
                <time>${escapeHtml(formatClock(item.createdAt))}</time>
              </div>
              <div class="inbox-msg-text">${escapeHtml(item.text)}</div>
            </div>
          </div>`;
        }
        const side = item.direction === 'out' ? 'out' : 'in';
        return `${dayHtml}<div class="inbox-msg ${side}">
          <div class="inbox-msg-avatar">${escapeHtml(initials(item.author))}</div>
          <div class="inbox-msg-card">
            <div class="inbox-msg-head">
              <strong>${escapeHtml(item.author)}</strong>
              <time>${escapeHtml(formatClock(item.createdAt))}</time>
            </div>
            <div class="inbox-msg-text">${escapeHtml(item.text)}</div>
          </div>
        </div>`;
      })
      .join('');
  }

  function renderThread() {
    const chat = selectedChat();
    syncMobilePane();
    renderInfo(chat);
    if (!chat) {
      els.thread?.classList.add('hidden');
      els.empty?.classList.remove('hidden');
      return;
    }
    els.empty?.classList.add('hidden');
    els.thread?.classList.remove('hidden');

    const m = me();
    const isMine = chat.status === 'assigned' && chat.assigneeId === m.id;
    const isOpen = chat.status === 'open';
    const isClosed = chat.status === 'closed';
    const isAdmin = m.role === 'admin';
    const isAssigned = chat.status === 'assigned';
    const canWrite = isMine || (isAdmin && isAssigned);
    const canClaim = isOpen || isClosed;
    const buyerName = chat.buyerName || 'Покупатель';
    const mUrl = messengerUrl(chat);
    const channelBits = ['Авито'];
    if (chat.itemTitle) channelBits.push(chat.itemTitle);
    if (chat.itemPrice) channelBits.push(chat.itemPrice);

    if (els.meta) {
      els.meta.innerHTML = `
        <div class="inbox-meta-row">
          <div class="inbox-meta-avatar">${escapeHtml(initials(buyerName))}</div>
          <div class="inbox-meta-text">
            <div class="inbox-meta-title">${
              mUrl
                ? `<a href="${escapeHtml(mUrl)}" target="_blank" rel="noopener">${escapeHtml(buyerName)}</a>`
                : escapeHtml(buyerName)
            }</div>
            <div class="inbox-meta-sub">${escapeHtml(channelBits.join(' · '))}</div>
          </div>
        </div>`;
    }

    // Incoming / archive → claim into «Мои». Mine: write + manage.
    els.claimBar?.classList.toggle('hidden', !canClaim);
    if (els.btnClaim) {
      els.btnClaim.textContent = isClosed ? 'Взять в «Мои»' : 'Принять диалог';
    }
    if (els.claimHint) {
      if (isClosed) {
        const who = chat.closedByName || chat.assigneeName;
        els.claimHint.textContent = who
          ? `В архиве · закрыл: ${who}`
          : 'Диалог в архиве — можно вернуть в работу';
        els.claimHint.classList.remove('hidden');
      } else {
        els.claimHint.textContent = '';
        els.claimHint.classList.add('hidden');
      }
    }
    els.composer?.classList.toggle('hidden', !canWrite);
    els.btnRelease?.classList.toggle('hidden', !canWrite);
    els.btnClose?.classList.toggle('hidden', !canWrite);
    els.btnRead?.classList.toggle('hidden', !(canWrite || isClosed));

    if (canWrite) {
      const replyTab = els.modeTabs?.querySelector('[data-mode="reply"]');
      if (replyTab) replyTab.classList.remove('hidden');
      if (state.composeMode !== 'reply' && state.composeMode !== 'note') {
        state.composeMode = 'reply';
      }
      syncComposeMode();
    } else if (isOpen) {
      state.composeMode = 'reply';
    }

    const timeline = buildTimeline(chat);
    const signature = timeline.length
      ? `${timeline.length}|${timeline.reduce((sum, item) => sum + String(item.text || '').length, 0)}|${timeline[timeline.length - 1].createdAt}|${timeline[timeline.length - 1].text}`
      : '0';
    if (state.timelineSig === signature && state.timelineChatId === chat.id) return;
    state.timelineSig = signature;
    state.timelineChatId = chat.id;

    const nearBottom =
      els.messages &&
      els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight < 120;

    if (els.messages) {
      els.messages.innerHTML = renderMessagesHtml(timeline);
      if (nearBottom || !els.messages.dataset.ready) {
        els.messages.scrollTop = els.messages.scrollHeight;
        els.messages.dataset.ready = '1';
      }
    }
  }

  function selectChat(id) {
    state.selectedId = id;
    state.timelineSig = '';
    state.selectedGame = null;
    state.accountHits = [];
    state.gameHits = [];
    if (els.accountSearch) els.accountSearch.value = '';
    hideGameDropdown();
    if (els.messages) delete els.messages.dataset.ready;
    els.shell?.classList.remove('info-open');
    syncUrlWithChat(id);
    renderList();
    listenMessages(id);
    listenNotes(id);
    renderThread();
    maybeAutofillGameFromChat(selectedChat());
  }

  function closeChatPane() {
    state.selectedId = null;
    state.timelineSig = '';
    syncUrlWithChat(null);
    els.shell?.classList.remove('info-open');
    if (state.unsubMessages) {
      try {
        state.unsubMessages();
      } catch (_) {}
      state.unsubMessages = null;
    }
    if (state.unsubNotes) {
      try {
        state.unsubNotes();
      } catch (_) {}
      state.unsubNotes = null;
    }
    state.messages = {};
    state.notes = {};
    renderList();
    renderThread();
  }

  function listenMessages(chatId) {
    if (state.unsubMessages) {
      try {
        state.unsubMessages();
      } catch (_) {}
      state.unsubMessages = null;
    }
    state.messages = {};
    if (!chatId || !firebase?.database) return;
    const ref = firebase.database().ref(`inboxMessages/${chatId}`).orderByKey().limitToLast(200);
    const handler = (snap) => {
      state.messages = snap.val() || {};
      harvestOutboundSnippets(state.messages);
      renderThread();
    };
    ref.on('value', handler);
    state.unsubMessages = () => ref.off('value', handler);
  }

  function listenNotes(chatId) {
    if (state.unsubNotes) {
      try {
        state.unsubNotes();
      } catch (_) {}
      state.unsubNotes = null;
    }
    state.notes = {};
    if (!chatId || !firebase?.database) return;
    const ref = firebase.database().ref(`inboxNotes/${chatId}`);
    const handler = (snap) => {
      state.notes = snap.val() || {};
      renderThread();
    };
    ref.on('value', handler);
    state.unsubNotes = () => ref.off('value', handler);
  }

  async function addInternalNote(text) {
    if (!text || !state.selectedId) return;
    if (!firebase?.database) {
      toast('Firebase не подключен', 'error');
      return;
    }
    const m = me();
    await firebase.database().ref(`inboxNotes/${state.selectedId}`).push({
      text,
      authorId: m.id,
      authorName: m.name,
      createdAt: new Date().toISOString(),
      internal: true
    });
    toast('Комментарий сохранён', 'success');
  }

  function normalizeSnippet(text) {
    return String(text || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 800);
  }

  function snippetKey(text) {
    const norm = normalizeSnippet(text);
    let h = 2166136261;
    for (let i = 0; i < norm.length; i++) {
      h ^= norm.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `s_${(h >>> 0).toString(36)}_${norm.length}`;
  }

  function allSnippets() {
    const map = {};
    Object.values(state.localSnippets || {}).forEach((s) => {
      if (!s?.text) return;
      map[snippetKey(s.text)] = { text: s.text, count: Number(s.count) || 1 };
    });
    Object.entries(state.snippets || {}).forEach(([key, s]) => {
      if (!s?.text) return;
      map[key] = {
        text: s.text,
        count: Math.max(Number(s.count) || 1, map[key]?.count || 0)
      };
    });
    return Object.values(map);
  }

  function harvestOutboundSnippets(messages) {
    const map = {};
    Object.values(messages || {}).forEach((msg) => {
      if (messageDirection(msg) !== 'out') return;
      const text = normalizeSnippet(msg.text);
      if (text.length < 2) return;
      const key = snippetKey(text);
      if (!map[key]) map[key] = { text, count: 0 };
      map[key].count += 1;
    });
    state.localSnippets = map;
  }

  function listenSnippets() {
    if (state.unsubSnippets) {
      try {
        state.unsubSnippets();
      } catch (_) {}
      state.unsubSnippets = null;
    }
    if (!firebase?.database) return;
    const ref = firebase.database().ref('inboxSnippets');
    const handler = (snap) => {
      state.snippets = snap.val() || {};
      updateSuggestFromInput();
    };
    ref.on('value', handler);
    state.unsubSnippets = () => ref.off('value', handler);
  }

  async function bumpSnippet(text) {
    const norm = normalizeSnippet(text);
    if (norm.length < 2) return;
    const key = snippetKey(norm);
    if (!state.localSnippets[key]) state.localSnippets[key] = { text: norm, count: 0 };
    state.localSnippets[key].count += 1;
    if (!firebase?.database) return;
    try {
      const ref = firebase.database().ref(`inboxSnippets/${key}`);
      await ref.transaction((cur) => {
        if (!cur) {
          return { text: norm, count: 1, updatedAt: new Date().toISOString() };
        }
        return {
          text: cur.text || norm,
          count: (Number(cur.count) || 0) + 1,
          updatedAt: new Date().toISOString()
        };
      });
    } catch (_) {}
  }

  function filterSuggestHits(query) {
    const q = normalizeSnippet(query).toLowerCase();
    if (q.length < 2 || state.composeMode === 'note') return [];
    const starts = [];
    const includes = [];
    allSnippets().forEach((s) => {
      const t = String(s.text || '');
      const low = t.toLowerCase();
      if (low === q) return;
      if (low.startsWith(q)) starts.push(s);
      else if (low.includes(q)) includes.push(s);
    });
    const sortFn = (a, b) =>
      (Number(b.count) || 0) - (Number(a.count) || 0) ||
      String(a.text).length - String(b.text).length;
    return [...starts.sort(sortFn), ...includes.sort(sortFn)].slice(0, 10);
  }

  function hideSuggest() {
    state.suggestHits = [];
    state.suggestIndex = -1;
    if (els.suggest) {
      els.suggest.classList.add('hidden');
      els.suggest.innerHTML = '';
    }
  }

  function renderSuggest() {
    if (!els.suggest) return;
    const hits = state.suggestHits || [];
    if (!hits.length) {
      hideSuggest();
      return;
    }
    els.suggest.classList.remove('hidden');
    els.suggest.innerHTML = hits
      .map((item, idx) => {
        const active = idx === state.suggestIndex ? ' active' : '';
        return `<button type="button" class="inbox-suggest-item${active}" data-suggest-idx="${idx}" role="option">
          <span class="inbox-suggest-count">${escapeHtml(String(item.count || 1))}</span>
          <span class="inbox-suggest-text">${escapeHtml(item.text)}</span>
        </button>`;
      })
      .join('');
  }

  function updateSuggestFromInput() {
    if (state.composeMode === 'note') {
      hideSuggest();
      return;
    }
    const q = els.composeText?.value || '';
    state.suggestHits = filterSuggestHits(q);
    state.suggestIndex = state.suggestHits.length ? 0 : -1;
    renderSuggest();
  }

  function applySuggest(idx) {
    const item = state.suggestHits[idx];
    if (!item || !els.composeText) return;
    els.composeText.value = item.text;
    hideSuggest();
    autoGrowCompose();
    els.composeText.focus();
    const len = els.composeText.value.length;
    els.composeText.setSelectionRange(len, len);
  }

  async function composeSubmit() {
    const text = String(els.composeText?.value || '').trim();
    if (!text) return;
    hideSuggest();
    try {
      els.btnComposeSend.disabled = true;
      if (state.composeMode === 'note') {
        await addInternalNote(text);
      } else {
        const m = me();
        await api('/api/inbox/reply', {
          chatId: state.selectedId,
          text,
          managerId: m.id,
          managerName: m.name,
          managerRole: m.role
        });
        bumpSnippet(text);
        state.recentOutbound = [
          { text, at: Date.now(), author: m.name },
          ...state.recentOutbound.filter((r) => Date.now() - r.at < 120000)
        ].slice(0, 20);
        state.timelineSig = '';
        renderThread();
        toast('Отправлено', 'success');
      }
      if (els.composeText) {
        els.composeText.value = '';
        autoGrowCompose();
      }
    } catch (e) {
      toast(e.message || 'Ошибка', 'error');
    } finally {
      if (els.btnComposeSend) els.btnComposeSend.disabled = false;
    }
  }

  function listenChats() {
    if (!firebase?.database) {
      toast('Firebase не подключен', 'error');
      return;
    }
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        renderList();
        if (state.selectedId && !state.chats[state.selectedId]) {
          state.selectedId = null;
          renderThread();
        } else if (state.selectedId) {
          renderThread();
        }
      }, 50);
    };
    const ref = firebase.database().ref('inboxChats');
    ref.on('child_added', (snap) => {
      state.chats[snap.key] = { ...(snap.val() || {}), id: snap.key };
      tryOpenPendingChat();
      schedule();
    });
    ref.on('child_changed', (snap) => {
      state.chats[snap.key] = { ...(snap.val() || {}), id: snap.key };
      schedule();
    });
    ref.on('child_removed', (snap) => {
      delete state.chats[snap.key];
      schedule();
    });
  }

  els.tabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    state.tab = btn.dataset.tab;
    els.tabs.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
    renderList();
  });

  els.search?.addEventListener('input', () => {
    state.query = els.search.value || '';
    renderList();
  });

  els.back?.addEventListener('click', () => {
    if (els.shell?.classList.contains('info-open')) {
      els.shell.classList.remove('info-open');
      return;
    }
    closeChatPane();
  });

  els.toggleInfo?.addEventListener('click', () => {
    els.shell?.classList.toggle('info-open');
  });

  els.list?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    selectChat(btn.dataset.id);
  });

  els.btnClaim?.addEventListener('click', async () => {
    try {
      els.btnClaim.disabled = true;
      const chat = selectedChat();
      const m = me();
      if (!chat?.id) throw new Error('Диалог не выбран');
      if (chat.status === 'assigned' && chat.assigneeId && chat.assigneeId !== m.id) {
        throw new Error(`Уже принял: ${chat.assigneeName || chat.assigneeId}`);
      }
      const fromArchive = chat.status === 'closed';
      const now = new Date().toISOString();
      await saveChatPatch(chat.id, {
        status: 'assigned',
        assigneeId: m.id,
        assigneeName: m.name || m.id,
        claimedAt: now,
        updatedAt: now,
        closedAt: null,
        closedBy: null,
        closedByName: null
      });
      state.tab = 'mine';
      els.tabs.querySelectorAll('[data-tab]').forEach((b) =>
        b.classList.toggle('active', b.dataset.tab === 'mine')
      );
      renderList();
      renderThread();
      toast(fromArchive ? 'Вернули в «Мои»' : 'Диалог принят', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      if (els.btnClaim) els.btnClaim.disabled = false;
    }
  });

  els.btnRelease?.addEventListener('click', async () => {
    try {
      const chat = selectedChat();
      const m = me();
      if (!chat?.id) throw new Error('Диалог не выбран');
      const isOwner = chat.assigneeId === m.id;
      if (!isOwner && m.role !== 'admin') throw new Error('Можно вернуть только свой диалог');
      const now = new Date().toISOString();
      await saveChatPatch(chat.id, {
        status: 'open',
        assigneeId: null,
        assigneeName: null,
        claimedAt: null,
        updatedAt: now
      });
      state.tab = 'incoming';
      els.tabs.querySelectorAll('[data-tab]').forEach((b) =>
        b.classList.toggle('active', b.dataset.tab === 'incoming')
      );
      renderList();
      renderThread();
      toast('Вернули во входящие', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  function pickNeighborChatId(currentId) {
    const list = filtered();
    const idx = list.findIndex((c) => String(c.id) === String(currentId));
    if (idx === -1) return list[0]?.id || null;
    return list[idx + 1]?.id || list[idx - 1]?.id || null;
  }

  els.btnClose?.addEventListener('click', async () => {
    try {
      const currentId = state.selectedId;
      const nextId = pickNeighborChatId(currentId);
      const chat = selectedChat();
      const m = me();
      if (!chat?.id) throw new Error('Диалог не выбран');
      const isOwner = chat.assigneeId === m.id;
      if (!isOwner && m.role !== 'admin') throw new Error('Можно завершить только свой диалог');
      const now = new Date().toISOString();
      await saveChatPatch(chat.id, {
        status: 'closed',
        closedAt: now,
        closedBy: m.id,
        closedByName: m.name || m.id,
        updatedAt: now,
        unread: 0
      });
      toast('Диалог завершён', 'success');
      if (nextId) selectChat(nextId);
      else closeChatPane();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  els.btnRead?.addEventListener('click', async () => {
    try {
      const chat = selectedChat();
      if (!chat?.id) throw new Error('Диалог не выбран');
      await saveChatPatch(chat.id, { unread: 0, updatedAt: new Date().toISOString() });
      renderList();
      toast('Прочитано', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  els.infoCopy?.addEventListener('click', async () => {
    const chat = selectedChat();
    const name = chat?.buyerName || '';
    if (!name) return;
    try {
      await navigator.clipboard.writeText(name);
      toast('Имя скопировано', 'success');
    } catch (_) {
      toast('Не удалось скопировать', 'error');
    }
  });

  els.infoCopyLink?.addEventListener('click', async () => {
    const chat = selectedChat();
    const link = chatDeepLink(chat?.id || state.selectedId);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast('Ссылка на диалог скопирована', 'success');
    } catch (_) {
      toast('Не удалось скопировать', 'error');
    }
  });

  els.accountSearch?.addEventListener('focus', () => {
    const q = els.accountSearch.value || '';
    if (!state.selectedGame) runGameSuggest(q);
  });

  els.accountSearch?.addEventListener('input', () => {
    clearTimeout(state.accountSearchTimer);
    state.selectedGame = null;
    renderSelectedGameBar(null);
    state.accountHits = [];
    if (els.accountResults) {
      els.accountResults.classList.add('hidden');
      els.accountResults.innerHTML = '';
    }
    const q = els.accountSearch.value || '';
    state.accountSearchTimer = setTimeout(() => {
      if (q.trim().length < 1) {
        hideGameDropdown();
        return;
      }
      runGameSuggest(q);
    }, 180);
  });

  els.gameDropdown?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick-game]');
    if (!btn) return;
    selectGameForInbox(btn.dataset.pickGame);
  });

  els.selectedGame?.addEventListener('click', (e) => {
    if (!e.target.closest('[data-clear-game]')) return;
    state.selectedGame = null;
    state.accountHits = [];
    renderSelectedGameBar(null);
    if (els.accountSearch) {
      els.accountSearch.value = '';
      els.accountSearch.focus();
    }
    if (els.accountResults) {
      els.accountResults.classList.add('hidden');
      els.accountResults.innerHTML = '';
    }
    hideGameDropdown();
  });

  function onAccountPanelClick(e) {
    const slot = e.target.closest('[data-slot-action]');
    if (slot) {
      e.preventDefault();
      handleInboxSlotClick(slot);
      return;
    }
    const linkBtn = e.target.closest('[data-link-account]');
    if (linkBtn) {
      linkAccountToChat(linkBtn.dataset.linkAccount);
      return;
    }
    const unlinkBtn = e.target.closest('[data-unlink-account]');
    if (unlinkBtn) {
      unlinkAccountFromChat(unlinkBtn.dataset.unlinkAccount);
    }
  }

  els.accountResults?.addEventListener('click', onAccountPanelClick);
  els.accountLinked?.addEventListener('click', onAccountPanelClick);

  document.addEventListener('click', (e) => {
    if (!els.accountSearchWrap?.contains(e.target)) hideGameDropdown();
  });

  els.modeTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn || btn.classList.contains('hidden')) return;
    state.composeMode = btn.dataset.mode;
    syncComposeMode();
    hideSuggest();
    els.composeText?.focus();
  });
  els.btnComposeSend?.addEventListener('click', composeSubmit);
  els.composeText?.addEventListener('input', () => {
    autoGrowCompose();
    updateSuggestFromInput();
  });
  els.composeText?.addEventListener('keydown', (e) => {
    const open = state.suggestHits.length > 0 && !els.suggest?.classList.contains('hidden');
    if (open && e.key === 'ArrowDown') {
      e.preventDefault();
      state.suggestIndex = (state.suggestIndex + 1) % state.suggestHits.length;
      renderSuggest();
      return;
    }
    if (open && e.key === 'ArrowUp') {
      e.preventDefault();
      state.suggestIndex =
        (state.suggestIndex - 1 + state.suggestHits.length) % state.suggestHits.length;
      renderSuggest();
      return;
    }
    if (open && e.key === 'Escape') {
      e.preventDefault();
      hideSuggest();
      return;
    }
    if (open && (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) && state.suggestIndex >= 0) {
      e.preventDefault();
      applySuggest(state.suggestIndex);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      composeSubmit();
    }
  });
  els.suggest?.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('[data-suggest-idx]');
    if (!btn) return;
    e.preventDefault();
    applySuggest(Number(btn.dataset.suggestIdx));
  });
  document.addEventListener('click', (e) => {
    if (
      els.suggest &&
      !els.suggest.contains(e.target) &&
      e.target !== els.composeText &&
      !els.composeText?.contains(e.target)
    ) {
      hideSuggest();
    }
  });

  window.inboxReply = async function inboxReply(text, chatId) {
    const id = chatId || state.selectedId;
    if (!id) throw new Error('Нет выбранного диалога');
    const m = me();
    return api('/api/inbox/reply', {
      chatId: id,
      text,
      managerId: m.id,
      managerName: m.name,
      managerRole: m.role
    });
  };

  window.inboxLinkAccount = linkAccountToChat;

  window.inboxRefreshAccountPanel = async function inboxRefreshAccountPanel() {
    const chat = selectedChat();
    if (!chat) return;
    if (state.selectedGame?.id && typeof window.loadSalesOnDemand === 'function') {
      try {
        await window.loadSalesOnDemand(state.selectedGame.id);
        const hits = accountsList().filter((a) => idsEqual(a.gameId, state.selectedGame.id));
        state.accountHits = hits;
      } catch (_) {}
    }
    renderInfo(chat);
  };

  function boot() {
    if (typeof checkAuth === 'function') checkAuth();
    try {
      localStorage.removeItem('inbox_api_url');
    } catch (_) {}
    state.pendingChatId = readChatIdFromUrl();
    listenChats();
    listenSnippets();
    renderList();
    renderThread();
    autoGrowCompose();
    tryOpenPendingChat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
