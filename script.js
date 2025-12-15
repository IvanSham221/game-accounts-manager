// script.js - ПОЛНАЯ ВЕРСИЯ с Firebase и синхронизацией

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И НАСТРОЙКИ
// ============================================

let games = [];
let accounts = [];
let sales = [];
let currentUser = null;

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

// Функция для получения инструкции по типу позиции
function getInstructionForPosition(positionType) {
    return POSITION_INSTRUCTIONS[positionType] || 
           '⚠️ Инструкция для данного типа позиции не найдена.';
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

// Закрытие по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('editModal');
        closeModal('editFreeModal');
        closeModal('saleModal');
    }
});

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
    <button onclick="security.updateSession(); location.href='charts.html'" class="btn ${location.pathname.includes('charts.html') ? 'btn-primary' : 'btn-secondary'}">
        <span>📈</span>
        <span class="nav-text">Графики</span>
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
    
    // Кнопка экспорта
    navButtons += `
        <button onclick="security.updateSession(); exportToCSV()" class="btn btn-success">
            <span>📁</span>
            <span class="nav-text">Экспорт CSV</span>
        </button>
    `;
    
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

// Мобильное меню
function initMobileMenu() {
    const navElement = document.querySelector('.nav-buttons');
    if (!navElement || document.querySelector('.mobile-menu-toggle')) return;
    
    // Создаем кнопку переключения меню
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-menu-toggle';
    toggleBtn.innerHTML = '☰ Меню навигации';
    toggleBtn.type = 'button';
    
    toggleBtn.onclick = function() {
        navElement.classList.toggle('active');
        this.innerHTML = navElement.classList.contains('active') 
            ? '✕ Закрыть меню' 
            : '☰ Меню навигации';
    };
    
    // Вставляем кнопку перед навигацией
    navElement.parentNode.insertBefore(toggleBtn, navElement);
    
    // Автоматически скрываем меню на мобильных
    if (window.innerWidth <= 768) {
        navElement.classList.remove('active');
    }
    
    // Обновляем при изменении размера окна
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            navElement.classList.add('active');
        } else {
            navElement.classList.remove('active');
        }
        toggleBtn.innerHTML = '☰ Меню навигации';
    });
}

// UI улучшения (тема, уведомления)
function initUIEnhancements() {
    // Переключатель темы
    const themeToggle = document.createElement('div');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = `
        <button class="theme-btn" onclick="toggleTheme()">
            <span id="themeIcon">🌙</span>
        </button>
    `;
    document.body.appendChild(themeToggle);
    
    // Проверяем сохраненную тему
    if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.textContent = '☀️';
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
        
        // Используем forceFullSync для первоначальной загрузки
        if (window.dataSync && window.dataSync.forceFullSync) {
            await dataSync.forceFullSync();
        }
        
        // Обновляем глобальные переменные из localStorage
        games = JSON.parse(localStorage.getItem('games')) || [];
        accounts = JSON.parse(localStorage.getItem('accounts')) || [];
        sales = JSON.parse(localStorage.getItem('sales')) || [];
        
        console.log(`📊 Данные загружены: ${games.length} игр, ${accounts.length} аккаунтов, ${sales.length} продаж`);
        
    } catch (error) {
        console.error('❌ Ошибка при загрузке данных:', error);
        
        // Загружаем из localStorage как запасной вариант
        games = JSON.parse(localStorage.getItem('games')) || [];
        accounts = JSON.parse(localStorage.getItem('accounts')) || [];
        sales = JSON.parse(localStorage.getItem('sales')) || [];
    }
}

function initApp() {
    const currentPage = window.location.pathname.split('/').pop();
    const user = security.getCurrentUser();
    
    if (user) {
        console.log('👤 Пользователь:', user.name);
        
        // Обновляем навигацию
        if (typeof updateNavigation === 'function') {
            updateNavigation();
        }
        
        // Загружаем данные с синхронизацией
        loadAllDataWithSync().then(() => {
            console.log('✅ Все данные загружены и синхронизированы');
            
            // Инициализация страниц
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
            
            // Инициализация UI улучшений (ДОБАВЬТЕ ЭТУ СТРОЧКУ!)
            initUIEnhancements();
            
            // Запускаем проверку обновлений
            startSyncChecker();
            
        }).catch(error => {
            console.error('❌ Ошибка загрузки данных:', error);
        });
        
        // Показываем уведомление
        if (typeof showNotification === 'function') {
            showNotification(`Добро пожаловать, ${user.name}! 👋`, 'info', 2000);
        }

        if (currentPage === 'manager.html') {
    loadGamesForManager();
    
    // Загружаем менеджеров для фильтра с задержкой
    setTimeout(() => {
        loadManagersForFilter();
    }, 1000);
}
    }
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

async function addGame() {
    const gameName = document.getElementById('gameName').value.trim();
    if (!gameName) {
        showNotification('Введите название игры', 'warning');
        return;
    }
    
    // Проверяем на дубликаты среди уже загруженных игр
    if (games.find(game => game.name.toLowerCase() === gameName.toLowerCase())) {
        showNotification('Игра с таким названием уже существует', 'error');
        return;
    }
    
    // Сначала показываем уведомление о начале сохранения
    showNotification(`Добавляем игру "${gameName}"...`, 'info', 1000);
    
    const newGame = {
        id: Date.now(),
        name: gameName,
        created: new Date().toLocaleDateString('ru-RU'),
        addedBy: security.getCurrentUser()?.name || 'Неизвестно'
    };
    
    games.push(newGame);
    const result = await saveToStorage('games', games);
    
    document.getElementById('gameName').value = '';
    
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
}

function displayGames() {
    const list = document.getElementById('gamesList');
    if (games.length === 0) {
        list.innerHTML = '<div class="empty">Нет добавленных игр</div>';
        return;
    }
    
    list.innerHTML = games.map(game => `
        <div class="item">
            <div class="account-info">
                <strong>${game.name}</strong>
                <div><small>Добавлена: ${game.created}</small></div>
            </div>
            <button class="btn btn-danger btn-small" onclick="deleteGame(${game.id})">🗑️ Удалить</button>
        </div>
    `).join('');
}

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
        }, 100);
    }
}

