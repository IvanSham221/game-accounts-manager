const SecurityManager = {
    hashPassword: function(password) {
        if (!password || typeof password !== 'string') {
        return '';
    }
    const salt = '@PSHub_Fixed_Salt_2025';
    let hash = 0;
    const saltedPassword = salt + password;
    
    for (let i = 0; i < saltedPassword.length; i++) {
        const char = saltedPassword.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = Math.abs(hash & hash);
    }
    return 'pshub_' + hash.toString(36) + '_' + password.length;
    },
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

    validateLogin: async function(username, password) {
    console.log(`🔐 Попытка входа: ${username}`);
    
    username = (username || '').toString().trim();
    password = (password || '').toString();
    
    if (!username || !password) {
        console.warn('❌ Пустые логин или пароль');
        return {
            success: false,
            error: 'Заполните все поля'
        };
    }
    
    // ===== НОВАЯ ЧАСТЬ: проверка через сервер =====
    const serverUrl = 'https://ps-store-api.onrender.com';
    
    try {
        // Отправляем запрос на сервер
        const response = await fetch(`${serverUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        // Если сервер подтвердил вход (администратор)
        if (data.success && data.user) {
            console.log(`✅ ${data.user.name} вошел через сервер`);
            return { success: true, user: data.user };
        }
        
        // Если сервер сказал "проверь локально" — значит, это работник
        if (data.requireLocalCheck) {
            console.log(`👷 Проверяем работника ${username} локально...`);
            return this.validateLocalWorker(username, password);
        }
        
        return { success: false, error: data.error || 'Ошибка входа' };
        
    } catch (error) {
        // Если сервер не запущен — проверяем локально
        console.warn('⚠️ Сервер недоступен, проверяем локально:', error.message);
        return this.validateLocalWorker(username, password);
    }
    // ===== КОНЕЦ НОВОЙ ЧАСТИ =====
},

// ===== НОВАЯ ФУНКЦИЯ: локальная проверка работников =====
validateLocalWorker: function(username, password) {
    try {
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
        const hashedInputPassword = this.hashPassword(password);
        
        const worker = workers.find(w => {
            if (!w || !w.username) return false;
            
            const usernameMatch = w.username.toString().trim().toLowerCase() === username.toLowerCase();
            const passwordMatch = w.password === hashedInputPassword || w.password === password;
            const isActive = w.active !== false;
            
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
            const sessionAge = Date.now() - parseInt(sessionStart);
            const eightHours = 8 * 60 * 60 * 1000;
            
            if (sessionAge > eightHours) {
                console.log('🕒 Сессия истекла (8 часов)');
                this.logout();
                return false;
            }
            const inactivityTime = Date.now() - parseInt(lastActivity || sessionStart);
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (inactivityTime > thirtyMinutes) {
                console.log('🕒 Сессия истекла из-за бездействия (30 минут)');
                this.logout();
                return false;
            }
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

    getCurrentUser: function() {
        try {
            const userStr = localStorage.getItem('currentUser');
            if (!userStr) return null;
            
            const user = JSON.parse(userStr);
            this.updateSession();
            
            return user;
        } catch (e) {
            console.error('❌ Ошибка получения пользователя:', e);
            return null;
        }
    },

    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.isAdmin === true);
    },

    // Выход из системы
    logout: function() {
        const user = this.getCurrentUser();
        console.log(`👋 Выход пользователя: ${user ? user.name : 'unknown'}`);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_start');
        localStorage.removeItem('last_activity');
        setTimeout(() => {
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }, 100);
    },

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

    sanitizeInput: function(input) {
        if (input === null || input === undefined) return '';
        
        if (typeof input !== 'string') {
            input = String(input);
        }
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

    isValidEmail: function(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

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

    canChangeSaleManager: function() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
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
    init: function() {
        console.log('✅ SecurityManager инициализирован');
        setInterval(() => {
            if (this.isSessionValid()) {
                this.updateSession();
            }
        }, 60000);
        document.addEventListener('click', () => this.updateSession());
        document.addEventListener('keypress', () => this.updateSession());
        document.addEventListener('scroll', () => this.updateSession());
        
        return true;
    }
};
window.security = SecurityManager;

if (typeof window !== 'undefined') {
    setTimeout(() => {
        SecurityManager.init();
        console.log('🔒 Система безопасности активирована');
    }, 100);
}