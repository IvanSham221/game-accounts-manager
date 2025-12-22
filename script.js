let games = [];
let accounts = [];
let sales = [];
let currentUser = null;

function extractProductId(url) {
    if (!url || typeof url !== 'string') return '';
    
    // Убираем возможные параметры запроса
    const cleanUrl = url.split('?')[0];
    
    // Ищем product/ в ссылке
    const productMatch = cleanUrl.match(/product\/([A-Z0-9_-]+)/i);
    if (productMatch) return productMatch[1];
    
    // Альтернативный формат
    const idMatch = cleanUrl.match(/([A-Z]{2}\d{4}-[A-Z]{3}\d{5}_\d{2}-[A-Z0-9]+)/i);
    if (idMatch) return idMatch[1];
    
    return '';
}

// Функция для проверки ссылки PS Store
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

// ============================================
// СИСТЕМА АВТОРИЗАЦИИ И НАВИГАЦИИ
// ============================================

// Проверка авторизации
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        return false;
    }
    
    // Проверяем, активен ли пользователь (для работников)
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

// ============================================
// ИНСТРУКЦИИ ДЛЯ РАЗНЫХ ТИПОВ ПОЗИЦИЙ
// ============================================

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

// Добавьте в начало script.js после русских инструкций:
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

// Функция для получения инструкции по типу позиции
function getInstructionForPosition(positionType) {
    return POSITION_INSTRUCTIONS[positionType] || 
           '⚠️ Инструкция для данного типа позиции не найдена.';
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    const burgerBtn = document.querySelector('.burger-btn');
    
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
    burgerBtn.classList.toggle('active');
    
    // Блокировка прокрутки страницы при открытом меню
    if (menu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    const burgerBtn = document.querySelector('.burger-btn');
    
    menu.classList.remove('active');
    overlay.classList.remove('active');
    burgerBtn.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ==================== УНИВЕРСАЛЬНЫЕ ФУНКЦИИ МОДАЛЬНЫХ ОКОН ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.classList.add('fade-out');
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            if (content) {
                content.classList.remove('fade-out');
            }
        }, 300);
    }
}

// Обновленные функции закрытия
function closeModal() {
    closeModal('editModal');
}

function closeFreeModal() {
    closeModal('editFreeModal');
}

function closeSaleModal() {
    closeModal('saleModal');
}

// Обработчик клика вне модального окна
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
        <button onclick="security.updateSession(); location.href='free-accounts.html'" class="btn ${location.pathname.includes('free-accounts.html') ? 'btn-primary' : 'btn-secondary'}">
            <span>🆓</span>
            <span class="nav-text">Свободные аккаунты</span>
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
    
    // Добавляем кнопку синхронизации
    setTimeout(addSyncButton, 100);
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
        { icon: '📋', text: 'Список аккаунтов', page: 'accounts.html', id: 'accounts' },
        { icon: '🆓', text: 'Свободные аккаунты', page: 'free-accounts.html', id: 'free-accounts' },
        { icon: '🎯', text: 'Управление играми', page: 'games.html', id: 'games' },
        { icon: '📊', text: 'Отчеты', page: 'reports.html', id: 'reports' },
        { icon: '📈', text: 'Статистика работников', page: 'workers-stats.html', id: 'workers-stats' },
        { icon: '🔥', text: 'Акции PS Store', page: 'discounts.html', id: 'discounts' },
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
            
            // Показываем уведомление приветствия
            const user = security.getCurrentUser();
            if (user && typeof showNotification === 'function') {
                setTimeout(() => {
                    showNotification(`Добро пожаловать, ${user.name}! 👋`, 'info', 2000);
                }, 1000);
            }
        });
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
}

