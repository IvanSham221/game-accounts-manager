// security.js
const SecurityManager = {
    validateLogin: function(username, password) {
        if (username === 'admin' && password === 'admin123') {
            return {
                success: true,
                user: {
                    username: 'admin',
                    name: 'Администратор',
                    role: 'admin'
                }
            };
        }
        
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
        } catch (e) {}
        
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
        const workers = JSON.parse(localStorage.getItem('workers') || '[]');
        const hasAdmin = workers.find(w => w.username === 'admin');
        
        if (!hasAdmin) {
            workers.push({
                name: 'Администратор',
                username: 'admin',
                password: 'admin123',
                active: true,
                created: new Date().toISOString(),
                role: 'admin'
            });
            localStorage.setItem('workers', JSON.stringify(workers));
        }
    }
};

SecurityManager.init();
window.security = SecurityManager;