// Проверка обновлений каждые 3 секунды
function startSyncChecker() {
    setInterval(() => {
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
    
    resultsContainer.innerHTML = accountsList.map(account => `
        <div class="account-card-manager">
            <div class="account-main">
                <div class="account-login">${account.psnLogin}</div>
                <div class="account-meta">
                    <span class="account-price-manager">${account.purchaseAmount} ₽</span>
                    <span class="account-game-manager">${account.gameName}</span>
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
    `).join('');
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

    // Получаем инструкцию для проданной позиции
    const instruction = getInstructionForPosition(window.currentSalePosition);
    
    const modalContent = document.getElementById('saleModalContent');
    modalContent.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 25px;">
            <span style="display: inline-block; margin-right: 10px;">✅</span>
            Продажа оформлена!
        </h2>
        
        <div class="sale-success-section" style="
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            padding: 25px;
            border-radius: 15px;
            border: 1px solid #bbf7d0;
            margin-bottom: 25px;
        ">
            <h3 style="color: #16a34a; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <span>📋</span>
                Данные для клиента:
            </h3>
            
            <div class="order-data" style="
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
Игра: ${account.gameName}
Логин PSN: ${account.psnLogin}
Пароль PSN: ${account.psnPassword || 'Не указан'}
Код аутентификации PSN: ${currentCode}
            </div>
            
            <div class="copy-buttons" style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn btn-success btn-small" onclick="copyAccountData()" style="flex: 1;">
                    <span style="margin-right: 8px;">📋</span>
                    Скопировать данные
                </button>
                <button class="btn btn-primary btn-small" onclick="copyInstruction()" style="flex: 1;">
                    <span style="margin-right: 8px;">📝</span>
                    Скопировать инструкцию
                </button>
            </div>
        </div>
        
        <div class="instruction-section" style="
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            padding: 25px;
            border-radius: 15px;
            border: 1px solid #bfdbfe;
            margin-bottom: 25px;
        ">
            <h3 style="color: #2563eb; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <span>📖</span>
                Инструкция для ${getPositionName(window.currentSalePosition)}:
            </h3>
            
            <div style="
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
                ${instruction.replace(/\n/g, '<br>')}
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <small style="color: #6b7280;">
                    ⭐ Инструкция скопирована в буфер обмена при нажатии кнопки выше
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
                    Оставшиеся коды (${psnCodesArray.length}):
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
                Скопировать ВСЁ (данные + инструкция)
            </button>
            <button class="btn btn-primary" onclick="closeSaleModalAndRefresh()" style="padding: 12px 24px;">
                <span style="margin-right: 8px;">✅</span>
                Готово
            </button>
        </div>
    `;
    
    // Сохраняем данные для копирования
    window.currentOrderData = `Игра: ${account.gameName}
Логин PSN: ${account.psnLogin}
Пароль PSN: ${account.psnPassword || 'Не указан'}
Код аутентификации PSN: ${currentCode}`;
    
    // Сохраняем инструкцию
    window.currentInstruction = instruction;
}

// Функция для копирования инструкции
function copyInstruction() {
    if (!window.currentInstruction) {
        showNotification('Инструкция не найдена', 'error');
        return;
    }
    
    navigator.clipboard.writeText(window.currentInstruction).then(() => {
        showNotification('Инструкция скопирована в буфер обмена! 📝', 'success');
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = window.currentInstruction;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Инструкция скопирована в буфер обмена! 📝', 'success');
    });
}

// Функция для копирования ВСЕГО (данные + инструкция)
function copyAllData() {
    if (!window.currentOrderData || !window.currentInstruction) {
        showNotification('Данные не найдены', 'error');
        return;
    }
    
    const allData = `${window.currentOrderData}\n\n${window.currentInstruction}`;
    
    navigator.clipboard.writeText(allData).then(() => {
        showNotification('Все данные скопированы! 📄', 'success');
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = allData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Все данные скопированы! 📄', 'success');
    });
}

// Обновим функцию copyAccountData() чтобы она тоже была доступна
function copyAccountData() {
    if (!window.currentOrderData) return;
    
    navigator.clipboard.writeText(window.currentOrderData).then(() => {
        showNotification('Данные скопированы в буфер обмена! 📋', 'success');
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = window.currentOrderData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Данные скопированы в буфер обмена! 📋', 'success');
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

// Экспорт данных
function exportToCSV() {
    if (accounts.length === 0) {
        showNotification('Нет данных для экспорта', 'warning');
        return;
    }
    
    const headers = ['Игра', 'Логин PSN', 'Пароль PSN', 'Почта', 'Пароль почты', 'Сумма закупа', 'Коды PSN', 'Дата добавления'];
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    accounts.forEach(account => {
        const row = [
            `"${account.gameName}"`,
            `"${account.psnLogin}"`,
            `"${account.psnPassword || ''}"`,
            `"${account.email || ''}"`,
            `"${account.emailPassword || ''}"`,
            account.purchaseAmount || 0,
            `"${account.psnCodes || ''}"`,
            `"${account.created}"`
        ];
        csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, 'accounts.csv');
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = 'accounts.csv';
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showNotification('Данные экспортированы в CSV 📁', 'success');
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

