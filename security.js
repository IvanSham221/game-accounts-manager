// security.js - ФИНАЛЬНАЯ ВЕРСИЯ

const SecurityManager = {
    // Проверка логина и пароля
    validateLogin: function(username, password) {
        // 1. Проверяем администратора
        if (username === 'Ivan' && password === '@Az27831501112') {
            return {
                success: true,
                user: {
                    username: 'admin',
                    name: 'Администратор',
                    role: 'admin'
                }
            };
        }
        
        // 2. Проверяем работников
        try {
            const workers = JSON.parse(localStorage.getItem('workers') || '[]');
            
            const worker = workers.find(w => 
                w.username === username && 
                w.password === password &&
                w.active === true
            );
            
            if (worker) {
                return {
                    success: true,
                    user: {
                        username: worker.username,
                        name: worker.name,
                        role: 'worker'
                    }
                };
            }
        } catch (e) {
            // Ошибка парсинга - игнорируем
        }
        
        // 3. Если не нашли
        return {
            success: false,
            error: 'Неверный логин или пароль'
        };
    },
    
    // Создание сессии
    startSession: function(user) {
        const sessionData = {
            username: user.username,
            name: user.name,
            role: user.role,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(sessionData));
        localStorage.setItem('session_start', Date.now().toString());
    },
    
    // Проверка активной сессии
    isSessionValid: function() {
        try {
            const userStr = localStorage.getItem('currentUser');
            const sessionStart = localStorage.getItem('session_start');
            
            if (!userStr || !sessionStart) return false;
            
            // Проверяем, не прошло ли более 8 часов
            const sessionAge = Date.now() - parseInt(sessionStart);
            const eightHours = 8 * 60 * 60 * 1000;
            
            if (sessionAge > eightHours) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // Получить текущего пользователя
    getCurrentUser: function() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },
    
    // Выход
    logout: function() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_start');
        window.location.href = 'login.html';
    },
    
    // Обновить активность
    updateSession: function() {
        localStorage.setItem('last_activity', Date.now().toString());
    },
    
    // Инициализация
    init: function() {
        // Проверяем, есть ли уже админ в workers
        const workers = JSON.parse(localStorage.getItem('workers') || '[]');
        const hasAdmin = workers.find(w => w.username === 'admin');
        
        if (!hasAdmin) {
            // Добавляем админа в список работников
            workers.push({
                name: 'Администратор',
                username: 'Ivan',
                password: '@Az27831501112',
                active: true,
                created: new Date().toISOString(),
                role: 'admin'
            });
            
            localStorage.setItem('workers', JSON.stringify(workers));
        }
    }
};

// Инициализируем при загрузке
SecurityManager.init();

// Делаем глобально доступным
window.security = SecurityManager;