function initPage(currentPage) {
    switch(currentPage) {
        case 'add-account.html':
            if (typeof loadGamesForSelect === 'function') {
                loadGamesForSelect();
            }
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
            if (typeof loadManagersForFilter === 'function') {
                setTimeout(() => {
                    loadManagersForFilter();
                }, 1000);
            }
            break;
            
        case 'free-accounts.html':
            if (typeof displayFreeAccounts === 'function') {
                displayFreeAccounts();
            }
            break;
            
        case 'reports.html':
            // Устанавливаем даты по умолчанию
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            
            const startInput = document.getElementById('startDate');
            const endInput = document.getElementById('endDate');
            if (startInput && endInput) {
                startInput.value = startDate.toISOString().split('T')[0];
                endInput.value = endDate.toISOString().split('T')[0];
            }
            break;
            
        case 'workers-stats.html':
            // Устанавливаем даты по умолчанию
            const endDate2 = new Date();
            const startDate2 = new Date();
            startDate2.setDate(startDate2.getDate() - 30);
            
            const startInput2 = document.getElementById('statsStartDate');
            const endInput2 = document.getElementById('statsEndDate');
            if (startInput2 && endInput2) {
                startInput2.value = startDate2.toISOString().split('T')[0];
                endInput2.value = endDate2.toISOString().split('T')[0];
            }
            
            // Загружаем статистику
            setTimeout(() => {
                if (typeof generateWorkersStats === 'function') {
                    generateWorkersStats();
                }
            }, 500);
            break;
            
        case 'discounts.html':
            // Инициализируем страницу скидок
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
    document.getElementById('gameUrlTR').value = '';
    document.getElementById('gameUrlUA').value = '';
    
    // Принудительно обновляем все страницы
    if (result.synced) {
        showNotification(`Игра "${gameName}" успешно добавлена и синхронизирована! 🎮`, 'success');
        
        // Запускаем принудительную синхронизацию на всех устройствах
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
    
    // Обновляем отображение списка
    displayGames();
}

// Функция редактирования игры
function editGame(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    // Заполняем форму редактирования
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
    
    // Открываем модальное окно
    document.getElementById('editGameModal').style.display = 'block';
    
    // Автофокус на первом поле
    setTimeout(() => {
        const firstInput = document.getElementById('editGameName');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Функция сохранения изменений игры
async function saveGameChanges() {
    const gameId = parseInt(document.getElementById('editGameId').value);
    const gameIndex = games.findIndex(g => g.id === gameId);
    
    if (gameIndex === -1) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const gameName = document.getElementById('editGameName').value.trim();
    const urlTR = document.getElementById('editGameUrlTR').value.trim();
    const urlUA = document.getElementById('editGameUrlUA').value.trim();
    
    if (!gameName) {
        showNotification('Введите название игры', 'warning');
        return;
    }
    
    // Проверяем уникальность названия (кроме текущей игры)
    const duplicate = games.find((g, index) => 
        index !== gameIndex && g.name.toLowerCase() === gameName.toLowerCase()
    );
    
    if (duplicate) {
        showNotification('Игра с таким названием уже существует', 'error');
        return;
    }
    
    // Обновляем игру
    games[gameIndex] = {
        ...games[gameIndex],
        name: gameName,
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
                            <img src="${game.imageUrl}" 
                                 style="width: 60px; height: 60px; border-radius: 10px; object-fit: cover; border: 2px solid #e2e8f0;">
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
    const formData = getAccountFormData();
    if (!formData) {
        return;
    }
    
    const newAccount = {
        id: Date.now(),
        ...formData,
        created: new Date().toLocaleDateString('ru-RU'),
        timestamp: new Date().toISOString()
    };

    accounts.push(newAccount);
    await saveToStorage('accounts', accounts);
    clearAccountForm();
    
    showNotification('Аккаунт успешно добавлен и синхронизирован! 🎮', 'success');
}

function getAccountFormData() {
    const gameSelect = document.getElementById('accountGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    const psnLogin = document.getElementById('psnLogin').value.trim();
    if (!psnLogin) {
        showNotification('Введите логин PSN', 'warning');
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

    comments: [];
}

function clearAccountForm() {
    document.getElementById('accountGame').selectedIndex = 0;
    document.getElementById('purchaseAmount').value = '';
    document.getElementById('psnLogin').value = '';
    document.getElementById('psnPassword').value = '';
    document.getElementById('email').value = '';
    document.getElementById('emailPassword').value = '';
    document.getElementById('backupEmail').value = '';
    document.getElementById('birthDate').value = '';
    document.getElementById('psnCodes').value = '';
    document.getElementById('psnAuthenticator').value = '';
    document.getElementById('p2_ps4').value = '0';
    document.getElementById('p3_ps4').value = '0';
    document.getElementById('p2_ps5').value = '0';
    document.getElementById('p3_ps5').value = '0';
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
function refreshAllGameSelects() {
    const freshGames = JSON.parse(localStorage.getItem('games')) || [];
    if (JSON.stringify(freshGames) !== JSON.stringify(games)) {
        games = freshGames;
        
        setTimeout(() => {
            if (typeof loadGamesForSelect === 'function') {
                loadGamesForSelect();
            }
            if (typeof loadGamesForFilter === 'function') {
                loadGamesForFilter();
            }
            if (typeof loadGamesForManager === 'function') {
                loadGamesForManager();
            }
            console.log('🔄 Все селекты с играми обновлены');
            
            // Обновляем автодополнение если есть
            if (window.autoComplete) {
                window.autoComplete.loadGames();
            }
        }, 100);
    }
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
            <label for="editPsnAuthenticator" style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748;">PSN Аутентификатор:</label>
            <input type="text" id="editPsnAuthenticator" value="${account.psnAuthenticator || ''}" 
                   placeholder="PSN Аутентификатор" class="input">
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
        
        <div class="modal-buttons">
            <button class="btn btn-secondary" onclick="closeModal()" style="padding: 12px 24px;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="saveAccountChanges()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">💾</span>
                Сохранить изменения
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

async function saveAccountChanges() {
    const accountId = parseInt(document.getElementById('editAccountId').value);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) return;
    
    const gameSelect = document.getElementById('editGame');
    const gameId = parseInt(gameSelect.value);
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
        showNotification('Выберите игру', 'warning');
        return;
    }
    
    const psnLogin = document.getElementById('editPsnLogin').value.trim();
    if (!psnLogin) {
        showNotification('Введите логин PSN', 'warning');
        return;
    }
    
    accounts[accountIndex] = {
        ...accounts[accountIndex],
        gameId: gameId,
        gameName: game.name,
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
        }
    };
    
    await saveToStorage('accounts', accounts);
    closeModal();
    displayAccounts();
    showNotification('Изменения сохранены и синхронизированы! ✅', 'success');
}

async function deleteAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    if (confirm(`Удалить аккаунт "${account.psnLogin}"? Это действие нельзя отменить.`)) {
        accounts = accounts.filter(acc => acc.id !== accountId);
        await saveToStorage('accounts', accounts);
        displayAccounts();
        showNotification(`Аккаунт "${account.psnLogin}" удален`, 'info');
    }
}

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

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

function searchByGame() {
    const gameSelect = document.getElementById('managerGame');
    const gameId = parseInt(gameSelect.value);
    
    if (!gameId) {
        showNotification('Выберите игру для поиска', 'warning');
        return;
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
    displaySearchResults(gameAccounts, game.name);
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
    
    const gamesMap = {};
    foundAccounts.forEach(acc => {
        if (!gamesMap[acc.gameName]) {
            gamesMap[acc.gameName] = [];
        }
        gamesMap[acc.gameName].push(acc);
    });
    
    const statsSection = document.getElementById('statsSection');
    statsSection.style.display = 'block';
    statsSection.innerHTML = `
        <div class="stats-header">
            <h3>🔍 Результаты поиска по логину: "${loginSearch}"</h3>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${foundAccounts.length}</div>
                <div class="stat-label">Найдено аккаунтов</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(gamesMap).length}</div>
                <div class="stat-label">Игр</div>
            </div>
        </div>
        ${Object.keys(gamesMap).length > 1 ? `
            <div class="games-breakdown">
                <h4>Распределение по играм:</h4>
                <div class="games-list">
                    ${Object.entries(gamesMap).map(([gameName, gameAccounts]) => `
                        <div class="game-item">
                            <span class="game-name">${gameName}</span>
                            <span class="game-count">${gameAccounts.length} акк.</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    displaySearchResults(foundAccounts, `по логину "${loginSearch}"`);
}

// ============================================
// СИСТЕМА ПРОДАЖ
// ============================================

function getPositionSaleInfo(accountId, positionType, positionIndex) {
    const positionId = `${accountId}_${positionType}_${positionIndex}`;
    return sales.find(sale => sale.id === positionId);
}

function displaySearchResults(accountsList, gameName) {
    const resultsContainer = document.getElementById('searchResults');
    const statsSection = document.getElementById('statsSection');
    
    if (accountsList.length === 0) {
        statsSection.style.display = 'none';
        resultsContainer.innerHTML = '<div class="empty">По игре "' + gameName + '" не найдено аккаунтов</div>';
        return;
    }
    
    const totalAccounts = accountsList.length;
    const totalInvestment = accountsList.reduce((sum, acc) => sum + (acc.purchaseAmount || 0), 0);
    const totalPositions = accountsList.reduce((sum, acc) => 
        sum + acc.positions.p2_ps4 + acc.positions.p3_ps4 + acc.positions.p2_ps5 + acc.positions.p3_ps5, 0
    );
    
    const p2_ps4 = accountsList.reduce((sum, acc) => sum + acc.positions.p2_ps4, 0);
    const p3_ps4 = accountsList.reduce((sum, acc) => sum + acc.positions.p3_ps4, 0);
    const p2_ps5 = accountsList.reduce((sum, acc) => sum + acc.positions.p2_ps5, 0);
    const p3_ps5 = accountsList.reduce((sum, acc) => sum + acc.positions.p3_ps5, 0);
    
    statsSection.style.display = 'block';
    statsSection.innerHTML = `
        <div class="stats-header">
            <h3>🎮 Статистика: ${gameName}</h3>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${totalAccounts}</div><div class="stat-label">Аккаунтов</div></div>
            <div class="stat-card"><div class="stat-value">${totalInvestment} ₽</div><div class="stat-label">Сумма закупа</div></div>
            <div class="stat-card"><div class="stat-value">${totalPositions}</div><div class="stat-label">Всего позиций</div></div>
            <div class="stat-card"><div class="stat-value">${p2_ps4}</div><div class="stat-label">П2 PS4</div></div>
            <div class="stat-card"><div class="stat-value">${p3_ps4}</div><div class="stat-label">П3 PS4</div></div>
            <div class="stat-card"><div class="stat-value">${p2_ps5}</div><div class="stat-label">П2 PS5</div></div>
            <div class="stat-card"><div class="stat-value">${p3_ps5}</div><div class="stat-label">П3 PS5</div></div>
        </div>
    `;
    
    resultsContainer.innerHTML = accountsList.map(account => {
        const commentsCount = account.comments ? account.comments.length : 0;
        
        return `
            <div class="account-card-manager" data-account-id="${account.id}">
                <div class="account-main">
                    <div class="account-login">${account.psnLogin}</div>
                    <div class="account-meta">
                        <span class="account-price-manager">${account.purchaseAmount} ₽</span>
                        <span class="account-game-manager">${account.gameName}</span>
                        <!-- КНОПКА КОММЕНТАРИЕВ -->
                        <button class="btn btn-small comments-btn" 
                                onclick="showAccountComments(${account.id})"
                                style="
                                    background: #f8fafc;
                                    color: #64748b;
                                    border: 1px solid #e2e8f0;
                                    display: flex;
                                    align-items: center;
                                    gap: 5px;
                                    padding: 6px 12px;
                                    font-size: 13px;
                                    border-radius: 8px;
                                    transition: all 0.2s ease;
                                ">
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
                                    font-size: 11px;
                                    font-weight: 600;
                                    margin-left: 2px;
                                ">${commentsCount}</span>
                                <span style="font-size: 12px;">Комментарии</span>
                            ` : '<span style="font-size: 12px;">Комментарии</span>'}
                        </button>
                    </div>
                </div>
                
                <div class="platforms-container">
                    <!-- PS4 -->
                    <div class="platform-section">
                        <div class="platform-title">PS4</div>
                        <div class="positions-container">
                            ${generatePositionsHTML(account, 'p2_ps4', 'П2 PS4', 'П2')}
                            ${generatePositionsHTML(account, 'p3_ps4', 'П3 PS4', 'П3')}
                            ${account.positions.p2_ps4 === 0 && account.positions.p3_ps4 === 0 ? 
                                '<div class="position-empty">Нет позиций</div>' : ''
                            }
                        </div>
                    </div>
                    
                    <!-- PS5 -->
                    <div class="platform-section">
                        <div class="platform-title">PS5</div>
                        <div class="positions-container">
                            ${generatePositionsHTML(account, 'p2_ps5', 'П2 PS5', 'П2')}
                            ${generatePositionsHTML(account, 'p3_ps5', 'П3 PS5', 'П3')}
                            ${account.positions.p2_ps5 === 0 && account.positions.p3_ps5 === 0 ? 
                                '<div class="position-empty">Нет позиций</div>' : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики событий для кнопок комментариев
    setTimeout(() => {
        document.querySelectorAll('.comments-btn').forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-1px)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            });
            
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        });
    }, 100);
}

function handlePositionClick(accountId, positionType, positionName, positionIndex) {
    const existingSale = getPositionSaleInfo(accountId, positionType, positionIndex);
    if (existingSale) {
        showSaleDetails(existingSale);
    } else {
        openSaleModal(accountId, positionType, positionName, positionIndex);
    }
}

// ============================================
// ОФОРМЛЕНИЕ ПРОДАЖ
// ============================================

function openSaleModal(accountId, positionType, positionName, positionIndex) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    window.currentSaleAccount = accountId;
    window.currentSalePosition = positionType;
    window.currentSalePositionIndex = positionIndex;
    
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    const modalContent = document.getElementById('saleModalContent');
    modalContent.innerHTML = `
        <h2 style="margin-bottom: 25px; color: #2d3748; text-align: center;">
            <span style="display: inline-block; margin-right: 10px;">💰</span>
            Оформить продажу
        </h2>
        
        <div class="sale-info">
            <div class="sale-info-item">
                <strong>Аккаунт:</strong>
                <span style="font-weight: 600; color: #1e293b;">${account.psnLogin}</span>
            </div>
            <div class="sale-info-item">
                <strong>Игра:</strong>
                <span style="font-weight: 600; color: #1e293b;">${account.gameName}</span>
            </div>
            <div class="sale-info-item">
                <strong>Позиция:</strong>
                <span style="
                    font-weight: 600; 
                    color: white;
                    background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
                    padding: 6px 15px;
                    border-radius: 20px;
                    font-size: 0.9em;
                ">${positionName}</span>
            </div>
        </div>
        
        <div class="sale-form">
            <div>
                <label for="salePrice" style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #2d3748;
                ">Цена продажи (₽):</label>
                <input type="number" id="salePrice" class="sale-input" 
                       placeholder="Введите цену" required 
                       style="font-size: 18px; font-weight: 600; text-align: center;">
            </div>
            
            <div class="datetime-group">
                <div>
                    <label for="saleDate" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #2d3748;
                    ">Дата продажи:</label>
                    <input type="date" id="saleDate" class="sale-input" value="${currentDate}">
                </div>
                <div>
                    <label for="saleTime" style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #2d3748;
                    ">Время продажи:</label>
                    <input type="time" id="saleTime" class="sale-input" value="${currentTime}">
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
                       placeholder="Дополнительная информация (необязательно)">
            </div>
        </div>
        
        <div class="sale-buttons">
            <button class="btn btn-secondary" onclick="closeSaleModal()" 
                    style="padding: 12px 24px; min-width: 120px;">
                Отмена
            </button>
            <button class="btn btn-success" onclick="confirmSaleAndShowData()"
                    style="padding: 12px 24px; min-width: 180px; font-weight: 600;">
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
    const saleDate = document.getElementById('saleDate').value;
    const saleTime = document.getElementById('saleTime').value;
    const saleNotes = document.getElementById('saleNotes').value;
    
    if (!salePrice) {
        showNotification('Введите цену продажи', 'warning');
        return;
    }
    
    const saleDateTime = saleDate && saleTime ? `${saleDate} ${saleTime}` : new Date().toLocaleString('ru-RU');
    
    const accountIndex = accounts.findIndex(acc => acc.id === window.currentSaleAccount);
    if (accountIndex === -1) return;
    
    const positionId = `${window.currentSaleAccount}_${window.currentSalePosition}_${window.currentSalePositionIndex}`;
    
    // Получаем текущего пользователя
    const currentUser = security.getCurrentUser();
    
    const newSale = {
        id: positionId,
        accountId: window.currentSaleAccount,
        accountLogin: accounts[accountIndex].psnLogin,
        gameName: accounts[accountIndex].gameName,
        positionType: window.currentSalePosition,
        positionName: getPositionName(window.currentSalePosition),
        price: parseFloat(salePrice),
        date: saleDate || new Date().toISOString().split('T')[0],
        time: saleTime || new Date().toTimeString().slice(0, 5),
        datetime: saleDateTime,
        notes: saleNotes,
        timestamp: new Date().toISOString(),
        sold: true,
        positionIndex: window.currentSalePositionIndex,
        // ДОБАВЛЯЕМ ИНФОРМАЦИЮ О МЕНЕДЖЕРЕ
        soldBy: currentUser ? currentUser.username : 'unknown',
        soldByName: currentUser ? currentUser.name : 'Неизвестно',
        managerRole: currentUser ? currentUser.role : 'unknown'
    };
    
    sales.push(newSale);
    await saveToStorage('sales', sales);
    
    showAccountDataAfterSale(window.currentSaleAccount);
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

// Замените существующую функцию showAccountDataAfterSale():
function showAccountDataAfterSale(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    const psnCodesArray = account.psnCodes ? account.psnCodes.split(',').map(code => code.trim()).filter(code => code !== '') : [];
    const currentCode = psnCodesArray.length > 0 ? psnCodesArray[0] : 'По запросу';
    
    if (psnCodesArray.length > 0) {
        psnCodesArray.shift();
        const updatedCodes = psnCodesArray.join(', ');
        
        const accountIndex = accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex].psnCodes = updatedCodes;
            saveToStorage('accounts', accounts);
        }
    }

    // Получаем инструкции на русском и английском
    const instructionRU = getInstructionForPosition(window.currentSalePosition);
    const instructionEN = POSITION_INSTRUCTIONS_EN[window.currentSalePosition] || instructionRU;
    
    // Сохраняем данные на русском
    window.currentOrderDataRU = `Игра: ${account.gameName}
Логин PSN: ${account.psnLogin}
Пароль PSN: ${account.psnPassword || 'Не указан'}
Код аутентификации PSN: ${currentCode}`;
    
    // Сохраняем данные на английском
    window.currentOrderDataEN = `Game: ${account.gameName}
PSN Login: ${account.psnLogin}
PSN Password: ${account.psnPassword || 'Not specified'}
PSN Authentication Code: ${currentCode}`;
    
    // Сохраняем инструкции
    window.currentInstructionRU = instructionRU;
    window.currentInstructionEN = instructionEN;
    
    // Сохраняем текущий язык (по умолчанию русский)
    window.currentLanguage = 'RU';

    const modalContent = document.getElementById('saleModalContent');
    modalContent.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 25px;">
            <span style="display: inline-block; margin-right: 10px;">✅</span>
            Продажа оформлена!
        </h2>
        
        <!-- Языковая панель -->
        <div class="language-switcher" style="
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 25px;
            padding: 15px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 15px;
            border: 1px solid #e2e8f0;
        ">
            <button onclick="switchLanguage('RU')" 
                    class="language-btn ${window.currentLanguage === 'RU' ? 'active' : ''}"
                    style="
                        padding: 10px 25px;
                        border-radius: 25px;
                        border: 2px solid ${window.currentLanguage === 'RU' ? '#4361ee' : '#e2e8f0'};
                        background: ${window.currentLanguage === 'RU' ? '#4361ee' : 'white'};
                        color: ${window.currentLanguage === 'RU' ? 'white' : '#64748b'};
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                🇷🇺 Русский
            </button>
            <button onclick="switchLanguage('EN')" 
                    class="language-btn ${window.currentLanguage === 'EN' ? 'active' : ''}"
                    style="
                        padding: 10px 25px;
                        border-radius: 25px;
                        border: 2px solid ${window.currentLanguage === 'EN' ? '#4361ee' : '#e2e8f0'};
                        background: ${window.currentLanguage === 'EN' ? '#4361ee' : 'white'};
                        color: ${window.currentLanguage === 'EN' ? 'white' : '#64748b'};
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                🇬🇧 English
            </button>
        </div>
        
        <!-- Данные для клиента (динамически меняются) -->
        <div id="orderDataSection" class="sale-success-section" style="
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            padding: 25px;
            border-radius: 15px;
            border: 1px solid #bbf7d0;
            margin-bottom: 25px;
        ">
            <h3 style="color: #16a34a; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <span>📋</span>
                <span id="dataTitle">Данные для клиента:</span>
            </h3>
            
            <div class="order-data" id="orderDataText" style="
                background: white;
                padding: 20px;
                border-radius: 10px;
                border: 1px solid #e2e8f0;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
                white-space: pre-wrap;
                word-break: break-word;
            ">
${window.currentOrderDataRU}
            </div>
            
            <div class="copy-buttons" style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn btn-success btn-small" onclick="copyAccountData()" style="flex: 1;">
                    <span style="margin-right: 8px;">📋</span>
                    <span id="copyDataBtn">Скопировать данные</span>
                </button>
                <button class="btn btn-primary btn-small" onclick="copyInstruction()" style="flex: 1;">
                    <span style="margin-right: 8px;">📝</span>
                    <span id="copyInstructionBtn">Скопировать инструкцию</span>
                </button>
            </div>
        </div>
        
        <!-- Инструкция (динамически меняется) -->
        <div id="instructionSection" class="instruction-section" style="
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            padding: 25px;
            border-radius: 15px;
            border: 1px solid #bfdbfe;
            margin-bottom: 25px;
        ">
            <h3 style="color: #2563eb; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <span>📖</span>
                <span id="instructionTitle">Инструкция для ${getPositionName(window.currentSalePosition)}:</span>
            </h3>
            
            <div id="instructionText" style="
                background: white;
                padding: 20px;
                border-radius: 10px;
                border: 1px solid #e2e8f0;
                max-height: 300px;
                overflow-y: auto;
                font-size: 13.5px;
                line-height: 1.5;
                color: #4b5563;
            ">
                ${instructionRU.replace(/\n/g, '<br>')}
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <small style="color: #6b7280;">
                    ⭐ <span id="instructionHint">Инструкция скопирована в буфер обмена при нажатии кнопки выше</span>
                </small>
            </div>
        </div>
        
        ${psnCodesArray.length > 0 ? `
            <div class="remaining-codes" style="
                background: #f8fafc;
                padding: 20px;
                border-radius: 15px;
                border: 1px solid #e2e8f0;
                margin-bottom: 25px;
            ">
                <h4 style="color: #475569; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <span>🔑</span>
                    <span id="codesTitle">Оставшиеся коды (${psnCodesArray.length}):</span>
                </h4>
                <div class="codes-list" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 10px;
                ">
                    ${psnCodesArray.map(code => `
                        <div style="
                            background: white;
                            padding: 10px 15px;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            text-align: center;
                            word-break: break-all;
                        ">${code}</div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="order-buttons" style="
            display: flex;
            gap: 15px;
            justify-content: center;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        ">
            <button class="btn btn-success" onclick="copyAllData()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">📄</span>
                <span id="copyAllBtn">Скопировать ВСЁ (данные + инструкция)</span>
            </button>
            <button class="btn btn-primary" onclick="closeSaleModalAndRefresh()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">✅</span>
                <span id="doneBtn">Готово</span>
            </button>
        </div>
    `;
    
    // Инициализируем копирование на русском
    window.currentOrderData = window.currentOrderDataRU;
    window.currentInstruction = window.currentInstructionRU;
}

// Добавьте после функции showAccountDataAfterSale() в script.js:

// Функция переключения языка
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
    
    // Обновляем тексты в зависимости от языка
    if (lang === 'EN') {
        // Обновляем заголовки
        document.getElementById('dataTitle').textContent = 'Customer data:';
        document.getElementById('instructionTitle').textContent = `Instructions for ${getPositionName(window.currentSalePosition)}:`;
        document.getElementById('copyDataBtn').textContent = 'Copy data';
        document.getElementById('copyInstructionBtn').textContent = 'Copy instructions';
        document.getElementById('instructionHint').textContent = 'Instructions copied to clipboard when clicking the button above';
        document.getElementById('copyAllBtn').textContent = 'Copy ALL (data + instructions)';
        document.getElementById('doneBtn').textContent = 'Done';
        
        if (document.getElementById('codesTitle')) {
            document.getElementById('codesTitle').textContent = `Remaining codes (${window.currentOrderDataEN.split('\n').filter(line => line.includes('Code')).length}):`;
        }
        
        // Обновляем данные
        document.getElementById('orderDataText').textContent = window.currentOrderDataEN;
        document.getElementById('instructionText').innerHTML = window.currentInstructionEN.replace(/\n/g, '<br>');
        
        // Обновляем глобальные переменные для копирования
        window.currentOrderData = window.currentOrderDataEN;
        window.currentInstruction = window.currentInstructionEN;
        
    } else {
        // Обновляем на русский
        document.getElementById('dataTitle').textContent = 'Данные для клиента:';
        document.getElementById('instructionTitle').textContent = `Инструкция для ${getPositionName(window.currentSalePosition)}:`;
        document.getElementById('copyDataBtn').textContent = 'Скопировать данные';
        document.getElementById('copyInstructionBtn').textContent = 'Скопировать инструкцию';
        document.getElementById('instructionHint').textContent = 'Инструкция скопирована в буфер обмена при нажатии кнопки выше';
        document.getElementById('copyAllBtn').textContent = 'Скопировать ВСЁ (данные + инструкция)';
        document.getElementById('doneBtn').textContent = 'Готово';
        
        if (document.getElementById('codesTitle')) {
            document.getElementById('codesTitle').textContent = `Оставшиеся коды (${window.currentOrderDataRU.split('\n').filter(line => line.includes('Код')).length}):`;
        }
        
        // Обновляем данные
        document.getElementById('orderDataText').textContent = window.currentOrderDataRU;
        document.getElementById('instructionText').innerHTML = window.currentInstructionRU.replace(/\n/g, '<br>');
        
        // Обновляем глобальные переменные для копирования
        window.currentOrderData = window.currentOrderDataRU;
        window.currentInstruction = window.currentInstructionRU;
    }
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

// Функция для копирования ВСЕГО (данные + инструкция)
function copyAllData() {
    if (!window.currentOrderData || !window.currentInstruction) {
        showNotification('❌ Data not found', 'error');
        return;
    }
    
    const isEnglish = window.currentLanguage === 'EN';
    const allData = `${window.currentOrderData}\n\n${window.currentInstruction}`;
    
    navigator.clipboard.writeText(allData).then(() => {
        showNotification(isEnglish ? '✅ All data copied!' : '✅ Все данные скопированы!', 'success');
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = allData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification(isEnglish ? '✅ All data copied!' : '✅ Все данные скопированы!', 'success');
    });
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

function closeSaleModalAndRefresh() {
    closeSaleModal();
    
    const gameSelect = document.getElementById('managerGame');
    const gameId = parseInt(gameSelect.value);
    if (gameId) {
        const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
        const game = games.find(g => g.id === gameId);
        if (game) {
            displaySearchResults(gameAccounts, game.name);
        }
    }
}

function showSaleDetails(sale) {
    const modalContent = document.getElementById('saleModalContent');
    
    const saleDate = sale.date || new Date(sale.timestamp).toISOString().split('T')[0];
    const saleTime = sale.time || new Date(sale.timestamp).toTimeString().slice(0, 5);
    
    modalContent.innerHTML = `
        <h2>💰 Информация о продаже</h2>
        
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
            <!-- ДОБАВЛЯЕМ СТРОКУ С МЕНЕДЖЕРОМ -->
            ${sale.soldByName ? `
                <div class="sale-info-item">
                    <strong>Оформил:</strong>
                    <span style="
                        background: ${sale.managerRole === 'admin' ? 'linear-gradient(135deg, #f72585 0%, #e63946 100%)' : 'linear-gradient(135deg, #4361ee 0%, #3a56d4 100%)'};
                        color: white;
                        padding: 4px 10px;
                        border-radius: 20px;
                        font-size: 0.9em;
                        display: inline-block;
                    ">
                        ${sale.soldByName} ${sale.managerRole === 'admin' ? '👑' : '👷'}
                    </span>
                </div>
            ` : ''}
        </div>
        
        <div class="sale-form">
            <div>
                <label for="editSalePrice">Цена продажи (₽):</label>
                <input type="number" id="editSalePrice" class="sale-input" value="${sale.price}" required>
            </div>
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
                <input type="text" id="editSaleNotes" class="sale-input" value="${sale.notes || ''}" placeholder="Дополнительная информация">
            </div>
        </div>
        
        <div class="sale-buttons">
            <button class="btn btn-secondary" onclick="closeSaleModal()">Отмена</button>
            <button class="btn btn-primary" onclick="updateSaleDetails('${sale.id}')">💾 Сохранить изменения</button>
            <button class="btn btn-danger" onclick="deleteSale('${sale.id}')">🗑️ Удалить продажу</button>
        </div>
    `;
    
    openModal('saleModal');
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
    const saleDate = document.getElementById('editSaleDate').value;
    const saleTime = document.getElementById('editSaleTime').value;
    const saleNotes = document.getElementById('editSaleNotes').value;
    
    if (!salePrice) {
        showNotification('Введите цену продажи', 'warning');
        return;
    }
    
    const saleDateTime = saleDate && saleTime ? `${saleDate} ${saleTime}` : '';
    
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex !== -1) {
        const currentUser = security.getCurrentUser();
        
        // Добавляем информацию о том, кто изменил продажу
        sales[saleIndex] = {
            ...sales[saleIndex],
            price: parseFloat(salePrice),
            date: saleDate,
            time: saleTime,
            datetime: saleDateTime,
            notes: saleNotes,
            lastModifiedBy: currentUser ? currentUser.username : 'unknown',
            lastModifiedByName: currentUser ? currentUser.name : 'Неизвестно',
            lastModifiedAt: new Date().toISOString()
        };
        
        await saveToStorage('sales', sales);
        closeSaleModal();
        
        const gameSelect = document.getElementById('managerGame');
        const gameId = parseInt(gameSelect.value);
        if (gameId) {
            const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
            const game = games.find(g => g.id === gameId);
            if (game) {
                displaySearchResults(gameAccounts, game.name);
            }
        }
        
        showNotification('Данные продажи обновлены! 💾', 'success');
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

// ============================================
// ФИЛЬТРАЦИЯ ПО МЕНЕДЖЕРУ
// ============================================

// Загрузка списка менеджеров для фильтра
function loadManagersForFilter() {
    const select = document.getElementById('filterManager');
    if (!select) return;
    
    const managersMap = new Map(); // Используем Map для уникальности
    
    // 1. Собираем менеджеров из продаж
    sales.forEach(sale => {
        if (sale.soldByName && sale.soldBy) {
            const key = sale.soldBy; // Используем username как ключ
            if (!managersMap.has(key)) {
                managersMap.set(key, {
                    name: sale.soldByName,
                    username: sale.soldBy,
                    role: sale.managerRole || 'worker'
                });
            }
        }
    });
    
    // 2. Добавляем текущих работников из базы
    const workers = JSON.parse(localStorage.getItem('workers')) || [];
    workers.forEach(worker => {
        if (worker.active !== false && worker.username) {
            const key = worker.username;
            if (!managersMap.has(key)) {
                managersMap.set(key, {
                    name: worker.name || worker.username,
                    username: worker.username,
                    role: worker.role || 'worker'
                });
            }
        }
    });
    
    // 3. Добавляем администратора (если есть продажи от админа)
    const currentUser = security.getCurrentUser();
    if (currentUser && currentUser.role === 'admin' && !managersMap.has(currentUser.username)) {
        managersMap.set(currentUser.username, {
            name: currentUser.name,
            username: currentUser.username,
            role: 'admin'
        });
    }
    
    // Сортируем по имени и формируем опции
    const sortedManagers = Array.from(managersMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    
    select.innerHTML = '<option value="">Все менеджеры</option>';
    sortedManagers.forEach(manager => {
        const displayName = `${manager.name} (${manager.role === 'admin' ? '👑' : '👷'})`;
        select.innerHTML += `<option value="${manager.username}">${displayName}</option>`;
    });
    
    console.log('Загружено менеджеров для фильтра:', sortedManagers.length);
}

// Функция фильтрации по менеджеру
function filterByManager() {
    const managerFilter = document.getElementById('filterManager').value;
    const gameSelect = document.getElementById('managerGame');
    const gameId = gameSelect ? parseInt(gameSelect.value) : 0;
    
    if (!gameId) {
        // Если игра не выбрана, показываем все аккаунты с продажами этого менеджера
        if (!managerFilter) {
            showNotification('Выберите менеджера для фильтрации', 'warning');
            return;
        }
        
        // Находим все аккаунты, где есть продажи от выбранного менеджера
        const salesByManager = sales.filter(sale => 
            sale.soldBy === managerFilter
        );
        
        const accountIds = [...new Set(salesByManager.map(sale => sale.accountId))];
        const filteredAccounts = accounts.filter(acc => accountIds.includes(acc.id));
        
        if (filteredAccounts.length === 0) {
            document.getElementById('searchResults').innerHTML = `
                <div class="empty">
                    <h3>У выбранного менеджера нет продаж</h3>
                </div>
            `;
            document.getElementById('statsSection').style.display = 'none';
            showNotification('У этого менеджера нет продаж', 'info');
            return;
        }
        
        // Группируем по играм для статистики
        const gamesMap = {};
        filteredAccounts.forEach(acc => {
            if (!gamesMap[acc.gameName]) {
                gamesMap[acc.gameName] = [];
            }
            gamesMap[acc.gameName].push(acc);
        });
        
        // Показываем статистику
        const statsSection = document.getElementById('statsSection');
        statsSection.style.display = 'block';
        
        const managerInfo = salesByManager[0] ? 
            `${salesByManager[0].soldByName} (${salesByManager[0].soldBy})` : 
            'Выбранный менеджер';
        
        statsSection.innerHTML = `
            <div class="stats-header">
                <h3>👷 Продажи менеджера: ${managerInfo}</h3>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${salesByManager.length}</div>
                    <div class="stat-label">Всего продаж</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${salesByManager.reduce((sum, sale) => sum + sale.price, 0).toLocaleString('ru-RU')} ₽</div>
                    <div class="stat-label">Общая выручка</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Object.keys(gamesMap).length}</div>
                    <div class="stat-label">Игр</div>
                </div>
            </div>
        `;
        
        displaySearchResults(filteredAccounts, 'по менеджеру');
        return;
    }
    
    // Если выбрана игра, фильтруем по игре + менеджеру
    const game = games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
    
    if (managerFilter) {
        // Фильтруем продажи по менеджеру
        const salesByManager = sales.filter(sale => 
            sale.soldBy === managerFilter && 
            sale.accountId && 
            gameAccounts.some(acc => acc.id === sale.accountId)
        );
        
        const accountIds = [...new Set(salesByManager.map(sale => sale.accountId))];
        const filteredAccounts = gameAccounts.filter(acc => accountIds.includes(acc.id));
        
        if (filteredAccounts.length === 0) {
            document.getElementById('searchResults').innerHTML = `
                <div class="empty">
                    <h3>У менеджера нет продаж по игре "${game.name}"</h3>
                </div>
            `;
            
            const statsSection = document.getElementById('statsSection');
            statsSection.style.display = 'block';
            statsSection.innerHTML = `
                <div class="stats-header">
                    <h3>🎮 ${game.name} - нет продаж у выбранного менеджера</h3>
                </div>
            `;
            
            showNotification(`У менеджера нет продаж по игре "${game.name}"`, 'info');
            return;
        }
        
        // Показываем статистику
        const managerName = salesByManager[0]?.soldByName || 'Выбранный менеджер';
        const statsSection = document.getElementById('statsSection');
        statsSection.style.display = 'block';
        statsSection.innerHTML = `
            <div class="stats-header">
                <h3>👷 ${managerName} - ${game.name}</h3>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${salesByManager.length}</div>
                    <div class="stat-label">Продаж в игре</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${salesByManager.reduce((sum, sale) => sum + sale.price, 0).toLocaleString('ru-RU')} ₽</div>
                    <div class="stat-label">Выручка в игре</div>
                </div>
            </div>
        `;
        
        displaySearchResults(filteredAccounts, game.name);
    } else {
        // Если менеджер не выбран, показываем все продажи по игре
        searchByGame();
    }
}

// Обновим функцию clearManagerSearch чтобы очищала и фильтр менеджера
function clearManagerSearch() {
    document.getElementById('managerGame').selectedIndex = 0;
    document.getElementById('managerLogin').value = '';
    
    // Очищаем фильтр менеджера
    const filterManager = document.getElementById('filterManager');
    if (filterManager) {
        filterManager.selectedIndex = 0;
    }
    
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
    showNotification('Поиск очищен', 'info');
}

async function deleteSale(saleId) {
    if (confirm('Удалить запись о продаже? Это действие нельзя отменить.')) {
        sales = sales.filter(sale => sale.id !== saleId);
        await saveToStorage('sales', sales);
        closeSaleModal();
        
        const gameSelect = document.getElementById('managerGame');
        const gameId = parseInt(gameSelect.value);
        if (gameId) {
            const gameAccounts = accounts.filter(acc => acc.gameId === gameId);
            const game = games.find(g => g.id === gameId);
            if (game) {
                displaySearchResults(gameAccounts, game.name);
            }
        }
        
        showNotification('Продажа удалена! 🗑️', 'info');
    }
}

function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function closeSaleModal() {
    const modal = document.getElementById('saleModal');
    const content = modal.querySelector('.modal-content');
    
    content.classList.add('fade-out');
    
    setTimeout(() => {
        modal.style.display = 'none';
        content.classList.remove('fade-out');
    }, 300);
}

function clearManagerSearch() {
    document.getElementById('managerGame').selectedIndex = 0;
    document.getElementById('managerLogin').value = '';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
    showNotification('Поиск очищен', 'info');
}

// ============================================
// ОТЧЕТЫ И СТАТИСТИКА
// ============================================

function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Выберите начальную и конечную дату', 'warning');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (start > end) {
        showNotification('Начальная дата не может быть больше конечной', 'error');
        return;
    }
    
    const periodSales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= start && saleDate <= end;
    });
    
    displayReportResults(periodSales, startDate, endDate);
}

function generateFullReport() {
    displayReportResults(sales, 'все время', 'все время');
}

function displayReportResults(salesData, startDate, endDate) {
    const reportResults = document.getElementById('reportResults');
    
    if (salesData.length === 0) {
        reportResults.innerHTML = `
            <div class="section">
                <h2>📊 Отчет за период: ${startDate} - ${endDate}</h2>
                <div class="empty">Нет продаж за выбранный период</div>
            </div>
        `;
        return;
    }
    
    const salesWithProfit = salesData.map(sale => {
        const account = accounts.find(acc => acc.id === sale.accountId);
        if (!account) {
            return { ...sale, cost: 0, profit: sale.price, profitMargin: 100 };
        }
        
        // ВАЖНО: Делим закуп аккаунта на ЕГО позиции, не на все позиции в системе!
        const totalPositionsForThisAccount = 
            account.positions.p2_ps4 + 
            account.positions.p3_ps4 + 
            account.positions.p2_ps5 + 
            account.positions.p3_ps5;
        
        const costPerPosition = totalPositionsForThisAccount > 0 
            ? (account.purchaseAmount || 0) / totalPositionsForThisAccount 
            : 0;
        
        const profit = sale.price - costPerPosition;
        const profitMargin = sale.price > 0 ? (profit / sale.price) * 100 : 0;
        
        return {
            ...sale,
            cost: costPerPosition,
            profit: profit,
            profitMargin: profitMargin
        };
    });
    
    const totalRevenue = salesWithProfit.reduce((sum, sale) => sum + sale.price, 0);
    const totalCost = salesWithProfit.reduce((sum, sale) => sum + sale.cost, 0);
    const totalProfit = salesWithProfit.reduce((sum, sale) => sum + sale.profit, 0);
    const totalSales = salesWithProfit.length;
    const avgSale = totalRevenue / totalSales;
    const avgProfit = totalProfit / totalSales;
    const totalProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    // Исправленная верстка с нормальными отступами
    reportResults.innerHTML = `
        <!-- Секция статистики с правильным классом -->
        <div class="report-stats-section">
            <h2 style="margin-bottom: 30px; color: white !important; text-align: center;">
                📊 Отчет за период: ${startDate} - ${endDate}
            </h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalRevenue)} ₽</div>
                    <div class="stat-label">Общая выручка</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(totalCost)} ₽</div>
                    <div class="stat-label">Себестоимость</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: ${totalProfit >= 0 ? '#4ade80' : '#f87171'}">
                        ${formatNumber(totalProfit)} ₽
                    </div>
                    <div class="stat-label">Чистая прибыль</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalProfitMargin.toFixed(1)}%</div>
                    <div class="stat-label">Рентабельность</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalSales}</div>
                    <div class="stat-label">Всего продаж</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatNumber(avgSale)} ₽</div>
                    <div class="stat-label">Средний чек</div>
                </div>
            </div>
        </div>
        
        <!-- Остальная часть отчёта -->
        <div class="section">
            <h3 style="margin-bottom: 25px;">🎮 Статистика по играм</h3>
            ${getGamesStatsHTML(salesWithProfit)}
        </div>
        
        <div class="section">
            <h3 style="margin-bottom: 25px;">💰 Все продажи</h3>
            ${getSalesListHTML(salesWithProfit)}
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
function getGamesStatsHTML(salesWithProfit) {
    const gamesStats = {};
    
    salesWithProfit.forEach(sale => {
        if (!gamesStats[sale.gameName]) {
            gamesStats[sale.gameName] = {
                revenue: 0,
                cost: 0,
                profit: 0,
                sales: 0
            };
        }
        gamesStats[sale.gameName].revenue += sale.price;
        gamesStats[sale.gameName].cost += sale.cost;
        gamesStats[sale.gameName].profit += sale.profit;
        gamesStats[sale.gameName].sales += 1;
    });
    
    const sortedGames = Object.entries(gamesStats)
        .sort(([,a], [,b]) => b.profit - a.profit);
    
    if (sortedGames.length === 0) {
        return '<div class="empty">Нет данных по играм</div>';
    }
    
    return sortedGames.map(([gameName, stats]) => {
        const gameProfitMargin = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;
        
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
                        color: ${stats.profit >= 0 ? '#10b981' : '#ef4444'};
                    ">
                        ${stats.profit.toFixed(0)} ₽ прибыли
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
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Себестоимость</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: #1e293b;">
                            ${stats.cost.toFixed(0)} ₽
                        </div>
                    </div>
                    
                    <div style="
                        background: ${stats.profit >= 0 ? '#f0fdf4' : '#fef2f2'};
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid ${stats.profit >= 0 ? '#d1fae5' : '#fecaca'};
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Прибыль</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: ${stats.profit >= 0 ? '#10b981' : '#ef4444'};">
                            ${stats.profit.toFixed(0)} ₽
                        </div>
                    </div>
                    
                    <div style="
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    ">
                        <div style="color: #64748b; font-size: 0.9em; margin-bottom: 5px;">Рентабельность</div>
                        <div style="font-weight: 700; font-size: 1.2em; color: #1e293b;">
                            ${gameProfitMargin.toFixed(1)}%
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
                </div>
            </div>
        `;
    }).join('');
}

// Новая функция для отображения списка продаж
function getSalesListHTML(salesWithProfit) {
    if (salesWithProfit.length === 0) {
        return '<div class="empty">Нет продаж</div>';
    }
    
    return `
        <div style="
            max-height: 500px;
            overflow-y: auto;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px;
        ">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="
                        background: #f1f5f9;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                    ">
                        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #cbd5e1;">Игра</th>
                        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #cbd5e1;">Позиция</th>
                        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #cbd5e1;">Аккаунт</th>
                        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #cbd5e1;">Цена</th>
                        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #cbd5e1;">Прибыль</th>
                        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #cbd5e1;">Дата</th>
                    </tr>
                </thead>
                <tbody>
                    ${salesWithProfit.map(sale => `
                        <tr style="
                            border-bottom: 1px solid #e2e8f0;
                            transition: background 0.2s;
                        ">
                            <td style="padding: 12px 15px;">${sale.gameName}</td>
                            <td style="padding: 12px 15px;">${sale.positionName}</td>
                            <td style="padding: 12px 15px;">${sale.accountLogin}</td>
                            <td style="padding: 12px 15px; font-weight: 600;">${sale.price} ₽</td>
                            <td style="
                                padding: 12px 15px; 
                                font-weight: 600;
                                color: ${sale.profit >= 0 ? '#10b981' : '#ef4444'};
                            ">
                                ${sale.profit.toFixed(0)} ₽
                            </td>
                            <td style="padding: 12px 15px; color: #64748b;">${sale.datetime || sale.date || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function loadGamesForSelect() {
    const select = document.getElementById('accountGame');
    if (select) {
        select.innerHTML = '<option value="">Выберите игру</option>' +
            games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
    }
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
    const startDate = document.getElementById('statsStartDate').value;
    const endDate = document.getElementById('statsEndDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Выберите начальную и конечную дату', 'warning');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (start > end) {
        showNotification('Начальная дата не может быть больше конечной', 'error');
        return;
    }
    
    // Фильтруем продажи по периоду
    const periodSales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= start && saleDate <= end;
    });
    
    displayWorkersStatsPage(periodSales, startDate, endDate);
}

function showAllTimeStats() {
    // Сбрасываем даты на все время
    document.getElementById('statsStartDate').value = '';
    document.getElementById('statsEndDate').value = '';
    
    // Показываем статистику за все время
    displayWorkersStatsPage(sales, 'все время', 'все время');
}

function displayWorkersStatsPage(periodSales, startDate, endDate) {
    const container = document.getElementById('workersStatsContainer');
    
    if (periodSales.length === 0) {
        container.innerHTML = `
            <div class="section">
                <h2>📊 Статистика работников: ${startDate} - ${endDate}</h2>
                <div class="empty">Нет продаж за выбранный период</div>
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

// Функция для отображения модального окна с комментариями
function showAccountComments(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Создаем модальное окно для комментариев
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'commentsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 80vh; display: flex; flex-direction: column;">
            <span class="close" onclick="document.getElementById('commentsModal').remove()">&times;</span>
            
            <h2 style="margin-bottom: 20px; color: #2d3748; display: flex; align-items: center; gap: 10px;">
                <span>💬</span>
                Комментарии к аккаунту: ${account.psnLogin}
            </h2>
            
            <div id="commentsList" style="flex: 1; overflow-y: auto; margin-bottom: 20px; padding-right: 10px;">
                ${renderCommentsList(account.comments || [], account.id)}
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <textarea id="newCommentText" 
                          placeholder="Введите комментарий..." 
                          rows="3"
                          style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 14px; resize: vertical;"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('commentsModal').remove()" style="flex: 1;">
                        Закрыть
                    </button>
                    <button class="btn btn-primary" onclick="submitComment(${account.id})" style="flex: 2;">
                        <span style="margin-right: 8px;">📝</span>
                        Добавить комментарий
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Автофокус на поле ввода
    setTimeout(() => {
        const textarea = document.getElementById('newCommentText');
        if (textarea) textarea.focus();
    }, 100);
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