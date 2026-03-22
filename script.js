let games = [];
let accounts = [];
let sales = [];
let currentUser = null;
let showAllAccounts = false;

function extractProductId(url) {
    if (!url || typeof url !== 'string') return '';
    const cleanUrl = url.split('?')[0];
    const productMatch = cleanUrl.match(/product\/([A-Z0-9_-]+)/i);
    if (productMatch) return productMatch[1];
    const idMatch = cleanUrl.match(/([A-Z]{2}\d{4}-[A-Z]{3}\d{5}_\d{2}-[A-Z0-9]+)/i);
    if (idMatch) return idMatch[1];
    return '';
}

function isValidPSStoreUrl(url, region = 'TR') {
    if (!url) return false;
    if (region === 'TR') {
        return url.includes('store.playstation.com') && 
               (url.includes('/tr-tr/') || url.includes('/tr/'));
    } else if (region === 'UA') {
        return url.includes('store.playstation.com') && 
               (url.includes('/uk-ua/') || url.includes('/ua/'));
    }
    return false;
}
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        return false;
    }
    if (currentUser.role === 'worker') {
        const workers = JSON.parse(localStorage.getItem('workers')) || [];
        const worker = workers.find(w => w.username === currentUser.username);
        if (!worker || !worker.active) {
            localStorage.removeItem('currentUser');
            return false;
        }
    }
    
    return true;
}

function initFirebaseListeners() {
    console.log('🔔 Инициализация Firebase слушателей...');
    
    // Твои слушатели уже работают в firebase.js, но мы можем добавить дополнительные
    
    // Принудительно обновляем селекты при загрузке страницы
    if (window.location.pathname.includes('add-account.html')) {
        setTimeout(() => {
            const freshGames = JSON.parse(localStorage.getItem('games')) || [];
            if (freshGames.length > 0) {
                games = freshGames;
                loadGamesForSelect();
            }
        }, 500);
    }
}

const POSITION_INSTRUCTIONS = {
    'p2_ps4': `🔐 Инструкция по активации П2 PS4:

1️⃣ Добавьте нового пользователя На консоли выберите значок «плюс» — Добавить пользователя
2️⃣ Нажмите «ВХОД В РУЧНУЮ»
3️⃣ Примите лицензионное соглашение → нажмите «ПОДТВЕРДИТЬ»
4️⃣ Выберите вход вручную и введите выданные данные
5️⃣ Код прописан в данных или запрашиваем у нас (30 секундный код)
6️⃣ В окне «Сбор данных» выберите «Только ограниченные данные»
7️⃣ После входа: Перейдите в БИБЛИОТЕКА → Ваша коллекция → загрузить игру
8️⃣ Зайдите в: [НАСТРОЙКИ] → [УПРАВЛЕНИЕ УЧЕТНОЙ ЗАПИСЬЮ] → [АКТИВИРОВАТЬ КАК ОСНОВНУЮ PLAYSTATION 4] Выберите: «ДЕАКТИВИРОВАТЬ»
✅ Готово! Игра будет доступна после установки

💬 Если появятся вопросы или сложности — пишите, мы всегда на связи и быстро поможем!
📩 Как только всё получится — пожалуйста, подтвердите выполнение заказа!
⭐ Мы будем благодарны за ваш отзыв — он поможет нам в развитии!`,

    'p3_ps4': `🔐 Инструкция по активации П3 PS4:

1️⃣ Добавьте нового пользователя
На консоли выберите значок «плюс» — Добавить пользователя
2️⃣ Нажмите «ВХОД В РУЧНУЮ»
3️⃣ Лицензионное соглашение – «Принять»
4️⃣ Введите логин и пароль, которые мы вам предоставим
5️⃣ Вводим код для входа или запрашиваем у нас (30-секундный код)
6️⃣ Информационный экран — выбираем ОК
7️⃣ Включите общий доступ к консоли:
[НАСТРОЙКИ] → [УПРАВЛЕНИЕ УЧЕТНОЙ ЗАПИСЬЮ] → [АКТИВИРОВАТЬ КАК ОСНОВНУЮ PLAYSTATION 4] Выберите: «АКТИВИРОВАТЬ»
8️⃣ На рабочем столе зайдите в Библиотека → Приобретено и начните загрузку игры
9️⃣ После этого вернитесь на свой основной аккаунт
"Настройки" → "Питание" → "Сменить пользователя"
✅ Готово! Игра будет доступна после установки

💬 Если появятся вопросы или сложности — пишите, мы всегда на связи и быстро поможем!
📩 Как только всё получится — пожалуйста, подтвердите выполнение заказа!
⭐ Мы будем благодарны за ваш отзыв — он поможет нам в развитии!`,

    'p2_ps5': `🔐 Инструкция по активации П2 PS5:

1️⃣ Добавьте нового пользователя На консоли выберите значок «плюс» — Добавить пользователя
2️⃣ Нажмите «ВХОД В РУЧНУЮ»
3️⃣ Примите лицензионное соглашение → нажмите «ПОДТВЕРДИТЬ»
4️⃣ Выберите вход вручную и введите выданные данные
5️⃣ Код прописан в данных или запрашиваем у нас (30 секундный код)
6️⃣ В окне «Сбор данных» выберите «Только ограниченные данные»
7️⃣ После входа: На рабочем столе перейдите в БИБЛИОТЕКА → Ваша коллекция → загрузить игру
8️⃣ Зайдите в: [НАСТРОЙКИ] → [ПОЛЬЗОВАТЕЛИ И УЧЕТНЫЕ ЗАПИСИ] → [ДРУГОЕ] → [ОБЩИЙ ДОСТУП К КОНСОЛИ И АВТОНОМНАЯ ИГРА] Выберите: «НЕ ВКЛЮЧАТЬ» или «ОТКЛЮЧИТЬ
✅ Готово! Игра будет доступна после установки

💬 Если появятся вопросы или сложности — пишите, мы всегда на связи и быстро поможем!
📩 Как только всё получится — пожалуйста, подтвердите выполнение заказа!
⭐ Мы будем благодарны за ваш отзыв — он поможет нам в развитии!`,

    'p3_ps5': `🔐 Инструкция по активации П3 PS5:

1️⃣ Добавьте нового пользователя
На консоли выберите значок «плюс» — Добавить пользователя
2️⃣ Нажмите «ВХОД В РУЧНУЮ»
3️⃣ Лицензионное соглашение – «Принять»
4️⃣ Введите логин и пароль, которые мы вам предоставим
5️⃣ Вводим код для входа или запрашиваем у нас (30-секундный код)
6️⃣ Информационный экран — выбираем ОК
7️⃣ Включите общий доступ к консоли:
(НАСТРОЙКИ) - [ПОЛЬЗОВАТЕЛИ И УЧЕТНЫЕ ЗАПИСИ] - [ДРУГОЕ] - [ОБЩИЙ ДОСТУП К КОНСОЛИ И АВТОНОМНАЯ ИГРА]. В данном меню выбрать «ВКЛЮЧИТЬ»
8️⃣ На рабочем столе зайдите в Библиотека → Приобретено и начните загрузку игры
9️⃣ После этого вернитесь на свой основной аккаунт
Нажимаете на аватарку → сменить пользователя → переходите на Вашего личного пользователя
✅ Готово! Игра будет доступна после установки

💬 Если появятся вопросы или сложности — пишите, мы всегда на связи и быстро поможем!
📩 Как только всё получится — пожалуйста, подтвердите выполнение заказа!
⭐ Мы будем благодарны за ваш отзыв — он поможет нам в развитии!`
};
const POSITION_INSTRUCTIONS_EN = {
    'p2_ps4': `🔐 Activation instructions for P2 PS4:

1️⃣ Add a new user: On the console, select the "plus" icon → Add user
2️⃣ Click "MANUAL LOGIN"
3️⃣ Accept the license agreement → click "CONFIRM"
4️⃣ Select manual login and enter the provided data
5️⃣ The code is specified in the data or can be requested from us (30-second code)
6️⃣ In the "Data Collection" window, select "Limited Data Only"
7️⃣ After logging in: Go to LIBRARY → Your collection → download the game
8️⃣ Go to: [SETTINGS] → [ACCOUNT MANAGEMENT] → [ACTIVATE AS PRIMARY PLAYSTATION 4] Select: "DEACTIVATE"
✅ Done! The game will be available after installation

💬 If you have any questions or difficulties, please write to us, we are always available and will help you quickly!
📩 Once everything is working, please confirm your order!
⭐ We would appreciate your feedback — it will help us improve!`,

    'p3_ps4': `🔐 Activation instructions for P3 PS4:

1️⃣ Add a new user
On the console, select the "plus" icon — Add user
2️⃣ Click "MANUAL LOGIN"
3️⃣ License agreement – "Accept"
4️⃣ Enter the login and password we provide you
5️⃣ Enter the login code or request it from us (30-second code)
6️⃣ Information screen — select OK
7️⃣ Enable console sharing:
[SETTINGS] → [ACCOUNT MANAGEMENT] → [ACTIVATE AS PRIMARY PLAYSTATION 4] Select: "ACTIVATE"
8️⃣ On the desktop, go to Library → Purchased and start downloading the game
9️⃣ After that, return to your main account
"Settings" → "Power" → "Switch User"
✅ Done! The game will be available after installation

💬 If you have any questions or difficulties, please write to us, we are always available and will help you quickly!
📩 Once everything is working, please confirm your order!
⭐ We would appreciate your feedback — it will help us improve!`,

    'p2_ps5': `🔐 Activation instructions for P2 PS5:

1️⃣ Add a new user: On the console, select the "plus" icon — Add user
2️⃣ Click "MANUAL LOGIN"
3️⃣ Accept the license agreement → click "CONFIRM"
4️⃣ Select manual login and enter the provided data
5️⃣ The code is specified in the data or can be requested from us (30-second code)
6️⃣ In the "Data Collection" window, select "Limited Data Only"
7️⃣ After logging in: On the desktop, go to LIBRARY → Your Collection → Download Game
8️⃣ Go to: [SETTINGS] → [USERS AND ACCOUNTS] → [OTHER] → [CONSOLE SHARING AND OFFLINE PLAY] Select: "DO NOT ENABLE" or "DISABLE"
✅ Done! The game will be available after installation

💬 If you have any questions or difficulties, please write to us. We are always available and will help you quickly!
📩 Once everything is working, please confirm your order!
⭐ We would appreciate your feedback—it will help us improve!`,

    'p3_ps5': `🔐 Activation instructions for P3 PS5:

1️⃣ Add a new user
On the console, select the "plus" icon — Add user
2️⃣ Click "MANUAL LOGIN"
3️⃣ License agreement – "Accept"
4️⃣ Enter the login and password we provide you
5️⃣ Enter the login code or request it from us (30-second code)
6️⃣ Information screen — select OK
7️⃣ Enable console sharing:
(SETTINGS) - [USERS AND ACCOUNTS] - [OTHER] - [CONSOLE SHARING AND OFFLINE PLAY]. In this menu, select "ENABLE"
8️⃣ On the desktop, go to Library → Purchased and start downloading the game
9️⃣ After that, return to your main account
Click on the avatar → change user → switch to your personal user
✅ Done! The game will be available after installation

💬 If you have any questions or difficulties, please write to us. We are always available and will help you quickly!
📩 Once everything is working, please confirm your order!
⭐ We would appreciate your feedback—it will help us improve!`
};

function getInstructionForPosition(positionType) {
    return POSITION_INSTRUCTIONS[positionType] || 
           '⚠️ Инструкция для данного типа позиции не найдена.';
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    const burgerBtn = document.querySelector('.burger-btn');
    
    if (menu.classList.contains('active')) {
        // Закрываем
        menu.classList.remove('active');
        overlay.classList.remove('active');
        burgerBtn.classList.remove('active');
        document.body.style.cssText = '';
        document.body.style.overflow = 'auto';
    } else {
        // Открываем
        menu.classList.add('active');
        overlay.classList.add('active');
        burgerBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    const burgerBtn = document.querySelector('.burger-btn');
    
    const scrollY = document.body.style.top;
    
    menu.classList.remove('active');
    overlay.classList.remove('active');
    burgerBtn.classList.remove('active');
    
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    
    if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
}

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ОТКРЫТИЯ
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        // ТОЛЬКО скрываем скролл, не трогаем position
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // ВОССТАНАВЛИВАЕМ СКРОЛЛ
    }
}

window.onclick = function(event) {
    const modals = ['editModal', 'editFreeModal', 'saleModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && event.target === modal) {
            closeModal(modalId);
        }
    });
}

// Функция для обновления бейджа с уведомлениями
function updateMenuBadge() {
    const badge = document.getElementById('menuBadge');
    if (!badge) return;
    
    // Считаем "горячие" уведомления (например, новые скидки)
    let notificationCount = 0;
    
    // 1. Проверяем большие скидки (например, > 60%)
    const discounts = JSON.parse(localStorage.getItem('discountsResults')) || [];
    const bigDiscounts = discounts.filter(d => 
        (d.discounts?.TR?.discount >= 70) || (d.discounts?.UA?.discount >= 70)
    );
    notificationCount += bigDiscounts.length;
    
    // 2. Проверяем новые продажи (за последние 24 часа)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentSales = sales.filter(sale => 
        new Date(sale.timestamp) > yesterday
    );
    notificationCount += recentSales.length;
    
    // 3. Можно добавить другие типы уведомлений
    
    // Обновляем бейдж
    if (notificationCount > 0) {
        badge.textContent = notificationCount > 9 ? '9+' : notificationCount;
        badge.style.display = 'flex';
        
        // Анимация пульсации для новых уведомлений
        if (notificationCount > 0) {
            badge.style.animation = 'pulse 2s infinite';
        }
    } else {
        badge.style.display = 'none';
    }
}

// Функция для анимации "тряски" кнопки
function shakeBurgerButton() {
    const burgerBtn = document.querySelector('.burger-btn');
    if (burgerBtn && !burgerBtn.classList.contains('active')) {
        burgerBtn.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            burgerBtn.style.animation = '';
        }, 500);
    }
}

// Анимация тряски (добавь в CSS)
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%, 100% { transform: scale(1) rotate(0); }
    25% { transform: scale(1.1) rotate(-5deg); }
    50% { transform: scale(1.1) rotate(5deg); }
    75% { transform: scale(1.1) rotate(-5deg); }
}
`;
document.head.appendChild(style);


// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('editModal');
        closeModal('editFreeModal');
        closeModal('saleModal');
        closeMobileMenu();
    }
});

setInterval(() => {
    refreshMobileMenu();
}, 5000);

// Выход из системы
function logout() {
    if (security && security.logout) {
        security.logout();
    } else {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

function updateActivity() {
    if (security && security.updateSession) {
        security.updateSession();
    }
}

document.addEventListener('click', updateActivity);
document.addEventListener('keypress', updateActivity);

// ==================== ОБНОВЛЕНИЕ НАВИГАЦИИ ====================
function updateNavigation() {
    const nav = document.querySelector('.nav-buttons');
    if (!nav) return;
    
    const user = security.getCurrentUser();
    if (!user) return;
    
    let navButtons = `
        <button onclick="security.updateSession(); location.href='manager.html'" class="btn ${location.pathname.includes('manager.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>🎮</span>
            <span class="nav-text">Панель менеджера</span>
        </button>
        <button onclick="security.updateSession(); location.href='add-account.html'" class="btn ${location.pathname.includes('add-account.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>➕</span>
            <span class="nav-text">Добавить аккаунт</span>
        </button>
        <button onclick="security.updateSession(); location.href='accounts.html'" class="btn ${location.pathname.includes('accounts.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>📋</span>
            <span class="nav-text">Список аккаунтов</span>
        </button>
        <button onclick="security.updateSession(); location.href='prices.html'" class="btn ${location.pathname.includes('prices.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>💰</span>
            <span class="nav-text">Ценники игр</span>
        </button>
        <button onclick="security.updateSession(); location.href='free-accounts.html'" class="btn ${location.pathname.includes('free-accounts.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>🆓</span>
            <span class="nav-text">Свободные аккаунты</span>
        </button>
        <button onclick="security.updateSession(); location.href='procurement.html'" class="btn ${location.pathname.includes('procurement.html') ? 'btn-primary' : 'btn-secondary'}">
        <span>📦</span>
        <span class="nav-text">Управление закупом</span>
        </button>
        <button onclick="security.updateSession(); location.href='games.html'" class="btn ${location.pathname.includes('games.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>🎯</span>
            <span class="nav-text">Управление играми</span>
        </button>
        <button onclick="security.updateSession(); location.href='reports.html'" class="btn ${location.pathname.includes('reports.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>📊</span>
            <span class="nav-text">Отчеты</span>
        </button>
        <button onclick="security.updateSession(); location.href='workers-stats.html'" class="btn ${location.pathname.includes('workers-stats.html') ? 'btn-primary' : 'btn-secondary'}">
        <span>📈</span>
        <span class="nav-text">Статистика работников</span>
    </button>
    <button onclick="security.updateSession(); location.href='discounts.html'" class="btn ${location.pathname.includes('discounts.html') ? 'btn-primary' : 'btn-secondary'}">
        <span>🔥</span>
        <span class="nav-text">Акции PS Store</span>
    </button>
    `;
    
    // Только администратор видит кнопку "Работники"
    if (user.role === 'admin') {
        navButtons += `
            <button onclick="security.updateSession(); location.href='workers.html'" class="btn ${location.pathname.includes('workers.html') ? 'btn-primary' : 'btn-secondary'}">
                <span>👑</span>
                <span class="nav-text">Работники</span>
            </button>
        `;
    }
    
    // Информация о пользователе и выход
    navButtons += `
        <div class="user-info">
            <span>${user.role === 'admin' ? '👑' : '👷'} ${user.name}</span>
            <button onclick="security.logout()" class="btn btn-small btn-danger">Выйти</button>
        </div>
    `;
    
    nav.innerHTML = navButtons;
    setTimeout(addSyncButton, 100);
    const mobileUserName = document.getElementById('mobileUserName');
    if (mobileUserName) {
        mobileUserName.textContent = user.name;
    }

    const userNameElements = document.querySelectorAll('.user-info span');
    userNameElements.forEach(el => {
        if (el.textContent.includes(user.role === 'admin' ? '👑' : '👷')) {
            el.textContent = `${user.role === 'admin' ? '👑' : '👷'} ${user.name}`;
        }
    });
}

// КНОПКА ПРИНУДИТЕЛЬНОЙ СИНХРОНИЗАЦИИ
function addSyncButton() {
    const nav = document.querySelector('.nav-buttons');
    if (nav && !document.querySelector('#syncButton')) {
        const syncBtn = document.createElement('button');
        syncBtn.id = 'syncButton';
        syncBtn.className = 'btn btn-success';
        syncBtn.innerHTML = '🔄 Синхронизировать';
        syncBtn.onclick = async function() {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '🔄 Синхронизация...';
            
            if (window.dataSync && window.dataSync.forceFullSync) {
                const result = await dataSync.forceFullSync();
                
                if (result.success) {
                    // Обновляем глобальные переменные
                    games = JSON.parse(localStorage.getItem('games')) || [];
                    accounts = JSON.parse(localStorage.getItem('accounts')) || [];
                    sales = JSON.parse(localStorage.getItem('sales')) || [];
                    
                    // Обновляем текущую страницу
                    const currentPage = window.location.pathname.split('/').pop();
                    if (currentPage === 'accounts.html') {
                        displayAccounts();
                        loadGamesForFilter();
                    } else if (currentPage === 'games.html') {
                        displayGames();
                    } else if (currentPage === 'manager.html') {
                        loadGamesForManager();
                    } else if (currentPage === 'free-accounts.html') {
                        displayFreeAccounts();
                    } else if (currentPage === 'reports.html') {
                        // Если на странице отчетов, обновляем отчет
                        if (typeof generateFullReport === 'function') {
                            generateFullReport();
                        }
                    }
                    
                    showNotification('Все данные синхронизированы! ✅', 'success');
                } else {
                    showNotification('Ошибка синхронизации ❌', 'error');
                }
            }
            
            syncBtn.disabled = false;
            syncBtn.innerHTML = '🔄 Синхронизировать';
        };
        
        // Добавляем кнопку перед кнопкой выхода
        const userInfo = nav.querySelector('.user-info');
        if (userInfo) {
            nav.insertBefore(syncBtn, userInfo);
        } else {
            nav.appendChild(syncBtn);
        }
    }
}

const originalSaveToStorage = saveToStorage;
window.saveToStorage = function(dataType, data) {
    security.updateSession(); // Обновляем сессию при действиях
    return originalSaveToStorage(dataType, data);
};

const originalSaveToFirebase = saveToFirebase;
window.saveToFirebase = function() {
    security.updateSession();
    return originalSaveToFirebase();
};

// Защита от XSS в полях ввода
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'`]/g, '');
}

// ============================================
// МОБИЛЬНОЕ МЕНЮ И UI УЛУЧШЕНИЯ
// ============================================

// Инициализация меню
function initMobileMenu() {
    const user = security.getCurrentUser();
    if (!user) return;
    
    // Обновляем информацию пользователя
    document.getElementById('mobileUserName').textContent = user.name;
    document.getElementById('mobileUserRole').textContent = 
        user.role === 'admin' ? 'Администратор 👑' : 'Работник 👷';
    
    // Определяем текущую страницу
    const currentPage = window.location.pathname.split('/').pop();
    
    // Пункты меню
    const menuItems = [
        { icon: '🎮', text: 'Панель менеджера', page: 'manager.html', id: 'manager' },
        { icon: '➕', text: 'Добавить аккаунт', page: 'add-account.html', id: 'add-account' },
        { icon: '💰', text: 'Ценники игр', page: 'prices.html', id: 'prices' },
        { icon: '📦', text: 'Управление закупом', page: 'procurement.html', id: 'procurement' },
        { icon: '📊', text: 'Отчеты', page: 'reports.html', id: 'reports' },
        { icon: '📈', text: 'Статистика работников', page: 'workers-stats.html', id: 'workers-stats' },
        { icon: '📋', text: 'Список аккаунтов', page: 'accounts.html', id: 'accounts' },
        { icon: '🆓', text: 'Свободные аккаунты', page: 'free-accounts.html', id: 'free-accounts' },
        { icon: '🎯', text: 'Управление играми', page: 'games.html', id: 'games' },
        { icon: '👑', text: 'Работники', page: 'workers.html', id: 'workers', adminOnly: true },
        { icon: '🔄', text: 'Синхронизация', onclick: 'syncData()', id: 'sync' }
    ];

    
    // Создаем меню
    const menuNav = document.querySelector('.mobile-menu-nav');
    menuNav.innerHTML = '';
    
    menuItems.forEach(item => {
        // Проверяем права доступа
        if (item.adminOnly && user.role !== 'admin') return;
        
        const isActive = currentPage === item.page;
        
        const menuItem = document.createElement('a');
        menuItem.className = `mobile-menu-item ${isActive ? 'active' : ''}`;
        menuItem.id = `menu-${item.id}`;
        
        if (item.onclick) {
            menuItem.href = '#';
            menuItem.onclick = function(e) {
                e.preventDefault();
                eval(item.onclick);
                closeMobileMenu();
            };
        } else {
            menuItem.href = item.page;
            menuItem.onclick = closeMobileMenu;
        }
        
        menuItem.innerHTML = `
            <span style="margin-right: 15px; font-size: 1.3rem;">${item.icon}</span>
            <span>${item.text}</span>
        `;
        
        menuNav.appendChild(menuItem);
    });
    
    // Обновляем бургер-кнопку
    updateBurgerButton();

     // Обновляем бейдж каждые 30 секунд
    setInterval(updateMenuBadge, 30000);
    
    // Первое обновление
    setTimeout(updateMenuBadge, 2000);
}

function notifyNewDiscount() {
    showNotification('Новая большая скидка! 🔥', 'warning');
    shakeBurgerButton();
    updateMenuBadge();
}

    // Обновление состояния бургер-кнопки
function updateBurgerButton() {
    const burgerBtn = document.querySelector('.burger-btn');
    if (burgerBtn) {
        burgerBtn.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
    }
}

// Функция синхронизации
function syncData() {
    const syncBtn = document.querySelector('#syncButton');
    if (syncBtn) {
        syncBtn.click();
        showNotification('Синхронизация запущена...', 'info');
    }
}

// Обновление меню при изменении данных
function refreshMobileMenu() {
    initMobileMenu();
}

