// security.js
const SecurityManager = {
    validateLogin: function(username, password) {
        // Единственный администратор Ivan
        if (username === 'Ivan' && password === '@Az27831501112') {
            return {
                success: true,
                user: {
                    username: 'Ivan',
                    name: 'Иван',
                    role: 'admin'
                }
            };
        }
        
        try {
            // Проверяем работников из хранилища
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
                        role: worker.role || 'worker'
                    }
                };
            }
        } catch (e) {
            console.error('Ошибка при проверке работников:', e);
        }
        
        return {
            success: false,
            error: 'Неверный логин или пароль'
        };
    },
    
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
    
    isSessionValid: function() {
        try {
            const userStr = localStorage.getItem('currentUser');
            const sessionStart = localStorage.getItem('session_start');
            
            if (!userStr || !sessionStart) return false;
            
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
    
    getCurrentUser: function() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },
    
    logout: function() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_start');
        window.location.href = 'login.html';
    },
    
    updateSession: function() {
        localStorage.setItem('last_activity', Date.now().toString());
    },
    
    init: function() {
        // Не создаем дефолтного админа, только Ivan
        console.log('✅ SecurityManager инициализирован');
        console.log('👤 Доступные логины:');
        console.log('   - Ivan (администратор)');
        console.log('   - Пароль: @Az27831501112');
    }
};

SecurityManager.init();
window.security = SecurityManager;