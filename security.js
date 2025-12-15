// security.js - УЛУЧШЕННАЯ ВЕРСИЯ С БЕЗОПАСНОСТЬЮ

const SecurityManager = {
    // Простое хеширование паролей (в продакшене используйте bcrypt или аналоги)
    hashPassword: function(password) {
        if (!password) return '';
        
        // Используем более сложное хеширование с солью
        const salt = '@PSHub_2025';
        let hash = 0;
        
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char + salt.charCodeAt(i % salt.length);
            hash = hash & hash; // Преобразуем в 32-битное целое
        }
        
        // Добавляем дополнительное хеширование
        hash = hash.toString(36) + salt.length + password.length;
        return hash;
    },

    // Создание хеша для нового пользователя
    createUserHash: function(username, password) {
        const combined = username + ':' + password + ':PSHub_Secure';
        let hash = 0;
        
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 7) - hash) + char;
            hash = hash & hash;
        }
        
        return 'pshub_' + Math.abs(hash).toString(36);
    },

    // Валидация логина
    validateLogin: function(username, password) {
        console.log(`🔐 Попытка входа: ${username}`);
        
        // Триммируем входные данные
        username = (username || '').toString().trim();
        password = (password || '').toString();
        
        if (!username || !password) {
            console.warn('❌ Пустые логин или пароль');
            return {
                success: false,
                error: 'Заполните все поля'
            };
        }

        // 1. Проверка администратора (жестко закодирован)
        if (username === 'Ivan') {
            // Для администратора используем прямое сравнение (без хеширования в демо)
            if (password === '@Az27831501112') {
                console.log('✅ Администратор Ivan вошел');
                return {
                    success: true,
                    user: {
                        username: 'Ivan',
                        name: 'Иван',
                        role: 'admin',
                        id: 'admin_1',
                        isAdmin: true
                    }
                };
            } else {
                console.warn('❌ Неверный пароль администратора');
                return {
                    success: false,
                    error: 'Неверный пароль'
                };
            }
        }

        try {
            // 2. Проверка работников из хранилища
            const workersStr = localStorage.getItem('workers');
            if (!workersStr) {
                console.warn('❌ Нет данных о работниках');
                return {
                    success: false,
                    error: 'Нет данных о пользователях'
                };
            }

            const workers = JSON.parse(workersStr);
            console.log(`👥 Проверка среди ${workers.length} работников`);

            // Хешируем введенный пароль для сравнения
            const hashedInputPassword = this.hashPassword(password);
            
            const worker = workers.find(w => {
                if (!w || !w.username) return false;
                
                const usernameMatch = w.username.toString().trim().toLowerCase() === username.toLowerCase();
                const passwordMatch = w.password === hashedInputPassword || w.password === password; // Поддержка старых паролей
                const isActive = w.active !== false; // По умолчанию true
                
                return usernameMatch && passwordMatch && isActive;
            });

            if (worker) {
                console.log(`✅ Работник ${worker.name} вошел (${worker.role || 'worker'})`);
                
                return {
                    success: true,
                    user: {
                        username: worker.username,
                        name: worker.name || worker.username,
                        role: worker.role || 'worker',
                        id: 'worker_' + (worker.id || worker.username),
                        isAdmin: worker.role === 'admin',
                        created: worker.created
                    }
                };
            }
            
            console.warn('❌ Работник не найден или не активен');
            return {
                success: false,
                error: 'Неверный логин, пароль или учетная запись неактивна'
            };
            
        } catch (e) {
            console.error('❌ Ошибка при проверке работников:', e);
            return {
                success: false,
                error: 'Ошибка системы аутентификации'
            };
        }
    },

    // Начало сессии
    startSession: function(user) {
        if (!user || !user.username) {
            console.error('❌ Неверные данные пользователя для сессии');
            return false;
        }

        const sessionData = {
            username: user.username,
            name: user.name,
            role: user.role,
            id: user.id,
            isAdmin: user.isAdmin || false,
            loginTime: new Date().toISOString(),
            sessionId: this.createUserHash(user.username, Date.now().toString()),
            lastActivity: Date.now()
        };

        try {
            localStorage.setItem('currentUser', JSON.stringify(sessionData));
            localStorage.setItem('session_start', Date.now().toString());
            localStorage.setItem('last_activity', Date.now().toString());
            
            console.log(`✅ Сессия начата для ${user.name} (${user.role})`);
            return true;
        } catch (e) {
            console.error('❌ Ошибка сохранения сессии:', e);
            return false;
        }
    },

    // Проверка валидности сессии
    isSessionValid: function() {
        try {
            const userStr = localStorage.getItem('currentUser');
            const sessionStart = localStorage.getItem('session_start');
            const lastActivity = localStorage.getItem('last_activity');

            if (!userStr || !sessionStart) {
                console.log('❌ Нет данных сессии');
                return false;
            }

            const user = JSON.parse(userStr);
            
            // Проверка времени жизни сессии (8 часов)
            const sessionAge = Date.now() - parseInt(sessionStart);
            const eightHours = 8 * 60 * 60 * 1000;
            
            if (sessionAge > eightHours) {
                console.log('🕒 Сессия истекла (8 часов)');
                this.logout();
                return false;
            }

            // Проверка бездействия (30 минут)
            const inactivityTime = Date.now() - parseInt(lastActivity || sessionStart);
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (inactivityTime > thirtyMinutes) {
                console.log('🕒 Сессия истекла из-за бездействия (30 минут)');
                this.logout();
                return false;
            }

            // Для работников проверяем активность в списке работников
            if (user.role === 'worker') {
                try {
                    const workers = JSON.parse(localStorage.getItem('workers') || '[]');
                    const worker = workers.find(w => w.username === user.username);
                    
                    if (!worker || worker.active === false) {
                        console.log('👷 Работник не найден или деактивирован');
                        this.logout();
                        return false;
                    }
                } catch (e) {
                    console.warn('⚠️ Ошибка проверки статуса работника:', e);
                }
            }

            return true;
            
        } catch (e) {
            console.error('❌ Ошибка проверки сессии:', e);
            this.logout();
            return false;
        }
    },

    // Получение текущего пользователя
    getCurrentUser: function() {
        try {
            const userStr = localStorage.getItem('currentUser');
            if (!userStr) return null;
            
            const user = JSON.parse(userStr);
            
            // Обновляем время активности
            this.updateSession();
            
            return user;
        } catch (e) {
            console.error('❌ Ошибка получения пользователя:', e);
            return null;
        }
    },

    // Проверка прав администратора
    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.isAdmin === true);
    },

    // Выход из системы
    logout: function() {
        const user = this.getCurrentUser();
        console.log(`👋 Выход пользователя: ${user ? user.name : 'unknown'}`);
        
        // Очищаем только сессионные данные
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_start');
        localStorage.removeItem('last_activity');
        
        // Перенаправляем на страницу входа
        setTimeout(() => {
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }, 100);
    },

    // Обновление времени активности
    updateSession: function() {
        try {
            localStorage.setItem('last_activity', Date.now().toString());
            
            // Продлеваем сессию если нужно
            const sessionStart = localStorage.getItem('session_start');
            if (sessionStart) {
                const sessionAge = Date.now() - parseInt(sessionStart);
                const sevenHours = 7 * 60 * 60 * 1000;
                
                // Если сессии почти 7 часов, обновляем время начала
                if (sessionAge > sevenHours) {
                    localStorage.setItem('session_start', Date.now().toString());
                    console.log('🔄 Сессия продлена');
                }
            }
        } catch (e) {
            console.error('❌ Ошибка обновления сессии:', e);
        }
    },

    // Защита от XSS - очистка ввода
    sanitizeInput: function(input) {
        if (input === null || input === undefined) return '';
        
        if (typeof input !== 'string') {
            input = String(input);
        }
        
        // Удаляем опасные символы
        return input.replace(/[<>&'"`]/g, function(match) {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                "'": '&#39;',
                '"': '&quot;',
                '`': '&#96;'
            };
            return entities[match] || match;
        }).trim();
    },

    // Проверка email
    isValidEmail: function(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Проверка сложности пароля
    isStrongPassword: function(password) {
        if (!password) return false;
        
        const minLength = 6;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return password.length >= minLength && 
               (hasUpperCase || hasLowerCase) && 
               (hasNumbers || hasSpecialChar);
    },

    // Создание безопасного пароля для работника
    generateSecurePassword: function(length = 10) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    },

    // Инициализация
    init: function() {
        console.log('✅ SecurityManager инициализирован');
        
        // Автоматическая проверка сессии каждую минуту
        setInterval(() => {
            if (this.isSessionValid()) {
                this.updateSession();
            }
        }, 60000);
        
        // Обработчик активности пользователя
        document.addEventListener('click', () => this.updateSession());
        document.addEventListener('keypress', () => this.updateSession());
        document.addEventListener('scroll', () => this.updateSession());
        
        return true;
    }
};

// Экспорт
window.security = SecurityManager;

// Автоматическая инициализация при загрузке
if (typeof window !== 'undefined') {
    setTimeout(() => {
        SecurityManager.init();
        console.log('🔒 Система безопасности активирована');
    }, 100);
}