// UI улучшения (тема, уведомления)
function initUIEnhancements() {
    // Проверяем сохраненную тему
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Создаем кнопку переключения темы если её нет
    if (!document.querySelector('.theme-toggle')) {
        const themeToggle = document.createElement('div');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = `
            <button class="theme-btn" onclick="toggleTheme()">
                <span id="themeIcon">${document.body.classList.contains('dark-theme') ? '☀️' : '🌙'}</span>
            </button>
        `;
        document.body.appendChild(themeToggle);
    }
    
    // Плавное появление
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease-in';
        
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 100);
    });
}

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        if (themeIcon) themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        if (themeIcon) themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Система уведомлений
function showNotification(message, type = 'info', duration = 3000) {
    // Проверяем, есть ли уже уведомление
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    notification.innerHTML = `
        <span style="font-size: 1.2em;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Скрываем через duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 400);
    }, duration);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация мобильного меню
    initMobileMenu();
    
    // Проверка сессии
    if (!security || !security.isSessionValid()) {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html' && currentPage !== 'index.html') {
            console.log('Сессия недействительна, перенаправление на вход');
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Обновление навигации
    if (typeof updateNavigation === 'function') {
        updateNavigation();
    }
    
    // Загрузка данных
    if (typeof loadAllDataWithSync === 'function') {
        loadAllDataWithSync().then(() => {
            console.log('✅ Все данные загружены');
            
            // Инициализация страниц
            const currentPage = window.location.pathname.split('/').pop();
            
            if (currentPage === 'add-account.html' && typeof loadGamesForSelect === 'function') {
                loadGamesForSelect();
            } else if (currentPage === 'accounts.html' && typeof loadGamesForFilter === 'function') {
                loadGamesForFilter();
                displayAccounts();
            } else if (currentPage === 'games.html' && typeof displayGames === 'function') {
                displayGames();
            } else if (currentPage === 'manager.html' && typeof loadGamesForManager === 'function') {
                loadGamesForManager();
            } else if (currentPage === 'free-accounts.html' && typeof displayFreeAccounts === 'function') {
                displayFreeAccounts();
            } else if (currentPage === 'reports.html') {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                const startInput = document.getElementById('startDate');
                const endInput = document.getElementById('endDate');
                if (startInput && endInput) {
                    startInput.value = startDate.toISOString().split('T')[0];
                    endInput.value = endDate.toISOString().split('T')[0];
                }
            }

            setTimeout(() => {
                if (typeof addQuickSearchField === 'function') {
                    addQuickSearchField();
                }
            }, 500);
            
        });
    }

     // Скрываем кнопку статистики при загрузке
    const statsBtn = document.getElementById('showStatsBtn');
    if (statsBtn) {
        statsBtn.style.display = 'none';
    }
    
    // Скрываем секцию статистики
    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
        statsSection.style.display = 'none';
    }
});

// ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ВСЕХ ДАННЫХ С СИНХРОНИЗАЦИЕЙ
async function loadAllDataWithSync() {
    try {
        console.log('🔄 Загружаем данные с синхронизацией...');
        
        if (window.dataSync && window.dataSync.forceFullSync) {
            await dataSync.forceFullSync();
        }
        
        // Обновляем глобальные переменные
        games = JSON.parse(localStorage.getItem('games')) || [];
        accounts = JSON.parse(localStorage.getItem('accounts')) || [];
        sales = JSON.parse(localStorage.getItem('sales')) || [];
        syncGameNamesInAccounts();
        // Убедимся, что у всех аккаунтов есть массив комментариев
        accounts.forEach(account => {
            if (!account.comments) {
                account.comments = [];
            }
        });
        
        console.log(`📊 Данные загружены: ${games.length} игр, ${accounts.length} аккаунтов, ${sales.length} продаж`);
        
    } catch (error) {
        console.error('❌ Ошибка при загрузке данных:', error);
        games = JSON.parse(localStorage.getItem('games')) || [];
        accounts = JSON.parse(localStorage.getItem('accounts')) || [];
        sales = JSON.parse(localStorage.getItem('sales')) || [];
    }
}

function initApp() {
    const currentPage = window.location.pathname.split('/').pop();
    const user = security.getCurrentUser();
    
    if (!user) {
        // Если нет пользователя, перенаправляем на логин
        if (currentPage !== 'login.html' && currentPage !== 'index.html') {
            window.location.href = 'login.html';
        }
        return;
    }
    
    console.log('👤 Пользователь:', user.name, `(${user.role})`);
    
    // Обновляем навигацию
    if (typeof updateNavigation === 'function') {
        updateNavigation();
    }
    
    // Инициализируем мобильное меню
    initMobileMenu();
    
    // Инициализируем UI улучшения
    initUIEnhancements();

    // Инициализируем Firebase слушатели
    setTimeout(initFirebaseListeners, 1000);
    
    // Загружаем данные с синхронизацией
    loadAllDataWithSync().then(() => {
        console.log(`✅ Все данные загружены: ${games.length} игр, ${accounts.length} аккаунтов, ${sales.length} продаж`);
        
        // Инициализируем страницы
        initPage(currentPage);
        
        // Инициализируем автодополнение если есть
        initAutocomplete();
        
        // Запускаем проверку обновлений
        startSyncChecker();
        
        // Показываем уведомление
        showNotification(`Добро пожаловать, ${user.name}! 👋`, 'info', 2000);
        
    }).catch(error => {
        console.error('❌ Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных. Проверьте соединение.', 'error');
        
        // Пробуем загрузить из локального хранилища
        loadFromLocalStorage();
        initPage(currentPage);
    });

    setTimeout(() => {
        initMobileMenu();
    }, 100);
    function initAppWithDiagnostics() {
    initApp();
    
    // Добавляем кнопку диагностики
    setTimeout(addDiagnosticButton, 1000);
    
    // Автоматическая проверка при загрузке
    setTimeout(() => {
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        if (Math.abs(sales.length - localSales.length) > 0) {
            console.warn('⚠️ Обнаружено расхождение данных продаж при загрузке');
            showNotification('Обнаружено расхождение в данных продаж. Рекомендуется провести диагностику.', 'warning', 5000);
        }
    }, 3000);
}
}

function initPage(currentPage) {
    switch(currentPage) {
        case 'add-account.html':
            if (typeof loadGamesForSelect === 'function') {
                loadGamesForSelect();
            }
            // Инициализация поиска игр для add-account
            setTimeout(() => {
                if (typeof initGameSearchForAddAccount === 'function') {
                    initGameSearchForAddAccount();
                }
            }, 500);
            
            // Слушаем изменения в localStorage
            window.addEventListener('storage', function(e) {
                if (e.key === 'games' && window.location.pathname.includes('add-account.html')) {
                    console.log('🔄 Обнаружено изменение игр, обновляем поиск');
                    setTimeout(() => {
                        if (typeof initGameSearchForAddAccount === 'function') {
                            initGameSearchForAddAccount();
                        }
                    }, 100);
                }
            });
            break;
            
        case 'accounts.html':
            if (typeof loadGamesForFilter === 'function') {
                loadGamesForFilter();
            }
            if (typeof displayAccounts === 'function') {
                displayAccounts();
            }
            break;
            
        case 'games.html':
            if (typeof displayGames === 'function') {
                displayGames();
            }
            break;
            
        case 'manager.html':
            if (typeof loadGamesForManager === 'function') {
                loadGamesForManager();
            }
            setTimeout(() => {
                setupGameSelectListener();
            }, 500);
            
            // Инициализируем кнопку переключения
            setTimeout(() => {
                if (typeof updateToggleButtonUI === 'function') {
                    const searchInput = document.getElementById('managerGameSearch');
                    const loginInput = document.getElementById('managerLogin');
                    const searchResults = document.getElementById('searchResults');
                    
                    if ((searchResults && searchResults.children.length > 0) || 
                        (searchInput && searchInput.value.trim()) || 
                        (loginInput && loginInput.value.trim())) {
                        updateToggleButtonUI();
                    }
                    console.log('🔄 Кнопка переключения инициализирована');
                }
            }, 500);
            break;
            
        case 'free-accounts.html':
            if (typeof displayFreeAccounts === 'function') {
                displayFreeAccounts();
            }
            break;
            
        case 'reports.html':
            setTimeout(() => {
                generateReport();
            }, 500);
            break;
            
        case 'workers-stats.html':
            setTimeout(() => {
                generateWorkersStats();
            }, 500);
            break;
            
        case 'discounts.html':
            setTimeout(() => {
                if (typeof initDiscountsPage === 'function') {
                    initDiscountsPage();
                }
            }, 500);
            break;
            
        case 'workers.html':
            // Страница работников инициализируется своим скриптом
            break;
            
        default:
            console.log('📄 Страница:', currentPage);
    }
}

function initAutocomplete() {
    // Проверяем, подключен ли скрипт автодополнения
    if (typeof window.autoComplete !== 'undefined') {
        console.log('🔍 Инициализирую автодополнение...');
        
        // Даем время на загрузку DOM
        setTimeout(() => {
            try {
                window.autoComplete.setupAllSelects();
                console.log('✅ Автодополнение инициализировано');
            } catch (error) {
                console.error('❌ Ошибка инициализации автодополнения:', error);
            }
        }, 1500);
    } else {
        console.log('⚠️ Автодополнение не подключено');
    }
}

function refreshAutocomplete() {
    if (typeof window.autoComplete !== 'undefined') {
        window.autoComplete.loadGames();
        window.autoComplete.setupAllSelects();
        console.log('🔄 Автодополнение обновлено');
    }
}

// Функция загрузки из локального хранилища (запасной вариант)
function loadFromLocalStorage() {
    games = JSON.parse(localStorage.getItem('games')) || [];
    accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    sales = JSON.parse(localStorage.getItem('sales')) || [];
    
    console.log(`📂 Загружено локально: ${games.length} игр, ${accounts.length} аккаунтов, ${sales.length} продаж`);
}

// ============================================
// СИСТЕМА СОХРАНЕНИЯ И СИНХРОНИЗАЦИИ
// ============================================

// Функция сохранения данных с синхронизацией
async function saveToStorage(dataType, data) {
    console.log(`💾 Сохранение ${dataType}...`);
    
    // Сохраняем в локальное хранилище для быстрого доступа
    localStorage.setItem(dataType, JSON.stringify(data));
    
    // Обновляем глобальные переменные
    switch(dataType) {
        case 'games': games = data; break;
        case 'accounts': accounts = data; break;
        case 'sales': sales = data; break;
    }
    
    // Синхронизируем с Firebase
    if (window.dataSync && window.dataSync.saveData) {
        const result = await dataSync.saveData(dataType, data);
        
        if (result.synced) {
            console.log(`✅ ${dataType} синхронизированы с Firebase`);
            if (typeof showNotification === 'function') {
                showNotification(`${dataType} сохранены и синхронизированы`, 'success', 1500);
            }
        } else if (result.local) {
            console.log(`⚠️ ${dataType} сохранены локально (Firebase недоступен)`);
        }
        
        return result;
    }
    
    return { success: true, local: true };
}

// Совместимость со старым кодом
async function saveToFirebase() {
    const results = [];
    
    results.push(await saveToStorage('games', games));
    results.push(await saveToStorage('accounts', accounts));
    results.push(await saveToStorage('sales', sales));
    
    return results;
}

// ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ ДАННЫХ ПРИ РЕДАКТИРОВАНИИ
async function refreshData(dataType) {
    try {
        if (window.dataSync && window.dataSync.loadData) {
            const freshData = await dataSync.loadData(dataType);
            
            switch(dataType) {
                case 'games':
                    games = freshData;
                    localStorage.setItem('games', JSON.stringify(games));
                    if (typeof displayGames === 'function') displayGames();
                    if (typeof loadGamesForSelect === 'function') loadGamesForSelect();
                    if (typeof loadGamesForFilter === 'function') loadGamesForFilter();
                    if (typeof loadGamesForManager === 'function') loadGamesForManager();
                    break;
                    
                case 'accounts':
                    accounts = freshData;
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                    if (typeof displayAccounts === 'function') displayAccounts();
                    if (typeof displayFreeAccounts === 'function') displayFreeAccounts();
                    break;
                    
                case 'sales':
                    sales = freshData;
                    localStorage.setItem('sales', JSON.stringify(sales));
                    break;
            }
            
            console.log(`✅ Данные "${dataType}" обновлены`);
            return freshData;
        }
    } catch (error) {
        console.error(`❌ Ошибка обновления данных "${dataType}":`, error);
    }
    
    return null;
}

// ============================================
// ФУНКЦИИ ДЛЯ ИГР
// ============================================

// ============================================
// ФУНКЦИИ ДЛЯ ИГР
// ============================================

async function addGame() {
    const gameName = document.getElementById('gameName').value.trim();
    const imageUrl = document.getElementById('gameImageUrl').value.trim(); // НОВОЕ
    const urlTR = document.getElementById('gameUrlTR').value.trim();
    const urlUA = document.getElementById('gameUrlUA').value.trim();
    
    if (!gameName) {
        showNotification('Введите название игры', 'warning');
        return;
    }
    
    // Проверяем на дубликаты среди уже загруженных игр
    if (games.find(game => game.name.toLowerCase() === gameName.toLowerCase())) {
        showNotification('Игра с таким названием уже существует', 'error');
        return;
    }
    
    // Валидация ссылок (если указаны)
    if (urlTR && !isValidPSStoreUrl(urlTR, 'TR')) {
        showNotification('Некорректная ссылка на турецкий PS Store', 'warning');
        return;
    }
    
    if (urlUA && !isValidPSStoreUrl(urlUA, 'UA')) {
        showNotification('Некорректная ссылка на украинский PS Store', 'warning');
        return;
    }
    
    // Сначала показываем уведомление о начале сохранения
    showNotification(`Добавляем игру "${gameName}"...`, 'info', 1000);
    
    const newGame = {
        id: Date.now(),
        name: gameName,
        imageUrl: imageUrl || null, // НОВОЕ ПОЛЕ
        storeLinks: {
            TR: urlTR || '',
            UA: urlUA || ''
        },
        productIds: {
            TR: extractProductId(urlTR) || '',
            UA: extractProductId(urlUA) || ''
        },
        created: new Date().toLocaleDateString('ru-RU'),
        addedBy: security.getCurrentUser()?.name || 'Неизвестно',
        lastUpdated: new Date().toISOString()
    };
    
    games.push(newGame);
    const result = await saveToStorage('games', games);
    
    // Очищаем форму
    document.getElementById('gameName').value = '';
    document.getElementById('gameImageUrl').value = ''; // НОВОЕ
    document.getElementById('gameUrlTR').value = '';
    document.getElementById('gameUrlUA').value = '';
    
    if (result.synced) {
        showNotification(`Игра "${gameName}" успешно добавлена и синхронизирована! 🎮`, 'success');
        
        if (window.dataSync && window.dataSync.forceFullSync) {
            setTimeout(() => {
                dataSync.forceFullSync().then(() => {
                    console.log('✅ Принудительная синхронизация запущена');
                });
            }, 1000);
        }
    } else {
        showNotification(`Игра "${gameName}" добавлена локально 🎮`, 'warning');
    }
    
    displayGames();
}

// Функция редактирования игры
function editGame(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const editForm = document.getElementById('editGameForm');
    editForm.innerHTML = `
        <input type="hidden" id="editGameId" value="${game.id}">
        
        <div>
            <label for="editGameName" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
                Название игры:
            </label>
            <input type="text" id="editGameName" value="${game.name}" 
                   class="input" placeholder="Название игры" required>
        </div>
        
        <!-- ===== НОВОЕ ПОЛЕ ДЛЯ КАРТИНКИ ===== -->
        <div>
            <label for="editGameImageUrl" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
                🖼️ URL картинки:
            </label>
            <input type="text" id="editGameImageUrl" value="${game.imageUrl || ''}" 
                   class="input" placeholder="https://example.com/game-cover.jpg">
        </div>
        <!-- ===== КОНЕЦ НОВОГО ПОЛЯ ===== -->
        
        <div>
            <label for="editGameUrlTR" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
                🇹🇷 Ссылка (Турция):
            </label>
            <input type="text" id="editGameUrlTR" value="${game.storeLinks?.TR || ''}" 
                   class="input" placeholder="https://store.playstation.com/tr-tr/product/...">
        </div>
        
        <div>
            <label for="editGameUrlUA" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
                🇺🇦 Ссылка (Украина):
            </label>
            <input type="text" id="editGameUrlUA" value="${game.storeLinks?.UA || ''}" 
                   class="input" placeholder="https://store.playstation.com/uk-ua/product/...">
        </div>
        
        ${game.imageUrl ? `
            <div style="text-align: center; margin: 15px 0; grid-column: 1 / -1;">
                <div style="font-size: 0.9em; color: #64748b; margin-bottom: 8px;">Текущее изображение:</div>
                <img src="${game.imageUrl}" 
                     style="max-width: 200px; max-height: 150px; border-radius: 10px; border: 2px solid #e2e8f0;">
                <div style="margin-top: 10px;">
                    <button onclick="removeGameImage(${game.id})" 
                            class="btn btn-small btn-danger">
                        ❌ Удалить изображение
                    </button>
                </div>
            </div>
        ` : ''}
        
        <div class="modal-buttons" style="grid-column: 1 / -1; display: flex; gap: 15px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <button class="btn btn-secondary" onclick="closeGameModal()" style="flex: 1;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="saveGameChanges()" style="flex: 2;">
                💾 Сохранить изменения
            </button>
        </div>
    `;
    
    document.getElementById('editGameModal').style.display = 'block';
    
    setTimeout(() => {
        const firstInput = document.getElementById('editGameName');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function saveGameChanges() {
    const gameId = parseInt(document.getElementById('editGameId').value);
    const gameIndex = games.findIndex(g => g.id === gameId);
    
    if (gameIndex === -1) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const gameName = document.getElementById('editGameName').value.trim();
    const imageUrl = document.getElementById('editGameImageUrl').value.trim(); // НОВОЕ
    const urlTR = document.getElementById('editGameUrlTR').value.trim();
    const urlUA = document.getElementById('editGameUrlUA').value.trim();
    
    if (!gameName) {
        showNotification('Введите название игры', 'warning');
        return;
    }
    
    const duplicate = games.find((g, index) => 
        index !== gameIndex && g.name.toLowerCase() === gameName.toLowerCase()
    );
    
    if (duplicate) {
        showNotification('Игра с таким названием уже существует', 'error');
        return;
    }
    
    games[gameIndex] = {
        ...games[gameIndex],
        name: gameName,
        imageUrl: imageUrl || null, // НОВОЕ
        storeLinks: {
            TR: urlTR,
            UA: urlUA
        },
        productIds: {
            TR: extractProductId(urlTR),
            UA: extractProductId(urlUA)
        },
        lastUpdated: new Date().toISOString()
    };
    
    await saveToStorage('games', games);
    syncGameNamesInAccounts();
    closeGameModal();
    displayGames();
    showNotification('Игра обновлена! ✅', 'success');
}

// Функция удаления изображения игры
async function removeGameImage(gameId) {
    const gameIndex = games.findIndex(g => g.id === gameId);
    
    if (gameIndex === -1) return;
    
    if (confirm('Удалить изображение игры?')) {
        games[gameIndex] = {
            ...games[gameIndex],
            imageUrl: null,
            lastUpdated: new Date().toISOString()
        };
        
        await saveToStorage('games', games);
        
        // Обновляем форму редактирования
        editGame(gameId);
        
        showNotification('Изображение удалено', 'info');
    }
}

// Функция закрытия модального окна редактирования игры
function closeGameModal() {
    document.getElementById('editGameModal').style.display = 'none';
}

function displayGames() {
    const list = document.getElementById('gamesList');
    if (!list) return;
    
    // Проверяем, есть ли активный поиск
    const searchInput = document.getElementById('searchGamesInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    let gamesToShow = games;
    
    // Фильтруем игры если есть поисковый запрос
    if (searchTerm) {
        gamesToShow = games.filter(game => 
            game.name.toLowerCase().includes(searchTerm)
        );
    }
    
    if (gamesToShow.length === 0) {
        list.innerHTML = `
            <div class="empty">
                ${searchTerm ? `
                    <div style="font-size: 50px; margin-bottom: 15px;">🔍</div>
                    <h3>Игры не найдены</h3>
                    <p>Попробуйте другой поисковый запрос</p>
                    <button onclick="document.getElementById('searchGamesInput').value = ''; displayGames();" 
                            class="btn btn-primary btn-small" style="margin-top: 10px;">
                        Показать все игры
                    </button>
                ` : `
                    <div style="font-size: 50px; margin-bottom: 15px;">🎮</div>
                    <h3>Нет добавленных игр</h3>
                    <p>Добавьте первую игру выше</p>
                `}
            </div>
        `;
        return;
    }
    
    // Сортируем игры по дате добавления (новые сначала)
    const sortedGames = [...gamesToShow].sort((a, b) => {
        const dateA = new Date(a.created || a.timestamp || 0);
        const dateB = new Date(b.created || b.timestamp || 0);
        return dateB - dateA;
    });
    
    list.innerHTML = sortedGames.map(game => {
        // Определяем, есть ли связанные аккаунты
        const accountsWithThisGame = accounts.filter(acc => acc.gameId === game.id);
        const hasAccounts = accountsWithThisGame.length > 0;
        
        // Определяем статус игры
        let statusBadge = '';
        if (game.storeLinks?.TR && game.storeLinks?.UA) {
            statusBadge = `<span style="padding: 3px 8px; background: #dcfce7; color: #166534; border-radius: 10px; font-size: 0.8em; font-weight: 600;">✅ Полная</span>`;
        } else if (game.storeLinks?.TR || game.storeLinks?.UA) {
            statusBadge = `<span style="padding: 3px 8px; background: #fef3c7; color: #92400e; border-radius: 10px; font-size: 0.8em; font-weight: 600;">⚠️ Частичная</span>`;
        } else {
            statusBadge = `<span style="padding: 3px 8px; background: #f1f5f9; color: #475569; border-radius: 10px; font-size: 0.8em; font-weight: 600;">📝 Без ссылок</span>`;
        }
        
        return `
            <div class="game-item" style="
                background: white;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                border-left: 4px solid ${hasAccounts ? '#4361ee' : '#94a3b8'};
            ">
                <!-- Заголовок игры -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 15px;
                ">
                    <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                        ${game.imageUrl ? `
                            <div style="position: relative;">
                                <img src="${game.imageUrl}" 
                                     style="width: 60px; height: 60px; border-radius: 10px; object-fit: cover; border: 2px solid #e2e8f0;"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                     onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
                                <div style="
                                    width: 60px; height: 60px;
                                    background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
                                    border-radius: 10px;
                                    display: none;
                                    align-items: center;
                                    justify-content: center;
                                    color: white;
                                    font-size: 24px;
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                ">🎮</div>
                            </div>
                        ` : `
                            <div style="
                                width: 60px; height: 60px;
                                background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
                                border-radius: 10px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 24px;
                            ">🎮</div>
                        `}
                        
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <h3 style="margin: 0; color: #2d3748; font-size: 1.3em;">${game.name}</h3>
                                ${statusBadge}
                                ${hasAccounts ? `
                                    <span style="
                                        padding: 3px 10px;
                                        background: #e0f2fe;
                                        color: #0369a1;
                                        border-radius: 12px;
                                        font-size: 0.8em;
                                        font-weight: 600;
                                    ">
                                        📊 ${accountsWithThisGame.length} акк.
                                    </span>
                                ` : ''}
                            </div>
                            
                            <div style="color: #64748b; font-size: 0.9em;">
                                <div>ID: ${game.id} • Добавлена: ${game.created || 'Не указано'}</div>
                                <div>${game.addedBy ? `Добавил: ${game.addedBy}` : ''}</div>
                                ${game.lastUpdated ? `
                                    <div>Обновлена: ${new Date(game.lastUpdated).toLocaleDateString('ru-RU')}</div>
                                ` : ''}
                                ${game.imageUrl ? `
                                    <div style="margin-top: 5px;">
                                        <span style="color: #10b981;">🖼️ Есть изображение</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${game.storeLinks?.TR ? `
                            <a href="${game.storeLinks.TR}" target="_blank" 
                               style="text-decoration: none;">
                                <button class="btn btn-small" style="background: #dc2626; color: white;">
                                    🇹🇷 Турция
                                </button>
                            </a>
                        ` : ''}
                        
                        ${game.storeLinks?.UA ? `
                            <a href="${game.storeLinks.UA}" target="_blank" 
                               style="text-decoration: none;">
                                <button class="btn btn-small" style="background: #2563eb; color: white;">
                                    🇺🇦 Украина
                                </button>
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Ссылки на PS Store -->
                <div style="
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    border: 1px solid #e2e8f0;
                ">
                    <h4 style="margin: 0 0 15px 0; color: #475569; font-size: 1em;">🔗 Ссылки на PS Store:</h4>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="padding: 15px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <span style="font-weight: 600; color: #dc2626;">🇹🇷 Турция:</span>
                                ${game.storeLinks?.TR ? `
                                    <span style="
                                        padding: 2px 8px;
                                        background: #fef2f2;
                                        color: #dc2626;
                                        border-radius: 10px;
                                        font-size: 0.8em;
                                        font-weight: 600;
                                    ">✅ Есть</span>
                                ` : `
                                    <span style="
                                        padding: 2px 8px;
                                        background: #f1f5f9;
                                        color: #64748b;
                                        border-radius: 10px;
                                        font-size: 0.8em;
                                        font-weight: 600;
                                    ">❌ Нет</span>
                                `}
                            </div>
                            
                            ${game.storeLinks?.TR ? `
                                <div style="font-family: 'Courier New', monospace; font-size: 0.85em; word-break: break-all; color: #475569;">
                                    ${game.storeLinks.TR}
                                </div>
                                ${game.productIds?.TR ? `
                                    <div style="margin-top: 8px; font-size: 0.8em; color: #94a3b8;">
                                        Product ID: ${game.productIds.TR}
                                    </div>
                                ` : ''}
                            ` : `
                                <div style="color: #94a3b8; font-style: italic;">Ссылка не добавлена</div>
                            `}
                        </div>
                        
                        <div style="padding: 15px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <span style="font-weight: 600; color: #2563eb;">🇺🇦 Украина:</span>
                                ${game.storeLinks?.UA ? `
                                    <span style="
                                        padding: 2px 8px;
                                        background: #eff6ff;
                                        color: #2563eb;
                                        border-radius: 10px;
                                        font-size: 0.8em;
                                        font-weight: 600;
                                    ">✅ Есть</span>
                                ` : `
                                    <span style="
                                        padding: 2px 8px;
                                        background: #f1f5f9;
                                        color: #64748b;
                                        border-radius: 10px;
                                        font-size: 0.8em;
                                        font-weight: 600;
                                    ">❌ Нет</span>
                                `}
                            </div>
                            
                            ${game.storeLinks?.UA ? `
                                <div style="font-family: 'Courier New', monospace; font-size: 0.85em; word-break: break-all; color: #475569;">
                                    ${game.storeLinks.UA}
                                </div>
                                ${game.productIds?.UA ? `
                                    <div style="margin-top: 8px; font-size: 0.8em; color: #94a3b8;">
                                        Product ID: ${game.productIds.UA}
                                    </div>
                                ` : ''}
                            ` : `
                                <div style="color: #94a3b8; font-style: italic;">Ссылка не добавлена</div>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- Статистика по игре -->
                ${hasAccounts ? `
                    <div style="
                        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                        padding: 20px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                        border: 1px solid #bbf7d0;
                    ">
                        <h4 style="margin: 0 0 15px 0; color: #166534; font-size: 1em;">📊 Статистика по игре:</h4>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                            <div style="text-align: center;">
                                <div style="font-size: 2em; font-weight: 700; color: #166534;">${accountsWithThisGame.length}</div>
                                <div style="font-size: 0.9em; color: #64748b;">Аккаунтов</div>
                            </div>
                            
                            <div style="text-align: center;">
                                <div style="font-size: 2em; font-weight: 700; color: #2563eb;">
                                    ${accountsWithThisGame.reduce((sum, acc) => sum + (acc.positions.p2_ps4 + acc.positions.p3_ps4 + acc.positions.p2_ps5 + acc.positions.p3_ps5), 0)}
                                </div>
                                <div style="font-size: 0.9em; color: #64748b;">Всего позиций</div>
                            </div>
                            
                            <div style="text-align: center;">
                                <div style="font-size: 2em; font-weight: 700; color: #7c3aed;">
                                    ${accountsWithThisGame.reduce((sum, acc) => sum + (acc.purchaseAmount || 0), 0)} ₽
                                </div>
                                <div style="font-size: 0.9em; color: #64748b;">Сумма закупа</div>
                            </div>
                            
                            <div style="text-align: center;">
                                <div style="font-size: 2em; font-weight: 700; color: #db2777;">
                                    ${sales.filter(sale => {
                                        const account = accountsWithThisGame.find(acc => acc.id === sale.accountId);
                                        return account !== undefined;
                                    }).length}
                                </div>
                                <div style="font-size: 0.9em; color: #64748b;">Продаж</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Кнопки действий -->
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                    <button class="btn btn-primary btn-small" onclick="editGame(${game.id})" style="flex: 1; min-width: 150px;">
                        <span style="margin-right: 8px;">✏️</span>
                        Редактировать игру
                    </button>
                    
                    <button class="btn btn-success btn-small" onclick="openGameStats(${game.id})" style="flex: 1; min-width: 150px;" ${!hasAccounts ? 'disabled style="opacity: 0.5;"' : ''}>
                        <span style="margin-right: 8px;">📊</span>
                        Статистика
                    </button>
                    
                    <button class="btn btn-danger btn-small" onclick="deleteGame(${game.id})" style="flex: 1; min-width: 150px;">
                        <span style="margin-right: 8px;">🗑️</span>
                        Удалить игру
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики для поиска
    if (searchInput) {
        searchInput.addEventListener('input', searchGamesList);
    }
}
// ============================================
// ПЕРЕОПРЕДЕЛЕНИЕ ФУНКЦИИ С АВТОДОПОЛНЕНИЕМ
// ============================================

// Сохраняем оригинальную функцию
const originalDisplayGames = displayGames;

// Переопределяем функцию displayGames
window.displayGames = function() {
    // Вызываем оригинальную функцию
    originalDisplayGames();
    
    // Обновляем автодополнение после отображения игр
    setTimeout(() => {
        refreshAutocomplete();
    }, 500);
};



function openGameStats(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
    const gameSales = sales.filter(sale => {
        const account = gameAccounts.find(acc => acc.id === sale.accountId);
        return account !== undefined;
    });
    
    // Создаем модальное окно со статистикой
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'gameStatsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close" onclick="document.getElementById('gameStatsModal').remove()">&times;</span>
            
            <h2 style="margin-bottom: 25px; color: #2d3748;">
                <span style="display: inline-block; margin-right: 10px;">📊</span>
                Статистика игры: ${game.name}
            </h2>
            
            ${renderGameStats(game, gameAccounts, gameSales)}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function renderGameStats(game, gameAccounts, gameSales) {
    const totalPositions = gameAccounts.reduce((sum, acc) => 
        sum + acc.positions.p2_ps4 + acc.positions.p3_ps4 + acc.positions.p2_ps5 + acc.positions.p3_ps5, 0
    );
    
    const soldPositions = gameSales.length;
    const freePositions = totalPositions - soldPositions;
    
    const totalRevenue = gameSales.reduce((sum, sale) => sum + sale.price, 0);
    const totalCost = gameAccounts.reduce((sum, acc) => sum + (acc.purchaseAmount || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    
    return `
        <div class="stats-grid" style="margin: 20px 0;">
            <div class="stat-card">
                <div class="stat-value">${gameAccounts.length}</div>
                <div class="stat-label">Аккаунтов</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-value">${totalPositions}</div>
                <div class="stat-label">Всего позиций</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-value">${soldPositions}</div>
                <div class="stat-label">Продано</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-value">${freePositions}</div>
                <div class="stat-label">Свободно</div>
            </div>
        </div>
        
        <div class="section" style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 10px;">
            <h3 style="margin-bottom: 15px; color: #2d3748;">💰 Финансы</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="color: #64748b; font-size: 0.9em;">Затраты на закуп:</div>
                    <div style="font-size: 1.5em; font-weight: 700; color: #ef4444;">${totalCost} ₽</div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="color: #64748b; font-size: 0.9em;">Выручка:</div>
                    <div style="font-size: 1.5em; font-weight: 700; color: #10b981;">${totalRevenue} ₽</div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="color: #64748b; font-size: 0.9em;">Прибыль:</div>
                    <div style="font-size: 1.5em; font-weight: 700; color: ${totalProfit >= 0 ? '#10b981' : '#ef4444'};">${totalProfit} ₽</div>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="color: #64748b; font-size: 0.9em;">Рентабельность:</div>
                    <div style="font-size: 1.5em; font-weight: 700; color: ${totalCost > 0 ? (totalProfit / totalCost * 100 >= 0 ? '#10b981' : '#ef4444') : '#64748b'};">
                        ${totalCost > 0 ? (totalProfit / totalCost * 100).toFixed(1) : '0'}%
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section" style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 10px;">
            <h3 style="margin-bottom: 15px; color: #2d3748;">📈 Распределение по позициям</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                ${['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].map(posType => {
                    const totalPos = gameAccounts.reduce((sum, acc) => sum + (acc.positions[posType] || 0), 0);
                    const soldPos = gameSales.filter(sale => sale.positionType === posType).length;
                    const freePos = totalPos - soldPos;
                    
                    return `
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px;">
                                ${getPositionName(posType)}
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #64748b;">Всего:</span>
                                <span style="font-weight: 600;">${totalPos}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #10b981;">Продано:</span>
                                <span style="font-weight: 600; color: #10b981;">${soldPos}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #ef4444;">Свободно:</span>
                                <span style="font-weight: 600; color: #ef4444;">${freePos}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <button onclick="exportGameStats(${game.id})" class="btn btn-primary">
                📁 Экспорт статистики
            </button>
            <button onclick="document.getElementById('gameStatsModal').remove()" class="btn btn-secondary" style="margin-left: 10px;">
                Закрыть
            </button>
        </div>
    `;
}

function exportGameStats(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
    const gameSales = sales.filter(sale => {
        const account = gameAccounts.find(acc => acc.id === sale.accountId);
        return account !== undefined;
    });
    
    // Создаем CSV
    const headers = ['Дата', 'Аккаунт', 'Позиция', 'Цена', 'Менеджер', 'Примечания'];
    const rows = gameSales.map(sale => [
        sale.datetime || sale.date || '',
        sale.accountLogin || '',
        sale.positionName || '',
        sale.price || 0,
        sale.soldByName || '',
        sale.notes || ''
    ]);
    
    const csvContent = [
        `Статистика игры: ${game.name}`,
        `Аккаунтов: ${gameAccounts.length}`,
        `Всего позиций: ${gameAccounts.reduce((sum, acc) => sum + acc.positions.p2_ps4 + acc.positions.p3_ps4 + acc.positions.p2_ps5 + acc.positions.p3_ps5, 0)}`,
        `Продано: ${gameSales.length}`,
        `Выручка: ${gameSales.reduce((sum, sale) => sum + sale.price, 0)} ₽`,
        '',
        ...headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Создаем и скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, `статистика_${game.name}_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = `статистика_${game.name}_${new Date().toISOString().split('T')[0]}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showNotification(`Статистика игры "${game.name}" экспортирована! 📁`, 'success');
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeGameModal();
    }
});

async function deleteGame(gameId) {
    const accountsWithThisGame = accounts.filter(acc => acc.gameId === gameId);
    const game = games.find(g => g.id === gameId);
    
    if (accountsWithThisGame.length > 0) {
        if (!confirm(`Удалить игру "${game.name}"? ${accountsWithThisGame.length} аккаунт(ов) с этой игрой останутся без привязки.`)) {
            return;
        }
    } else {
        if (!confirm(`Удалить игру "${game.name}"?`)) {
            return;
        }
    }
    
    games = games.filter(game => game.id !== gameId);
    await saveToStorage('games', games);
    displayGames();
    loadGamesForSelect();
    loadGamesForFilter();
    
    showNotification(`Игра "${game.name}" удалена`, 'info');
}

// ============================================
// ФУНКЦИИ ДЛЯ АККАУНТОВ
// ============================================

async function addAccount() {
    console.log('➕ Добавляем новый аккаунт...');
    
    // Получаем данные из формы
    const formData = getAccountFormData();
    if (!formData) {
        return;
    }
    
    // Показываем в консоли куда добавляем
    console.log(`🎮 Добавляем аккаунт в игру: ${formData.gameName}`);
    
    // Создаем новый аккаунт
    const newAccount = {
        id: Date.now(),
        ...formData,
        created: new Date().toLocaleDateString('ru-RU'),
        timestamp: new Date().toISOString(),
        comments: []
    };

    // Добавляем в массив
    accounts.push(newAccount);
    
    try {
        // Сохраняем
        await saveToStorage('accounts', accounts);
        
        // Очищаем форму (игра остается выбранной!)
        clearAccountForm();
        
        // Показываем успешное сообщение
        showNotification(`Аккаунт добавлен в "${formData.gameName}"! 🎮`, 'success');
        
        // Выводим в консоль для отладки
        console.log(`✅ Аккаунт "${formData.psnLogin}" добавлен к игре "${formData.gameName}"`);
        console.log(`📊 Всего аккаунтов в системе: ${accounts.length}`);
        
    } catch (error) {
        console.error('❌ Ошибка при добавлении:', error);
        showNotification('Ошибка при добавлении аккаунта ❌', 'error');
    }
}

// 🔥 НОВАЯ ФУНКЦИЯ: мгновенное обновление селектов
function refreshAllGameSelectsImmediately() {
    console.log('🔥 Мгновенное обновление селектов');
    
    // Обновляем глобальную переменную games из localStorage
    const freshGames = JSON.parse(localStorage.getItem('games')) || [];
    games = freshGames;
    
    // Обновляем селекты без задержек
    if (window.location.pathname.includes('add-account.html')) {
        const select = document.getElementById('accountGame');
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Выберите игру</option>';
            
            freshGames.forEach(game => {
                const option = document.createElement('option');
                option.value = game.id;
                option.textContent = game.name;
                select.appendChild(option);
            });
            
            const freeOption = document.createElement('option');
            freeOption.value = 0;
            freeOption.textContent = 'Свободный';
            select.appendChild(freeOption);
            
            if (currentValue) {
                select.value = currentValue;
            }
        }
    }
    
    // Обновляем другие селекты если они есть на странице
    const managerSelect = document.getElementById('managerGame');
    if (managerSelect && window.location.pathname.includes('manager.html')) {
        const currentValue = managerSelect.value;
        managerSelect.innerHTML = '<option value="">Выберите игру</option>';
        
        freshGames.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = game.name;
            managerSelect.appendChild(option);
        });
        
        if (currentValue) {
            managerSelect.value = currentValue;
        }
    }
    
    // Обновляем автодополнение если есть
    if (window.autoComplete && typeof window.autoComplete.loadGames === 'function') {
        window.autoComplete.loadGames();
        window.autoComplete.setupAllSelects();
    }
}

function getAccountFormData() {
    // ===== ИСПРАВЛЕНО: Берем ID из скрытого поля =====
    const gameIdInput = document.getElementById('accountGameId');
    const gameId = gameIdInput ? parseInt(gameIdInput.value) || 0 : 0;
    const game = games.find(g => g.id === gameId);
    
    // Проверяем выбрана ли игра
    if (!gameId) {
        console.warn('⚠️ Игра не выбрана - создаем Свободный аккаунт');
    }
    
    const psnLogin = document.getElementById('psnLogin').value.trim();
    if (!psnLogin) {
        showNotification('Введите логин PSN!', 'warning');
        return null;
    }
    
    // Проверка на дубликат логина
    const duplicate = accounts.find(acc => 
        acc.psnLogin.toLowerCase() === psnLogin.toLowerCase()
    );
    if (duplicate) {
        showNotification(`Логин "${psnLogin}" уже существует!`, 'error');
        return null;
    }
    
    const gameData = game ? {
        gameId: gameId,
        gameName: game.name
    } : {
        gameId: 0,
        gameName: 'Свободный'
    };

    return {
        ...gameData,
        purchaseAmount: parseFloat(document.getElementById('purchaseAmount').value) || 0,
        psnLogin: psnLogin,
        psnPassword: document.getElementById('psnPassword').value,
        email: document.getElementById('email').value.trim(),
        emailPassword: document.getElementById('emailPassword').value,
        backupEmail: document.getElementById('backupEmail').value.trim(),
        birthDate: document.getElementById('birthDate').value.trim(),
        psnCodes: document.getElementById('psnCodes').value.trim(),
        psnAuthenticator: document.getElementById('psnAuthenticator').value.trim(),
        positions: {
            p2_ps4: parseInt(document.getElementById('p2_ps4').value) || 0,
            p3_ps4: parseInt(document.getElementById('p3_ps4').value) || 0,
            p2_ps5: parseInt(document.getElementById('p2_ps5').value) || 0,
            p3_ps5: parseInt(document.getElementById('p3_ps5').value) || 0
        }
    };
}

function clearAccountForm() {
    console.log('🧹 Очищаю форму (игра остается выбранной)');
    
    // Очищаем ВСЕ поля КРОМЕ выбранной игры
    document.getElementById('purchaseAmount').value = '';
    document.getElementById('psnLogin').value = '';
    document.getElementById('psnPassword').value = '';
    document.getElementById('email').value = '';
    document.getElementById('emailPassword').value = '';
    document.getElementById('backupEmail').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('psnCodes').value = '';
    document.getElementById('psnAuthenticator').value = '';
    
    // Сбрасываем позиции на 0
    document.getElementById('p2_ps4').value = '0';
    document.getElementById('p3_ps4').value = '0';
    document.getElementById('p2_ps5').value = '0';
    document.getElementById('p3_ps5').value = '0';
    
    // Фокус на поле логина для быстрого ввода следующего аккаунта
    setTimeout(() => {
        const loginField = document.getElementById('psnLogin');
        if (loginField) {
            loginField.focus();
        }
    }, 100);
    
    console.log('✅ Форма очищена (игра осталась выбранной)');
}


// ============================================
// ОТОБРАЖЕНИЕ АККАУНТОВ
// ============================================

function displayAccounts(accountsToShow = accounts) {
    const list = document.getElementById('accountsList');
    
    if (accountsToShow.length === 0) {
        list.innerHTML = '<div class="empty">Аккаунты не найдены</div>';
        return;
    }
    
    list.innerHTML = accountsToShow.map(account => `
        <div class="account-card">
            <div class="account-header">
                <div class="account-game">${account.gameName}</div>
                <div class="account-price">${account.purchaseAmount} ₽</div>
            </div>
            
            <div class="account-info">
                <div class="info-row">
                    <span class="info-label">Логин PSN:</span>
                    <span class="info-value">${account.psnLogin}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль PSN:</span>
                    <span class="info-value">${account.psnPassword || 'Не указан'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Коды PSN:</span>
                    <span class="info-value">${account.psnCodes || 'Не указаны'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Почта:</span>
                    <span class="info-value">${account.email || 'Не указана'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль почты:</span>
                    <span class="info-value">${account.emailPassword || 'Не указан'}</span>
                </div>
                ${account.birthDate ? `<div class="info-row"><span class="info-label">Дата рождения:</span><span class="info-value">${account.birthDate}</span></div>` : ''}
                ${account.backupEmail ? `<div class="info-row"><span class="info-label">Резервная почта:</span><span class="info-value">${account.backupEmail}</span></div>` : ''}
                ${account.psnAuthenticator ? `<div class="info-row"><span class="info-label">PSN Аутентификатор:</span><span class="info-value">${account.psnAuthenticator}</span></div>` : ''}
            </div>
            
            <div class="positions-info">
                <h4>Позиции:</h4>
                <div class="positions-grid">
                    <div class="position-item"><span>П2 PS4:</span><strong>${account.positions.p2_ps4}</strong></div>
                    <div class="position-item"><span>П3 PS4:</span><strong>${account.positions.p3_ps4}</strong></div>
                    <div class="position-item"><span>П2 PS5:</span><strong>${account.positions.p2_ps5}</strong></div>
                    <div class="position-item"><span>П3 PS5:</span><strong>${account.positions.p3_ps5}</strong></div>
                </div>
            </div>
            
            <div class="account-actions">
                <button class="btn btn-primary btn-small" onclick="editAccount(${account.id})">✏️ Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="deleteAccount(${account.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

// Свободные аккаунты
function displayFreeAccounts() {
    const freeAccounts = accounts.filter(acc => !acc.gameId || acc.gameId === 0);
    const list = document.getElementById('freeAccountsList');
    
    if (freeAccounts.length === 0) {
        list.innerHTML = '<div class="empty">Нет свободных аккаунтов</div>';
        return;
    }
    
    list.innerHTML = freeAccounts.map(account => `
        <div class="account-card">
            <div class="account-header">
                <div class="account-game" style="color: #e74c3c;">🆓 Свободный</div>
                <div class="account-price">${account.purchaseAmount} ₽</div>
            </div>
            
            <div class="account-info">
                <div class="info-row">
                    <span class="info-label">Логин PSN:</span>
                    <span class="info-value">${account.psnLogin}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль PSN:</span>
                    <span class="info-value">${account.psnPassword || 'Не указан'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Коды PSN:</span>
                    <span class="info-value">${account.psnCodes || 'Не указаны'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Почта:</span>
                    <span class="info-value">${account.email || 'Не указана'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Пароль почты:</span>
                    <span class="info-value">${account.emailPassword || 'Не указан'}</span>
                </div>
                ${account.birthDate ? `<div class="info-row"><span class="info-label">Дата рождения:</span><span class="info-value">${account.birthDate}</span></div>` : ''}
                ${account.backupEmail ? `<div class="info-row"><span class="info-label">Резервная почта:</span><span class="info-value">${account.backupEmail}</span></div>` : ''}
                ${account.psnAuthenticator ? `<div class="info-row"><span class="info-label">PSN Аутентификатор:</span><span class="info-value">${account.psnAuthenticator}</span></div>` : ''}
            </div>
            
            <div class="positions-info">
                <h4>Позиции:</h4>
                <div class="positions-grid">
                    <div class="position-item"><span>П2 PS4:</span><strong>${account.positions.p2_ps4}</strong></div>
                    <div class="position-item"><span>П3 PS4:</span><strong>${account.positions.p3_ps4}</strong></div>
                    <div class="position-item"><span>П2 PS5:</span><strong>${account.positions.p2_ps5}</strong></div>
                    <div class="position-item"><span>П3 PS5:</span><strong>${account.positions.p3_ps5}</strong></div>
                </div>
            </div>
            
            <div class="account-actions">
                <button class="btn btn-success btn-small" onclick="attachGameToAccount(${account.id})">🎮 Привязать игру</button>
                <button class="btn btn-primary btn-small" onclick="editAccount(${account.id})">✏️ Редактировать</button>
                <button class="btn btn-danger btn-small" onclick="deleteAccount(${account.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

function refreshGamesPage() {
    if (!window.location.pathname.includes('games.html')) return;
    
    const freshGames = JSON.parse(localStorage.getItem('games')) || [];
    if (JSON.stringify(freshGames) !== JSON.stringify(games)) {
        games = freshGames;
        if (typeof displayGames === 'function') {
            displayGames();
            console.log('🔄 UI игр обновлен');
        }
        
        // Отправляем событие обновления игр
        window.dispatchEvent(new Event('gamesUpdated'));
    }
}

// Функция для обновления страницы аккаунтов
function refreshAccountsPage() {
    const freshAccounts = JSON.parse(localStorage.getItem('accounts')) || [];
    if (JSON.stringify(freshAccounts) !== JSON.stringify(accounts)) {
        accounts = freshAccounts;
        
        if (window.location.pathname.includes('accounts.html') && typeof displayAccounts === 'function') {
            displayAccounts();
            console.log('🔄 UI аккаунтов обновлен');
        }
        
        if (window.location.pathname.includes('free-accounts.html') && typeof displayFreeAccounts === 'function') {
            displayFreeAccounts();
            console.log('🔄 UI свободных аккаунтов обновлен');
        }
    }
}


// Функция для обновления всех селектов с играми
// Функция для обновления всех селектов с играми
function refreshAllGameSelects() {
    console.log('🔄 Обновляем все селекты с играми');
    
    // Обновляем данные из localStorage
    const freshGames = JSON.parse(localStorage.getItem('games')) || [];
    if (JSON.stringify(freshGames) !== JSON.stringify(games)) {
        games = freshGames;
    }
    
    // Обновляем все селекты на разных страницах
    setTimeout(() => {
        // На странице добавления аккаунта
        if (typeof loadGamesForSelect === 'function' && 
            window.location.pathname.includes('add-account.html')) {
            loadGamesForSelect();
        }
        
        // На странице фильтрации аккаунтов
        if (typeof loadGamesForFilter === 'function' && 
            window.location.pathname.includes('accounts.html')) {
            loadGamesForFilter();
        }
        
        // На странице менеджера
        if (typeof loadGamesForManager === 'function' && 
            window.location.pathname.includes('manager.html')) {
            loadGamesForManager();
        }
        
        console.log('✅ Все селекты обновлены');
        
        // Обновляем автодополнение если есть
        if (window.autoComplete && typeof window.autoComplete.loadGames === 'function') {
            setTimeout(() => {
                window.autoComplete.loadGames();
                window.autoComplete.setupAllSelects();
                console.log('✅ Автодополнение обновлено');
            }, 300);
        }
        
    }, 100);
}


// Проверка обновлений каждые 3 секунды
function startSyncChecker() {
    if (window.syncChecker) clearInterval(window.syncChecker);
    
    window.syncChecker = setInterval(() => {
        refreshGamesPage();
        refreshAccountsPage();
        refreshAllGameSelects();
    }, 3000);
}

// ============================================
// ФИЛЬТРАЦИЯ И ПОИСК
// ============================================

function filterAccounts() {
    const gameFilter = document.getElementById('filterGame').value;
    const searchText = document.getElementById('searchAccount').value.toLowerCase();
    
    let filteredAccounts = accounts;
    
    if (gameFilter) {
        filteredAccounts = filteredAccounts.filter(acc => acc.gameId === parseInt(gameFilter));
    }
    
    if (searchText) {
        filteredAccounts = filteredAccounts.filter(acc => 
            acc.psnLogin.toLowerCase().includes(searchText) ||
            (acc.email && acc.email.toLowerCase().includes(searchText))
        );
    }
    
    displayAccounts(filteredAccounts);
    
    if (filteredAccounts.length === 0) {
        showNotification('Аккаунты не найдены', 'info');
    }
}

function clearFilters() {
    document.getElementById('filterGame').selectedIndex = 0;
    document.getElementById('searchAccount').value = '';
    displayAccounts();
    showNotification('Фильтры сброшены', 'info');
}

// ============================================
// РЕДАКТИРОВАНИЕ АККАУНТОВ
// ============================================

function editAccount(accountId) {
    // Просто открываем наше универсальное модальное окно
    openAccountEditModal(accountId);
}

// ============================================
// УНИВЕРСАЛЬНОЕ РЕДАКТИРОВАНИЕ АККАУНТОВ
// ============================================

function openAccountEditModal(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        showNotification('Аккаунт не найден', 'error');
        return;
    }
    
    const editForm = document.getElementById('editForm');
    editForm.innerHTML = `
        <input type="hidden" id="editAccountId" value="${account.id}">
        
        <div style="grid-column: 1 / -1;">
            <label for="editGame" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Игра:</label>
            <select id="editGame" class="input" required>
                <option value="">Выберите игру</option>
                ${games.map(game => `
                    <option value="${game.id}" ${game.id === account.gameId ? 'selected' : ''}>
                        ${game.name}
                    </option>
                `).join('')}
                <option value="0" ${account.gameId === 0 ? 'selected' : ''}>Свободный</option>
            </select>
        </div>
        
        <div>
            <label for="editPurchaseAmount" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Сумма закупа (₽):</label>
            <input type="number" id="editPurchaseAmount" value="${account.purchaseAmount}" 
                   placeholder="Сумма закупа" class="input" step="0.01">
        </div>
        
        <div>
            <label for="editPsnLogin" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Логин PSN:</label>
            <input type="text" id="editPsnLogin" value="${account.psnLogin}" 
                   placeholder="Логин PSN" class="input" required>
        </div>
        
        <div>
            <label for="editPsnPassword" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Пароль PSN:</label>
            <input type="text" id="editPsnPassword" value="${account.psnPassword || ''}" 
                   placeholder="Пароль PSN" class="input">
        </div>
        
        <div>
            <label for="editEmail" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Почта:</label>
            <input type="email" id="editEmail" value="${account.email || ''}" 
                   placeholder="Почта" class="input">
        </div>
        
        <div>
            <label for="editEmailPassword" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Пароль от почты:</label>
            <input type="text" id="editEmailPassword" value="${account.emailPassword || ''}" 
                   placeholder="Пароль от почты" class="input">
        </div>
        
        <div>
            <label for="editBackupEmail" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Резервная почта:</label>
            <input type="email" id="editBackupEmail" value="${account.backupEmail || ''}" 
                   placeholder="Резервная почта" class="input">
        </div>
        
        <div>
            <label for="editBirthDate" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Дата рождения:</label>
            <input type="text" id="editBirthDate" value="${account.birthDate || ''}" 
                   placeholder="Дата рождения" class="input">
        </div>
        
        <div>
            <label for="editPsnCodes" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Коды PSN:</label>
            <input type="text" id="editPsnCodes" value="${account.psnCodes || ''}" 
                   placeholder="Коды PSN (через запятую)" class="input">
        </div>
        
        <div>
            <label for="editPsnAuthenticator" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
                PSN Аутентификатор:
            </label>
            <input type="text" id="editPsnAuthenticator" value="${account.psnAuthenticator || ''}" 
                   class="input" placeholder="Base32 ключ (например: 2G6NIBH554YYQMLIPAHSIS4Z53IXBZXDVWVKF36C5QWDBKARFR6TOLV4P3VHLWGIKMJGEIBOE7YNB4J43K5GZ7HYKM4LN7QCVLLWRSQ)">
            
            ${account.psnAuthenticator ? `
                <div style="margin-top: 10px;">
                    <button class="btn btn-primary" onclick="openPSNCodeModal(${account.id})" style="width: 100%;">
                        <span style="margin-right: 8px;">🔐</span>
                        Сгенерировать PSN Код (30 секундный)
                    </button>
                    <div style="font-size: 0.85em; color: #64748b; margin-top: 5px; text-align: center;">
                        Откроется окно с автоматически обновляющимся кодом
                    </div>
                </div>
            ` : `
                <div style="font-size: 0.85em; color: #64748b; margin-top: 5px;">
                    Вставьте 32-значный ключ из PSN. Кнопка появится после сохранения.
                </div>
            `}
        </div>
        
        <div class="positions-section">
            <h3 style="margin-bottom: 20px; color: #2d3748; font-size: 1.2rem;">🎮 Количество позиций:</h3>
            <div class="positions-grid">
                <div>
                    <label for="editP2_ps4" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П2 PS4:</label>
                    <input type="number" id="editP2_ps4" value="${account.positions.p2_ps4}" 
                           class="input" min="0" style="width: 100%;">
                </div>
                <div>
                    <label for="editP3_ps4" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П3 PS4:</label>
                    <input type="number" id="editP3_ps4" value="${account.positions.p3_ps4}" 
                           class="input" min="0" style="width: 100%;">
                </div>
                <div>
                    <label for="editP2_ps5" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П2 PS5:</label>
                    <input type="number" id="editP2_ps5" value="${account.positions.p2_ps5}" 
                           class="input" min="0" style="width: 100%;">
                </div>
                <div>
                    <label for="editP3_ps5" style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">П3 PS5:</label>
                    <input type="number" id="editP3_ps5" value="${account.positions.p3_ps5}" 
                           class="input" min="0" style="width: 100%;">
                </div>
            </div>
        </div>
        
        <!-- Комментарии к аккаунту -->
        <div class="comments-section" style="grid-column: 1 / -1; margin-top: 20px;">
            <h3 style="margin-bottom: 15px; color: #2d3748; font-size: 1.2rem;">💬 Комментарии к аккаунту:</h3>
            <div id="accountCommentsList" style="
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 15px;
                padding: 15px;
                background: #f8fafc;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            ">
                ${renderCommentsListForEditModal(account.comments || [], account.id)}
            </div>
            
            <div class="new-comment-box">
                <textarea id="newAccountComment" placeholder="Добавить новый комментарий..." 
                         rows="3" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;"></textarea>
                <button onclick="addCommentFromEditModal(${account.id})" 
                        class="btn btn-primary btn-small" style="margin-top: 10px;">
                    💬 Добавить комментарий
                </button>
            </div>
        </div>

        <div style="grid-column: 1 / -1; margin-top: 20px;">
            <h3 style="margin-bottom: 15px; color: #2d3748; font-size: 1.2rem;">🛑 Деактивация аккаунта:</h3>
            
            <div style="display: flex; gap: 15px; align-items: center;">
                <button id="toggleDeactivationBtn" 
                        class="btn ${account.deactivated ? 'btn-danger' : 'btn-secondary'}" 
                        onclick="toggleAccountDeactivation(${account.id})"
                        style="min-width: 150px;">
                    ${account.deactivated ? '✅ Активировать' : '🛑 Деактивировать'}
                </button>
                
                ${account.deactivated ? `
                    <div style="flex: 1;">
                        <label for="deactivationDate" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">
                            Дата деактивации:
                        </label>
                        <input type="date" id="deactivationDate" value="${account.deactivationDate || new Date().toISOString().split('T')[0]}" 
                               class="input" style="width: 200px;">
                        <button onclick="updateDeactivationDate(${account.id})" 
                                class="btn btn-small btn-primary" style="margin-left: 10px;">
                            Обновить
                        </button>
                    </div>
                    
                    <div style="
                        background: #fef2f2;
                        color: #dc2626;
                        padding: 8px 15px;
                        border-radius: 8px;
                        border: 1px solid #fecaca;
                        font-weight: 600;
                    ">
                        🛑 Деактивирован
                        ${account.deactivationDate ? `<br><small>${account.deactivationDate}</small>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="modal-buttons">
            <button class="btn btn-secondary" onclick="closeAnyModal('editModal')" style="padding: 12px 24px;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="saveAccountChanges()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">💾</span>
                Сохранить изменения
            </button>
            <button class="btn btn-danger" onclick="deleteAccountFromModal(${account.id})" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">🗑️</span>
                Удалить аккаунт
            </button>
        </div>
    `;
    
    openModal('editModal');
    
    // Автофокус на первом поле
    setTimeout(() => {
        const firstInput = editForm.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Функция для рендеринга комментариев в модальном окне редактирования
function renderCommentsListForEditModal(comments, accountId) {
    if (!comments || comments.length === 0) {
        return '<div style="text-align: center; color: #94a3b8;">Нет комментариев</div>';
    }
    
    return comments.map(comment => `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.9em;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div style="font-weight: 600; color: #2d3748;">${comment.author}</div>
                <div style="color: #64748b; font-size: 0.85em;">
                    ${comment.date} ${comment.time}
                </div>
            </div>
            <div style="color: #374151;">${sanitizeHTML(comment.text)}</div>
            ${comment.authorUsername === security.getCurrentUser()?.username || security.getCurrentUser()?.role === 'admin' ? `
                <div style="margin-top: 5px; text-align: right;">
                    <button onclick="deleteCommentFromEditModal(${comment.id}, ${accountId})" 
                            style="
                                background: #fef2f2;
                                color: #dc2626;
                                border: 1px solid #fecaca;
                                padding: 2px 8px;
                                border-radius: 4px;
                                font-size: 11px;
                                cursor: pointer;
                            ">
                        Удалить
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Функции для деактивации аккаунта
function toggleAccountDeactivation(accountId) {
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    if (accountIndex === -1) return;
    
    const isCurrentlyDeactivated = accounts[accountIndex].deactivated;
    
    if (!isCurrentlyDeactivated) {
        // Деактивируем
        if (confirm('Деактивировать этот аккаунт?')) {
            accounts[accountIndex] = {
                ...accounts[accountIndex],
                deactivated: true,
                deactivationDate: new Date().toISOString().split('T')[0],
                deactivatedBy: security.getCurrentUser()?.name || 'Неизвестно',
                deactivatedAt: new Date().toISOString()
            };
            
            saveToStorage('accounts', accounts);
            
            // Обновляем UI в модальном окне
            const btn = document.getElementById('toggleDeactivationBtn');
            if (btn) {
                btn.className = 'btn btn-danger';
                btn.textContent = '✅ Активировать';
            }
            
            showNotification('Аккаунт деактивирован', 'success');
        }
    } else {
        // Активируем
        if (confirm('Активировать этот аккаунт?')) {
            accounts[accountIndex] = {
                ...accounts[accountIndex],
                deactivated: false,
                deactivationDate: null,
                deactivatedBy: null,
                deactivatedAt: null
            };
            
            saveToStorage('accounts', accounts);
            
            // Обновляем UI в модальном окне
            const btn = document.getElementById('toggleDeactivationBtn');
            if (btn) {
                btn.className = 'btn btn-secondary';
                btn.textContent = '🛑 Деактивировать';
            }
            
            showNotification('Аккаунт активирован', 'success');
        }
    }
}

function updateDeactivationDate(accountId) {
    const dateInput = document.getElementById('deactivationDate');
    if (!dateInput) return;
    
    const newDate = dateInput.value;
    if (!newDate) {
        showNotification('Выберите дату', 'warning');
        return;
    }
    
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    if (accountIndex === -1) return;
    
    accounts[accountIndex] = {
        ...accounts[accountIndex],
        deactivationDate: newDate
    };
    
    saveToStorage('accounts', accounts);
    showNotification('Дата деактивации обновлена', 'success');
}

// Функция для добавления комментария из модального окна редактирования
function addCommentFromEditModal(accountId) {
    const textarea = document.getElementById('newAccountComment');
    const commentText = textarea.value.trim();
    
    if (!commentText) {
        showNotification('Введите текст комментария', 'warning');
        return;
    }
    
    if (addCommentToAccount(accountId, commentText)) {
        textarea.value = '';
        
        // Обновляем список комментариев
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            document.getElementById('accountCommentsList').innerHTML = 
                renderCommentsListForEditModal(account.comments || [], account.id);
        }
        
        showNotification('Комментарий добавлен', 'success');
    }
}

// Функция для удаления комментария из модального окна редактирования
function deleteCommentFromEditModal(commentId, accountId) {
    if (deleteComment(accountId, commentId)) {
        // Обновляем список комментариев
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            document.getElementById('accountCommentsList').innerHTML = 
                renderCommentsListForEditModal(account.comments || [], account.id);
        }
    }
}

async function deleteAccountFromModal(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    if (confirm(`Удалить аккаунт "${account.psnLogin}"? Это действие нельзя отменить.`)) {
        // Удаляем из локального массива
        accounts = accounts.filter(acc => acc.id !== accountId);
        
        // Сохраняем в localStorage
        localStorage.setItem('accounts', JSON.stringify(accounts));
        
        // Сохраняем в Firebase
        if (typeof firebase !== 'undefined' && firebase.database) {
            try {
                const db = firebase.database();
                const accountsObj = {};
                accounts.forEach(acc => {
                    accountsObj[acc.id] = acc;
                });
                await db.ref('accounts').set(accountsObj);
                console.log('✅ Аккаунт удален из Firebase');
            } catch (error) {
                console.error('❌ Ошибка Firebase:', error);
            }
        }
        
        closeAnyModal('editModal');
        
        // Обновляем отображение
        if (window.location.pathname.includes('accounts.html')) {
            displayAccounts();
        } else if (window.location.pathname.includes('manager.html')) {
            const searchInput = document.getElementById('managerGameSearch');
            if (searchInput && searchInput.value.trim()) {
                searchByGame();
            }
        }
        
        showNotification(`Аккаунт "${account.psnLogin}" удален`, 'info');
    }
}

// ============================================
// ФУНКЦИЯ СОХРАНЕНИЯ ИЗМЕНЕНИЙ АККАУНТА
// ============================================

async function saveAccountChanges() {
    const accountId = parseInt(document.getElementById('editAccountId').value);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) return;
    
    const gameSelect = document.getElementById('editGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    if (!game && gameId !== 0) {
        showNotification('Выберите игру или "Свободный"', 'warning');
        return;
    }
    
    const psnLogin = document.getElementById('editPsnLogin').value.trim();
    if (!psnLogin) {
        showNotification('Введите логин PSN', 'warning');
        return;
    }
    
    // Проверяем уникальность логина (кроме текущего аккаунта)
    const duplicate = accounts.find((acc, index) => 
        index !== accountIndex && 
        acc.psnLogin.toLowerCase() === psnLogin.toLowerCase()
    );
    
    if (duplicate) {
        showNotification(`Логин "${psnLogin}" уже существует у другого аккаунта!`, 'error');
        return;
    }
    
    // Обновляем аккаунт
    accounts[accountIndex] = {
        ...accounts[accountIndex],
        gameId: gameId,
        gameName: game ? game.name : 'Свободный',
        purchaseAmount: parseFloat(document.getElementById('editPurchaseAmount').value) || 0,
        psnLogin: psnLogin,
        psnPassword: document.getElementById('editPsnPassword').value,
        email: document.getElementById('editEmail').value.trim(),
        emailPassword: document.getElementById('editEmailPassword').value,
        backupEmail: document.getElementById('editBackupEmail').value.trim(),
        birthDate: document.getElementById('editBirthDate').value.trim(),
        psnCodes: document.getElementById('editPsnCodes').value.trim(),
        psnAuthenticator: document.getElementById('editPsnAuthenticator').value.trim(),
        positions: {
            p2_ps4: parseInt(document.getElementById('editP2_ps4').value) || 0,
            p3_ps4: parseInt(document.getElementById('editP3_ps4').value) || 0,
            p2_ps5: parseInt(document.getElementById('editP2_ps5').value) || 0,
            p3_ps5: parseInt(document.getElementById('editP3_ps5').value) || 0
        },
        lastModified: new Date().toISOString(),
        modifiedBy: security.getCurrentUser()?.name || 'Неизвестно'
    };
    
    await saveToStorage('accounts', accounts);
    
    closeAnyModal('editModal');
    
    // Обновляем отображение на обеих страницах
    if (window.location.pathname.includes('accounts.html')) {
        displayAccounts();
    } else if (window.location.pathname.includes('manager.html')) {
        // Обновляем результаты поиска если что-то искали
        const searchInput = document.getElementById('managerGameSearch');
        if (searchInput && searchInput.value.trim()) {
            searchByGame();
        }
    } else if (window.location.pathname.includes('free-accounts.html')) {
        displayFreeAccounts();
    }
    
    showNotification('Изменения сохранены и синхронизированы! ✅', 'success');
}

async function deleteAccount(accountId) {
    console.log('🗑️ Удаление аккаунта:', accountId);
    
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        showNotification('Аккаунт не найден', 'error');
        return;
    }
    
    if (confirm(`Удалить аккаунт "${account.psnLogin}"? Это действие нельзя отменить.`)) {
        // Удаляем из локального массива
        accounts = accounts.filter(acc => acc.id !== accountId);
        
        // Сохраняем в localStorage
        localStorage.setItem('accounts', JSON.stringify(accounts));
        
        // Сохраняем в Firebase (обновляем весь список)
        if (typeof firebase !== 'undefined' && firebase.database) {
            try {
                const db = firebase.database();
                const accountsObj = {};
                accounts.forEach(acc => {
                    accountsObj[acc.id] = acc;
                });
                await db.ref('accounts').set(accountsObj);
                console.log('✅ Аккаунт удален из Firebase');
            } catch (error) {
                console.error('❌ Ошибка Firebase:', error);
                showNotification('Ошибка синхронизации, аккаунт удален только локально', 'warning');
            }
        }
        
        // Обновляем отображение
        if (typeof displayAccounts === 'function') {
            displayAccounts();
        }
        
        showNotification(`Аккаунт "${account.psnLogin}" удален`, 'success');
    }
}

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

function attachGameToAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    const editForm = document.getElementById('editFreeForm');
    editForm.innerHTML = `
        <h2 style="margin-bottom: 25px; color: #2d3748; text-align: center;">
            <span style="display: inline-block; margin-right: 10px;">🎮</span>
            Привязать игру к аккаунту
        </h2>
        
        <input type="hidden" id="editFreeAccountId" value="${account.id}">
        
        <div style="grid-column: 1 / -1;">
            <label for="editFreeGame" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Игра:</label>
            <select id="editFreeGame" class="input" required>
                <option value="">Выберите игру</option>
                ${games.map(game => `<option value="${game.id}">${game.name}</option>`).join('')}
            </select>
        </div>
        
        <div>
            <label for="editFreePurchaseAmount" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">Сумма закупа (₽):</label>
            <input type="number" id="editFreePurchaseAmount" value="${account.purchaseAmount}" 
                   placeholder="Сумма закупа" class="input" step="0.01">
        </div>
        
        <div class="modal-buttons">
            <button class="btn btn-secondary" onclick="closeFreeModal()" style="padding: 12px 24px;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="saveFreeAccountChanges()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">💾</span>
                Привязать игру
            </button>
        </div>
    `;
    
    openModal('editFreeModal');
}

async function saveFreeAccountChanges() {
    const accountId = parseInt(document.getElementById('editFreeAccountId').value);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) return;
    
    const gameSelect = document.getElementById('editFreeGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
        showNotification('Выберите игру', 'warning');
        return;
    }
    
    const purchaseAmount = parseFloat(document.getElementById('editFreePurchaseAmount').value) || 0;
    
    accounts[accountIndex] = {
        ...accounts[accountIndex],
        gameId: gameId,
        gameName: game.name,
        purchaseAmount: purchaseAmount
    };
    
    await saveToStorage('accounts', accounts);
    closeFreeModal();
    
    if (window.location.pathname.includes('free-accounts.html')) {
        displayFreeAccounts();
    } else {
        displayAccounts();
    }
    
    showNotification(`Игра "${game.name}" успешно привязана к аккаунту!`, 'success');
}

function closeFreeModal() {
    document.getElementById('editFreeModal').style.display = 'none';
}

// ============================================
// МЕНЕДЖЕР ПРОДАЖ
// ============================================

function loadGamesForManager() {
    const select = document.getElementById('managerGame');
    if (select) {
        select.innerHTML = '<option value="">Выберите игру</option>' +
            games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
    }
}

// Обновим searchByGame, чтобы можно было передать параметр
function searchByGame(silent = false) {
    const searchInput = document.getElementById('managerGameSearch');
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        if (!silent) showNotification('Введите название игры для поиска', 'warning');
        return;
    }
    
    const foundGame = games.find(game => 
        game.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!foundGame) {
        if (!silent) {
            showNotification(`Игра "${searchTerm}" не найдена`, 'error');
            
            const similarGames = games.filter(game => 
                game.name.toLowerCase().includes(searchTerm.toLowerCase().substring(0, 3))
            ).slice(0, 5);
            
            if (similarGames.length > 0) {
                const similarList = similarGames.map(game => game.name).join(', ');
                showNotification(`Возможно, вы искали: ${similarList}`, 'info');
            }
        }
        
        const statsBtn = document.getElementById('showStatsBtn');
        if (statsBtn) statsBtn.style.display = 'none';
        
        document.getElementById('searchResults').innerHTML = `
            <div class="empty">
                <h3>Игра "${searchTerm}" не найдена</h3>
            </div>
        `;
        return;
    }
    
    const gameAccounts = accounts.filter(acc => acc.gameId === foundGame.id);
    
    const statsBtn = document.getElementById('showStatsBtn');
    if (statsBtn) {
        if (gameAccounts.length > 0) {
            statsBtn.style.display = 'inline-block';
            statsBtn.textContent = `📊 Статистика (${gameAccounts.length} акк.)`;
            statsBtn.setAttribute('data-game-id', foundGame.id);
        } else {
            statsBtn.style.display = 'none';
        }
    }
    
    document.getElementById('statsSection').style.display = 'none';
    
    updateToggleButtonUI();
    displaySearchResults(gameAccounts, foundGame.name);
    searchInput.value = foundGame.name;
    
    if (gameAccounts.length === 0 && !silent) {
        showNotification(`По игре "${foundGame.name}" не найдено аккаунтов`, 'info');
    }
}

// ============================================
// ФУНКЦИЯ ПОКАЗА СТАТИСТИКИ ПО ИГРЕ
// ============================================

function showGameStats() {
    const searchInput = document.getElementById('managerGameSearch');
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showNotification('Введите название игры для просмотра статистики', 'warning');
        return;
    }
    
    // Ищем игру по названию
    const foundGame = games.find(game => 
        game.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!foundGame) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const gameAccounts = accounts.filter(acc => acc.gameId === foundGame.id);
    
    if (gameAccounts.length === 0) {
        showNotification('Нет аккаунтов для этой игры', 'info');
        return;
    }
    
    // Рассчитываем статистику
    const stats = calculateGameStats(gameAccounts);
    
    // Показываем статистику
    displayGameStats(foundGame.name, stats);
    
    // Прокручиваем к статистике
    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
        statsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Функция расчета статистики
function calculateGameStats(gameAccounts) {
    let stats = {
        totalAccounts: gameAccounts.length,
        
        // Все позиции
        totalPositions: 0,
        freePositions: 0,
        soldPositions: 0,
        
        // По типам позиций
        p2_ps4: { total: 0, free: 0, sold: 0 },
        p3_ps4: { total: 0, free: 0, sold: 0 },
        p2_ps5: { total: 0, free: 0, sold: 0 },
        p3_ps5: { total: 0, free: 0, sold: 0 },
        
        // Продажи
        totalRevenue: 0,
        avgPrice: 0,
        salesCount: 0
    };
    
    // Собираем все ID аккаунтов для быстрого поиска продаж
    const accountIds = gameAccounts.map(acc => acc.id);
    const gameSales = sales.filter(sale => accountIds.includes(sale.accountId));
    
    stats.salesCount = gameSales.length;
    stats.totalRevenue = gameSales.reduce((sum, sale) => sum + sale.price, 0);
    stats.avgPrice = stats.salesCount > 0 ? stats.totalRevenue / stats.salesCount : 0;
    
    // Рассчитываем позиции
    gameAccounts.forEach(account => {
        // P2 PS4
        const p2_ps4_count = account.positions.p2_ps4 || 0;
        stats.p2_ps4.total += p2_ps4_count;
        stats.totalPositions += p2_ps4_count;
        
        // P3 PS4
        const p3_ps4_count = account.positions.p3_ps4 || 0;
        stats.p3_ps4.total += p3_ps4_count;
        stats.totalPositions += p3_ps4_count;
        
        // P2 PS5
        const p2_ps5_count = account.positions.p2_ps5 || 0;
        stats.p2_ps5.total += p2_ps5_count;
        stats.totalPositions += p2_ps5_count;
        
        // P3 PS5
        const p3_ps5_count = account.positions.p3_ps5 || 0;
        stats.p3_ps5.total += p3_ps5_count;
        stats.totalPositions += p3_ps5_count;
    });
    
    // Рассчитываем проданные позиции по каждой категории
    gameSales.forEach(sale => {
        switch(sale.positionType) {
            case 'p2_ps4':
                stats.p2_ps4.sold++;
                stats.soldPositions++;
                break;
            case 'p3_ps4':
                stats.p3_ps4.sold++;
                stats.soldPositions++;
                break;
            case 'p2_ps5':
                stats.p2_ps5.sold++;
                stats.soldPositions++;
                break;
            case 'p3_ps5':
                stats.p3_ps5.sold++;
                stats.soldPositions++;
                break;
        }
    });
    
    // Рассчитываем свободные позиции
    stats.p2_ps4.free = stats.p2_ps4.total - stats.p2_ps4.sold;
    stats.p3_ps4.free = stats.p3_ps4.total - stats.p3_ps4.sold;
    stats.p2_ps5.free = stats.p2_ps5.total - stats.p2_ps5.sold;
    stats.p3_ps5.free = stats.p3_ps5.total - stats.p3_ps5.sold;
    
    stats.freePositions = stats.totalPositions - stats.soldPositions;
    
    return stats;
}

function displayGameStats(gameName, stats) {
    const statsSection = document.getElementById('statsSection');
    
    // Компактная версия статистики
    statsSection.style.display = 'block';
    statsSection.innerHTML = `
        <div class="stats-header">
            <h3>📊 Статистика: ${gameName}</h3>
            <button class="btn btn-small btn-secondary" onclick="hideStats()" style="margin-left: auto;">
                Скрыть статистику
            </button>
        </div>
        
        <div class="compact-stats-grid">
            <!-- Основная статистика -->
            <div class="compact-stat-card main-stat">
                <div class="compact-stat-value">${stats.totalAccounts}</div>
                <div class="compact-stat-label">Всего аккаунтов</div>
            </div>
            
            <div class="compact-stat-card main-stat">
                <div class="compact-stat-value">${stats.totalPositions}</div>
                <div class="compact-stat-label">Всего позиций</div>
            </div>
            
            <div class="compact-stat-card main-stat free-positions">
                <div class="compact-stat-value">${stats.freePositions}</div>
                <div class="compact-stat-label">Свободных позиций</div>
            </div>
            
            <div class="compact-stat-card main-stat sold-positions">
                <div class="compact-stat-value">${stats.soldPositions}</div>
                <div class="compact-stat-label">Продано позиций</div>
            </div>
        </div>
        
        <!-- Детализация по типам позиций -->
        <div class="position-stats-section">
            <h4 style="margin: 20px 0 15px 0; color: #64748b; font-size: 0.9em;">📈 Детализация по позициям:</h4>
            
            <div class="position-stats-grid">
                <!-- PS4 -->
                <div class="platform-stats">
                    <div class="platform-title">🎮 PS4</div>
                    
                    <div class="position-type-stats">
                        <div class="position-stat-item">
                            <div class="position-type-label">П2 PS4:</div>
                            <div class="position-numbers">
                                <span class="total-positions">${stats.p2_ps4.total}</span>
                                <span class="separator">/</span>
                                <span class="free-positions" style="color: #10b981;">${stats.p2_ps4.free}</span>
                                <span class="separator">/</span>
                                <span class="sold-positions" style="color: #ef4444;">${stats.p2_ps4.sold}</span>
                            </div>
                        </div>
                        
                        <div class="position-stat-item">
                            <div class="position-type-label">П3 PS4:</div>
                            <div class="position-numbers">
                                <span class="total-positions">${stats.p3_ps4.total}</span>
                                <span class="separator">/</span>
                                <span class="free-positions" style="color: #10b981;">${stats.p3_ps4.free}</span>
                                <span class="separator">/</span>
                                <span class="sold-positions" style="color: #ef4444;">${stats.p3_ps4.sold}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- PS5 -->
                <div class="platform-stats">
                    <div class="platform-title">🎮 PS5</div>
                    
                    <div class="position-type-stats">
                        <div class="position-stat-item">
                            <div class="position-type-label">П2 PS5:</div>
                            <div class="position-numbers">
                                <span class="total-positions">${stats.p2_ps5.total}</span>
                                <span class="separator">/</span>
                                <span class="free-positions" style="color: #10b981;">${stats.p2_ps5.free}</span>
                                <span class="separator">/</span>
                                <span class="sold-positions" style="color: #ef4444;">${stats.p2_ps5.sold}</span>
                            </div>
                        </div>
                        
                        <div class="position-stat-item">
                            <div class="position-type-label">П3 PS5:</div>
                            <div class="position-numbers">
                                <span class="total-positions">${stats.p3_ps5.total}</span>
                                <span class="separator">/</span>
                                <span class="free-positions" style="color: #10b981;">${stats.p3_ps5.free}</span>
                                <span class="separator">/</span>
                                <span class="sold-positions" style="color: #ef4444;">${stats.p3_ps5.sold}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Легенда -->
            <div class="stats-legend" style="
                margin-top: 15px;
                padding: 10px;
                background: #f8fafc;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                font-size: 0.8em;
                color: #64748b;
                display: flex;
                gap: 15px;
                justify-content: center;
            ">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-weight: 600; color: #1e293b;">Всего</span>
                    <span>/</span>
                    <span style="color: #10b981; font-weight: 600;">Свободно</span>
                    <span>/</span>
                    <span style="color: #ef4444; font-weight: 600;">Продано</span>
                </div>
                ${stats.salesCount > 0 ? `
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span>💰 Продаж:</span>
                        <span style="font-weight: 600;">${stats.salesCount}</span>
                        <span>•</span>
                        <span>Средняя цена:</span>
                        <span style="font-weight: 600;">${Math.round(stats.avgPrice)} ₽</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Кнопка экспорта -->
        <div style="text-align: center; margin-top: 15px;">
            <button onclick="exportGameStatsToCSV('${gameName}', stats)" class="btn btn-small btn-primary">
                📁 Экспорт статистики
            </button>
        </div>
    `;
    
    // Сохраняем текущую статистику для экспорта
    window.currentGameStats = { gameName, stats };
}

function hideStats() {
    const statsSection = document.getElementById('statsSection');
    if (statsSection) {
        statsSection.style.display = 'none';
        showNotification('Статистика скрыта', 'info');
    }
}

// Добавьте эту функцию для обработки изменений в выпадающем списке
function setupGameSelectListener() {
    const gameSelect = document.getElementById('managerGame');
    if (!gameSelect) return;
    
    gameSelect.addEventListener('change', function() {
        // При смене игры скрываем статистику
        const statsSection = document.getElementById('statsSection');
        if (statsSection) {
            statsSection.style.display = 'none';
        }
        
        // Скрываем кнопку статистики пока не нажата кнопка поиска
        const statsBtn = document.getElementById('showStatsBtn');
        if (statsBtn) {
            statsBtn.style.display = 'none';
        }
        
        // Очищаем результаты поиска
        document.getElementById('searchResults').innerHTML = '';
    });
}

function searchByLogin() {
    const loginSearch = document.getElementById('managerLogin').value.trim().toLowerCase();
    
    if (!loginSearch) {
        showNotification('Введите логин для поиска', 'warning');
        return;
    }
    
    const foundAccounts = accounts.filter(acc => 
        acc.psnLogin.toLowerCase().includes(loginSearch)
    );
    
    if (foundAccounts.length === 0) {
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('searchResults').innerHTML = `
            <div class="empty">
                <h3>Аккаунты с логином "${loginSearch}" не найдены</h3>
            </div>
        `;
        showNotification(`Аккаунты с логином "${loginSearch}" не найдены`, 'info');
        return;
    }
    
    // Скрываем кнопку статистики при поиске по логину
    const statsBtn = document.getElementById('showStatsBtn');
    if (statsBtn) {
        statsBtn.style.display = 'none';
    }
    
    // Скрываем статистику
    document.getElementById('statsSection').style.display = 'none';
    
    displaySearchResults(foundAccounts, `по логину "${loginSearch}"`);
    updateToggleButtonUI();
}

function clearSearchFields() {
    const gameSelect = document.getElementById('managerGame');
    const loginInput = document.getElementById('managerLogin');
    const gameSearchInput = document.getElementById('managerGameSearch');
    
    if (gameSelect) {
        gameSelect.selectedIndex = 0;
    }
    
    if (loginInput) {
        loginInput.value = '';
    }
    
    if (gameSearchInput) {
        gameSearchInput.value = '';
    }
    
    // Скрываем кнопку статистики
    const statsBtn = document.getElementById('showStatsBtn');
    if (statsBtn) {
        statsBtn.style.display = 'none';
    }
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
    hideToggleButton();
    showAllAccounts = false;
}

// ============================================
// СИСТЕМА ПРОДАЖ
// ============================================

function getPositionSaleInfo(accountId, positionType, positionIndex) {
    // Ищем продажу с правильными параметрами, которая НЕ пересажена
    return sales.find(sale => {
        return sale.accountId === accountId && 
               sale.positionType === positionType &&
               sale.positionIndex === positionIndex &&
               !sale.isTransplanted; // Важно! Игнорируем пересаженные
    });
}

function debugPositionSales(accountId, positionType, positionIndex) {
    console.log('🔍 Отладка продаж для позиции:', { accountId, positionType, positionIndex });
    
    const expectedId = `${accountId}_${positionType}_${positionIndex}`;
    console.log('Ожидаемый ID (без timestamp):', expectedId);
    
    const allSalesForPosition = sales.filter(sale => {
        return sale.accountId === accountId && 
               sale.positionType === positionType &&
               sale.positionIndex === positionIndex;
    });
    
    console.log('Найденные продажи:', allSalesForPosition);
    
    if (allSalesForPosition.length === 0) {
        console.log('❌ Продажи не найдены в фильтре по полям');
        
        // Ищем по ID
        const byId = sales.find(s => s.id && s.id.includes(expectedId));
        console.log('Поиск по части ID:', byId);
    }
    
    return allSalesForPosition;
}

function displaySearchResults(accountsList, gameName) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!accountsList || accountsList.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty" style="text-align: center; padding: 40px 20px; color: #64748b;">
                <div style="font-size: 3em; margin-bottom: 15px;">🔍</div>
                <h3 style="color: #64748b; margin-bottom: 10px;">
                    По запросу "${gameName}" не найдено аккаунтов
                </h3>
            </div>
        `;
        return;
    }
    
    // Функция проверки, полностью ли продан аккаунт
    function isAccountFullySold(account) {
        let totalPositions = 0;
        let soldPositions = 0;
        
        // Считаем все позиции
        ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
            const count = account.positions[posType] || 0;
            totalPositions += count;
            
            // Считаем сколько из них продано
            for (let i = 1; i <= count; i++) {
                if (getPositionSaleInfo(account.id, posType, i)) {
                    soldPositions++;
                }
            }
        });
        
        // Если есть позиции и все проданы
        return totalPositions > 0 && soldPositions === totalPositions;
    }
    
    // Фильтруем аккаунты в зависимости от настройки
    let filteredAccounts = accountsList;
    let hiddenCount = 0;
    
    if (!showAllAccounts) {
        // Скрываем полностью проданные
        filteredAccounts = accountsList.filter(account => !isAccountFullySold(account));
        hiddenCount = accountsList.length - filteredAccounts.length;
    }
    
    console.log('📊 Отображение результатов:', {
        всего: accountsList.length,
        показано: filteredAccounts.length,
        скрыто: hiddenCount,
        showAllAccounts: showAllAccounts
    });
    
    // Генерируем HTML
    let html = '';
    
    // ==== СТАРАЯ КНОПКА УДАЛЕНА ====
    // Больше не добавляем блок с кнопкой здесь
    
    // Если после фильтрации ничего не осталось
    if (filteredAccounts.length === 0) {
        html += `
            <div style="
                text-align: center;
                padding: 40px 20px;
                background: #f8fafc;
                border-radius: 10px;
                border: 1px solid #e2e8f0;
                color: #64748b;
            ">
                <div style="font-size: 3em; margin-bottom: 10px;">👻</div>
                <h3 style="color: #64748b; margin-bottom: 10px;">
                    Все доступные аккаунты проданы
                </h3>
                
                <button onclick="toggleShowAllAccounts()" 
                        style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-weight: 600;
                            margin-top: 15px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        "
                        onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                    ${showAllAccounts ? '👁️ Скрыть проданные' : '👁️‍🗨️ Показать проданные аккаунты'}
                </button>
            </div>
        `;
    } else {
        // Показываем аккаунты (код без изменений)
        html += filteredAccounts.map(account => {
            const commentsCount = account.comments ? account.comments.length : 0;
            const isSold = isAccountFullySold(account);
            
            return `
                <div class="account-simple ${isSold ? 'fully-sold' : ''}" style="
                    background: ${isSold ? '#fef2f2' : 'white'};
                    border-radius: 12px;
                    border: 1px solid ${isSold ? '#fecaca' : '#e2e8f0'};
                    margin-bottom: 15px;
                    padding: 20px;
                    width: 100%;
                    position: relative;
                    ${isSold ? 'opacity: 0.9;' : ''}
                    transition: all 0.3s ease;
                "
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'">
                    
                    ${isSold ? `
                        <div style="
                            position: absolute;
                            top: -10px;
                            right: -10px;
                            background: #dc2626;
                            color: white;
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 700;
                            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
                            z-index: 1;
                        ">
                            ПРОДАНО
                        </div>
                    ` : ''}

                    <!-- ВЕРХ: ЛОГИН КЛИКАБЕЛЬНЫЙ И КАРТИНКА -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <!-- ===== КАРТИНКА ИГРЫ ===== -->
                            ${(() => {
                                const game = games.find(g => g.id === account.gameId);
                                if (game && game.imageUrl) {
                                    return `
                                        <div style="position: relative; width: 50px; height: 50px;">
                                            <img src="${game.imageUrl}" 
                                                style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 2px solid ${isSold ? '#fecaca' : '#e2e8f0'};"
                                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                                onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
                                            <div style="
                                                width: 50px; height: 50px;
                                                background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
                                                border-radius: 8px;
                                                display: none;
                                                align-items: center;
                                                justify-content: center;
                                                color: white;
                                                font-size: 20px;
                                                position: absolute;
                                                top: 0;
                                                left: 0;
                                            ">🎮</div>
                                        </div>
                                    `;
                                } else {
                                    return `
                                        <div style="
                                            width: 50px; height: 50px;
                                            background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
                                            border-radius: 8px;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            color: white;
                                            font-size: 20px;
                                        ">🎮</div>
                                    `;
                                }
                            })()}
                            <!-- ===== КОНЕЦ КАРТИНКИ ===== -->
                            
                            <div style="
                                font-size: 1.3em;
                                font-weight: 700;
                                color: ${isSold ? '#dc2626' : '#2d3748'};
                                ${isSold ? 'text-decoration: line-through;' : ''};
                                cursor: pointer;
                                transition: all 0.2s ease;
                            "
                            onclick="openAccountEditModal(${account.id})"
                            onmouseover="this.style.color='#4361ee';"
                            onmouseout="this.style.color='${isSold ? '#dc2626' : '#2d3748'}';">
                                ${account.psnLogin}
                                <span style="font-size: 0.8em; color: #64748b; margin-left: 10px;">
                                    ${account.gameName || 'Свободный'}
                                </span>
                            </div>
                        </div>
                        
                        <!-- ПРАВАЯ ЧАСТЬ: ДАТА ДЕАКТИВАЦИИ И КОММЕНТАРИИ -->
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${account.deactivated ? `
                                <div style="
                                    background: #dc2626;
                                    color: white;
                                    padding: 6px 12px;
                                    border-radius: 20px;
                                    font-size: 12px;
                                    font-weight: 600;
                                    display: flex;
                                    align-items: center;
                                    gap: 5px;
                                ">
                                    🛑 ${account.deactivationDate || ''}
                                </div>
                            ` : ''}
                            
                            ${commentsCount > 0 ? `
                                <button onclick="showAccountComments(${account.id})" 
                                        style="
                                            background: ${isSold ? '#fecaca' : '#4361ee'};
                                            color: ${isSold ? '#dc2626' : 'white'};
                                            border: ${isSold ? '1px solid #fecaca' : 'none'};
                                            padding: 6px 12px;
                                            border-radius: 6px;
                                            font-size: 13px;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                            gap: 5px;
                                        ">
                                    💬 ${commentsCount}
                                </button>
                            ` : `
                                <button onclick="showAccountComments(${account.id})" 
                                        style="
                                            background: #f8fafc;
                                            color: #64748b;
                                            border: 1px solid #e2e8f0;
                                            padding: 6px 12px;
                                            border-radius: 6px;
                                            font-size: 13px;
                                            cursor: pointer;
                                        ">
                                    💬
                                </button>
                            `}
                        </div>
                    </div>
                    
                    <!-- ПОСАДКИ: PS4 слева, PS5 справа -->
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                    ">
                        <!-- ЛЕВАЯ ПОЛОВИНА: PS4 -->
                        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="font-weight: 700; color: #2d3748; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                                <span>🎮</span>
                                <span>PS4</span>
                            </div>
                            
                            <!-- ВСЕ ПОСАДКИ PS4 В ОДНОЙ СТРОКЕ -->
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${generateSimplePositionButtons(account, 'p2_ps4', 'П2 PS4', 'П2')}
                                
                                ${account.positions.p2_ps4 > 0 ? '<div style="margin-right: 15px;"></div>' : ''}
                                
                                ${generateSimplePositionButtons(account, 'p3_ps4', 'П3 PS4', 'П3')}
                            </div>
                        </div>
                        
                        <!-- ПРАВАЯ ПОЛОВИНА: PS5 -->
                        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="font-weight: 700; color: #2d3748; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                                <span>🎮</span>
                                <span>PS5</span>
                            </div>
                            
                            <!-- ВСЕ ПОСАДКИ PS5 В ОДНОЙ СТРОКЕ -->
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${generateSimplePositionButtons(account, 'p2_ps5', 'П2 PS5', 'П2')}
                                
                                ${account.positions.p2_ps5 > 0 ? '<div style="margin-right: 15px;"></div>' : ''}
                                
                                ${generateSimplePositionButtons(account, 'p3_ps5', 'П3 PS5', 'П3')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsContainer.innerHTML = html;
    updateToggleButtonUI();
}

// ============================================
// СИНХРОНИЗАЦИЯ МЕЖДУ ВКЛАДКАМИ ЧЕРЕЗ FIREBASE
// ============================================

// Модифицируем функцию saveToStorage для работы с Firebase
async function saveToStorageWithFirebase(dataType, data) {
    console.log(`💾 Сохранение ${dataType} в Firebase...`);
    
    // Сохраняем в локальное хранилище для быстрого доступа
    localStorage.setItem(dataType, JSON.stringify(data));
    
    // Обновляем глобальные переменные
    switch(dataType) {
        case 'games': 
            games = data; 
            break;
        case 'accounts': 
            accounts = data; 
            break;
        case 'sales': 
            sales = data; 
            break;
        case 'workers':
            // workers уже обрабатывается отдельно
            break;
        case 'gamePrices':
            // gamePrices уже обрабатывается отдельно
            break;
    }
    
    // Синхронизируем с Firebase через dataSync
    if (window.dataSync && window.dataSync.saveData) {
        try {
            const result = await window.dataSync.saveData(dataType, data);
            
            if (result.synced) {
                console.log(`✅ ${dataType} синхронизированы с Firebase`);
                
                // Отправляем уведомление через Firebase Realtime Database для других вкладок
                if (firebaseSync && firebaseSync.db) {
                    const timestamp = Date.now();
                    firebaseSync.db.ref('lastUpdate').set({
                        dataType: dataType,
                        timestamp: timestamp,
                        user: security.getCurrentUser()?.name || 'Неизвестно'
                    }).then(() => {
                        console.log(`📢 Уведомление о обновлении ${dataType} отправлено`);
                    });
                }
                
                if (typeof showNotification === 'function') {
                    showNotification(`${dataType} сохранены и синхронизированы`, 'success', 1500);
                }
            } else if (result.local) {
                console.log(`⚠️ ${dataType} сохранены локально (Firebase недоступен)`);
                showNotification(`${dataType} сохранены локально`, 'warning');
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ Ошибка синхронизации ${dataType}:`, error);
            
            // Сохраняем только локально при ошибке
            localStorage.setItem(dataType, JSON.stringify(data));
            
            return { success: true, local: true, error: error.message };
        }
    }
    
    // Fallback - только локальное сохранение
    return { success: true, local: true };
}

// Переопределяем старую функцию saveToStorage
window.saveToStorage = saveToStorageWithFirebase;

// Настраиваем слушатель Firebase для обновлений в реальном времени
function setupFirebaseUpdateListener() {
    if (!firebaseSync || !firebaseSync.db) return;
    
    // Слушаем общие обновления
    firebaseSync.db.ref('lastUpdate').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const update = snapshot.val();
            console.log('📢 Получено уведомление об обновлении:', update);
            
            // Если это не наше собственное обновление
            if (update.user !== (security.getCurrentUser()?.name || 'Неизвестно')) {
                // Обновляем данные указанного типа
                refreshDataFromFirebase(update.dataType);
            }
        }
    });
}

// Функция для обновления данных из Firebase
async function refreshDataFromFirebase(dataType) {
    if (!window.dataSync || !window.dataSync.loadData) return;
    
    try {
        console.log(`🔄 Обновляем ${dataType} из Firebase...`);
        
        const freshData = await window.dataSync.loadData(dataType);
        
        switch(dataType) {
            case 'games':
                games = freshData;
                localStorage.setItem('games', JSON.stringify(games));
                
                // Обновляем UI игр
                if (typeof displayGames === 'function' && 
                    window.location.pathname.includes('games.html')) {
                    displayGames();
                }
                
                // Обновляем все селекты с играми
                if (typeof loadGamesForSelect === 'function' && 
                    window.location.pathname.includes('add-account.html')) {
                    loadGamesForSelect();
                }
                
                if (typeof loadGamesForFilter === 'function' && 
                    window.location.pathname.includes('accounts.html')) {
                    loadGamesForFilter();
                }
                
                if (typeof loadGamesForManager === 'function' && 
                    window.location.pathname.includes('manager.html')) {
                    loadGamesForManager();
                }
                break;
                
            case 'accounts':
                accounts = freshData;
                localStorage.setItem('accounts', JSON.stringify(accounts));
                
                // Обновляем UI аккаунтов
                if (typeof displayAccounts === 'function' && 
                    window.location.pathname.includes('accounts.html')) {
                    displayAccounts();
                }
                
                if (typeof displayFreeAccounts === 'function' && 
                    window.location.pathname.includes('free-accounts.html')) {
                    displayFreeAccounts();
                }
                
                // Обновляем результаты поиска в менеджере
                if (typeof displaySearchResults === 'function' && 
                    window.location.pathname.includes('manager.html')) {
                    const searchInput = document.getElementById('managerGameSearch');
                    if (searchInput && searchInput.value.trim()) {
                        searchByGame();
                    }
                }
                break;
                
            case 'sales':
                sales = freshData;
                localStorage.setItem('sales', JSON.stringify(sales));
                
                // Обновляем отчеты если открыты
                if (window.location.pathname.includes('reports.html')) {
                    setTimeout(() => {
                        if (typeof generateReport === 'function') {
                            generateReport();
                        }
                    }, 500);
                }
                break;
        }
        
        console.log(`✅ Данные "${dataType}" обновлены из Firebase`);
        
    } catch (error) {
        console.error(`❌ Ошибка обновления "${dataType}":`, error);
    }
}

// Запускаем слушатель при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupFirebaseUpdateListener();
    }, 2000);
});

// Модифицируем функцию saveAccountChanges для работы с Firebase
async function saveAccountChanges() {
    const accountId = parseInt(document.getElementById('editAccountId').value);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) return;
    
    const gameSelect = document.getElementById('editGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    if (!game && gameId !== 0) {
        showNotification('Выберите игру или "Свободный"', 'warning');
        return;
    }
    
    const psnLogin = document.getElementById('editPsnLogin').value.trim();
    if (!psnLogin) {
        showNotification('Введите логин PSN', 'warning');
        return;
    }
    
    // Проверяем уникальность логина (кроме текущего аккаунта)
    const duplicate = accounts.find((acc, index) => 
        index !== accountIndex && 
        acc.psnLogin.toLowerCase() === psnLogin.toLowerCase()
    );
    
    if (duplicate) {
        showNotification(`Логин "${psnLogin}" уже существует у другого аккаунта!`, 'error');
        return;
    }
    
    // Сохраняем оригинальный аккаунт для отслеживания изменений
    const originalAccount = accounts[accountIndex];
    
    // Обновляем аккаунт
    accounts[accountIndex] = {
        ...originalAccount,
        gameId: gameId,
        gameName: game ? game.name : 'Свободный',
        purchaseAmount: parseFloat(document.getElementById('editPurchaseAmount').value) || 0,
        psnLogin: psnLogin,
        psnPassword: document.getElementById('editPsnPassword').value,
        email: document.getElementById('editEmail').value.trim(),
        emailPassword: document.getElementById('editEmailPassword').value,
        backupEmail: document.getElementById('editBackupEmail').value.trim(),
        birthDate: document.getElementById('editBirthDate').value.trim(),
        psnCodes: document.getElementById('editPsnCodes').value.trim(),
        psnAuthenticator: document.getElementById('editPsnAuthenticator').value.trim(),
        positions: {
            p2_ps4: parseInt(document.getElementById('editP2_ps4').value) || 0,
            p3_ps4: parseInt(document.getElementById('editP3_ps4').value) || 0,
            p2_ps5: parseInt(document.getElementById('editP2_ps5').value) || 0,
            p3_ps5: parseInt(document.getElementById('editP3_ps5').value) || 0
        },
        lastModified: new Date().toISOString(),
        modifiedBy: security.getCurrentUser()?.name || 'Неизвестно',
        modifiedByUsername: security.getCurrentUser()?.username || 'unknown'
    };
    
    // Сохраняем с синхронизацией через Firebase
    const result = await saveToStorage('accounts', accounts);
    
    if (result.synced) {
        // Отправляем уведомление о конкретном изменении
        if (firebaseSync && firebaseSync.db) {
            const changes = {
                accountId: accountId,
                accountLogin: psnLogin,
                modifiedBy: security.getCurrentUser()?.name || 'Неизвестно',
                timestamp: new Date().toISOString(),
                changes: {}
            };
            
            // Отмечаем какие поля изменились
            if (originalAccount.gameName !== accounts[accountIndex].gameName) {
                changes.changes.gameName = {
                    from: originalAccount.gameName,
                    to: accounts[accountIndex].gameName
                };
            }
            
            if (originalAccount.psnLogin !== psnLogin) {
                changes.changes.psnLogin = {
                    from: originalAccount.psnLogin,
                    to: psnLogin
                };
            }
            
            // Логируем изменение
            firebaseSync.db.ref('accountChanges').push(changes);
        }
    }
    
    closeAnyModal('editModal');
    
    // Обновляем отображение на обеих страницах
    if (window.location.pathname.includes('accounts.html')) {
        displayAccounts();
    } else if (window.location.pathname.includes('manager.html')) {
        // Обновляем результаты поиска если что-то искали
        const searchInput = document.getElementById('managerGameSearch');
        if (searchInput && searchInput.value.trim()) {
            searchByGame();
        }
    } else if (window.location.pathname.includes('free-accounts.html')) {
        displayFreeAccounts();
    }
    
    showNotification('Изменения сохранены и синхронизированы! ✅', 'success');
}

function toggleShowAllAccounts() {
    // Переключаем флаг
    showAllAccounts = !showAllAccounts;
    
    console.log('🔄 Переключение показа аккаунтов:', {
        showAllAccounts: showAllAccounts,
        текущая_страница: window.location.pathname
    });
    
    // Обновляем отображение ВСЕХ аккаунтов текущей игры
    const searchInput = document.getElementById('managerGameSearch');
    const loginInput = document.getElementById('managerLogin');
    
    let accountsToShow = [];
    let searchTitle = '';
    
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim();
        const foundGame = games.find(game => 
            game.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (foundGame) {
            accountsToShow = accounts.filter(acc => acc.gameId === foundGame.id);
            searchTitle = foundGame.name;
        }
    } else if (loginInput && loginInput.value.trim()) {
        const loginSearch = loginInput.value.trim().toLowerCase();
        accountsToShow = accounts.filter(acc => 
            acc.psnLogin.toLowerCase().includes(loginSearch)
        );
        searchTitle = `по логину "${loginSearch}"`;
    } else {
        accountsToShow = accounts;
        searchTitle = 'все аккаунты';
        if (searchInput) {
            searchInput.value = 'Все аккаунты';
        }
    }
    
    console.log(`📊 Показать: ${accountsToShow.length} аккаунтов`);
    displaySearchResults(accountsToShow, searchTitle);
    
    // ===== ВАЖНО: Кнопка обновится внутри displaySearchResults, так что здесь не нужно =====
    
    showNotification(
        showAllAccounts ? 'Показаны все аккаунты' : 'Скрыты проданные аккаунты',
        'info'
    );
}

function generateSimplePositionButtons(account, positionType, positionName, positionLabel) {
    const positionCount = account.positions[positionType] || 0;
    if (positionCount === 0) return '';
    
    const buttons = [];
    for (let i = 1; i <= positionCount; i++) {
        const saleInfo = getPositionSaleInfo(account.id, positionType, i);
        const isSold = !!saleInfo;
        
        // Форматируем дату продажи в формат ДД/ММ/ГГ
        let saleDate = '';
        let managerInfo = '';
        let marketplaceBadge = '';
        
        if (saleInfo) {
            // Дата
            if (saleInfo.datetime) {
                try {
                    const dateObj = new Date(saleInfo.datetime);
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = String(dateObj.getFullYear()).slice(-2);
                    saleDate = `${day}/${month}/${year}`;
                } catch (e) {
                    console.warn('Ошибка форматирования даты:', saleInfo.datetime);
                }
            }
            
            // Информация о менеджере
            if (saleInfo.soldByName) {
                const managerIcon = saleInfo.managerRole === 'admin' ? '👑' : '👷';
                managerInfo = `
                    <div style="
                        font-size: 9px;
                        color: ${saleInfo.managerRole === 'admin' ? '#f72585' : '#4361ee'};
                        font-weight: 700;
                        margin-top: 2px;
                    ">
                        ${saleInfo.soldByName} ${managerIcon}
                    </div>
                `;
            }
            
            // Площадка продажи
            if (saleInfo.marketplace) {
                const marketplaceColors = {
                    'telegram': '#0088cc',
                    'funpay': '#ff6b00',
                    'avito': '#006cff'
                };
                
                const marketplaceNames = {
                    'telegram': 'TG',
                    'funpay': 'FP',
                    'avito': 'AV'
                }; 
                
                const color = marketplaceColors[saleInfo.marketplace] || '#64748b';
                const name = marketplaceNames[saleInfo.marketplace] || saleInfo.marketplace.substring(0, 2).toUpperCase();
                
                marketplaceBadge = `
                    <div style="
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        width: 18px;
                        height: 18px;
                        background: ${color};
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 9px;
                        font-weight: 700;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    ">
                        ${name}
                    </div>
                `;
            }
        }
        
       buttons.push(`
    <div style="
        display: inline-block;
        text-align: center;
        margin-right: 8px;
        margin-bottom: 8px;
        position: relative;
    ">
        <button onclick="handlePositionClick(${account.id}, '${positionType}', '${positionName}', ${i})"
                style="
                    width: 40px;
                    height: 40px;
                    background: ${isSold ? '#ef4444' : '#3b82f6'};
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    margin-bottom: 2px;
                    position: relative;
                "
                onmouseover="this.style.opacity='0.9'; this.style.transform='scale(1.05)'"
                onmouseout="this.style.opacity='1'; this.style.transform='scale(1)'"
                title="${isSold ? 
                    `Продано: ${saleDate || 'без даты'}\nПлощадка: ${saleInfo.marketplace || 'не указана'}\nМенеджер: ${saleInfo.soldByName || 'неизвестно'}` : 
                    'Свободно'}">
            <div>${i}</div>
            <div style="font-size: 9px;">${positionLabel}</div>
            ${marketplaceBadge}
        </button>
        
        ${isSold && saleDate ? `
            <div style="
                font-size: 8px;
                color: #ef4444;
                font-weight: 700;
                white-space: nowrap;
                letter-spacing: -0.2px;
            ">
                ${saleDate}
            </div>
            ${managerInfo}
        ` : ''}
    </div>
`);
    }
    
    return buttons.join('');
}

// В функции displayReportResults добавим статистику по площадкам:
function getMarketplaceStats(salesData) {
    const marketplaceStats = {};
    
    salesData.forEach(sale => {
        const marketplace = sale.marketplace || 'other';
        if (!marketplaceStats[marketplace]) {
            marketplaceStats[marketplace] = {
                sales: 0,
                revenue: 0,
                avgPrice: 0
            };
        }
        marketplaceStats[marketplace].sales += 1;
        marketplaceStats[marketplace].revenue += sale.price;
    });
    
    // Рассчитываем средний чек
    Object.keys(marketplaceStats).forEach(marketplace => {
        const stats = marketplaceStats[marketplace];
        stats.avgPrice = stats.sales > 0 ? stats.revenue / stats.sales : 0;
    });
    
    return marketplaceStats;
}

// Добавим эту статистику в отчеты
function displayMarketplaceStats(stats) {
    const sortedMarketplaces = Object.entries(stats)
        .sort(([,a], [,b]) => b.revenue - a.revenue);
    
    if (sortedMarketplaces.length === 0) {
        return '<div class="empty">Нет данных по площадкам</div>';
    }
    
    return `
        <div class="section">
            <h3>🏪 Статистика по площадкам продаж</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                ${sortedMarketplaces.map(([marketplace, stat]) => {
                    const marketplaceName = getMarketplaceName(marketplace);
                    const marketplaceColor = marketplace === 'telegram' ? '#0088cc' :
                                            marketplace === 'funpay' ? '#ff6b00' :
                                            marketplace === 'avito' ? '#006cff' :
                                            marketplace === 'vk' ? '#4c75a3' : '#64748b';
                    
                    return `
                        <div style="
                            background: white;
                            padding: 20px;
                            border-radius: 10px;
                            border: 1px solid #e2e8f0;
                            text-align: center;
                            border-top: 4px solid ${marketplaceColor};
                        ">
                            <div style="font-size: 1.1em; font-weight: 700; color: #2d3748; margin-bottom: 10px;">
                                ${marketplaceName}
                            </div>
                            <div style="font-size: 1.8em; font-weight: 800; color: ${marketplaceColor}; margin: 10px 0;">
                                ${stat.sales}
                            </div>
                            <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">
                                продаж
                            </div>
                            <div style="font-size: 1.4em; font-weight: 700; color: #10b981; margin: 10px 0;">
                                ${stat.revenue.toLocaleString('ru-RU')} ₽
                            </div>
                            <div style="color: #64748b; font-size: 0.85em;">
                                Средний чек: ${stat.avgPrice.toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Функция для получения названия площадки
function getMarketplaceName(marketplace) {
    const names = {
        'telegram': 'Telegram 📱',
        'funpay': 'Funpay 🕹️',
        'avito': 'Avito 🏪',
    };
    return names[marketplace] || marketplace;
}

// Функция для получения списка работников для селекта
function getWorkersOptions(sale) {
    const workers = JSON.parse(localStorage.getItem('workers')) || [];
    const currentUser = security.getCurrentUser();
    
    let options = '';
    
    // Добавляем всех активных работников
    workers.filter(w => w.active !== false).forEach(worker => {
        const selected = sale.soldBy === worker.username ? 'selected' : '';
        const adminBadge = worker.role === 'admin' ? ' 👑' : ' 👷';
        options += `<option value="${worker.username}" ${selected}>
            ${worker.name}${adminBadge}
        </option>`;
    });
    
    // Добавляем текущего пользователя если он не в списке работников
    if (currentUser && !workers.find(w => w.username === currentUser.username)) {
        const selected = sale.soldBy === currentUser.username ? 'selected' : '';
        const adminBadge = currentUser.role === 'admin' ? ' 👑' : ' 👷';
        options += `<option value="${currentUser.username}" ${selected}>
            ${currentUser.name} (текущий)${adminBadge}
        </option>`;
    }
    
    return options;
}

// Вспомогательная функция для генерации кнопок позиций
function generatePositionButtons(account, positionType, positionName, positionLabel) {
    const positionCount = account.positions[positionType] || 0;
    
    if (positionCount === 0) return '';
    
    const positionsHTML = Array(positionCount).fill().map((_, index) => {
        const positionNumber = index + 1;
        const saleInfo = getPositionSaleInfo(account.id, positionType, positionNumber);
        const isSold = !!saleInfo;
        
        let displayDate = '';
        if (saleInfo) {
            if (saleInfo.datetime) {
                displayDate = saleInfo.datetime;
            } else if (saleInfo.date) {
                displayDate = saleInfo.date + (saleInfo.time ? ` ${saleInfo.time}` : '');
            }
        }
        
        let managerHTML = '';
        if (saleInfo && saleInfo.soldByName) {
            const managerIcon = saleInfo.managerRole === 'admin' ? '👑' : '👷';
            managerHTML = `
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                    ${saleInfo.soldByName} ${managerIcon}
                </div>
            `;
        }
        
        const soldClass = isSold ? 'sold' : '';
        const adminClass = (saleInfo && saleInfo.managerRole === 'admin') ? 'admin-sold' : '';
        
        return `
            <div class="position-single ${soldClass} ${adminClass}" 
                 onclick="handlePositionClick(${account.id}, '${positionType}', '${positionName}', ${positionNumber})"
                 title="${isSold ? `Продано: ${displayDate}` : 'Свободно'}"
                 style="
                    min-width: 50px;
                    height: 50px;
                    background: ${isSold ? 
                        (saleInfo.managerRole === 'admin' ? 
                            'linear-gradient(135deg, #f72585 0%, #e63946 100%)' : 
                            'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)'
                        ) : '#f1f5f9'};
                    color: ${isSold ? 'white' : '#64748b'};
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: 600;
                    font-size: 16px;
                    position: relative;
                 ">
                <div>${positionNumber}</div>
                <div style="font-size: 11px; margin-top: 2px;">${positionLabel}</div>
                
                ${isSold ? `
                    <div style="
                        position: absolute;
                        top: -5px;
                        right: -5px;
                        background: ${saleInfo.managerRole === 'admin' ? '#f72585' : '#4361ee'};
                        color: white;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                    ">
                        ${saleInfo.managerRole === 'admin' ? '👑' : '💰'}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    return positionsHTML;
}

function handlePositionClick(accountId, positionType, positionName, positionIndex) {
    const existingSale = getPositionSaleInfo(accountId, positionType, positionIndex);
    if (existingSale) {
        showSaleDetails(existingSale);
    } else {
        openSaleModal(accountId, positionType, positionName, positionIndex);
    }
}

function openSaleModal(accountId, positionType, positionName, positionIndex) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    window.currentSaleAccount = accountId;
    window.currentSalePosition = positionType;
    window.currentSalePositionIndex = positionIndex;
    
    // ==== ИСПРАВЛЕНИЕ: Используем московское время ====
    const moscowTime = getSimpleMoscowDateTime();
    const currentDate = moscowTime.date;
    const currentTime = moscowTime.time;
    
    const currentUser = security.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    const modalContent = document.getElementById('saleModalContent');
    modalContent.innerHTML = `
        <h2 style="margin-bottom: 25px; color: #2d3748; text-align: center;">
            <span style="display: inline-block; margin-right: 10px;">💰</span>
            Оформить продажу
        </h2>
        
        <div class="sale-info" style="
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 25px;
            border: 1px solid #e2e8f0;
        ">
            <div class="sale-info-item" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong style="color: #64748b;">Аккаунт:</strong>
                <span style="font-weight: 600; color: #1e293b;">${account.psnLogin}</span>
            </div>
            <div class="sale-info-item" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong style="color: #64748b;">Игра:</strong>
                <span style="font-weight: 600; color: #1e293b;">${account.gameName}</span>
            </div>
            <div class="sale-info-item" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong style="color: #64748b;">Позиция:</strong>
                <span style="
                    font-weight: 600; 
                    color: white;
                    background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
                    padding: 6px 15px;
                    border-radius: 20px;
                    font-size: 0.9em;
                ">${positionName}</span>
            </div>
            <div class="sale-info-item" style="display: flex; justify-content: space-between;">
                <strong style="color: #64748b;">Менеджер:</strong>
                <span style="font-weight: 600; color: #1e293b;">
                    ${currentUser ? currentUser.name : 'Неизвестно'}
                    ${currentUser && currentUser.role === 'admin' ? ' 👑' : ' 👷'}
                </span>
            </div>
            <!-- Добавим индикатор часового пояса -->
            <div style="margin-top: 10px; font-size: 0.85em; color: #10b981; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
                ⏰ Московское время (UTC+3)
            </div>
        </div>
        
        <div class="sale-form" style="display: grid; gap: 20px;">
            <div>
                <label for="salePrice" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                ">Цена продажи (₽):</label>
                <input type="number" id="salePrice" class="sale-input" 
                       placeholder="Введите цену" required 
                       style="font-size: 18px; font-weight: 600; text-align: center; width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;"
                       oninput="updateCommission()">
            </div>
            
            <div>
                <label for="saleMarketplace" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                ">Площадка продажи:</label>
                <select id="saleMarketplace" class="sale-input" required onchange="updateCommission()"
                        style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;">
                    <option value="funpay" selected>Funpay (комиссия 3%)</option>
                    <option value="telegram">Telegram (без комиссии)</option>
                    <option value="avito">Avito (без комиссии)</option>
                </select>
            </div>
            
            <div id="commissionInfo" style="
                display: none;
                background: #fef3c7;
                padding: 15px;
                border-radius: 10px;
                border: 1px solid #fbbf24;
                margin-bottom: 15px;
                transition: all 0.3s ease;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #92400e;">💰 Комиссия Funpay (3%):</strong>
                    <span id="commissionAmount" style="font-weight: 700; color: #dc2626;">0 ₽</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #92400e;">✅ Сумма к получению (после комиссии):</strong>
                    <span id="finalAmount" style="font-weight: 700; color: #16a34a; font-size: 1.1em;">0 ₽</span>
                </div>
                <div style="margin-top: 8px; font-size: 0.85em; color: #92400e;">
                    <small>Комиссия вычитается автоматически и записывается в базу</small>
                </div>
            </div>
            
            <div class="datetime-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label for="saleDate" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #2d3748;
                    ">Дата продажи:</label>
                    <input type="date" id="saleDate" class="sale-input" value="${currentDate}"
                           style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
                <div>
                    <label for="saleTime" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #2d3748;
                    ">Время продажи:</label>
                    <input type="time" id="saleTime" class="sale-input" value="${currentTime}"
                           style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                </div>
            </div>
            
            <div>
                <label for="saleNotes" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                ">Примечания:</label>
                <input type="text" id="saleNotes" class="sale-input" 
                       placeholder="Дополнительная информация (необязательно)"
                       style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
            </div>
        </div>
        
        <div class="sale-buttons" style="
            display: flex;
            gap: 15px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        ">
            <button class="btn btn-secondary" onclick="closeSaleModal()" 
                    style="flex: 1; padding: 14px; background: #64748b; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="confirmSaleAndShowData()"
                    style="flex: 2; padding: 14px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                <span style="margin-right: 8px;">✅</span>
                Подтвердить продажу
            </button>
        </div>
    `;
    
    openModal('saleModal');
    
    // Автофокус на поле цены
    setTimeout(() => {
        const priceInput = document.getElementById('salePrice');
        if (priceInput) priceInput.focus();
    }, 100);
}

async function confirmSaleAndShowData() {
    const salePrice = document.getElementById('salePrice').value;
    const marketplace = document.getElementById('saleMarketplace').value;
    const saleDate = document.getElementById('saleDate').value;
    const saleTime = document.getElementById('saleTime').value;
    const saleNotes = document.getElementById('saleNotes').value;
    
    if (!salePrice) {
        showNotification('Введите цену продажи', 'warning');
        return;
    }
    
    let price = parseFloat(salePrice);
    
    // РАСЧЕТ КОМИССИИ ТОЛЬКО ДЛЯ НОВЫХ ПРОДАЖ
    let finalPrice = price;
    let commissionData = null;
    
    if (marketplace === 'funpay') {
        commissionData = calculateFPCommission(price);
        finalPrice = commissionData.final;
        console.log(`💰 Funpay комиссия: ${price} - ${commissionData.commission} = ${finalPrice}`);
    }
    
    // ==== ИСПРАВЛЕНИЕ: Используем московское время для сохранения ====
    let saleDateTime;
    let timestamp;
    
    if (saleDate && saleTime) {
        // Если дата и время выбраны вручную, создаем объект с учетом московского времени
        const [year, month, day] = saleDate.split('-').map(Number);
        const [hours, minutes] = saleTime.split(':').map(Number);
        
        // Создаем дату в московском времени
        const moscowDate = new Date(Date.UTC(year, month - 1, day, hours - 3, minutes));
        timestamp = moscowDate.getTime();
        saleDateTime = `${saleDate} ${saleTime}`;
    } else {
        // Если не выбраны, используем текущее московское время
        const moscowTime = getSimpleMoscowDateTime();
        saleDateTime = moscowTime.datetime;
        timestamp = moscowTime.timestamp;
    }
    
    const accountIndex = accounts.findIndex(acc => acc.id === window.currentSaleAccount);
    if (accountIndex === -1) {
        showNotification('Аккаунт не найден', 'error');
        return;
    }
    
    // ГЕНЕРАЦИЯ УНИКАЛЬНОГО ID С ТАЙМСТЭМПОМ
    const positionId = `${window.currentSaleAccount}_${window.currentSalePosition}_${window.currentSalePositionIndex}_${timestamp}`;
    
    const currentUser = security.getCurrentUser();
    
    // СОЗДАЕМ ЗАПИСЬ О ПРОДАЖЕ
    const newSale = {
        id: positionId,
        accountId: window.currentSaleAccount,
        accountLogin: accounts[accountIndex].psnLogin,
        gameName: accounts[accountIndex].gameName,
        positionType: window.currentSalePosition,
        positionName: getPositionName(window.currentSalePosition),
        price: finalPrice,
        originalPrice: marketplace === 'funpay' ? price : null,
        commission: marketplace === 'funpay' ? commissionData?.commission || 0 : 0,
        commissionPercent: marketplace === 'funpay' ? 3 : 0,
        date: saleDate || new Date(timestamp).toISOString().split('T')[0],
        time: saleTime || new Date(timestamp).toTimeString().slice(0, 5),
        datetime: saleDateTime,
        notes: saleNotes,
        timestamp: timestamp,
        createdTimestamp: timestamp,
        sold: true,
        positionIndex: window.currentSalePositionIndex,
        soldBy: currentUser ? currentUser.username : 'unknown',
        soldByName: currentUser ? currentUser.name : 'Неизвестно',
        managerRole: currentUser ? currentUser.role : 'unknown',
        marketplace: marketplace || 'telegram',
        commissionApplied: marketplace === 'funpay',
        // Добавляем информацию о часовом поясе
        timezone: 'Europe/Moscow',
        timezoneOffset: '+03:00'
    };
    
    console.log('💾 Создана новая продажа:', newSale);
    console.log('⏰ Время:', saleDateTime);
    
    try {
        // Шаг 1: Добавляем в локальный массив
        sales.push(newSale);
        console.log('📱 Добавлено в локальный массив. Всего продаж:', sales.length);
        
        // Шаг 2: Сохраняем локально
        localStorage.setItem('sales', JSON.stringify(sales));
        console.log('💾 Сохранено в localStorage');
        
        // Шаг 3: Пытаемся синхронизировать с Firebase
        if (window.dataSync && window.dataSync.saveSale) {
            console.log('🔄 Использую dataSync.saveSale...');
            const result = await window.dataSync.saveSale(newSale);
            
            if (result.synced) {
                console.log('✅ Продажа синхронизирована через dataSync');
                showNotification('✅ Продажа сохранена и синхронизирована!', 'success');
            } else {
                console.log('⚠️ dataSync сохранил локально:', result);
                showNotification('✅ Продажа сохранена локально', 'warning');
            }
        } 
        else if (firebase && firebase.database) {
            console.log('🔥 Записываю в Firebase напрямую...');
            const db = firebase.database();
            
            const saleRef = db.ref('sales').child(positionId);
            await saleRef.set(newSale);
            
            console.log('✅ Продажа записана в Firebase с ID:', positionId);
            showNotification('✅ Продажа сохранена в облаке!', 'success');
        }
        else {
            console.log('📱 Firebase недоступен, только локальное сохранение');
            showNotification('✅ Продажа сохранена локально', 'warning');
        }
        
        // Шаг 4: Обновляем отображение
        refreshSearchResultsAfterSaleUpdate();
        
        // Шаг 5: Показываем данные клиенту
        showAccountDataAfterSale(window.currentSaleAccount);
        
    } catch (error) {
        console.error('❌ Критическая ошибка при сохранении продажи:', error);
        showNotification('❌ Ошибка при сохранении продажи. Проверьте консоль.', 'error');
        
        // Сохраняем хотя бы локально при ошибке
        try {
            localStorage.setItem('sales', JSON.stringify(sales));
            showNotification('✅ Продажа сохранена локально (ошибка синхронизации)', 'warning');
        } catch (localError) {
            console.error('❌ Ошибка локального сохранения:', localError);
            showNotification('❌ Не удалось сохранить продажу', 'error');
        }
    }
}

// Добавь в script.js
function logSaleOperation(operation, sale, success, error = null) {
    const log = {
        timestamp: new Date().toISOString(),
        operation: operation,
        saleId: sale.id,
        accountId: sale.accountId,
        accountLogin: sale.accountLogin,
        price: sale.price,
        user: security.getCurrentUser()?.username || 'unknown',
        success: success,
        error: error
    };
    
    console.log('📝 Лог продажи:', log);
    
    // Сохраняем лог в localStorage
    try {
        const logs = JSON.parse(localStorage.getItem('saleLogs') || '[]');
        logs.push(log);
        localStorage.setItem('saleLogs', JSON.stringify(logs.slice(-100))); // Храним последние 100 записей
    } catch (e) {
        console.error('Ошибка сохранения лога:', e);
    }
}

// Добавь в script.js
function validateAndFixSalesData() {
    console.log('🔍 Проверка целостности данных продаж...');
    
    const originalLength = sales.length;
    
    // 1. Удаляем дубликаты по ID
    const uniqueSales = [];
    const seenIds = new Set();
    
    sales.forEach(sale => {
        if (sale && sale.id && !seenIds.has(sale.id)) {
            seenIds.add(sale.id);
            uniqueSales.push(sale);
        } else if (sale && !sale.id) {
            // Восстанавливаем ID для продаж без него
            const newId = `${sale.accountId}_${sale.positionType}_${sale.positionIndex}_${Date.now()}`;
            sale.id = newId;
            uniqueSales.push(sale);
            console.log('🔄 Восстановлен ID для продажи:', sale);
        }
    });
    
    // 2. Проверяем обязательные поля
    const validSales = uniqueSales.filter(sale => {
        return sale && 
               sale.id && 
               sale.accountId && 
               sale.price !== undefined &&
               sale.timestamp;
    });
    
    // 3. Сортируем по времени
    validSales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 4. Сохраняем если есть изменения
    if (validSales.length !== originalLength) {
        console.log(`🔄 Исправлены данные: было ${originalLength}, стало ${validSales.length}`);
        sales = validSales;
        localStorage.setItem('sales', JSON.stringify(sales));
        
        // Показываем уведомление если много ошибок
        const lostCount = originalLength - validSales.length;
        if (lostCount > 0) {
            showNotification(`Обнаружено ${lostCount} повреждённых записей продаж`, 'warning');
        }
    }
    
    return validSales.length;
}

// Вызывай при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        validateAndFixSalesData();
    }, 2000);
});

// В firebase.js или в script.js
function setupSalesSyncMonitor() {
    if (!firebase || !firebase.database) return;
    
    const db = firebase.database();
    
    // Мониторим изменения в продажах
    db.ref('sales').on('value', (snapshot) => {
        const firebaseSales = snapshot.val() || {};
        const firebaseCount = Object.keys(firebaseSales).length;
        const localCount = sales.length;
        
        console.log(`📊 Синхронизация: Firebase=${firebaseCount}, Локально=${localCount}`);
        
        if (Math.abs(firebaseCount - localCount) > 5) {
            console.warn('⚠️ Большое расхождение в данных продаж!');
            
            // Загружаем данные из Firebase
            const firebaseArray = Object.values(firebaseSales);
            
            // Синхронизируем
            sales = firebaseArray;
            localStorage.setItem('sales', JSON.stringify(sales));
            
            showNotification('Данные продаж синхронизированы с облаком 🔄', 'info');
            
            // Обновляем отображение
            if (typeof refreshSearchResultsAfterSaleUpdate === 'function') {
                refreshSearchResultsAfterSaleUpdate();
            }
        }
    });
}

function getPositionName(positionType) {
    const names = {
        'p2_ps4': 'П2 PS4',
        'p3_ps4': 'П3 PS4', 
        'p2_ps5': 'П2 PS5',
        'p3_ps5': 'П3 PS5'
    };
    return names[positionType] || positionType;
}


// ============================================
// ПОКАЗ ДАННЫХ ПОСЛЕ ПРОДАЖИ (ТОЛЬКО ПРАВИЛА ДЛЯ ВЫБРАННОЙ ПОЗИЦИИ)
// ============================================
function showAccountDataAfterSale(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        console.error('❌ Аккаунт не найден');
        return;
    }

    // Получаем данные о последней проданной позиции
    const lastSale = sales
        .filter(s => s.accountId === accountId)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

    if (!lastSale) {
        console.error('❌ Не найдена продажа для аккаунта', accountId);
        return;
    }

    const marketplace = lastSale.marketplace;
    const positionType = lastSale.positionType;
    const isP2 = positionType.includes('p2');

    // --- ТЕКСТЫ ДЛЯ ПЛАШЕК (Русский) ---
    const rulesP2_RU = `❗️ Чтобы гарантия на игру сохранялась — при любых ошибках пишем только в чат, где была куплена игра.
Правила пользования игрой (П2):
— Данные пользователя не менять: пароль, аутентификатор, номер телефона.
— Играем только на той консоли, для которой была приобретена игра.
— Одна игра — один пользователь: не покупаем игры или подписки на выданном пользователе.
— Используем только одну личную консоль: добавлять игру на другие устройства запрещено.
— Включать активацию для PS4 или общий доступ для PS5 нельзя, вы играете только с выданных данных с включенным интернетом.`;

    const rulesP3_RU = `❗️ Чтобы гарантия на игру сохранялась — при любых ошибках пишем только в чат, где была куплена игра.
Правила пользования выданной игрой с Активацией / Общим доступом (П3):
— Данные пользователя не менять: пароль, аутентификатор, номер телефона.
— Одна игра — один пользователь: не покупаем игры или подписки на выданные данные.
— Позиция с Активацией / Общим доступом — играем только с вашего личного пользователя. На выданном пользователе заходим только для настройки.
— Пользователя нельзя добавлять на несколько консолей. Используем только одну личную консоль.
— Если на игре появился “замочек”, зайдите на пользователя с игрой и:
• на PS4 — активируйте как основную систему,
• на PS5 — включите общий доступ к консоли.
— Играем только на той консоли, для которой была приобретена игра. Купить игру для PS4 и играть на PS5 — это потеря гарантии.
— При несоблюдении правил гарантии мы имеем право отобрать пользователя без возврата денег.`;

    const review_RU = `🙏 Мы будем благодарны за ваш отзыв — он очень помогает нам развиваться!
🎮 Приятной игры!

📝 Отзывы: https://t.me/pshubshoptg/29
📌 Актуальные цены на игры: @pshubshoptg`;

    // --- ТЕКСТЫ ДЛЯ ПЛАШЕК (Английский) ---
    const rulesP2_EN = `❗️ To maintain the game warranty, please only write to the chat where the game was purchased if you encounter any errors.
Rules for using the game (P2):
— Do not change your account details: password, authenticator, phone number.
— Only play on the console for which the game was purchased.
— One game — one user: do not purchase games or subscriptions on the account provided.
— Use only one personal console: adding the game to other devices is prohibited.
— Do not enable activation for PS4 or shared access for PS5; you can only play with the provided data with the internet enabled.`;

    const rulesP3_EN = `**Rules for using the game with Activation/Shared Access (P3):**
— Do not change your account details: password, authenticator, phone number.
— One game — one user: we do not purchase games or subscriptions for the issued details.
— **Position with Activation/Shared Access — play only with your personal user.** Log in to the issued account **only for configuration**.
— **Data cannot be added to multiple consoles.** Use only one personal console.
— If a "lock" appears on the game, log in to the user with the game and:
  • on PS4 — activate it as the primary system,
  • on PS5 — enable shared access to the console.`;

    const review_EN = `🙏 We would appreciate your feedback — it will help us improve!
🎮 Enjoy the game!

📝 Reviews: https://t.me/pshubshoptg/29
📌 Current game prices: @pshubshoptg`;

    // --- ИНСТРУКЦИИ ПО АКТИВАЦИИ ---
    const instructionRU = isP2 ? 
        POSITION_INSTRUCTIONS['p2_' + (positionType.includes('ps4') ? 'ps4' : 'ps5')] : 
        POSITION_INSTRUCTIONS['p3_' + (positionType.includes('ps4') ? 'ps4' : 'ps5')];
    
    const instructionEN = isP2 ? 
        POSITION_INSTRUCTIONS_EN['p2_' + (positionType.includes('ps4') ? 'ps4' : 'ps5')] : 
        POSITION_INSTRUCTIONS_EN['p3_' + (positionType.includes('ps4') ? 'ps4' : 'ps5')];

    // --- ДАННЫЕ АККАУНТА ---
    const psnCodesArray = account.psnCodes ? account.psnCodes.split(',').map(code => code.trim()).filter(code => code !== '') : [];
    const currentCode = psnCodesArray.length > 0 ? psnCodesArray[0] : 'По запросу / On request';

    if (psnCodesArray.length > 0) {
        psnCodesArray.shift();
        const updatedCodes = psnCodesArray.join(', ');
        const accountIndex = accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].psnCodes = updatedCodes;
            saveToStorage('accounts', accounts);
        }
    }

    // --- ФУНКЦИИ КОПИРОВАНИЯ ---
    window.copyRules = function() {
        const text = window.currentLanguage === 'EN' 
            ? (isP2 ? rulesP2_EN : rulesP3_EN)
            : (isP2 ? rulesP2_RU : rulesP3_RU);
        navigator.clipboard.writeText(text).then(() => {
            showNotification(window.currentLanguage === 'EN' ? '✅ Rules copied!' : '✅ Правила скопированы!', 'success');
        });
    };

    window.copyReview = function() {
        if (marketplace !== 'telegram') {
            showNotification(window.currentLanguage === 'EN' ? 'Feedback is only for Telegram' : 'Отзыв только для Telegram', 'info');
            return;
        }
        const text = window.currentLanguage === 'EN' ? review_EN : review_RU;
        navigator.clipboard.writeText(text).then(() => {
            showNotification(window.currentLanguage === 'EN' ? '✅ Feedback copied!' : '✅ Отзыв скопирован!', 'success');
        });
    };

    window.copyAccountData = function() {
        const text = window.currentLanguage === 'EN' ? window.currentOrderDataEN : window.currentOrderDataRU;
        navigator.clipboard.writeText(text).then(() => {
            showNotification(window.currentLanguage === 'EN' ? '✅ Data copied!' : '✅ Данные скопированы!', 'success');
        });
    };

    window.copyInstruction = function() {
        const text = window.currentLanguage === 'EN' ? instructionEN : instructionRU;
        navigator.clipboard.writeText(text).then(() => {
            showNotification(window.currentLanguage === 'EN' ? '✅ Instructions copied!' : '✅ Инструкция скопирована!', 'success');
        });
    };

    window.switchLanguage = function(lang) {
        window.currentLanguage = lang;
        renderModal();
    };

    // --- ФУНКЦИЯ ДЛЯ ОТРИСОВКИ МОДАЛЬНОГО ОКНА ---
    function renderModal() {
        const isEn = window.currentLanguage === 'EN';
        
        // Текущие тексты
        const currentOrderData = isEn ? window.currentOrderDataEN : window.currentOrderDataRU;
        const currentInstruction = isEn ? instructionEN : instructionRU;
        const currentRules = isEn 
            ? (isP2 ? rulesP2_EN : rulesP3_EN)
            : (isP2 ? rulesP2_RU : rulesP3_RU);
        const currentReview = isEn ? review_EN : review_RU;

        // Тексты для кнопок и заголовков
        const dataTitle = isEn ? 'Customer data:' : 'Данные для клиента:';
        const instructionTitle = isEn ? `Instructions for ${getPositionName(positionType)}:` : `Инструкция для ${getPositionName(positionType)}:`;
        const rulesTitle = isEn 
            ? (isP2 ? 'Rules for P2:' : 'Rules for P3:')
            : (isP2 ? 'Правила для П2:' : 'Правила для П3:');
        const reviewTitle = isEn ? 'Feedback' : 'Отзыв';
        const copyDataBtn = isEn ? 'Copy data' : 'Скопировать данные';
        const copyInstructionBtn = isEn ? 'Copy instructions' : 'Скопировать инструкцию';
        const copyRulesBtn = isEn ? 'Copy rules' : 'Скопировать правила';
        const copyReviewBtn = isEn ? 'Copy feedback' : 'Скопировать отзыв';
        const doneBtn = isEn ? 'Done' : 'Готово';

        // Генерируем HTML блоков в зависимости от площадки
        let marketplaceBlocksHTML = '';
        
        if (marketplace === 'telegram') {
            marketplaceBlocksHTML = `
                <!-- Правила (только для выбранной позиции) -->
                <div class="instruction-section" style="background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); border-color: #ffc107; margin-top: 15px; padding: 20px; border-radius: 15px;">
                    <h4 style="color: #856404; margin-bottom: 10px;">${rulesTitle}</h4>
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ffe69c; font-size: 13px; white-space: pre-wrap; margin-bottom: 10px;">${currentRules}</div>
                    <button class="btn btn-warning btn-small" onclick="window.copyRules()" style="width: 100%;"><span style="margin-right: 8px;">📋</span> ${copyRulesBtn}</button>
                </div>
                <!-- Отзыв -->
                <div class="instruction-section" style="background: linear-gradient(135deg, #d1e7dd 0%, #b8dfd0 100%); border-color: #20c997; margin-top: 15px; padding: 20px; border-radius: 15px;">
                    <h4 style="color: #0f5132; margin-bottom: 10px;">${reviewTitle}:</h4>
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #b8dfd0; font-size: 13px; white-space: pre-wrap; margin-bottom: 10px;">${currentReview}</div>
                    <button class="btn btn-success btn-small" onclick="window.copyReview()" style="width: 100%;"><span style="margin-right: 8px;">📋</span> ${copyReviewBtn}</button>
                </div>
            `;
        } else if (marketplace === 'avito') {
            marketplaceBlocksHTML = `
                <!-- Правила (только для выбранной позиции) -->
                <div class="instruction-section" style="background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); border-color: #ffc107; margin-top: 15px; padding: 20px; border-radius: 15px;">
                    <h4 style="color: #856404; margin-bottom: 10px;">${rulesTitle}</h4>
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ffe69c; font-size: 13px; white-space: pre-wrap; margin-bottom: 10px;">${currentRules}</div>
                    <button class="btn btn-warning btn-small" onclick="window.copyRules()" style="width: 100%;"><span style="margin-right: 8px;">📋</span> ${copyRulesBtn}</button>
                </div>
            `;
        }

        const modalContent = document.getElementById('saleModalContent');
        modalContent.innerHTML = `
            <h2 style="text-align: center; margin-bottom: 25px;">
                <span style="display: inline-block; margin-right: 10px;">✅</span>
                Продажа оформлена!
            </h2>
            
            <!-- Языковая панель -->
            <div class="language-switcher" style="display: flex; justify-content: center; gap: 10px; margin-bottom: 25px; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 15px; border: 1px solid #e2e8f0;">
                <button onclick="window.switchLanguage('RU')" class="language-btn" style="padding: 10px 25px; border-radius: 25px; border: 2px solid ${!isEn ? '#4361ee' : '#e2e8f0'}; background: ${!isEn ? '#4361ee' : 'white'}; color: ${!isEn ? 'white' : '#64748b'}; font-weight: 600; cursor: pointer;">🇷🇺 Русский</button>
                <button onclick="window.switchLanguage('EN')" class="language-btn" style="padding: 10px 25px; border-radius: 25px; border: 2px solid ${isEn ? '#4361ee' : '#e2e8f0'}; background: ${isEn ? '#4361ee' : 'white'}; color: ${isEn ? 'white' : '#64748b'}; font-weight: 600; cursor: pointer;">🇬🇧 English</button>
            </div>
            
            <!-- Данные для клиента -->
            <div id="orderDataSection" class="sale-success-section" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 15px; border: 1px solid #bbf7d0; margin-bottom: 25px;">
                <h3 style="color: #16a34a; margin-bottom: 20px;"><span>📋</span> <span>${dataTitle}</span></h3>
                <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-wrap; word-break: break-word;">${currentOrderData}</div>
                <button class="btn btn-success btn-small" onclick="window.copyAccountData()" style="width: 100%;"><span style="margin-right: 8px;">📋</span> ${copyDataBtn}</button>
            </div>
            
            <!-- Инструкция по активации -->
            <div id="instructionSection" class="instruction-section" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 15px; border: 1px solid #bfdbfe; margin-bottom: 25px;">
                <h3 style="color: #2563eb; margin-bottom: 15px;"><span>📖</span> <span>${instructionTitle}</span></h3>
                <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto; font-size: 13.5px; line-height: 1.5; color: #4b5563; white-space: pre-wrap; margin-bottom: 10px;">${currentInstruction.replace(/\n/g, '<br>')}</div>
                <button class="btn btn-primary btn-small" onclick="window.copyInstruction()" style="width: 100%;"><span style="margin-right: 8px;">📝</span> ${copyInstructionBtn}</button>
            </div>
            
            <!-- ДИНАМИЧЕСКИЕ БЛОКИ (только правила для выбранной позиции) -->
            <div id="marketplaceBlocksContainer">
                ${marketplaceBlocksHTML}
            </div>
            
            <!-- Оставшиеся коды -->
            ${psnCodesArray.length > 0 ? `
                <div class="remaining-codes" style="background: #f8fafc; padding: 20px; border-radius: 15px; border: 1px solid #e2e8f0; margin: 25px 0;">
                    <h4 style="color: #475569; margin-bottom: 15px;"><span>🔑</span> <span>${isEn ? `Remaining codes (${psnCodesArray.length}):` : `Оставшиеся коды (${psnCodesArray.length}):`}</span></h4>
                    <div class="codes-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                        ${psnCodesArray.map(code => `<div style="background: white; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-family: 'Courier New', monospace; font-size: 12px; text-align: center; word-break: break-all;">${code}</div>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Кнопка закрытия -->
            <div class="order-buttons" style="display: flex; gap: 15px; justify-content: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <button class="btn btn-primary" onclick="closeSaleModalAndRefresh()" style="padding: 12px 24px; flex: 1; background: #10b981; border-color: #10b981;" id="closeSaleBtn">
                    <span style="margin-right: 8px;">✅</span>
                    ${doneBtn}
                </button>
            </div>
        `;
    }

    // Сохраняем данные глобально
    window.currentLanguage = 'RU';
    window.currentOrderDataRU = `Игра: ${account.gameName}
Логин PSN: ${account.psnLogin}
Пароль PSN: ${account.psnPassword || 'Не указан'}
Код аутентификации PSN: ${currentCode}`;

    window.currentOrderDataEN = `Game: ${account.gameName}
PSN Login: ${account.psnLogin}
PSN Password: ${account.psnPassword || 'Not specified'}
PSN Authentication Code: ${currentCode}`;

    // Отображаем модальное окно
    renderModal();
    openModal('saleModal');
}

// Функция закрытия (оставляем)
function closeSaleModalAndRefresh() {
    console.log('✅ Закрываю модальное окно продажи...');
    
    const saleModal = document.getElementById('saleModal');
    if (saleModal) {
        saleModal.style.display = 'none';
    }
    
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    
    setTimeout(() => {
        refreshSearchResultsAfterSaleUpdate();
    }, 300);
    
    showNotification('Продажа завершена! ✅', 'success', 2000);
}

// Функция для копирования инструкции
function copyInstruction() {
    if (!window.currentInstruction) {
        showNotification('❌ Instructions not found', 'error');
        return;
    }
    
    const isEnglish = window.currentLanguage === 'EN';
    
    navigator.clipboard.writeText(window.currentInstruction).then(() => {
        showNotification(isEnglish ? '✅ Instructions copied to clipboard!' : '✅ Инструкция скопирована в буфер обмена!', 'success');
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = window.currentInstruction;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification(isEnglish ? '✅ Instructions copied to clipboard!' : '✅ Инструкция скопирована в буфер обмена!', 'success');
    });
}


function copyRulesP2() {
    const texts = window.getCurrentTexts();
    navigator.clipboard.writeText(texts.rulesP2).then(() => {
        showNotification(texts.copyRulesP2Btn + ' ✅', 'success');
    });
}

function copyRulesP3() {
    const texts = window.getCurrentTexts();
    navigator.clipboard.writeText(texts.rulesP3).then(() => {
        showNotification(texts.copyRulesP3Btn + ' ✅', 'success');
    });
}

function copyReview() {
    const texts = window.getCurrentTexts();
    if (window.currentMarketplace === 'telegram') {
        navigator.clipboard.writeText(texts.review).then(() => {
            showNotification(texts.copyReviewBtn + ' ✅', 'success');
        });
    } else {
        showNotification('Отзыв доступен только для Telegram', 'info');
    }
}

// Обновим функцию copyAccountData() чтобы она тоже была доступна
function copyAccountData() {
    if (!window.currentOrderData) {
        showNotification('❌ Data not found', 'error');
        return;
    }
    
    const isEnglish = window.currentLanguage === 'EN';
    
    navigator.clipboard.writeText(window.currentOrderData).then(() => {
        showNotification(isEnglish ? '✅ Data copied to clipboard!' : '✅ Данные скопированы в буфер обмена!', 'success');
    }).catch(err => {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = window.currentOrderData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification(isEnglish ? '✅ Data copied to clipboard!' : '✅ Данные скопированы в буфер обмена!', 'success');
    });
}

function copyAllSaleData() {
    const texts = window.getCurrentTexts();
    let allText = texts.orderData + '\n\n' + texts.instruction + '\n\n' + texts.rulesP2 + '\n\n' + texts.rulesP3;
    
    if (window.currentMarketplace === 'telegram') {
        allText += '\n\n' + texts.review;
    }
    
    navigator.clipboard.writeText(allText).then(() => {
        showNotification(texts.copyAllBtn + ' ✅', 'success');
    });
}

// ============================================
// ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ЯЗЫКА (обновленная)
// ============================================
function switchLanguage(lang) {
    if (!window.currentOrderDataRU) return;
    
    window.currentLanguage = lang;
    
    // Обновляем кнопки языка
    document.querySelectorAll('.language-btn').forEach(btn => {
        const isActive = btn.textContent.includes(lang === 'RU' ? 'Русский' : 'English');
        btn.style.background = isActive ? '#4361ee' : 'white';
        btn.style.color = isActive ? 'white' : '#64748b';
        btn.style.borderColor = isActive ? '#4361ee' : '#e2e8f0';
    });
    
    // Перерендериваем модальное окно
    if (window.renderSaleModal) {
        window.renderSaleModal();
    }
}

// ИСПОЛЬЗУЙТЕ эту функцию:
function closeSaleModalAndRefresh() {
    console.log('✅ Закрываю модальное окно продажи...');
    
    // 1. Закрываем модальное окно продажи
    const saleModal = document.getElementById('saleModal');
    if (saleModal) {
        saleModal.style.display = 'none';
        console.log('🎯 Модальное окно продажи закрыто');
    }
    
    // 2. Если открыто окно с данными для клиента - закрываем его тоже
    const psnCodeModal = document.getElementById('psnCodeModal');
    if (psnCodeModal) {
        psnCodeModal.style.display = 'none';
        psnCodeModal.remove();
        console.log('🗂️ Окно PSN кода закрыто');
    }
    
    // 3. Восстанавливаем скролл страницы
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    
    // 4. Обновляем результаты поиска
    setTimeout(() => {
        refreshSearchResultsAfterSaleUpdate();
        console.log('🔄 Результаты поиска обновлены');
    }, 300);
    
    // 5. Показываем уведомление
    showNotification('Продажа завершена! ✅', 'success', 2000);
}


function showSaleDetails(sale) {
    const modalContent = document.getElementById('saleModalContent');
    const currentUser = security.getCurrentUser();
    const canChangeManager = security.canChangeSaleManager();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    // Определяем, была ли уже пересадка
    const isTransplanted = sale.isTransplanted || false;
    
    // ==== ИСПРАВЛЕНИЕ: Преобразуем время продажи в московское для отображения ====
    let saleDate, saleTime;
    
    if (sale.datetime) {
        const parts = sale.datetime.split(' ');
        saleDate = parts[0];
        saleTime = parts[1] || '00:00';
    } else if (sale.date) {
        saleDate = sale.date;
        saleTime = sale.time || '00:00';
    } else if (sale.timestamp) {
        const date = new Date(sale.timestamp);
        const moscowDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
        saleDate = moscowDate.toISOString().split('T')[0];
        saleTime = moscowDate.toTimeString().slice(0, 5);
    } else {
        const moscowTime = getSimpleMoscowDateTime();
        saleDate = moscowTime.date;
        saleTime = moscowTime.time;
    }
    
    const displayPrice = sale.price;
    const originalMarketplace = sale.marketplace || 'telegram';
    
    modalContent.innerHTML = `
        <h2>💰 Редактировать продажу</h2>
        
        <!-- Скрытое поле для оригинальной площадки -->
        <input type="hidden" id="originalMarketplace" value="${originalMarketplace}">
        
        <div class="sale-info">
            <div class="sale-info-item">
                <strong>Аккаунт:</strong>
                <span>${sale.accountLogin}</span>
            </div>
            <div class="sale-info-item">
                <strong>Игра:</strong>
                <span>${sale.gameName}</span>
            </div>
            <div class="sale-info-item">
                <strong>Позиция:</strong>
                <span>${sale.positionName}</span>
            </div>
            <div class="sale-info-item">
                <strong>Менеджер:</strong>
                <span style="
                    background: ${sale.managerRole === 'admin' ? 
                        'linear-gradient(135deg, #f72585 0%, #e63946 100%)' : 
                        'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)'};
                    color: white;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.9em;
                    display: inline-block;
                ">
                    ${sale.soldByName} ${sale.managerRole === 'admin' ? '👑' : '👷'}
                </span>
            </div>
            ${isTransplanted ? `
                <div style="margin-top: 10px; background: #fef3c7; color: #92400e; padding: 8px; border-radius: 8px; text-align: center; border: 1px solid #fbbf24;">
                    🔄 Пересадка (позиция освобождена)
                </div>
            ` : ''}
            <div style="margin-top: 10px; font-size: 0.85em; color: #10b981; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
                ⏰ Московское время (UTC+3)
            </div>
        </div>
        
        <div class="sale-form">
            <div>
                <label for="editSalePrice">Цена продажи (₽):</label>
                <input type="number" id="editSalePrice" class="sale-input" value="${displayPrice}" required>
            </div>
            
            <div>
                <label for="editSaleMarketplace">Площадка продажи:</label>
                <select id="editSaleMarketplace" class="sale-input" ${isAdmin ? '' : 'disabled'}>
                    <option value="funpay" ${sale.marketplace === 'funpay' ? 'selected' : ''}>Funpay (комиссия 3%)</option>
                    <option value="telegram" ${sale.marketplace === 'telegram' ? 'selected' : ''}>Telegram (без комиссии)</option>
                    <option value="avito" ${sale.marketplace === 'avito' ? 'selected' : ''}>Avito (без комиссии)</option>
                </select>
                ${!isAdmin ? '<div style="font-size: 0.85em; color: #64748b; margin-top: 5px;">Только админ может менять площадку</div>' : ''}
            </div>
            
            <!-- Блок комиссии для Funpay -->
            <div id="editCommissionInfo" style="
                display: ${sale.marketplace === 'funpay' ? 'block' : 'none'};
                background: #fef3c7;
                padding: 15px;
                border-radius: 10px;
                border: 1px solid #fbbf24;
                margin-bottom: 15px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #92400e;">💰 Комиссия Funpay (3%):</strong>
                    <span id="editCommissionAmount" style="font-weight: 700; color: #dc2626;">0 ₽</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #92400e;">✅ Оригинальная цена (до комиссии):</strong>
                    <span id="editOriginalAmount" style="font-weight: 700; color: #16a34a; font-size: 1.1em;">${sale.originalPrice || sale.price} ₽</span>
                </div>
                <div style="margin-top: 8px; font-size: 0.85em; color: #92400e;">
                    <small>При редактировании комиссия не пересчитывается автоматически</small>
                </div>
            </div>
            
            <!-- ПОЛЕ МЕНЕДЖЕРА - ТОЛЬКО ДЛЯ АДМИНА -->
            ${canChangeManager ? `
                <div>
                    <label for="editSaleManager">Менеджер:</label>
                    <select id="editSaleManager" class="sale-input">
                        <option value="">Выберите менеджера</option>
                        ${getWorkersOptions(sale)}
                    </select>
                </div>
            ` : ''}
            
            <div class="datetime-group">
                <div>
                    <label for="editSaleDate">Дата продажи:</label>
                    <input type="date" id="editSaleDate" class="sale-input" value="${saleDate}">
                </div>
                <div>
                    <label for="editSaleTime">Время продажи:</label>
                    <input type="time" id="editSaleTime" class="sale-input" value="${saleTime}">
                </div>
            </div>
            
            <div>
                <label for="editSaleNotes">Примечания:</label>
                <input type="text" id="editSaleNotes" class="sale-input" 
                       value="${sale.notes || ''}" placeholder="Дополнительная информация">
            </div>
        </div>
        
        <div class="sale-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="closeSaleModal()" style="flex: 1;">Отмена</button>
            <button class="btn btn-primary" onclick="updateSaleDetails('${sale.id}')" style="flex: 1;">
                💾 Сохранить
            </button>
            <button class="btn btn-danger" onclick="deleteSale('${sale.id}')" style="flex: 1;">
                🗑️ Удалить
            </button>
        </div>
    `;
    
    // Если продажа с Funpay - показываем оригинальную цену
    if (sale.marketplace === 'funpay' && sale.originalPrice) {
        document.getElementById('editCommissionAmount').textContent = 
            `-${sale.commission || 0} ₽`;
        document.getElementById('editOriginalAmount').textContent = 
            `${sale.originalPrice} ₽`;
    }
    
    // Добавляем обработчик изменения цены/площадки
    document.getElementById('editSalePrice').addEventListener('input', updateEditCommission);
    document.getElementById('editSaleMarketplace').addEventListener('change', updateEditCommission);
    
    // Вызываем для начального расчета
    updateEditCommission();
    
    openModal('saleModal');
}

// Функция обновления комиссии при редактировании
function updateEditCommission() {
    const priceInput = document.getElementById('editSalePrice');
    const marketplaceSelect = document.getElementById('editSaleMarketplace');
    const commissionInfo = document.getElementById('editCommissionInfo');
    
    if (!priceInput || !marketplaceSelect || !commissionInfo) return;
    
    const price = parseFloat(priceInput.value) || 0;
    const marketplace = marketplaceSelect.value;
    
    // Показываем блок комиссии только для Funpay
    if (marketplace === 'funpay' && price > 0) {
        commissionInfo.style.display = 'block';
        
        // Рассчитываем комиссию
        const commissionData = calculateFPCommission(price);
        
        // Обновляем отображение
        document.getElementById('editCommissionAmount').textContent = 
            `-${commissionData.commission} ₽`;
        document.getElementById('editOriginalAmount').textContent = 
            `${commissionData.original} ₽`;
        
        // Подсвечиваем поле цены
        priceInput.style.borderColor = '#fbbf24';
        priceInput.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
    } else {
        commissionInfo.style.display = 'none';
        priceInput.style.borderColor = '';
        priceInput.style.boxShadow = '';
    }
}

// Функция для восстановления при конфликтах
async function fixSalesConflict() {
    console.log('🔄 Восстановление при конфликте данных...');
    
    // 1. Загружаем из Firebase
    if (window.dataSync && window.dataSync.loadData) {
        const firebaseSales = await window.dataSync.loadData('sales');
        
        // 2. Сравниваем с локальными
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        
        // 3. Объединяем, устраняя дубликаты
        const mergedSales = [...firebaseSales];
        
        localSales.forEach(localSale => {
            const exists = mergedSales.find(fbSale => fbSale.id === localSale.id);
            if (!exists) {
                mergedSales.push(localSale);
            }
        });
        
        // 4. Сохраняем обратно
        sales = mergedSales;
        localStorage.setItem('sales', JSON.stringify(sales));
        
        // 5. Синхронизируем с Firebase
        if (window.dataSync && window.dataSync.saveData) {
            await window.dataSync.saveData('sales', sales);
        }
        
        console.log(`✅ Конфликт устранен. Всего продаж: ${sales.length}`);
        showNotification(`Конфликт данных устранен. Продаж: ${sales.length}`, 'success');
        
        // 6. Обновляем UI
        refreshSearchResultsAfterSaleUpdate();
    }
}

// Автоматически проверяем каждые 5 минут
setInterval(() => {
    const localSales = JSON.parse(localStorage.getItem('sales')) || [];
    if (Math.abs(sales.length - localSales.length) > 0) {
        console.warn('⚠️ Обнаружено расхождение данных продаж');
        fixSalesConflict();
    }
}, 5 * 60 * 1000); // 5 минут

// ============================================
// PSN AUTHENTICATOR (TOTP)
// ============================================

// Открытие модального окна с PSN кодом
function openPSNCodeModal(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
        showNotification('Аккаунт не найден', 'error');
        return;
    }
    
    // Получаем ключ аутентификатора
    const authenticatorKey = account.psnAuthenticator?.trim();
    
    if (!authenticatorKey) {
        showNotification('PSN аутентификатор не настроен для этого аккаунта', 'warning');
        return;
    }
    
    // Проверяем формат ключа
    if (!TOTP.isValidSecret(authenticatorKey)) {
        showNotification('Некорректный формат ключа аутентификатора', 'error');
        return;
    }
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'psnCodeModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <span class="close" onclick="closePSNCodeModal()">&times;</span>
            
            <h2 style="margin-bottom: 20px; color: #2d3748;">
                <span style="margin-right: 10px;">🔐</span>
                PSN Код для ${account.psnLogin}
            </h2>
            
            <div style="
                margin: 25px 0;
                padding: 30px;
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border-radius: 15px;
                border: 2px solid #bbf7d0;
            ">
                <div id="psnCodeDisplay" style="
                    font-family: 'Courier New', monospace;
                    font-size: 3.5rem;
                    font-weight: 800;
                    letter-spacing: 10px;
                    color: #166534;
                    text-shadow: 0 2px 10px rgba(22, 101, 52, 0.2);
                    margin: 15px 0;
                ">
                    Загрузка...
                </div>
                
                <div style="
                    font-size: 0.9em;
                    color: #64748b;
                    margin: 10px 0;
                ">
                    Действителен:
                    <span id="timeRemaining" style="
                        font-weight: 700;
                        color: #ef4444;
                        font-size: 1.2em;
                        margin-left: 5px;
                    ">30</span>
                    секунд
                </div>
                
                <div style="margin: 20px 0;">
                    <div style="
                        height: 6px;
                        background: #e2e8f0;
                        border-radius: 3px;
                        overflow: hidden;
                    ">
                        <div id="progressBar" style="
                            height: 100%;
                            width: 100%;
                            background: linear-gradient(90deg, #10b981, #22c55e);
                            border-radius: 3px;
                            transition: width 1s linear;
                        "></div>
                    </div>
                </div>
                
                <div style="
                    font-size: 0.85em;
                    color: #94a3b8;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px dashed #e2e8f0;
                ">
                    Обновляется автоматически каждые 30 секунд
                </div>
            </div>
            
            <div style="margin-top: 25px;">
                <button class="btn btn-primary" onclick="copyPSNCode()" style="margin-right: 10px;">
                    📋 Скопировать код
                </button>
                <button class="btn btn-secondary" onclick="closePSNCodeModal()">
                    Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Инициализируем генератор кодов
    initPSNCodeGenerator(accountId, authenticatorKey);
}

// Инициализация генератора кода
function initPSNCodeGenerator(accountId, secretKey) {
    // Создаем глобальные переменные для этого модального окна
    window.psnCodeData = {
        accountId: accountId,
        secretKey: secretKey,
        interval: null,
        timer: null
    };
    
    // Генерируем первый код
    updatePSNCode();
    
    // Запускаем обновление каждую секунду
    window.psnCodeData.interval = setInterval(updatePSNCode, 1000);
}

// Обновление PSN кода
// Обновление PSN кода
async function updatePSNCode() {
    const { secretKey } = window.psnCodeData || {};
    
    if (!secretKey) {
        clearInterval(window.psnCodeData?.interval);
        return;
    }
    
    try {
        // Генерируем текущий код
        const currentCode = await TOTP.generateTOTP(secretKey);
        const remainingSeconds = TOTP.getRemainingSeconds();
        
        // Обновляем отображение
        const codeDisplay = document.getElementById('psnCodeDisplay');
        const timeDisplay = document.getElementById('timeRemaining');
        const progressBar = document.getElementById('progressBar');
        
        if (codeDisplay) {
            // Если код изменился, добавляем анимацию
            if (codeDisplay.textContent !== currentCode && 
                codeDisplay.textContent !== 'Загрузка...' &&
                codeDisplay.textContent !== 'ОШИБКА') {
                codeDisplay.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    codeDisplay.style.animation = '';
                }, 500);
            }
            
            codeDisplay.textContent = currentCode;
        }
        
        if (timeDisplay) {
            timeDisplay.textContent = remainingSeconds;
            
            // Меняем цвет при приближении к смене кода
            if (remainingSeconds <= 5) {
                timeDisplay.style.color = '#dc2626';
                timeDisplay.style.animation = remainingSeconds <= 3 ? 'pulse 0.5s infinite' : 'none';
            } else if (remainingSeconds <= 10) {
                timeDisplay.style.color = '#f97316';
            } else {
                timeDisplay.style.color = '#10b981';
                timeDisplay.style.animation = 'none';
            }
        }
        
        if (progressBar) {
            const progressPercentage = (remainingSeconds / 30) * 100;
            progressBar.style.width = `${progressPercentage}%`;
            
            // Меняем цвет прогресс-бара
            if (remainingSeconds <= 5) {
                progressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            } else if (remainingSeconds <= 10) {
                progressBar.style.background = 'linear-gradient(90deg, #f97316, #ea580c)';
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #10b981, #22c55e)';
            }
        }
        
    } catch (error) {
        console.error('Ошибка генерации PSN кода:', error);
        const codeDisplay = document.getElementById('psnCodeDisplay');
        if (codeDisplay) {
            codeDisplay.textContent = 'ОШИБКА';
            codeDisplay.style.color = '#dc2626';
        }
        
        // Показываем сообщение об ошибке
        const timeDisplay = document.getElementById('timeRemaining');
        if (timeDisplay) {
            timeDisplay.textContent = 'ERR';
            timeDisplay.style.color = '#dc2626';
        }
    }
}

// Копирование PSN кода в буфер обмена
function copyPSNCode() {
    const codeDisplay = document.getElementById('psnCodeDisplay');
    if (!codeDisplay) return;
    
    const code = codeDisplay.textContent.trim();
    
    if (code === 'Загрузка...' || code === 'ОШИБКА') {
        showNotification('Не удалось скопировать код', 'error');
        return;
    }
    
    navigator.clipboard.writeText(code).then(() => {
        showNotification('PSN код скопирован в буфер обмена! 📋', 'success');
    }).catch(err => {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('PSN код скопирован! 📋', 'success');
    });
}

// Закрытие модального окна
function closePSNCodeModal() {
    const modal = document.getElementById('psnCodeModal');
    if (modal) {
        // Очищаем интервалы
        if (window.psnCodeData?.interval) {
            clearInterval(window.psnCodeData.interval);
        }
        if (window.psnCodeData?.timer) {
            clearTimeout(window.psnCodeData.timer);
        }
        
        // Удаляем модальное окно
        modal.remove();
        window.psnCodeData = null;
    }
}

// Обновляем форму редактирования аккаунта - добавляем кнопку PSN Код
function updateEditFormWithPSNButton(accountId, currentKey) {
    // Добавляем кнопку только если есть ключ
    if (currentKey && TOTP.isValidSecret(currentKey)) {
        return `
            <div style="grid-column: 1 / -1; margin-top: 10px;">
                <button class="btn btn-primary" onclick="openPSNCodeModal(${accountId})" style="width: 100%;">
                    <span style="margin-right: 8px;">🔐</span>
                    Сгенерировать PSN Код (30 секундный)
                </button>
                <div style="font-size: 0.85em; color: #64748b; margin-top: 5px; text-align: center;">
                    Откроется окно с автоматически обновляющимся кодом
                </div>
            </div>
        `;
    }
    return '';
}


function displayWorkersStats(periodSales) {
    const container = document.getElementById('workersStats');
    if (!container) return;
    
    // Собираем статистику по менеджерам
    const managersStats = {};
    
    periodSales.forEach(sale => {
        const managerName = sale.soldByName || 'Неизвестно';
        const managerUsername = sale.soldBy || 'unknown';
        
        if (!managersStats[managerUsername]) {
            managersStats[managerUsername] = {
                name: managerName,
                username: managerUsername,
                role: sale.managerRole || 'worker',
                revenue: 0,
                sales: 0,
                avgCheck: 0,
                profit: 0
            };
        }
        
        managersStats[managerUsername].revenue += sale.price;
        managersStats[managerUsername].sales += 1;
        managersStats[managerUsername].profit += (sale.profit || 0);
    });
    
    // Рассчитываем средний чек
    Object.keys(managersStats).forEach(username => {
        const stats = managersStats[username];
        stats.avgCheck = stats.sales > 0 ? stats.revenue / stats.sales : 0;
    });
    
    // Сортируем по выручке
    const sortedManagers = Object.values(managersStats)
        .sort((a, b) => b.revenue - a.revenue);
    
    if (sortedManagers.length === 0) {
        container.innerHTML = '<div class="empty">Нет данных по менеджерам</div>';
        return;
    }
    
    const tableHTML = sortedManagers.map(manager => {
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 600;">${manager.name}</span>
                        ${manager.role === 'admin' ? 
                            '<span style="background: #f72585; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">👑 Админ</span>' : 
                            '<span style="background: #4361ee; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">👷 Работник</span>'
                        }
                    </div>
                </td>
                <td>${manager.sales}</td>
                <td>${manager.revenue.toLocaleString('ru-RU')} ₽</td>
                <td>${manager.profit.toLocaleString('ru-RU')} ₽</td>
                <td>${manager.avgCheck.toLocaleString('ru-RU')} ₽</td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = `
        <h3>👷 Статистика по менеджерам</h3>
        <div style="margin: 20px 0; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <div style="font-weight: 600; margin-bottom: 5px;">Всего менеджеров: ${sortedManagers.length}</div>
            <div>Лучший по выручке: <strong>${sortedManagers[0].name}</strong> (${sortedManagers[0].revenue.toLocaleString('ru-RU')} ₽)</div>
        </div>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Менеджер</th>
                    <th>Продажи</th>
                    <th>Выручка</th>
                    <th>Прибыль</th>
                    <th>Средний чек</th>
                </tr>
            </thead>
            <tbody>
                ${tableHTML}
            </tbody>
        </table>
    `;
}

async function updateSaleDetails(saleId) {
    const salePrice = document.getElementById('editSalePrice').value;
    const marketplaceSelect = document.getElementById('editSaleMarketplace');
    const saleDate = document.getElementById('editSaleDate').value;
    const saleTime = document.getElementById('editSaleTime').value;
    const saleNotes = document.getElementById('editSaleNotes').value;
    const originalMarketplace = document.getElementById('originalMarketplace')?.value || 'telegram';
    
    if (!salePrice) {
        showNotification('Введите цену продажи', 'warning');
        return;
    }
    
    let finalPrice = parseFloat(salePrice);
    
    // ВАЖНО: ПРИ РЕДАКТИРОВАНИИ НЕ ПЕРЕСЧИТЫВАЕМ КОМИССИЮ!
    // Только если админ меняет площадку
    let newMarketplace = originalMarketplace;
    let originalPrice = finalPrice;
    let commission = 0;
    
    const currentUser = security.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    // Если админ меняет площадку
    if (isAdmin && marketplaceSelect) {
        newMarketplace = marketplaceSelect.value;
        
        // Если меняем НА Funpay - рассчитываем комиссию
        if (newMarketplace === 'funpay' && originalMarketplace !== 'funpay') {
            const commissionData = calculateFPCommission(finalPrice);
            commission = commissionData.commission;
            // Оставляем цену как есть (она уже введена как финальная)
        }
        // Если меняем С Funpay на другую площадку - убираем комиссию
        else if (newMarketplace !== 'funpay' && originalMarketplace === 'funpay') {
            // Находим оригинальную цену
            const saleIndex = sales.findIndex(s => s.id === saleId);
            if (saleIndex !== -1 && sales[saleIndex].originalPrice) {
                originalPrice = sales[saleIndex].originalPrice;
                commission = 0;
            }
        }
    }
    
    const saleDateTime = saleDate && saleTime ? `${saleDate} ${saleTime}` : '';
    
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return;
    
    const originalSale = sales[saleIndex];
    
    // МЕНЕДЖЕРА МЕНЯЕМ ТОЛЬКО ЕСЛИ АДМИН
    let newManager = originalSale.soldBy;
    let newManagerName = originalSale.soldByName;
    let newManagerRole = originalSale.managerRole;
    
    const managerSelect = document.getElementById('editSaleManager');
    if (managerSelect && security.canChangeSaleManager()) {
        const newManagerUsername = managerSelect.value;
        if (newManagerUsername && newManagerUsername !== originalSale.soldBy) {
            if (newManagerUsername === currentUser.username) {
                newManager = currentUser.username;
                newManagerName = currentUser.name;
                newManagerRole = currentUser.role;
            } else {
                const workers = JSON.parse(localStorage.getItem('workers')) || [];
                const worker = workers.find(w => w.username === newManagerUsername);
                if (worker) {
                    newManager = worker.username;
                    newManagerName = worker.name;
                    newManagerRole = worker.role;
                }
            }
        }
    }
    
    // Обновляем продажу
    sales[saleIndex] = {
        ...originalSale,
        price: finalPrice,
        originalPrice: newMarketplace === 'funpay' ? originalPrice : null,
        commission: newMarketplace === 'funpay' ? commission : 0,
        commissionPercent: newMarketplace === 'funpay' ? 3 : 0,
        marketplace: newMarketplace,
        date: saleDate,
        time: saleTime,
        datetime: saleDateTime,
        notes: saleNotes,
        soldBy: newManager,
        soldByName: newManagerName,
        managerRole: newManagerRole,
        commissionApplied: newMarketplace === 'funpay',
        lastModifiedBy: currentUser ? currentUser.username : 'unknown',
        lastModifiedByName: currentUser ? currentUser.name : 'Неизвестно',
        lastModifiedAt: new Date().toISOString()
    };
    
    // Сохраняем с синхронизацией
    try {
        await saveToStorage('sales', sales);
        
        closeSaleModal();
        
        // Обновляем отображение
        refreshSearchResultsAfterSaleUpdate();
        
        showNotification('Данные продажи обновлены! 💾', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации продажи:', error);
        showNotification('Данные сохранены локально', 'warning');
    }
}

// Функция расчета комиссии Funpay (только для новых продаж)
function calculateFPCommission(price) {
    if (!price || price <= 0) return { original: 0, commission: 0, final: 0 };
    
    // Вычисляем комиссию (3%)
    const commission = price * 0.03;
    
    // Округляем по правилам:
    const fractionalPart = commission - Math.floor(commission);
    
    // Если дробная часть >= 0.5, округляем вверх
    let roundedCommission;
    if (fractionalPart >= 0.5) {
        roundedCommission = Math.ceil(commission);
    } else {
        roundedCommission = Math.floor(commission);
    }
    
    // Финальная сумма (цена минус комиссия)
    const finalAmount = price - roundedCommission;
    
    return {
        original: price,
        commission: roundedCommission,
        final: finalAmount,
        commissionPercent: 3,
        roundedBy: fractionalPart >= 0.5 ? 'вверх' : 'вниз'
    };
}

// Функция обновления отображения комиссии (только для новых продаж)
function updateCommission() {
    const priceInput = document.getElementById('salePrice');
    const marketplaceSelect = document.getElementById('saleMarketplace');
    const commissionInfo = document.getElementById('commissionInfo');
    
    if (!priceInput || !marketplaceSelect || !commissionInfo) return;
    
    const price = parseFloat(priceInput.value) || 0;
    const marketplace = marketplaceSelect.value;
    
    // Показываем блок комиссии только для Funpay
    if (marketplace === 'funpay' && price > 0) {
        commissionInfo.style.display = 'block';
        
        // Рассчитываем комиссию
        const commissionData = calculateFPCommission(price);
        
        // Обновляем отображение
        document.getElementById('commissionAmount').textContent = 
            `-${commissionData.commission} ₽`;
        document.getElementById('finalAmount').textContent = 
            `${commissionData.final} ₽`;
        
        // Подсвечиваем поле цены
        priceInput.style.borderColor = '#fbbf24';
        priceInput.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
    } else {
        commissionInfo.style.display = 'none';
        priceInput.style.borderColor = '';
        priceInput.style.boxShadow = '';
    }
}

function refreshSearchResultsAfterSaleUpdate() {
    const searchInput = document.getElementById('managerGameSearch');
    const loginInput = document.getElementById('managerLogin');
    
    // Просто перезапускаем текущий поиск
    if (searchInput && searchInput.value.trim()) {
        searchByGame();
    } else if (loginInput && loginInput.value.trim()) {
        searchByLogin();
    } else {
        // Если ничего не искали, очищаем результаты
        document.getElementById('searchResults').innerHTML = '';
    }
}

// Добавьте в script.js после функций для игр

// Функция поиска в списке игр
function searchGamesList() {
    const searchInput = document.getElementById('searchGamesInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Вызываем displayGames() с учетом поиска
    displayGames();
    
    // Показываем количество найденных игр
    if (searchTerm) {
        const foundCount = games.filter(game => 
            game.name.toLowerCase().includes(searchTerm)
        ).length;
        
        // Обновляем заголовок
        const title = document.querySelector('#gamesList').previousElementSibling;
        if (title && title.tagName === 'H2') {
            title.innerHTML = `📚 Список игр <span style="font-size: 0.8em; color: #64748b;">(найдено: ${foundCount})</span>`;
        }
    }
}

function refreshAutocomplete() {
    if (typeof window.autoComplete !== 'undefined') {
        window.autoComplete.loadGames();
        window.autoComplete.setupAllSelects();
        console.log('🔄 Автодополнение обновлено');
    }
}

// Функция для отображения отфильтрованных игр
function displayFilteredGames(filteredGames) {
    const list = document.getElementById('gamesList');
    if (filteredGames.length === 0) {
        list.innerHTML = '<div class="empty">Нет добавленных игр</div>';
        return;
    }
    
    list.innerHTML = filteredGames.map(game => `
        <div class="item" style="display: flex; justify-content: space-between; align-items: center; 
              padding: 20px; margin-bottom: 15px; background: white; border-radius: 12px; 
              border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <strong style="font-size: 1.2em; color: #2d3748;">${game.name}</strong>
                    ${game.imageUrl ? `<img src="${game.imageUrl}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` : ''}
                </div>
                
                <div style="font-size: 0.9em; color: #64748b;">
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;">
                        ${game.storeLinks?.TR ? `
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <span>🇹🇷</span>
                                <a href="${game.storeLinks.TR}" target="_blank" 
                                   style="color: #4361ee; text-decoration: none;">
                                    Турция
                                </a>
                            </div>
                        ` : '<div style="color: #94a3b8;">🇹🇷 Нет ссылки</div>'}
                        
                        ${game.storeLinks?.UA ? `
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <span>🇺🇦</span>
                                <a href="${game.storeLinks.UA}" target="_blank" 
                                   style="color: #4361ee; text-decoration: none;">
                                    Украина
                                </a>
                            </div>
                        ` : '<div style="color: #94a3b8;">🇺🇦 Нет ссылки</div>'}
                    </div>
                    
                    <div style="margin-top: 10px; color: #94a3b8; font-size: 0.85em;">
                        Добавлена: ${game.created} • ${game.addedBy}
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-primary btn-small" onclick="editGame(${game.id})">
                    ✏️ Редактировать
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteGame(${game.id})">
                    🗑️ Удалить
                </button>
            </div>
        </div>
    `).join('');
}

// ИСПОЛЬЗУЙТЕ ЭТУ ВЕРСИЮ:
async function deleteSale(saleId) {
    console.log(`🗑️ Пытаюсь удалить продажу: ${saleId}`);
    
    if (!saleId) {
        console.error('❌ ID продажи не указан');
        showNotification('Ошибка: ID продажи не указан', 'error');
        return;
    }
    
    const currentUser = security.getCurrentUser();
    const sale = sales.find(s => s.id === saleId);

    if (!sale) {
        console.error(`❌ Продажа с ID ${saleId} не найдена`);
        showNotification('Продажа не найдена', 'error');
        return;
    }
    
    if (!confirm(`Удалить продажу аккаунта "${sale.accountLogin}" за ${sale.price} ₽?\nЭто действие нельзя отменить.`)) {
        return;
    }
    
    try {
        console.log(`✅ Начинаю удаление продажи ${saleId}...`);
        
        // 1. Удаляем из локального массива
        const originalCount = sales.length;
        sales = sales.filter(sale => sale.id !== saleId);
        console.log(`✅ Удалено из памяти. Было: ${originalCount}, стало: ${sales.length}`);
        
        // 2. Сохраняем локально
        localStorage.setItem('sales', JSON.stringify(sales));
        console.log('✅ Сохранено в localStorage');
        
        // 3. Удаляем из Firebase (если подключен)
        let firebaseDeleted = false;
        if (firebaseSync && firebaseSync.db) {
            try {
                await firebaseSync.db.ref('sales/' + saleId).remove();
                firebaseDeleted = true;
                console.log(`✅ Продажа удалена из Firebase: ${saleId}`);
            } catch (firebaseError) {
                console.error('❌ Ошибка удаления из Firebase:', firebaseError);
                // Продолжаем работу, продажа уже удалена локально
            }
        }
        
        // 4. Закрываем модальное окно
        closeSaleModal();
        
        // 5. Обновляем отображение
        refreshSearchResultsAfterSaleUpdate();
        
        // 6. Показываем уведомление
        if (firebaseDeleted) {
            showNotification(`Продажа "${sale.accountLogin}" удалена из облака! 🗑️`, 'success');
        } else {
            showNotification(`Продажа "${sale.accountLogin}" удалена локально 🗑️`, 'info');
        }
        
        // 7. Логируем удаление
        console.log(`🎉 Продажа успешно удалена: ${sale.accountLogin} за ${sale.price} ₽`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка при удалении продажи:', error);
        showNotification('Ошибка при удалении продажи ❌', 'error');
    }
}

function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЗАКРЫТИЯ ЛЮБОЙ МОДАЛКИ
function closeAnyModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    
    // ВОССТАНАВЛИВАЕМ СКРОЛЛ В ЛЮБОМ СЛУЧАЕ
    document.body.style.cssText = '';
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    document.body.style.width = '100%';
    
    // На всякий случай - принудительный рефлоу
    setTimeout(() => {
        window.scrollTo(window.scrollX, window.scrollY);
    }, 10);
}

// ИСПОЛЬЗУЙТЕ:
function closeSaleModal() {
    console.log('🔒 Закрытие модального окна продажи...');
    
    // Закрываем основное модальное окно
    const saleModal = document.getElementById('saleModal');
    if (saleModal) {
        saleModal.style.display = 'none';
    }
    
    // Закрываем окно PSN кода если открыто
    const psnCodeModal = document.getElementById('psnCodeModal');
    if (psnCodeModal) {
        psnCodeModal.style.display = 'none';
        psnCodeModal.remove();
    }
    
    // Восстанавливаем скролл
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    
    // Очищаем данные текущей продажи
    window.currentSaleAccount = null;
    window.currentSalePosition = null;
    window.currentSalePositionIndex = null;
    
    console.log('✅ Модальное окно продажи закрыто');
}

function closeModal() {
    closeAnyModal('editModal');
}

function closeFreeModal() {
    closeAnyModal('editFreeModal');
}

// ============================================
// ОТЧЕТЫ И СТАТИСТИКА
// ============================================

function generateReport() {
    // Просто показываем полную статистику за всё время
    displayReportResults(sales, 'все время', 'все время');
    showNotification('Показана статистика за всё время 📊', 'info');
}

function generateFullReport() {
    displayReportResults(sales, 'все время', 'все время');
}

function displayReportResults(salesData, startDate, endDate) {
    const reportResults = document.getElementById('reportResults');
    
    if (salesData.length === 0) {
        reportResults.innerHTML = `
            <div class="section">
                <h2>📊 Отчет за всё время</h2>
                <div class="empty">
                    <div style="font-size: 3em; margin-bottom: 15px;">📊</div>
                    <h3>Нет продаж</h3>
                    <p>Пока не было совершено ни одной продажи</p>
                </div>
            </div>
        `;
        return;
    }
    
    // СУММА ЗАКУПА ВСЕХ АККАУНТОВ В СИСТЕМЕ
    let totalPurchaseAmount = 0;
    accounts.forEach(account => {
        totalPurchaseAmount += account.purchaseAmount || 0;
    });
    
    // ===== ДОБАВЛЯЕМ СУММУ ЗАКУПА ИЗ СВОБОДНЫХ ПРОДАЖ =====
    salesData.forEach(sale => {
        if (sale.isFreeSale && sale.purchaseAmount) {
            totalPurchaseAmount += sale.purchaseAmount;
        }
    });
    // ===== КОНЕЦ ДОБАВЛЕНИЯ =====
    
    // Общая выручка из продаж
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.price, 0);
    const totalSales = salesData.length;
    const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Чистая прибыль
    const netProfit = totalRevenue - totalPurchaseAmount;
    
    // Статистика по играм
    const gamesStats = {};
    salesData.forEach(sale => {
        if (!gamesStats[sale.gameName]) {
            gamesStats[sale.gameName] = {
                sales: 0,
                revenue: 0
            };
        }
        gamesStats[sale.gameName].sales += 1;
        gamesStats[sale.gameName].revenue += sale.price;
    });
    
    // Сортируем игры по выручке
    const sortedGames = Object.entries(gamesStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue);
    
    // НОВОЕ: Статистика по площадкам
    const marketplaceStats = {};
    salesData.forEach(sale => {
        const marketplace = sale.marketplace || 'unknown';
        if (!marketplaceStats[marketplace]) {
            marketplaceStats[marketplace] = {
                sales: 0,
                revenue: 0
            };
        }
        marketplaceStats[marketplace].sales += 1;
        marketplaceStats[marketplace].revenue += sale.price;
    });
    
    // Сортируем площадки по выручке
    const sortedMarketplaces = Object.entries(marketplaceStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue);
    
    // Функция для названия площадки
    function getMarketplaceDisplayName(marketplace) {
        if (marketplace === 'funpay') return 'Funpay';
        if (marketplace === 'telegram') return 'Telegram';
        if (marketplace === 'avito') return 'Avito';
        return marketplace;
    }
    
    // Функция для цвета площадки
    function getMarketplaceColor(marketplace) {
        if (marketplace === 'funpay') return '#ff6b00';
        if (marketplace === 'telegram') return '#0088cc';
        if (marketplace === 'avito') return '#006cff';
        return '#64748b';
    }
    
    reportResults.innerHTML = `
        <!-- Секция статистики -->
        <div class="report-stats-section">
            <h2 style="margin-bottom: 30px; color: white !important; text-align: center;">
                📊 Отчет за всё время
            </h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalRevenue)} ₽</div>
                    <div class="stat-label">Общая выручка</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalPurchaseAmount)} ₽</div>
                    <div class="stat-label">Сумма закупа</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: ${netProfit >= 0 ? '#4ade80' : '#f87171'}">
                        ${formatNumber(netProfit)} ₽
                    </div>
                    <div class="stat-label">Чистая прибыль</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalSales}</div>
                    <div class="stat-label">Всего продаж</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(avgSale)} ₽</div>
                    <div class="stat-label">Средний чек</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalPurchaseAmount > 0 ? (totalRevenue / totalPurchaseAmount).toFixed(2) + 'x' : '0x'}</div>
                    <div class="stat-label">Окупаемость</div>
                </div>
            </div>
        </div>
        
        <!-- НОВОЕ: Статистика по площадкам -->
        <div class="section">
            <h3 style="margin-bottom: 25px;">🏪 Продажи по площадкам</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 20px;">
                ${sortedMarketplaces.map(([marketplace, stats]) => {
                const percent = totalRevenue > 0 ? ((stats.revenue / totalRevenue) * 100).toFixed(1) : 0;
                
                return `
                    <div style="
                        background: white;
                        padding: 20px;
                        border-radius: 10px;
                        border: 1px solid #e2e8f0;
                        border-top: 4px solid ${getMarketplaceColor(marketplace)};
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    ">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                            <div style="font-weight: 700; color: #2d3748; font-size: 1.1em;">
                                ${getMarketplaceDisplayName(marketplace)}
                            </div>
                            <div style="
                                background: ${getMarketplaceColor(marketplace)};
                                color: white;
                                padding: 3px 10px;
                                border-radius: 20px;
                                font-size: 0.85em;
                                font-weight: 600;
                            ">
                                ${stats.sales} продаж
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">
                                Выручка
                            </div>
                            <div style="font-size: 1.6em; font-weight: 800; color: #10b981;">
                                ${formatNumber(stats.revenue)} ₽
                            </div>
                        </div>
                        
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            margin-top: 15px;
                            padding-top: 15px;
                            border-top: 1px solid #f1f5f9;
                            color: #64748b;
                            font-size: 0.85em;
                        ">
                            <div>
                                ${percent}% от общей выручки
                            </div>
                            <div>
                                Средний чек: ${stats.sales > 0 ? formatNumber(stats.revenue / stats.sales) : 0} ₽
                            </div>
                        </div>
                    </div>
                `;
                }).join('')}
            </div>
        </div>
        
        <!-- Статистика по играм -->
        <div class="section">
            <h3 style="margin-bottom: 25px;">🎮 Статистика по играм</h3>
            ${getGamesStatsHTML(salesData, sortedGames)}
        </div>
        <!-- Подробный список продаж -->
        <div class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">💰 Все продажи (${totalSales})</h3>
                <button class="btn btn-primary btn-small" onclick="generateReport()">
                    🔄 Обновить список
                </button>
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px; font-size: 0.9em; color: #64748b;">
                    <span>🗑️</span>
                    <span>Кликните на иконку корзины чтобы удалить продажу (только свои или если вы админ)</span>
                </div>
            </div>
            
            ${getSalesListHTML(salesData)}
        </div>
    `;
}

function formatNumber(num) {
    return num.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function generatePositionsHTML(account, positionType, positionName, positionLabel) {
    const positionCount = account.positions[positionType] || 0;
    
    // Если позиций нет - возвращаем пустую строку
    if (positionCount === 0) return '';
    
    // Генерируем массив позиций
    const positionsHTML = Array(positionCount).fill().map((_, index) => {
        const positionNumber = index + 1;
        const saleInfo = getPositionSaleInfo(account.id, positionType, positionNumber);
        const isSold = !!saleInfo;
        
        // Форматируем дату продажи
        let displayDate = '';
        if (saleInfo) {
            if (saleInfo.datetime) {
                displayDate = saleInfo.datetime;
            } else if (saleInfo.date) {
                displayDate = saleInfo.date + (saleInfo.time ? ` ${saleInfo.time}` : '');
            } else if (saleInfo.timestamp) {
                const date = new Date(saleInfo.timestamp);
                displayDate = date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        // Информация о менеджере
        let managerHTML = '';
        if (saleInfo && saleInfo.soldByName) {
            const managerIcon = saleInfo.managerRole === 'admin' ? '👑' : '👷';
            managerHTML = `
                <div class="position-sale-manager ${saleInfo.managerRole === 'admin' ? 'admin' : 'worker'}">
                    ${saleInfo.soldByName} ${managerIcon}
                </div>
            `;
        }
        
        // Определяем дополнительные классы
        const soldClass = isSold ? 'sold' : '';
        const adminClass = (saleInfo && saleInfo.managerRole === 'admin') ? 'admin-sold' : '';
        
        return `
            <div class="position-single ${soldClass} ${adminClass}" 
                 onclick="handlePositionClick(${account.id}, '${positionType}', '${positionName}', ${positionNumber})"
                 title="${isSold ? `Продано: ${displayDate}${saleInfo.soldByName ? '\nМенеджер: ' + saleInfo.soldByName : ''}` : 'Свободно'}">
                ${positionNumber}
                ${isSold ? `
                    <div class="position-sale-info">
                        <div class="position-sale-date">${displayDate}</div>
                        ${managerHTML}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Возвращаем полную структуру группы позиций
    return `
        <div class="position-group">
            <div class="position-label">${positionLabel}:</div>
            <div class="position-buttons">
                ${positionsHTML}
            </div>
        </div>
    `;
}

// Новая функция для отображения статистики по играм
function getGamesStatsHTML(salesData, sortedGames) {
    if (sortedGames.length === 0) {
        return '<div class="empty">Нет данных по играм</div>';
    }
    
    // Рассчитываем закуп по каждой игре (ВСЕХ аккаунтов этой игры)
    const gamePurchases = {};
    
    // Считаем ВСЕ аккаунты каждой игры
    accounts.forEach(account => {
        if (account.gameName && account.gameName !== 'Свободный') {
            if (!gamePurchases[account.gameName]) {
                gamePurchases[account.gameName] = 0;
            }
            gamePurchases[account.gameName] += (account.purchaseAmount || 0);
        }
    });
    
    return sortedGames.map(([gameName, stats]) => {
        const gamePurchaseAmount = gamePurchases[gameName] || 0;
        const gameProfit = stats.revenue - gamePurchaseAmount;
        
        // Найдем сколько всего аккаунтов у этой игры
        const gameAccounts = accounts.filter(acc => acc.gameName === gameName);
        const totalGameAccounts = gameAccounts.length;
        
        // Сколько аккаунтов продано
        const soldAccounts = [...new Set(salesData
            .filter(sale => sale.gameName === gameName)
            .map(sale => sale.accountId)
        )].length;
        
        return `
            <div class="game-stat-card" style="
                background: white;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #f1f5f9;
                ">
                    <h4 style="margin: 0; font-size: 1.3em; color: #2d3748;">${gameName}</h4>
                    <span style="
                        font-weight: 700;
                        font-size: 1.2em;
                        color: ${gameProfit >= 0 ? '#10b981' : '#ef4444'};
                    ">
                        ${gameProfit.toFixed(0)} ₽ ${gameProfit >= 0 ? 'прибыли' : 'убытка'}
                    </span>
                </div>
                
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                ">
                    <div style="
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Выручка</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: #1e293b;">
                            ${stats.revenue.toFixed(0)} ₽
                        </div>
                    </div>
                    
                    <div style="
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Закуп (всех акк.)</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: #ef4444;">
                            ${gamePurchaseAmount.toFixed(0)} ₽
                        </div>
                    </div>
                    
                    <div style="
                        background: ${gameProfit >= 0 ? '#f0fdf4' : '#fef2f2'};
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid ${gameProfit >= 0 ? '#d1fae5' : '#fecaca'};
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Прибыль</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: ${gameProfit >= 0 ? '#10b981' : '#ef4444'};">
                            ${gameProfit.toFixed(0)} ₽
                        </div>
                    </div>
                    
                    <div style="
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Продажи</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: #1e293b;">
                            ${stats.sales}
                        </div>
                    </div>
                    
                    <div style="
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Средний чек</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: #1e293b;">
                            ${(stats.revenue / stats.sales).toFixed(0)} ₽
                        </div>
                    </div>
                    
                    <div style="
                        background: #eff6ff;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #dbeafe;
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Аккаунты</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: #2563eb;">
                            ${totalGameAccounts} всего
                        </div>
                        <div style="color: #64748b; font-size: 0.8em;">
                            ${soldAccounts} продано
                        </div>
                    </div>
                </div>
                
                <!-- Прогресс-бар продаж -->
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9em; color: #64748b;">
                        <span>Прогресс продаж:</span>
                        <span>${soldAccounts}/${totalGameAccounts} (${totalGameAccounts > 0 ? Math.round((soldAccounts / totalGameAccounts) * 100) : 0}%)</span>
                    </div>
                    <div style="
                        width: 100%;
                        height: 8px;
                        background: #e2e8f0;
                        border-radius: 4px;
                        overflow: hidden;
                    ">
                        <div style="
                            width: ${totalGameAccounts > 0 ? (soldAccounts / totalGameAccounts) * 100 : 0}%;
                            height: 100%;
                            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                            border-radius: 4px;
                        "></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Новая функция для отображения списка продаж
function getSalesListHTML(salesData) {
    if (!salesData || salesData.length === 0) {
        return '<div class="empty" style="padding: 40px; text-align: center; color: #64748b;">Нет продаж</div>';
    }
    
    try {
        // Сортируем по дате (новые сверху)
        const sortedSales = [...salesData].sort((a, b) => {
            try {
                const dateA = new Date(a.datetime || a.timestamp || a.date || 0);
                const dateB = new Date(b.datetime || b.timestamp || b.date || 0);
                return dateB - dateA;
            } catch (e) {
                return 0;
            }
        });
        
        // Безопасное получение данных пользователя
        let currentUser = null;
        let isAdmin = false;
        try {
            if (typeof security !== 'undefined' && security.getCurrentUser) {
                currentUser = security.getCurrentUser();
                isAdmin = currentUser && currentUser.role === 'admin';
            }
        } catch (e) {
            console.warn('Не удалось получить данные пользователя:', e);
        }
        
        // Безопасное получение accounts
        let accountsArray = [];
        try {
            if (typeof accounts !== 'undefined') {
                accountsArray = accounts;
            } else {
                const localAccounts = localStorage.getItem('accounts');
                accountsArray = localAccounts ? JSON.parse(localAccounts) : [];
            }
        } catch (e) {
            console.warn('Не удалось получить аккаунты:', e);
        }
        
        // Рассчитываем статистику
        const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.price || 0), 0);
        const totalCommission = salesData
            .filter(s => s.marketplace === 'funpay')
            .reduce((sum, sale) => sum + (sale.commission || 0), 0);
        
        // Создаем HTML таблицы
        let tableRows = '';
        
        sortedSales.forEach(sale => {
            try {
                // Безопасное получение данных аккаунта
                const account = accountsArray.find(acc => acc && acc.id === sale.accountId);
                const purchaseAmount = account ? (account.purchaseAmount || 0) : (sale.purchaseAmount || 0);
                
                // Проверяем права на удаление
                const canDelete = isAdmin || (currentUser && sale.soldBy === currentUser.username);
                
                // Форматируем отображение цены с учетом комиссии
                let priceDisplay = `${sale.price || 0} ₽`;
                if (sale.marketplace === 'funpay' && sale.commission) {
                    priceDisplay = `
                        <div style="font-weight: 600; color: #1e293b;">${sale.price || 0} ₽</div>
                        <div style="font-size: 0.85em; color: #64748b;">
                            комиссия: -${sale.commission} ₽
                        </div>
                    `;
                }
                
                // Форматируем дату
                let displayDate = '';
                try {
                    if (sale.datetime) {
                        displayDate = sale.datetime;
                    } else if (sale.date) {
                        displayDate = sale.date;
                        if (sale.time) {
                            displayDate += ` ${sale.time}`;
                        }
                    } else if (sale.timestamp) {
                        displayDate = new Date(sale.timestamp).toLocaleDateString('ru-RU');
                    }
                } catch (e) {
                    displayDate = 'Дата не указана';
                }
                
                // Название площадки
                const marketplaceName = sale.marketplace === 'funpay' ? 'Funpay' : 
                                       sale.marketplace === 'telegram' ? 'Telegram' : 
                                       sale.marketplace === 'avito' ? 'Avito' : 
                                       sale.marketplace || 'Не указано';
                
                // Цвет для площадки
                let marketplaceStyle = '';
                if (sale.marketplace === 'funpay') {
                    marketplaceStyle = 'background: #fef3c7; color: #92400e; border-color: #fbbf24;';
                } else if (sale.marketplace === 'telegram') {
                    marketplaceStyle = 'background: #dbeafe; color: #1e40af; border-color: #93c5fd;';
                } else if (sale.marketplace === 'avito') {
                    marketplaceStyle = 'background: #f0f9ff; color: #0c4a6e; border-color: #7dd3fc;';
                } else {
                    marketplaceStyle = 'background: #f1f5f9; color: #374151; border-color: #e2e8f0;';
                }
                
                // ===== СТИЛЬ ДЛЯ СВОБОДНЫХ ПРОДАЖ =====
                let rowStyle = '';
                let typeBadge = '';
                
                if (sale.isFreeSale) {
                    rowStyle = 'background: #fff7ed; border-left: 3px solid #f97316;';
                    typeBadge = `
                        <span style="
                            display: inline-block;
                            background: #f97316;
                            color: white;
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 0.7em;
                            font-weight: 600;
                            margin-left: 8px;
                        ">
                            🆓
                        </span>
                    `;
                }
                // ===== КОНЕЦ СТИЛЯ =====
                
                // ВАЖНО: добавляем data-sale-id к строке таблицы для анимации удаления
                tableRows += `
                    <tr data-sale-id="${sale.id}" style="border-bottom: 1px solid #e2e8f0; transition: all 0.3s ease; ${rowStyle}">
                        <td style="padding: 12px 15px; color: #64748b; font-size: 0.9em;">
                            ${displayDate}
                            ${typeBadge}
                        </td>
                        <td style="padding: 12px 15px; font-weight: 500;">${sale.gameName || 'Не указано'}</td>
                        <td style="padding: 12px 15px; font-weight: 500;">${sale.accountLogin || 'Не указано'}</td>
                        <td style="padding: 12px 15px; font-weight: 500;">${sale.positionName || 'Не указано'}</td>
                        <td style="padding: 12px 15px;">
                            ${priceDisplay}
                            ${purchaseAmount > 0 ? `
                                <div style="font-size: 0.85em; color: #64748b;">
                                    закуп: ${purchaseAmount} ₽
                                </div>
                            ` : ''}
                        </td>
                        <td style="padding: 12px 15px;">
                            <span style="
                                padding: 4px 10px;
                                border-radius: 12px;
                                font-size: 0.85em;
                                font-weight: 600;
                                border: 1px solid;
                                ${marketplaceStyle}
                            ">
                                ${marketplaceName}
                                ${sale.marketplace === 'funpay' ? ' (3%)' : ''}
                            </span>
                        </td>
                        <td style="padding: 12px 15px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 500;">${sale.soldByName || sale.soldBy || 'Неизвестно'}</span>
                                ${sale.managerRole === 'admin' ? 
                                    '<span style="color: #f72585; font-size: 1.2em;">👑</span>' : 
                                    '<span style="color: #4361ee; font-size: 1.2em;">👷</span>'}
                            </div>
                        </td>
                        <td style="padding: 12px 15px; text-align: center;">
                            <button onclick="deleteSaleFromReports('${sale.id}')" 
                                    data-sale-id="${sale.id}"
                                        style="
                                            background: #ef4444;
                                            color: white;
                                            border: none;
                                            width: 30px;
                                            height: 30px;
                                            border-radius: 6px;
                                            cursor: pointer;
                                            font-size: 16px;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            transition: all 0.2s;
                                        "
                                        onmouseover="this.style.background='#dc2626'; this.style.transform='scale(1.1)'"
                                        onmouseout="this.style.background='#ef4444'; this.style.transform='scale(1)'"
                                        title="Удалить продажу ${sale.accountLogin} за ${sale.price} ₽">
                                    🗑️
                                </button>
                        </td>
                    </tr>
                `;
            } catch (error) {
                console.error('Ошибка при создании строки таблицы:', error);
                // Пропускаем проблемную запись
            }
        });
        
        return `
            <div style="
                max-height: 500px;
                overflow-y: auto;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 10px;
                background: white;
            ">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="
                            background: #f1f5f9;
                            position: sticky;
                            top: 0;
                            z-index: 10;
                            border-bottom: 2px solid #cbd5e1;
                        ">
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151;">Дата</th>
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151;">Игра</th>
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151;">Аккаунт</th>
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151;">Позиция</th>
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151;">Цена</th>
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151;">Площадка</th>
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151;">Менеджер</th>
                            <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #374151; width: 50px;">🗑️</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                
                <div style="
                    padding: 15px;
                    margin-top: 15px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    font-size: 0.9em;
                    color: #64748b;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <strong>Всего продаж:</strong> ${salesData.length}
                        </div>
                        <div>
                            <strong>Выручка:</strong> ${totalRevenue.toLocaleString('ru-RU')} ₽
                        </div>
                        <div>
                            <strong>Комиссия Funpay:</strong> ${totalCommission.toLocaleString('ru-RU')} ₽
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Критическая ошибка в getSalesListHTML:', error);
        return `
            <div style="
                padding: 40px;
                text-align: center;
                background: #fef2f2;
                border-radius: 10px;
                border: 1px solid #fecaca;
                color: #991b1b;
            ">
                <div style="font-size: 3em; margin-bottom: 15px;">⚠️</div>
                <h3 style="color: #dc2626; margin-bottom: 10px;">Ошибка при загрузке продаж</h3>
                <p>${error.message || 'Неизвестная ошибка'}</p>
                <button onclick="location.reload()" 
                        style="
                            margin-top: 15px;
                            padding: 10px 20px;
                            background: #dc2626;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        ">
                    Обновить страницу
                </button>
            </div>
        `;
    }
}
// ИСПОЛЬЗУЙТЕ ЭТУ ВЕРСИЮ:
async function deleteSaleFromReports(saleId) {
    console.log(`📊 Удаление продажи из отчетов: ${saleId}`);
    
    // Проверяем ID
    if (!saleId) {
        console.error('❌ ID продажи не указан');
        showNotification('Ошибка: ID продажи не указан', 'error');
        return;
    }
    
    // Находим продажу
    const sale = sales.find(s => s.id === saleId);
    if (!sale) {
        console.error(`❌ Продажа ${saleId} не найдена в массиве sales`);
        
        // Пробуем найти в localStorage
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        const localSale = localSales.find(s => s.id === saleId);
        
        if (!localSale) {
            showNotification('Продажа не найдена в системе', 'error');
            return;
        }
        
        console.log('✅ Найдена в localStorage, обновляю память...');
        sales = localSales;
    }
    
    // Проверяем права пользователя
    const currentUser = security.getCurrentUser();
    if (!currentUser) {
        showNotification('❌ Пользователь не авторизован', 'error');
        return;
    }

    const canDelete = true;
    
    // Подтверждение удаления
    if (!confirm(`Удалить продажу аккаунта "${sale.accountLogin}" за ${sale.price} ₽?\nДата: ${sale.date || 'не указана'}\nЭто действие нельзя отменить.`)) {
        return;
    }
    
    try {
        console.log(`✅ Начинаю удаление продажи ${saleId}...`);
        
        // 1. Удаляем из локального массива
        const originalCount = sales.length;
        sales = sales.filter(s => s.id !== saleId);
        console.log(`✅ Удалено из памяти. Было: ${originalCount}, стало: ${sales.length}`);
        
        // 2. Сохраняем локально
        localStorage.setItem('sales', JSON.stringify(sales));
        console.log('✅ Сохранено в localStorage');
        
        // 3. Удаляем из Firebase (если подключен)
        let firebaseDeleted = false;
        let firebaseError = null;
        
        if (firebase && firebase.database) {
            try {
                const db = firebase.database();
                await db.ref('sales/' + saleId).remove();
                firebaseDeleted = true;
                console.log(`✅ Продажа удалена из Firebase: ${saleId}`);
            } catch (error) {
                firebaseError = error;
                console.error('❌ Ошибка удаления из Firebase:', error);
                // Продолжаем работу, продажа уже удалена локально
            }
        } else if (window.dataSync && window.dataSync.saveData) {
            // Используем dataSync для синхронизации
            try {
                await window.dataSync.saveData('sales', sales);
                firebaseDeleted = true;
                console.log('✅ Продажи синхронизированы через dataSync');
            } catch (error) {
                firebaseError = error;
                console.error('❌ Ошибка синхронизации через dataSync:', error);
            }
        }
        
        // 4. Плавное удаление из таблицы UI
        const row = document.querySelector(`[data-sale-id="${saleId}"]`);
        if (row) {
            // Добавляем класс для анимации
            row.classList.add('sale-row-removing');
            
            // Удаляем после анимации
            setTimeout(() => {
                row.remove();
                console.log('✅ Строка удалена из UI с анимацией');
            }, 500);
        }
        
        // 5. Обновляем статистику
        updateReportStatsAfterDeletion(sale.price);
        
        // 6. Показываем уведомление
        if (firebaseDeleted) {
            showNotification(`✅ Продажа "${sale.accountLogin}" удалена из системы!`, 'success');
        } else if (firebaseError) {
            showNotification(`⚠️ Продажа удалена локально (ошибка синхронизации: ${firebaseError.message})`, 'warning');
        } else {
            showNotification(`✅ Продажа "${sale.accountLogin}" удалена локально`, 'info');
        }
        
        // 7. Если таблица пустая, обновляем всю страницу
        setTimeout(() => {
            const tbody = document.querySelector('.stats-table tbody');
            if (tbody && tbody.children.length === 0) {
                console.log('📊 Таблица пустая, обновляю страницу...');
                setTimeout(() => {
                    generateReport();
                }, 500);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Критическая ошибка при удалении:', error);
        showNotification('❌ Ошибка при удалении продажи', 'error');
    }
}

function updateReportStatsAfterDeletion(deletedPrice) {
    // Обновляем общие цифры в отчете
    const totalSales = sales.length;
    const header = document.querySelector('.section h3');
    if (header && header.textContent.includes('Все продажи')) {
        header.textContent = `💰 Все продажи (${totalSales})`;
    }
    
    // Обновляем статистические карточки если они есть
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 3) {
        // Карточка "Всего продаж"
        if (statCards[2].querySelector('.stat-value')) {
            statCards[2].querySelector('.stat-value').textContent = totalSales;
        }
        
        // Пересчитываем выручку
        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
        if (statCards[0].querySelector('.stat-value')) {
            statCards[0].querySelector('.stat-value').textContent = `${totalRevenue.toLocaleString('ru-RU')} ₽`;
        }
        
        // Пересчитываем средний чек
        const avgCheck = totalSales > 0 ? totalRevenue / totalSales : 0;
        if (statCards.length >= 5 && statCards[4].querySelector('.stat-value')) {
            statCards[4].querySelector('.stat-value').textContent = `${avgCheck.toLocaleString('ru-RU')} ₽`;
        }
    }
    
    console.log('📊 Статистика обновлена после удаления');
}

// Добавьте функцию обновления статистики
function updateReportStats() {
    const totalSales = sales.length;
    const header = document.querySelector('.section h3');
    if (header) {
        header.textContent = `💰 Все продажи (${totalSales})`;
    }
    
    // Обновляем общие цифры если они есть
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const totalElements = document.querySelectorAll('.stat-value');
    if (totalElements.length >= 3) {
        totalElements[0].textContent = `${totalRevenue.toLocaleString('ru-RU')} ₽`;
        totalElements[2].textContent = totalSales;
    }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function loadGamesForSelect() {
    const select = document.getElementById('accountGame');
    if (!select) return;
    
    // Всегда обновляем games из localStorage перед показом
    const freshGames = JSON.parse(localStorage.getItem('games')) || [];
    games = freshGames;
    
    console.log('🔄 Загружаем игры для селекта:', freshGames.length);
    
    // Сохраняем текущее значение
    const currentValue = select.value;
    
    // Очищаем и заполняем заново
    select.innerHTML = '<option value="">Выберите игру</option>';
    
    // Добавляем все игры
    freshGames.forEach(game => {
        const option = document.createElement('option');
        option.value = game.id;
        option.textContent = game.name;
        select.appendChild(option);
    });
    
    // Добавляем опцию "Свободный"
    const freeOption = document.createElement('option');
    freeOption.value = 0;
    freeOption.textContent = 'Свободный';
    select.appendChild(freeOption);
    
    // Восстанавливаем выбранное значение если нужно
    if (currentValue) {
        select.value = currentValue;
    }
    
    console.log('✅ Селект игр обновлен, игр:', freshGames.length);
}

function loadGamesForFilter() {
    const filter = document.getElementById('filterGame');
    if (filter) {
        filter.innerHTML = '<option value="">Все игры</option>' +
            games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
    }
}

// Обработчики кликов вне модальных окон
window.onclick = function(event) {
    const editModal = document.getElementById('editModal');
    const saleModal = document.getElementById('saleModal');
    const editFreeModal = document.getElementById('editFreeModal');
    
    if (event.target === editModal) closeModal();
    if (event.target === saleModal) closeSaleModal();
    if (event.target === editFreeModal) closeFreeModal();
}

// Горячие клавиши
document.addEventListener('keydown', function(e) {
    // ESC закрывает модальные окна
    if (e.key === 'Escape') {
        closeModal();
        closeSaleModal();
        closeFreeModal();
    }
    
    // Ctrl+S - сохранить
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (document.getElementById('editAccountId')) {
            saveAccountChanges();
        }
    }
    
    // F5 - синхронизировать
    if (e.key === 'F5') {
        e.preventDefault();
        const syncBtn = document.getElementById('syncButton');
        if (syncBtn) syncBtn.click();
    }
});

// ==================== ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ====================

// Автоматическое создание кнопки темы
(function() {
    // Проверяем сохраненную тему
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Ждем полной загрузки страницы
    window.addEventListener('load', function() {
        // Создаем кнопку если её нет
        if (!document.querySelector('.theme-toggle')) {
            const themeToggle = document.createElement('div');
            themeToggle.className = 'theme-toggle';
            themeToggle.innerHTML = `
                <button class="theme-btn" onclick="toggleTheme()">
                    <span id="themeIcon">${document.body.classList.contains('dark-theme') ? '☀️' : '🌙'}</span>
                </button>
            `;
            document.body.appendChild(themeToggle);
        }
    });
    
    // Глобальная функция переключения темы
    window.toggleTheme = function() {
        const body = document.body;
        const themeIcon = document.getElementById('themeIcon');
        
        body.classList.toggle('dark-theme');
        
        if (body.classList.contains('dark-theme')) {
            if (themeIcon) themeIcon.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        }
    };
})();

// ============================================
// СТАТИСТИКА ПО РАБОЧИМ (РАБОТНИКАМ)
// ============================================

function generateWorkersStats() {
    // Показываем статистику за всё время
    displayWorkersStatsPage(sales, 'все время', 'все время');
    showNotification('Показана статистика работников за всё время 📊', 'info');
}

function showAllTimeStats() {
    // Та же функция что и generateWorkersStats
    displayWorkersStatsPage(sales, 'все время', 'все время');
}

function displayWorkersStatsPage(periodSales, startDate, endDate) {
    const container = document.getElementById('workersStatsContainer');
    
    if (periodSales.length === 0) {
        container.innerHTML = `
            <div class="section">
                <h2>📊 Статистика работников за всё время</h2>
                <div class="empty">Нет продаж</div>
            </div>
        `;
        return;
    }
    
    // Получаем список всех работников
    const workers = JSON.parse(localStorage.getItem('workers')) || [];
    
    // Добавляем администратора, если он делал продажи
    const currentUser = security.getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
        const adminExists = workers.find(w => w.username === currentUser.username);
        if (!adminExists) {
            workers.push({
                username: currentUser.username,
                name: currentUser.name,
                role: 'admin',
                active: true
            });
        }
    }
    
    // Рассчитываем статистику для каждого работника
    const workersStats = calculateWorkersStatistics(workers, periodSales);
    
    // Сортируем по выручке (сначала лучшие)
    const sortedStats = workersStats.sort((a, b) => b.revenue - a.revenue);
    
    // Рассчитываем общую статистику
    const totalStats = calculateTotalStatistics(sortedStats);
    
    container.innerHTML = `
        <div class="section report-stats-section">
            <h2 style="color: white !important; text-align: center; margin-bottom: 30px;">
                📈 Статистика работников: ${startDate} - ${endDate}
            </h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${sortedStats.length}</div>
                    <div class="stat-label">Всего работников</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalStats.activeWorkers}</div>
                    <div class="stat-label">Активных</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalStats.totalRevenue.toLocaleString('ru-RU')} ₽</div>
                    <div class="stat-label">Общая выручка</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalStats.totalSales}</div>
                    <div class="stat-label">Всего продаж</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalStats.avgCheck.toLocaleString('ru-RU')} ₽</div>
                    <div class="stat-label">Средний чек</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalStats.bestWorkerName || 'Нет данных'}</div>
                    <div class="stat-label">Лучший работник</div>
                    ${totalStats.bestWorkerRevenue ? `
                        <div class="stat-sub">${totalStats.bestWorkerRevenue.toLocaleString('ru-RU')} ₽</div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="section">
            <h3>🏆 Рейтинг работников</h3>
            <div class="workers-ranking">
                ${generateWorkersRankingHTML(sortedStats)}
            </div>
        </div>
        
        <div class="section">
            <h3>📊 Подробная статистика по каждому работнику</h3>
            <div class="workers-detailed-stats">
                ${generateWorkersDetailedStatsHTML(sortedStats)}
            </div>
        </div>
        
        <div class="section">
            <h3>📅 Продажи по дням (график)</h3>
            <div class="workers-daily-stats">
                ${generateWorkersDailyStatsHTML(periodSales)}
            </div>
        </div>
    `;
}

function calculateWorkersStatistics(workers, periodSales) {
    return workers.map(worker => {
        // Находим все продажи этого работника
        const workerSales = periodSales.filter(sale => 
            sale.soldBy === worker.username || 
            (worker.role === 'admin' && sale.soldBy === 'Ivan') // Для совместимости
        );
        
        const revenue = workerSales.reduce((sum, sale) => sum + sale.price, 0);
        const salesCount = workerSales.length;
        const avgCheck = salesCount > 0 ? revenue / salesCount : 0;
        
        // Рассчитываем прибыль для этих продаж
        let profit = 0;
        workerSales.forEach(sale => {
            const account = accounts.find(acc => acc.id === sale.accountId);
            if (account) {
                const totalPositions = account.positions.p2_ps4 + account.positions.p3_ps4 + 
                                      account.positions.p2_ps5 + account.positions.p3_ps5;
                const costPerPosition = totalPositions > 0 ? (account.purchaseAmount || 0) / totalPositions : 0;
                profit += sale.price - costPerPosition;
            }
        });
        
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        
        // Группируем продажи по играм
        const gamesStats = {};
        workerSales.forEach(sale => {
            if (!gamesStats[sale.gameName]) {
                gamesStats[sale.gameName] = {
                    sales: 0,
                    revenue: 0
                };
            }
            gamesStats[sale.gameName].sales += 1;
            gamesStats[sale.gameName].revenue += sale.price;
        });
        
        // Находим лучшую игру
        const bestGame = Object.entries(gamesStats).sort((a, b) => b[1].revenue - a[1].revenue)[0];
        
        return {
            ...worker,
            revenue,
            sales: salesCount,
            avgCheck,
            profit,
            profitMargin,
            gamesStats,
            bestGame: bestGame ? {
                name: bestGame[0],
                revenue: bestGame[1].revenue,
                sales: bestGame[1].sales
            } : null,
            lastSale: workerSales.length > 0 ? 
                workerSales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null
        };
    });
}

function calculateTotalStatistics(workersStats) {
    const activeWorkers = workersStats.filter(w => w.active !== false).length;
    const totalRevenue = workersStats.reduce((sum, w) => sum + w.revenue, 0);
    const totalSales = workersStats.reduce((sum, w) => sum + w.sales, 0);
    const avgCheck = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Находим лучшего работника
    const bestWorker = workersStats.length > 0 ? 
        workersStats.sort((a, b) => b.revenue - a.revenue)[0] : null;
    
    return {
        activeWorkers,
        totalRevenue,
        totalSales,
        avgCheck,
        bestWorkerName: bestWorker ? bestWorker.name : null,
        bestWorkerRevenue: bestWorker ? bestWorker.revenue : 0
    };
}

function generateWorkersRankingHTML(workersStats) {
    // Фильтруем только тех, у кого есть продажи
    const workersWithSales = workersStats.filter(w => w.sales > 0);
    
    if (workersWithSales.length === 0) {
        return '<div class="empty">Нет данных о продажах работников</div>';
    }
    
    return `
        <div class="ranking-container">
            ${workersWithSales.map((worker, index) => {
                const rank = index + 1;
                const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
                const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                
                return `
                    <div class="ranking-item ${rankClass}" style="
                        display: flex;
                        align-items: center;
                        padding: 15px 20px;
                        margin-bottom: 10px;
                        background: white;
                        border-radius: 10px;
                        border: 1px solid #e2e8f0;
                        ${rankClass ? 'border-left: 4px solid;' : ''}
                        ${rankClass === 'gold' ? 'border-left-color: #ffd700;' : ''}
                        ${rankClass === 'silver' ? 'border-left-color: #c0c0c0;' : ''}
                        ${rankClass === 'bronze' ? 'border-left-color: #cd7f32;' : ''}
                    ">
                        <div style="
                            font-size: 1.5em;
                            font-weight: 700;
                            min-width: 50px;
                            text-align: center;
                            ${rankClass === 'gold' ? 'color: #ffd700;' : ''}
                            ${rankClass === 'silver' ? 'color: #c0c0c0;' : ''}
                            ${rankClass === 'bronze' ? 'color: #cd7f32;' : ''}
                        ">
                            ${rankIcon}
                        </div>
                        
                        <div style="flex: 1; padding: 0 20px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <strong style="font-size: 1.1em;">${worker.name}</strong>
                                <span style="
                                    padding: 2px 8px;
                                    border-radius: 10px;
                                    font-size: 0.8em;
                                    font-weight: 600;
                                    background: ${worker.role === 'admin' ? 
                                        'linear-gradient(135deg, #f72585 0%, #e63946 100%)' : 
                                        'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)'};
                                    color: white;
                                ">
                                    ${worker.role === 'admin' ? '👑 Админ' : '👷 Работник'}
                                </span>
                                ${worker.active === false ? 
                                    '<span style="color: #ef4444; font-size: 0.9em;">❌ Неактивен</span>' : ''}
                            </div>
                            <div style="color: #64748b; font-size: 0.9em;">
                                ${worker.sales} продаж • ${worker.revenue.toLocaleString('ru-RU')} ₽ • 
                                Средний чек: ${worker.avgCheck.toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                        
                        <div style="text-align: right;">
                            <div style="font-size: 1.4em; font-weight: 700; color: #10b981;">
                                ${worker.revenue.toLocaleString('ru-RU')} ₽
                            </div>
                            <div style="color: #64748b; font-size: 0.9em;">
                                Прибыль: ${worker.profit.toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        ${workersStats.length > workersWithSales.length ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 10px 0; color: #64748b;">👥 Без продаж:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${workersStats
                        .filter(w => w.sales === 0)
                        .map(w => `
                            <span style="
                                padding: 5px 12px;
                                background: ${w.active === false ? '#fef2f2' : '#f1f5f9'};
                                border-radius: 20px;
                                font-size: 0.9em;
                                color: ${w.active === false ? '#ef4444' : '#64748b'};
                                border: 1px solid ${w.active === false ? '#fecaca' : '#e2e8f0'};
                            ">
                                ${w.name} ${w.active === false ? '(неактивен)' : ''}
                            </span>
                        `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

function generateWorkersDetailedStatsHTML(workersStats) {
    return `
        <div class="detailed-stats-grid">
            ${workersStats.map(worker => `
                <div class="worker-detailed-card" style="
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 15px;
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #f1f5f9;
                    ">
                        <div>
                            <h4 style="margin: 0; color: #2d3748;">${worker.name}</h4>
                            <div style="color: #64748b; font-size: 0.9em; margin-top: 5px;">
                                ${worker.role === 'admin' ? '👑 Администратор' : '👷 Работник'} • 
                                ${worker.active === false ? '❌ Неактивен' : '✅ Активен'}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.3em; font-weight: 700; color: #10b981;">
                                ${worker.revenue.toLocaleString('ru-RU')} ₽
                            </div>
                            <div style="color: #64748b; font-size: 0.9em;">
                                ${worker.sales} продаж
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div style="
                            background: #f8fafc;
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                        ">
                            <div style="color: #64748b; font-size: 0.85em; margin-bottom: 5px;">Средний чек</div>
                            <div style="font-weight: 700; color: #1e293b;">
                                ${worker.avgCheck.toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                        
                        <div style="
                            background: #f0fdf4;
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid #d1fae5;
                        ">
                            <div style="color: #64748b; font-size: 0.85em; margin-bottom: 5px;">Прибыль</div>
                            <div style="font-weight: 700; color: #10b981;">
                                ${worker.profit.toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                        
                        <div style="
                            background: #f8fafc;
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                        ">
                            <div style="color: #64748b; font-size: 0.85em; margin-bottom: 5px;">Рентабельность</div>
                            <div style="font-weight: 700; color: ${worker.profitMargin >= 0 ? '#10b981' : '#ef4444'};">
                                ${worker.profitMargin.toFixed(1)}%
                            </div>
                        </div>
                        
                        ${worker.bestGame ? `
                            <div style="
                                background: #eff6ff;
                                padding: 12px;
                                border-radius: 8px;
                                border: 1px solid #dbeafe;
                            ">
                                <div style="color: #64748b; font-size: 0.85em; margin-bottom: 5px;">Лучшая игра</div>
                                <div style="font-weight: 700; color: #1e293b;">
                                    ${worker.bestGame.name}
                                </div>
                                <div style="color: #64748b; font-size: 0.8em;">
                                    ${worker.bestGame.revenue.toLocaleString('ru-RU')} ₽
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${worker.lastSale ? `
                        <div style="
                            margin-top: 15px;
                            padding-top: 15px;
                            border-top: 1px solid #f1f5f9;
                            font-size: 0.9em;
                            color: #64748b;
                        ">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Последняя продажа:</span>
                                <span style="font-weight: 600;">${worker.lastSale.gameName}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                <span>Дата:</span>
                                <span>${worker.lastSale.datetime || worker.lastSale.date || ''}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// СИСТЕМА КОММЕНТАРИЕВ ДЛЯ АККАУНТОВ
// ============================================


// Функция для добавления комментария к аккаунту
// Обновите функцию addCommentToAccount() для лучшей синхронизации:
function addCommentToAccount(accountId, commentText) {
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    if (accountIndex === -1) {
        showNotification('Аккаунт не найден', 'error');
        return false;
    }
    
    const currentUser = security.getCurrentUser();
    if (!currentUser) {
        showNotification('Пользователь не авторизован', 'error');
        return false;
    }
    
    const newComment = {
        id: Date.now(),
        text: commentText.trim(),
        author: currentUser.name,
        authorUsername: currentUser.username,
        role: currentUser.role,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('ru-RU'),
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    
    // Инициализируем массив комментариев если его нет
    if (!accounts[accountIndex].comments) {
        accounts[accountIndex].comments = [];
    }
    
    // Добавляем комментарий в начало массива
    accounts[accountIndex].comments.unshift(newComment);
    
    // Сохраняем изменения
    saveToStorage('accounts', accounts).then(result => {
        if (result.success) {
            showNotification('Комментарий сохранен', 'success');
        } else {
            showNotification('Комментарий сохранен локально', 'warning');
        }
    }).catch(error => {
        console.error('Ошибка сохранения комментария:', error);
    });
    
    // Обновляем отображение если мы на странице менеджера
    if (window.location.pathname.includes('manager.html')) {
        refreshAccountCommentsDisplay(accountId);
    }
    
    return true;
}

// Функция для удаления комментария
function deleteComment(accountId, commentId) {
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    if (accountIndex === -1) return false;
    
    if (!accounts[accountIndex].comments) return false;
    
    const commentIndex = accounts[accountIndex].comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return false;
    
    const comment = accounts[accountIndex].comments[commentIndex];
    const currentUser = security.getCurrentUser();
    
    // Проверяем права: автор или администратор может удалять
    if (comment.authorUsername !== currentUser.username && currentUser.role !== 'admin') {
        showNotification('Вы можете удалять только свои комментарии', 'error');
        return false;
    }
    
    if (confirm('Удалить этот комментарий?')) {
        accounts[accountIndex].comments.splice(commentIndex, 1);
        saveToStorage('accounts', accounts);
        
        // Обновляем отображение
        if (window.location.pathname.includes('manager.html')) {
            refreshAccountCommentsDisplay(accountId);
        }
        
        showNotification('Комментарий удален', 'info');
        return true;
    }
    
    return false;
}

function showAccountComments(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'commentsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="document.getElementById('commentsModal').remove()">&times;</span>
            
            <h3 style="margin-bottom: 15px;">
                💬 Комментарии к ${account.psnLogin}
            </h3>
            
            <div id="commentsList" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                ${(account.comments && account.comments.length > 0) ? 
                    account.comments.map(c => `
                        <div style="margin-bottom: 10px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-weight: 600;">${c.author}</div>
                            <div style="font-size: 12px; color: #64748b;">${c.date} ${c.time}</div>
                            <div>${c.text}</div>
                        </div>
                    `).join('') 
                    : '<div style="text-align: center; color: #94a3b8;">Нет комментариев</div>'
                }
            </div>
            
            <div>
                <textarea id="newCommentText" 
                          placeholder="Добавить комментарий..." 
                          rows="3"
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"></textarea>
                <button onclick="submitComment(${account.id})" 
                        style="width: 100%; padding: 10px; background: #4361ee; color: white; border: none; border-radius: 5px; margin-top: 10px;">
                    Добавить
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}



// Функция для отправки комментария
function submitComment(accountId) {
    const textarea = document.getElementById('newCommentText');
    const commentText = textarea.value.trim();
    
    if (!commentText) {
        showNotification('Введите текст комментария', 'warning');
        return;
    }
    
    if (addCommentToAccount(accountId, commentText)) {
        textarea.value = '';
        
        // Обновляем список комментариев
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            document.getElementById('commentsList').innerHTML = renderCommentsList(account.comments || [], account.id);
            // Прокручиваем вверх чтобы увидеть новый комментарий
            const commentsList = document.getElementById('commentsList');
            if (commentsList) {
                commentsList.scrollTop = 0;
            }
        }
        
        showNotification('Комментарий добавлен', 'success');
    }
}

// Функция для рендеринга списка комментариев
function renderCommentsList(comments, accountId) {
    if (!comments || comments.length === 0) {
        return `
            <div class="empty" style="text-align: center; padding: 40px 20px; color: #94a3b8;">
                <div style="font-size: 3em; margin-bottom: 15px;">💬</div>
                <h3 style="margin: 0 0 10px 0; color: #64748b;">Нет комментариев</h3>
                <p>Будьте первым, кто оставит комментарий</p>
            </div>
        `;
    }
    
    return comments.map(comment => `
        <div class="comment-item" style="
            background: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 15px;
            border: 1px solid #e2e8f0;
            position: relative;
        ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="
                        width: 32px;
                        height: 32px;
                        background: ${comment.role === 'admin' ? 
                            'linear-gradient(135deg, #f72585 0%, #e63946 100%)' : 
                            'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)'};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 600;
                        font-size: 14px;
                    ">
                        ${comment.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #2d3748;">${comment.author}</div>
                        <div style="font-size: 0.85em; color: #64748b;">
                            ${comment.date} в ${comment.time}
                            ${comment.role === 'admin' ? ' • 👑 Администратор' : ' • 👷 Работник'}
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 5px;">
                    ${comment.authorUsername === security.getCurrentUser()?.username || security.getCurrentUser()?.role === 'admin' ? `
                        <button onclick="deleteCommentFromModal(${comment.id}, ${accountId})" 
                                class="btn btn-small btn-danger" 
                                style="padding: 4px 8px; font-size: 12px;">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div style="color: #374151; line-height: 1.5; white-space: pre-wrap;">
                ${sanitizeHTML(comment.text)}
            </div>
        </div>
    `).join('');
}


// Вспомогательная функция для удаления комментария из модального окна
function deleteCommentFromModal(commentId, accountId) {
    if (deleteComment(accountId, commentId)) {
        // Обновляем отображение в модальном окне
        const account = accounts.find(acc => acc.id === accountId);
        if (account && document.getElementById('commentsList')) {
            document.getElementById('commentsList').innerHTML = renderCommentsList(account.comments || [], account.id);
        }
        
        // Также обновляем счетчик на карточке аккаунта
        refreshAccountCommentsDisplay(accountId);
    }
}

// Функция для обновления отображения комментариев на карточке аккаунта
function refreshAccountCommentsDisplay(accountId) {
    // Находим карточку аккаунта в результатах поиска
    const accountCard = document.querySelector(`[data-account-id="${accountId}"]`);
    if (!accountCard) return;
    
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Обновляем кнопку комментариев
    const commentsBtn = accountCard.querySelector('.comments-btn');
    if (commentsBtn) {
        const commentsCount = account.comments ? account.comments.length : 0;
        commentsBtn.innerHTML = `
            <span style="margin-right: 5px;">💬</span>
            ${commentsCount > 0 ? `
                <span class="comments-count" style="
                    background: #4361ee;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 600;
                ">${commentsCount}</span>
            ` : 'Комментарии'}
        `;
    }
}

// Обновите функцию showAllComments():
function showAllComments() {
    // Собираем все аккаунты с комментариями
    const accountsWithComments = accounts.filter(acc => 
        acc.comments && acc.comments.length > 0
    );
    
    if (accountsWithComments.length === 0) {
        showNotification('Нет комментариев в системе', 'info');
        return;
    }
    
    // Создаем модальное окно со всеми комментариями
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'allCommentsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; display: flex; flex-direction: column;">
            <span class="close" onclick="document.getElementById('allCommentsModal').remove()">&times;</span>
            
            <h2 style="margin-bottom: 20px; color: #2d3748; display: flex; align-items: center; gap: 10px;">
                <span>💬</span>
                Все комментарии (${accountsWithComments.reduce((sum, acc) => sum + acc.comments.length, 0)})
            </h2>
            
            <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Аккаунтов с комментариями:</strong> ${accountsWithComments.length}
                    </div>
                    <div>
                        <strong>Всего комментариев:</strong> ${accountsWithComments.reduce((sum, acc) => sum + acc.comments.length, 0)}
                    </div>
                </div>
            </div>
            
            <div id="allCommentsList" style="flex: 1; overflow-y: auto; padding-right: 10px;">
                ${accountsWithComments.map(account => `
                    <div class="account-comments-section" style="margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #2d3748; display: flex; align-items: center; gap: 10px;">
                            <span>🎮</span>
                            ${account.gameName} - ${account.psnLogin}
                            <span style="font-size: 0.8em; background: #e2e8f0; padding: 2px 10px; border-radius: 12px;">
                                ${account.comments.length} коммент.
                            </span>
                        </h3>
                        
                        ${account.comments.map(comment => `
                            <div class="comment-item" style="margin-bottom: 10px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <strong style="color: #2d3748;">${comment.author}</strong>
                                        <span style="font-size: 0.85em; color: #64748b;">
                                            ${comment.date} в ${comment.time}
                                        </span>
                                    </div>
                                    ${comment.authorUsername === security.getCurrentUser()?.username || security.getCurrentUser()?.role === 'admin' ? `
                                        <button onclick="deleteComment(${account.id}, ${comment.id})" 
                                                class="btn btn-small btn-danger" 
                                                style="padding: 2px 6px; font-size: 11px;">
                                            🗑️
                                        </button>
                                    ` : ''}
                                </div>
                                <div style="color: #374151; line-height: 1.4; font-size: 0.95em;">
                                    ${sanitizeHTML(comment.text)}
                                </div>
                            </div>
                        `).join('')}
                        
                        <div style="margin-top: 15px;">
                            <textarea id="newCommentFor${account.id}" 
                                      placeholder="Добавить комментарий к этому аккаунту..." 
                                      rows="2"
                                      style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;"></textarea>
                            <button onclick="addCommentFromAllModal(${account.id})" 
                                    class="btn btn-small btn-primary" 
                                    style="margin-top: 5px; font-size: 12px;">
                                Добавить комментарий
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                <button class="btn btn-secondary" onclick="document.getElementById('allCommentsModal').remove()">
                    Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function generateWorkersDailyStatsHTML(periodSales) {
    // Группируем продажи по дням и менеджерам
    const dailyStats = {};
    
    periodSales.forEach(sale => {
        const date = sale.date || new Date(sale.timestamp).toISOString().split('T')[0];
        const manager = sale.soldByName || 'Неизвестно';
        
        if (!dailyStats[date]) {
            dailyStats[date] = {};
        }
        
        if (!dailyStats[date][manager]) {
            dailyStats[date][manager] = {
                sales: 0,
                revenue: 0
            };
        }
        
        dailyStats[date][manager].sales += 1;
        dailyStats[date][manager].revenue += sale.price;
    });
    
    // Сортируем даты
    const sortedDates = Object.keys(dailyStats).sort((a, b) => b.localeCompare(a));
    
    if (sortedDates.length === 0) {
        return '<div class="empty">Нет данных о продажах по дням</div>';
    }
    
    // Получаем список всех менеджеров за период
    const allManagers = new Set();
    Object.values(dailyStats).forEach(day => {
        Object.keys(day).forEach(manager => allManagers.add(manager));
    });
    const managersList = Array.from(allManagers);
    
    return `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1;">Дата</th>
                        ${managersList.map(manager => `
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #cbd5e1;">${manager}</th>
                        `).join('')}
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #cbd5e1;">Итого за день</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedDates.map(date => {
                        const dayStats = dailyStats[date];
                        const dayTotal = Object.values(dayStats).reduce((sum, stat) => sum + stat.revenue, 0);
                        
                        return `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 12px; font-weight: 600; color: #2d3748;">${date}</td>
                                ${managersList.map(manager => {
                                    const managerStats = dayStats[manager];
                                    if (!managerStats) {
                                        return '<td style="padding: 12px; text-align: center; color: #94a3b8;">-</td>';
                                    }
                                    
                                    return `
                                        <td style="padding: 12px; text-align: center;">
                                            <div style="font-weight: 700; color: #1e293b;">${managerStats.revenue.toLocaleString('ru-RU')} ₽</div>
                                            <div style="font-size: 0.8em; color: #64748b;">${managerStats.sales} продаж</div>
                                        </td>
                                    `;
                                }).join('')}
                                <td style="padding: 12px; text-align: right; font-weight: 700; color: #10b981;">
                                    ${dayTotal.toLocaleString('ru-RU')} ₽
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        
        <div style="
            margin-top: 20px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
        ">
            <h4 style="margin: 0 0 10px 0; color: #2d3748;">📊 Итоги по менеджерам:</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                ${managersList.map(manager => {
                    const managerSales = periodSales.filter(s => 
                        s.soldByName === manager || (manager === 'Неизвестно' && !s.soldByName)
                    );
                    const managerRevenue = managerSales.reduce((sum, s) => sum + s.price, 0);
                    
                    return `
                        <div style="
                            background: white;
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                        ">
                            <div style="font-weight: 600; color: #2d3748; margin-bottom: 5px;">${manager}</div>
                            <div style="color: #64748b; font-size: 0.9em;">
                                ${managerSales.length} продаж • ${managerRevenue.toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ============================================
// ФУНКЦИИ ДЛЯ ДИАГНОСТИКИ ПРОБЛЕМЫ С ПРОДАЖАМИ
// ============================================

// Функция для поиска "призрачной" продажи
function findGhostSale() {
    console.log('👻 Поиск проблемных продаж...');
    
    // 1. Проверяем локальный массив
    console.log('📊 Локальный массив sales:', sales.length);
    
    // 2. Проверяем localStorage
    const localSales = JSON.parse(localStorage.getItem('sales')) || [];
    console.log('💾 localStorage sales:', localSales.length);
    
    // 3. Ищем расхождения
    if (sales.length !== localSales.length) {
        console.warn(`⚠️ Расхождение данных! Локально: ${sales.length}, localStorage: ${localSales.length}`);
        
        // Находим ID, которые есть в localStorage, но нет в локальном массиве
        const localIds = localSales.map(s => s.id);
        const memIds = sales.map(s => s.id);
        
        const missingInMemory = localIds.filter(id => !memIds.includes(id));
        const missingInLocal = memIds.filter(id => !localIds.includes(id));
        
        if (missingInMemory.length > 0) {
            console.log('❌ Продажи в localStorage, но не в памяти:', missingInMemory);
            const ghostSales = localSales.filter(s => missingInMemory.includes(s.id));
            console.log('👻 Призрачные продажи:', ghostSales);
            
            // Показываем пользователю
            alert(`Найдено ${missingInMemory.length} призрачных продаж в localStorage! Проверьте консоль.`);
            return ghostSales;
        }
        
        if (missingInLocal.length > 0) {
            console.log('❌ Продажи в памяти, но не в localStorage:', missingInLocal);
        }
    }
    
    console.log('✅ Проверка завершена');
    return [];
}

// Функция для принудительной синхронизации продаж
async function forceSyncSales() {
    console.log('🔄 Принудительная синхронизация продаж...');
    
    try {
        // 1. Загружаем из localStorage как основной источник
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        
        // 2. Обновляем локальный массив
        sales = localSales;
        
        // 3. Сохраняем в Firebase
        if (window.dataSync && window.dataSync.saveData) {
            await window.dataSync.saveData('sales', sales);
        }
        
        // 4. Обновляем отображение
        refreshSearchResultsAfterSaleUpdate();
        
        console.log(`✅ Продажи синхронизированы: ${sales.length} записей`);
        showNotification(`Продажи синхронизированы: ${sales.length} записей`, 'success');
        
        return sales;
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        showNotification('Ошибка синхронизации', 'error');
        return sales;
    }
}

// Функция для восстановления удалённой продажи
async function recoverGhostSale(saleId) {
    console.log(`🔄 Восстановление продажи ${saleId}...`);
    
    try {
        // 1. Ищем продажу в localStorage
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        const ghostSale = localSales.find(s => s.id === saleId);
        
        if (!ghostSale) {
            showNotification('Продажа не найдена в localStorage', 'error');
            return false;
        }
        
        console.log('👻 Найдена призрачная продажа:', ghostSale);
        
        // 2. Добавляем обратно в массив
        const exists = sales.find(s => s.id === saleId);
        if (!exists) {
            sales.push(ghostSale);
            console.log('✅ Продажа добавлена в массив');
        }
        
        // 3. Сохраняем
        await saveToStorage('sales', sales);
        
        // 4. Обновляем отображение
        refreshSearchResultsAfterSaleUpdate();
        
        showNotification(`Продажа ${saleId} восстановлена!`, 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка восстановления:', error);
        showNotification('Ошибка восстановления продажи', 'error');
        return false;
    }
}

// Функция для полной очистки "призрачных" продаж
async function cleanGhostSales() {
    console.log('🧹 Очистка призрачных продаж...');
    
    if (!confirm('Очистить все несоответствия в данных продаж? Это может удалить некоторые записи.')) {
        return;
    }
    
    try {
        // 1. Берём localStorage как источник истины
        const localSales = JSON.parse(localStorage.getItem('sales')) || [];
        
        // 2. Обновляем глобальный массив
        const originalCount = sales.length;
        sales = localSales;
        
        // 3. Сохраняем
        await saveToStorage('sales', sales);
        
        // 4. Обновляем отображение
        refreshSearchResultsAfterSaleUpdate();
        
        const diff = originalCount - sales.length;
        console.log(`✅ Очистка завершена. Удалено записей: ${diff}`);
        
        if (diff > 0) {
            showNotification(`Очищено ${diff} призрачных продаж`, 'success');
        } else {
            showNotification('Несоответствий не найдено', 'info');
        }
        
    } catch (error) {
        console.error('❌ Ошибка очистки:', error);
        showNotification('Ошибка очистки', 'error');
    }
}

// Добавьте кнопку диагностики в UI
function addDiagnosticButton() {
    const nav = document.querySelector('.nav-buttons');
    if (!nav) return;
    
    if (!document.querySelector('#diagnosticBtn')) {
        const diagnosticBtn = document.createElement('button');
        diagnosticBtn.id = 'diagnosticBtn';
        diagnosticBtn.className = 'btn btn-warning';
        diagnosticBtn.innerHTML = '🔍 Диагностика';
        diagnosticBtn.onclick = function() {
            openDiagnosticModal();
        };
        
        // Добавляем кнопку в навигацию
        const syncBtn = nav.querySelector('#syncButton');
        if (syncBtn) {
            nav.insertBefore(diagnosticBtn, syncBtn);
        } else {
            nav.appendChild(diagnosticBtn);
        }
    }
}

// Модальное окно диагностики
function openDiagnosticModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'diagnosticModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <span class="close" onclick="document.getElementById('diagnosticModal').remove()">&times;</span>
            
            <h2 style="margin-bottom: 20px; color: #2d3748;">
                <span style="margin-right: 10px;">🔍</span>
                Диагностика системы продаж
            </h2>
            
            <div id="diagnosticResults" style="
                background: #f8fafc;
                padding: 20px;
                border-radius: 10px;
                border: 1px solid #e2e8f0;
                margin-bottom: 20px;
                max-height: 300px;
                overflow-y: auto;
                font-family: 'Courier New', monospace;
                font-size: 12px;
            ">
                Запустите проверку...
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <button class="btn btn-primary" onclick="runSalesDiagnostic()">
                    🔍 Проверить продажи
                </button>
                <button class="btn btn-success" onclick="forceSyncSales().then(() => runSalesDiagnostic())">
                    🔄 Синхронизировать
                </button>
                <button class="btn btn-warning" onclick="findGhostSale()">
                    👻 Найти призрачные
                </button>
                <button class="btn btn-danger" onclick="cleanGhostSales()">
                    🧹 Очистить ошибки
                </button>
            </div>
            
            <div style="
                padding: 15px;
                background: #fef3c7;
                border-radius: 8px;
                border: 1px solid #fbbf24;
                color: #92400e;
                font-size: 0.9em;
            ">
                <strong>⚠️ Внимание:</strong> Функция "Очистить ошибки" может удалить продажи, 
                которые есть в localStorage, но отсутствуют в памяти. Используйте осторожно!
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Автоматически запускаем диагностику
    setTimeout(runSalesDiagnostic, 300);
}

// ============================================
// ПАРСИНГ АККАУНТА ИЗ БУФЕРА ОБМЕНА
// ============================================
async function pasteFromClipboard() {
    try {
        // Пытаемся прочитать текст из буфера обмена
        const text = await navigator.clipboard.readText();
        if (!text) {
            showNotification('Буфер обмена пуст', 'warning');
            return;
        }

        // Разбираем текст на поля
        const lines = text.split('\n');
        const data = {};

        lines.forEach(line => {
            line = line.trim();
            
            // Почта для входа Playstation: ...
            if (line.includes('Почта для входа Playstation:')) {
                const match = line.match(/Почта для входа Playstation:\s*(.+)/);
                if (match) {
                    const email = match[1].trim();
                    document.getElementById('psnLogin').value = email;
                    document.getElementById('email').value = email;
                }
            }
            
            // Пароль для входа Playstation: ...
            else if (line.includes('Пароль для входа Playstation:')) {
                const match = line.match(/Пароль для входа Playstation:\s*(.+)/);
                if (match) {
                    document.getElementById('psnPassword').value = match[1].trim();
                }
            }
            
            // Почта пароль: ...
            else if (line.includes('Почта пароль:')) {
                const match = line.match(/Почта пароль:\s*(.+)/);
                if (match) {
                    document.getElementById('emailPassword').value = match[1].trim();
                }
            }
            
            // Дата рождения: ...
            else if (line.includes('Дата рождения:')) {
                const match = line.match(/Дата рождения:\s*(.+)/);
                if (match) {
                    document.getElementById('birthDate').value = match[1].trim();
                }
            }
            
            // 2ФА (Google): ...
            else if (line.includes('2ФА (Google):')) {
                const match = line.match(/2ФА \(Google\):\s*(.+)/);
                if (match) {
                    document.getElementById('psnAuthenticator').value = match[1].trim();
                }
            }
            
            // 2ФА резервные коды: ...
            else if (line.includes('2ФА резервные коды:')) {
                const match = line.match(/2ФА резервные коды:\s*(.+)/);
                if (match) {
                    // Убираем пробелы после запятых если есть
                    const codes = match[1].trim().replace(/,\s+/g, ',');
                    document.getElementById('psnCodes').value = codes;
                }
            }
        });

        // Ставим прочерк в резервную почту
        document.getElementById('backupEmail').value = '-';
        
        showNotification('✅ Аккаунт успешно заполнен из буфера!', 'success');
        
    } catch (err) {
        console.error('Ошибка при чтении буфера:', err);
        showNotification('❌ Не удалось прочитать буфер обмена', 'error');
    }
}

// Запуск диагностики
function runSalesDiagnostic() {
    const resultsDiv = document.getElementById('diagnosticResults');
    if (!resultsDiv) return;
    
    let log = '=== ДИАГНОСТИКА СИСТЕМЫ ПРОДАЖ ===\n\n';
    
    // 1. Основная информация
    log += `📊 Всего продаж в памяти: ${sales.length}\n`;
    
    // 2. localStorage
    const localSales = JSON.parse(localStorage.getItem('sales')) || [];
    log += `💾 Всего продаж в localStorage: ${localSales.length}\n`;
    
    // 3. Расхождения
    if (sales.length === localSales.length) {
        log += '✅ Данные синхронизированы\n';
    } else {
        log += `⚠️ РАСХОЖДЕНИЕ! Разница: ${Math.abs(sales.length - localSales.length)} записей\n`;
        
        // Находим ID
        const memIds = sales.map(s => s.id).sort();
        const localIds = localSales.map(s => s.id).sort();
        
        // Продажи в localStorage, но не в памяти
        const onlyInLocal = localIds.filter(id => !memIds.includes(id));
        if (onlyInLocal.length > 0) {
            log += `\n👻 Продажи только в localStorage (${onlyInLocal.length}):\n`;
            onlyInLocal.forEach(id => {
                const sale = localSales.find(s => s.id === id);
                log += `  • ${id} | ${sale?.accountLogin} | ${sale?.price} ₽ | ${sale?.date}\n`;
            });
        }
        
        // Продажи в памяти, но не в localStorage
        const onlyInMem = memIds.filter(id => !localIds.includes(id));
        if (onlyInMem.length > 0) {
            log += `\n📱 Продажи только в памяти (${onlyInMem.length}):\n`;
            onlyInMem.forEach(id => {
                const sale = sales.find(s => s.id === id);
                log += `  • ${id} | ${sale?.accountLogin} | ${sale?.price} ₽ | ${sale?.date}\n`;
            });
        }
    }
    
    // 4. Проблемные записи
    log += '\n=== ПРОВЕРКА ЦЕЛОСТНОСТИ ===\n';
    
    let errorCount = 0;
    
    sales.forEach((sale, index) => {
        if (!sale.id || !sale.accountId || sale.price === undefined) {
            errorCount++;
            log += `❌ Запись ${index}: Неполные данные (ID: ${sale.id})\n`;
        }
    });
    
    if (errorCount === 0) {
        log += '✅ Все записи корректны\n';
    } else {
        log += `⚠️ Найдено проблемных записей: ${errorCount}\n`;
    }
    
    // 5. Выводим результат
    resultsDiv.textContent = log;
}

function updateToggleButtonUI() {
    const toggleBtn = document.getElementById('toggleSoldAccountsBtn');
    const toggleContainer = document.getElementById('toggleButtonContainer');
    
    // Если кнопки нет на странице - ничего не делаем
    if (!toggleBtn || !toggleContainer) return;
    
    // Получаем текущие результаты поиска
    const searchResults = document.getElementById('searchResults');
    const hasResults = searchResults && searchResults.children.length > 0;
    
    // Если нет результатов - сразу прячем кнопку
    if (!hasResults) {
        toggleContainer.style.display = 'none';
        return;
    }
    
    // Считаем количество скрытых аккаунтов
    let hiddenCount = 0;
    
    // Получаем текущий список аккаунтов из результатов поиска
    const searchInput = document.getElementById('managerGameSearch');
    const loginInput = document.getElementById('managerLogin');
    
    let currentAccountsList = [];
    
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.trim();
        const foundGame = games.find(game => 
            game.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (foundGame) {
            currentAccountsList = accounts.filter(acc => acc.gameId === foundGame.id);
        }
    } else if (loginInput && loginInput.value.trim()) {
        const loginSearch = loginInput.value.trim().toLowerCase();
        currentAccountsList = accounts.filter(acc => 
            acc.psnLogin.toLowerCase().includes(loginSearch)
        );
    }
    
    // Если нет аккаунтов в текущем поиске - прячем кнопку
    if (currentAccountsList.length === 0) {
        toggleContainer.style.display = 'none';
        return;
    }
    
    // Считаем полностью проданные
    const fullySoldCount = currentAccountsList.filter(account => {
        let totalPositions = 0;
        let soldPositions = 0;
        
        ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
            const count = account.positions[posType] || 0;
            totalPositions += count;
            
            for (let i = 1; i <= count; i++) {
                if (getPositionSaleInfo(account.id, posType, i)) {
                    soldPositions++;
                }
            }
        });
        
        return totalPositions > 0 && soldPositions === totalPositions;
    }).length;
    
    hiddenCount = fullySoldCount;
    
    // Показываем или скрываем контейнер в зависимости от наличия скрытых аккаунтов
    if (hiddenCount > 0) {
        toggleContainer.style.display = 'flex'; // Показываем кнопку
    } else {
        toggleContainer.style.display = 'none'; // Прячем кнопку
        return;
    }
    
    // Обновляем текст и стиль кнопки
    const iconSpan = document.getElementById('toggleBtnIcon');
    const textSpan = document.getElementById('toggleBtnText');

    if (showAllAccounts) {
        // Режим "Показать все"
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-primary');
        if (iconSpan) iconSpan.textContent = '👁️‍🗨️';
        if (textSpan) textSpan.textContent = `Скрыть проданные (${hiddenCount})`;
        toggleBtn.title = 'Нажмите, чтобы скрыть полностью проданные аккаунты';
    } else {
        // Режим "Скрыть проданные"
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-secondary');
        if (iconSpan) iconSpan.textContent = '👁️';
        if (textSpan) textSpan.textContent = `Показать все (+${hiddenCount})`;
        toggleBtn.title = 'Нажмите, чтобы показать все аккаунты, включая проданные';
    }
}

function hideToggleButton() {
    const toggleContainer = document.getElementById('toggleButtonContainer');
    if (toggleContainer) {
        toggleContainer.style.display = 'none';
    }
}

// Функция для получения даты и времени в Московском часовом поясе (UTC+3)
function getMoscowDateTime() {
    const now = new Date();
    
    // Получаем текущее время в UTC
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDay = now.getUTCDate();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    // Создаем новую дату, добавляя 3 часа (Москва UTC+3)
    const moscowDate = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours + 3, utcMinutes));
    
    // Форматируем для отображения
    const year = moscowDate.getUTCFullYear();
    const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getUTCDate()).padStart(2, '0');
    const hours = String(moscowDate.getUTCHours()).padStart(2, '0');
    const minutes = String(moscowDate.getUTCMinutes()).padStart(2, '0');
    
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
        datetime: `${year}-${month}-${day} ${hours}:${minutes}`,
        timestamp: moscowDate.getTime(),
        isoString: moscowDate.toISOString()
    };
}

// Альтернативный простой способ через смещение
function getSimpleMoscowDateTime() {
    const now = new Date();
    
    // Смещение для Москвы (UTC+3)
    const moscowOffset = 3 * 60; // 3 часа в минутах
    
    // Текущее смещение браузера в минутах
    const browserOffset = now.getTimezoneOffset();
    
    // Разница между московским и браузерным временем
    const diffMinutes = moscowOffset + browserOffset;
    
    // Применяем разницу
    const moscowTime = new Date(now.getTime() + diffMinutes * 60000);
    
    const year = moscowTime.getFullYear();
    const month = String(moscowTime.getMonth() + 1).padStart(2, '0');
    const day = String(moscowTime.getDate()).padStart(2, '0');
    const hours = String(moscowTime.getHours()).padStart(2, '0');
    const minutes = String(moscowTime.getMinutes()).padStart(2, '0');
    
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
        datetime: `${year}-${month}-${day} ${hours}:${minutes}`,
        timestamp: moscowTime.getTime()
    };
}

// Новая функция для универсального поиска
function performUnifiedSearch() {
    const searchInput = document.getElementById('managerGameSearch');
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showNotification('Введите название игры или логин для поиска', 'warning');
        return;
    }
    
    // Пытаемся определить, что ищем
    // Если есть @ или специфичные символы - скорее всего логин
    if (searchTerm.includes('@') || searchTerm.includes('_') || searchTerm.includes('-')) {
        // Поиск по логину
        const foundAccounts = accounts.filter(acc => 
            acc.psnLogin.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (foundAccounts.length > 0) {
            document.getElementById('statsSection').style.display = 'none';
            const statsBtn = document.getElementById('showStatsBtn');
            if (statsBtn) statsBtn.style.display = 'none';
            
            updateToggleButtonUI();
            displaySearchResults(foundAccounts, `по логину "${searchTerm}"`);
        } else {
            // Если не нашли по логину, пробуем найти игру
            searchByGame(true); // true означает, что не показывать ошибку сразу
        }
    } else {
        // Поиск по игре
        searchByGame();
    }
}

// ============================================
// БЫСТРЫЙ ПОИСК ПО ЛОГИНУ (ШАПКА)
// ============================================

// Добавляем поле быстрого поиска в шапку
function addQuickSearchField() {
    // Проверяем, не на странице ли входа
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('index.html')) {
        return;
    }
    
    // Проверяем, есть ли уже такое поле
    if (document.getElementById('quickLoginSearch')) return;
    
    // Создаем контейнер для поля
    const searchContainer = document.createElement('div');
    searchContainer.id = 'quickSearchContainer';
    searchContainer.style.cssText = `
        position: fixed;
        top: 30px;
        right: 100px;
        z-index: 9999;
    `;
    
    // Создаем поле ввода
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'quickLoginSearch';
    input.placeholder = '🔍 Быстрый поиск по логину...';
    input.style.cssText = `
        padding: 10px 20px;
        width: 250px;
        border: 2px solid #e2e8f0;
        border-radius: 30px;
        font-size: 14px;
        transition: all 0.3s ease;
        outline: none;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    `;
    
    // Добавляем обработчики
    input.addEventListener('focus', () => {
        input.style.borderColor = '#4361ee';
        input.style.boxShadow = '0 0 0 3px rgba(67, 97, 238, 0.1)';
    });
    
    input.addEventListener('blur', () => {
        input.style.borderColor = '#e2e8f0';
        input.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
    });
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            quickSearchByLogin();
        }
    });
    
    searchContainer.appendChild(input);
    document.body.appendChild(searchContainer);
}

// Функция поиска по логину из шапки
function quickSearchByLogin() {
    const input = document.getElementById('quickLoginSearch');
    if (!input) return;
    
    const loginSearch = input.value.trim();
    
    if (!loginSearch) {
        showNotification('Введите логин PSN', 'warning');
        return;
    }
    
    // Ищем аккаунт по точному совпадению (логины уникальны)
    const account = accounts.find(acc => 
        acc.psnLogin.toLowerCase() === loginSearch.toLowerCase()
    );
    
    if (!account) {
        showNotification(`Аккаунт "${loginSearch}" не найден`, 'error');
        return;
    }
    
    // Показываем модальное окно с продажами
    showAccountSalesModal(account);
}

// Функция для показа модального окна с продажами аккаунта
function showAccountSalesModal(account) {
    // Получаем все продажи этого аккаунта
    const accountSales = sales
        .filter(sale => sale.accountId === account.id)
        .sort((a, b) => new Date(b.datetime || b.timestamp) - new Date(a.datetime || a.timestamp));
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'accountSalesModal';
    modal.style.display = 'block';
    
    // Заголовок в зависимости от наличия продаж
    const title = accountSales.length > 0 
        ? `📊 Продажи аккаунта ${account.psnLogin} (${accountSales.length})`
        : `📊 Аккаунт ${account.psnLogin} - нет продаж`;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <span class="close" onclick="document.getElementById('accountSalesModal').remove()">&times;</span>
            
            <h2 style="margin-bottom: 25px; color: #2d3748;">
                <span style="margin-right: 10px;">💰</span>
                ${title}
            </h2>
            
            ${accountSales.length > 0 ? `
                <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 0.9em; color: #64748b;">Всего продаж</div>
                            <div style="font-size: 1.8em; font-weight: 700; color: #1e293b;">${accountSales.length}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.9em; color: #64748b;">Общая выручка</div>
                            <div style="font-size: 1.8em; font-weight: 700; color: #10b981;">
                                ${accountSales.reduce((sum, s) => sum + s.price, 0).toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.9em; color: #64748b;">Средний чек</div>
                            <div style="font-size: 1.8em; font-weight: 700; color: #4361ee;">
                                ${Math.round(accountSales.reduce((sum, s) => sum + s.price, 0) / accountSales.length).toLocaleString('ru-RU')} ₽
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f1f5f9; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 12px; text-align: left;">Дата</th>
                                <th style="padding: 12px; text-align: left;">Игра</th>
                                <th style="padding: 12px; text-align: left;">Позиция</th>
                                <th style="padding: 12px; text-align: left;">Цена</th>
                                <th style="padding: 12px; text-align: left;">Площадка</th>
                                <th style="padding: 12px; text-align: left;">Менеджер</th>
                                <th style="padding: 12px; text-align: center;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${accountSales.map(sale => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px;">${sale.datetime || sale.date || ''}</td>
                                    <td style="padding: 12px;">${sale.gameName || ''}</td>
                                    <td style="padding: 12px;">${sale.positionName || sale.positionType || ''}</td>
                                    <td style="padding: 12px; font-weight: 600; color: #10b981;">${sale.price} ₽</td>
                                    <td style="padding: 12px;">
                                        <span style="
                                            padding: 4px 8px;
                                            border-radius: 6px;
                                            font-size: 0.85em;
                                            background: ${sale.marketplace === 'funpay' ? '#fef3c7' : 
                                                       sale.marketplace === 'telegram' ? '#dbeafe' : 
                                                       sale.marketplace === 'avito' ? '#f0f9ff' : '#f1f5f9'};
                                            color: ${sale.marketplace === 'funpay' ? '#92400e' : 
                                                   sale.marketplace === 'telegram' ? '#1e40af' : 
                                                   sale.marketplace === 'avito' ? '#0c4a6e' : '#374151'};
                                        ">
                                            ${sale.marketplace || 'Не указано'}
                                        </span>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 5px;">
                                            <span>${sale.soldByName || sale.soldBy || 'Неизвестно'}</span>
                                            ${sale.managerRole === 'admin' ? '👑' : '👷'}
                                        </div>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <button onclick="quickEditSale('${sale.id}')" 
                                                style="
                                                    background: #4361ee;
                                                    color: white;
                                                    border: none;
                                                    width: 30px;
                                                    height: 30px;
                                                    border-radius: 6px;
                                                    cursor: pointer;
                                                    margin-right: 5px;
                                                "
                                                title="Редактировать продажу">
                                            ✏️
                                        </button>
                                        <button onclick="quickDeleteSale('${sale.id}')" 
                                                style="
                                                    background: #ef4444;
                                                    color: white;
                                                    border: none;
                                                    width: 30px;
                                                    height: 30px;
                                                    border-radius: 6px;
                                                    cursor: pointer;
                                                "
                                                title="Удалить продажу">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 10px;">
                    <div style="font-size: 3em; margin-bottom: 15px;">🔍</div>
                    <h3 style="color: #64748b;">У этого аккаунта нет продаж</h3>
                    <p style="color: #94a3b8; margin-top: 10px;">
                        Аккаунт добавлен ${account.created || 'в системе'}, но еще не было продаж
                    </p>
                </div>
            `}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: right;">
                <button class="btn btn-secondary" onclick="document.getElementById('accountSalesModal').remove()">
                    Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Вспомогательные функции для редактирования/удаления из модального окна
function quickEditSale(saleId) {
    // Закрываем текущее модальное окно
    document.getElementById('accountSalesModal').remove();
    
    // Находим продажу и открываем стандартное окно редактирования
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
        showSaleDetails(sale);
    }
}

function quickDeleteSale(saleId) {
    if (confirm('Удалить эту продажу?')) {
        deleteSale(saleId);
        // Закрываем модальное окно после удаления
        setTimeout(() => {
            document.getElementById('accountSalesModal')?.remove();
        }, 500);
    }
}

// Синхронизация названий игр в аккаунтах
function syncGameNamesInAccounts() {
    let updated = false;
    
    accounts.forEach(account => {
        if (account.gameId && account.gameId !== 0) {
            const game = games.find(g => g.id === account.gameId);
            if (game && account.gameName !== game.name) {
                account.gameName = game.name;
                updated = true;
            }
        }
    });
    
    if (updated) {
        saveToStorage('accounts', accounts);
        console.log('🔄 Названия игр в аккаунтах обновлены');
        
        // Обновляем отображение если на странице менеджера
        if (window.location.pathname.includes('manager.html')) {
            const searchInput = document.getElementById('managerGameSearch');
            if (searchInput && searchInput.value.trim()) {
                searchByGame();
            }
        }
    }
}

// ==================== СВОБОДНАЯ ПРОДАЖА ====================

// Открыть модальное окно свободной продажи
function openFreeSaleModal() {
    const moscowTime = getSimpleMoscowDateTime();
    document.getElementById('freeSaleDate').value = moscowTime.date;
    document.getElementById('freeSaleTime').value = moscowTime.time;
    document.getElementById('freeSalePrice').value = '';
    document.getElementById('freeSalePurchase').value = '0';
    document.getElementById('freeSaleNotes').value = '';
    document.getElementById('freeSaleModal').style.display = 'block';
}

// Закрыть модальное окно свободной продажи
function closeFreeSaleModal() {
    document.getElementById('freeSaleModal').style.display = 'none';
}

// Подтвердить свободную продажу
async function confirmFreeSale() {
    const saleType = document.getElementById('freeSaleType').value;
    const salePrice = parseFloat(document.getElementById('freeSalePrice').value);
    const purchaseAmount = parseFloat(document.getElementById('freeSalePurchase').value) || 0;
    const marketplace = document.getElementById('freeSaleMarketplace').value;
    const saleDate = document.getElementById('freeSaleDate').value;
    const saleTime = document.getElementById('freeSaleTime').value;
    const notes = document.getElementById('freeSaleNotes').value;
    
    if (!salePrice || salePrice <= 0) {
        showNotification('Введите корректную цену продажи', 'warning');
        return;
    }
    
    let finalPrice = salePrice;
    let commission = 0;
    let originalPrice = null;
    
    if (marketplace === 'funpay') {
        const commissionData = calculateFPCommission(salePrice);
        commission = commissionData.commission;
        finalPrice = commissionData.final;
        originalPrice = salePrice;
    }
    
    const saleDateTime = saleDate && saleTime ? `${saleDate} ${saleTime}` : getSimpleMoscowDateTime().datetime;
    const timestamp = saleDate && saleTime 
        ? new Date(`${saleDate}T${saleTime}`).getTime() 
        : getSimpleMoscowDateTime().timestamp;
    
    const currentUser = security.getCurrentUser();
    
    const newSale = {
        id: `free_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        accountId: 'free_sale',
        accountLogin: saleType,
        gameName: saleType,
        positionType: 'free_sale',
        positionName: saleType,
        price: finalPrice,
        originalPrice: originalPrice,
        commission: commission,
        commissionPercent: marketplace === 'funpay' ? 3 : 0,
        date: saleDate,
        time: saleTime,
        datetime: saleDateTime,
        notes: notes,
        timestamp: timestamp,
        createdTimestamp: timestamp,
        sold: true,
        positionIndex: 1,
        soldBy: currentUser ? currentUser.username : 'unknown',
        soldByName: currentUser ? currentUser.name : 'Неизвестно',
        managerRole: currentUser ? currentUser.role : 'unknown',
        marketplace: marketplace,
        commissionApplied: marketplace === 'funpay',
        isFreeSale: true,
        freeSaleType: saleType,
        purchaseAmount: purchaseAmount,
        timezone: 'Europe/Moscow',
        timezoneOffset: '+03:00'
    };
    
    try {
        sales.push(newSale);
        localStorage.setItem('sales', JSON.stringify(sales));
        
        if (window.dataSync && window.dataSync.saveSale) {
            await window.dataSync.saveSale(newSale);
            showNotification('✅ Свободная продажа сохранена и синхронизирована!', 'success');
        } else if (firebase && firebase.database) {
            const db = firebase.database();
            await db.ref('sales/' + newSale.id).set(newSale);
            showNotification('✅ Свободная продажа сохранена в облаке!', 'success');
        } else {
            showNotification('✅ Свободная продажа сохранена локально', 'warning');
        }
        
        closeFreeSaleModal();
        
        if (window.location.pathname.includes('reports.html')) {
            setTimeout(() => generateReport(), 500);
        }
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        showNotification('❌ Ошибка при сохранении', 'error');
    }
}

// ==================== ПОИСК ИГР ДЛЯ ADD-ACCOUNT ====================

function initGameSearchForAddAccount() {
    const searchInput = document.getElementById('accountGameSearch');
    const gameIdInput = document.getElementById('accountGameId');
    const dropdown = document.getElementById('accountGameDropdown');
    
    if (!searchInput) return;
    
    console.log('🔧 Инициализация поиска игр для add-account');
    
    // Обработчик ввода текста
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        
        if (searchTerm === '') {
            dropdown.style.display = 'none';
            gameIdInput.value = '';
            return;
        }
        
        // Ищем игры
        const filteredGames = games.filter(game => 
            game.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10);
        
        if (filteredGames.length === 0) {
            dropdown.innerHTML = `
                <div style="padding: 12px 15px; color: #64748b; text-align: center;">
                    🎮 Игры не найдены
                </div>
            `;
            dropdown.style.display = 'block';
            return;
        }
        
        // Показываем результаты
        dropdown.innerHTML = filteredGames.map(game => `
            <div class="game-search-item" 
                 data-game-id="${game.id}"
                 data-game-name="${game.name.replace(/'/g, "\\'")}"
                 style="
                    padding: 12px 15px;
                    cursor: pointer;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: background 0.2s;
                 "
                 onmouseover="this.style.background='#f1f5f9'"
                 onmouseleave="this.style.background='white'"
                 onclick="selectGameForAccount(${game.id}, '${game.name.replace(/'/g, "\\'")}')">
                
                <div style="
                    width: 40px; height: 40px;
                    background: linear-gradient(135deg, #4361ee, #3a56d4);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 18px;
                ">🎮</div>
                
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1e293b;">${game.name}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                        ${accounts.filter(acc => acc.gameId === game.id).length} аккаунтов
                    </div>
                </div>
            </div>
        `).join('');
        
        dropdown.style.display = 'block';
    });
    
    // Закрытие при клике вне
    document.addEventListener('click', function(e) {
        if (searchInput && dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Поиск при фокусе
    searchInput.addEventListener('focus', function() {
        if (this.value.trim() !== '') {
            dropdown.style.display = 'block';
        }
    });
}

// Выбор игры
function selectGameForAccount(gameId, gameName) {
    const searchInput = document.getElementById('accountGameSearch');
    const gameIdInput = document.getElementById('accountGameId');
    const dropdown = document.getElementById('accountGameDropdown');
    
    if (searchInput) searchInput.value = gameName;
    if (gameIdInput) gameIdInput.value = gameId;
    if (dropdown) dropdown.style.display = 'none';
    
    console.log(`✅ Выбрана игра: ${gameName} (ID: ${gameId})`);
}