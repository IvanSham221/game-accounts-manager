(() => {
  const INBOX_API = 'https://147.45.149.39.sslip.io/inbox';
  // Same key for everyone; keep localStorage only as fallback for already configured browsers
  const INBOX_KEY = localStorage.getItem('inbox_api_key') || '';

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
    pendingChatId: null
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
      const author =
        direction === 'out' ? mgr : msg.authorName || buyer;
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
    if (els.messages) delete els.messages.dataset.ready;
    els.shell?.classList.remove('info-open');
    syncUrlWithChat(id);
    renderList();
    listenMessages(id);
    listenNotes(id);
    renderThread();
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

  async function composeSubmit() {
    const text = String(els.composeText?.value || '').trim();
    if (!text) return;
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
        state.recentOutbound = [
          { text, at: Date.now(), author: m.name },
          ...state.recentOutbound.filter((r) => Date.now() - r.at < 120000)
        ].slice(0, 20);
        // Patch echo in Firebase if Avito saved it under the buyer name
        try {
          if (firebase?.database && state.selectedId) {
            const chatId = state.selectedId;
            const updates = {};
            Object.entries(state.messages || {}).forEach(([id, msg]) => {
              if (String(msg?.text || '').trim() !== text) return;
              updates[`inboxMessages/${chatId}/${id}/direction`] = 'out';
              updates[`inboxMessages/${chatId}/${id}/authorName`] = m.name;
              updates[`inboxMessages/${chatId}/${id}/authorId`] = m.id;
            });
            if (Object.keys(updates).length) {
              firebase.database().ref().update(updates);
            }
          }
        } catch (_) {}
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
      const m = me();
      const fromArchive = selectedChat()?.status === 'closed';
      await api('/api/inbox/claim', {
        chatId: state.selectedId,
        managerId: m.id,
        managerName: m.name,
        managerRole: m.role
      });
      state.tab = 'mine';
      els.tabs.querySelectorAll('[data-tab]').forEach((b) =>
        b.classList.toggle('active', b.dataset.tab === 'mine')
      );
      toast(fromArchive ? 'Вернули в «Мои»' : 'Диалог принят', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      if (els.btnClaim) els.btnClaim.disabled = false;
    }
  });

  els.btnRelease?.addEventListener('click', async () => {
    try {
      const m = me();
      await api('/api/inbox/release', {
        chatId: state.selectedId,
        managerId: m.id,
        managerName: m.name,
        managerRole: m.role
      });
      state.tab = 'incoming';
      els.tabs.querySelectorAll('[data-tab]').forEach((b) =>
        b.classList.toggle('active', b.dataset.tab === 'incoming')
      );
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
      const m = me();
      await api('/api/inbox/close', {
        chatId: currentId,
        managerId: m.id,
        managerName: m.name,
        managerRole: m.role
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
      await api('/api/inbox/read', { chatId: state.selectedId });
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

  els.modeTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn || btn.classList.contains('hidden')) return;
    state.composeMode = btn.dataset.mode;
    syncComposeMode();
    els.composeText?.focus();
  });
  els.btnComposeSend?.addEventListener('click', composeSubmit);
  els.composeText?.addEventListener('input', autoGrowCompose);
  els.composeText?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      composeSubmit();
    }
  });

  function boot() {
    if (typeof checkAuth === 'function') checkAuth();
    try {
      localStorage.removeItem('inbox_api_url');
    } catch (_) {}
    state.pendingChatId = readChatIdFromUrl();
    listenChats();
    renderList();
    renderThread();
    autoGrowCompose();
    tryOpenPendingChat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();
