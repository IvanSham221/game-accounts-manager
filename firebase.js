// firebase.js - КРОСС-БРАУЗЕРНАЯ ВЕРСИЯ

// Проверяем, загружен ли Firebase
if (typeof firebase === 'undefined') {
    // Если Firebase не загружен, добавляем скрипт
    const firebaseScript = document.createElement('script');
    firebaseScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js';
    firebaseScript.onload = function() {
        const authScript = document.createElement('script');
        authScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js';
        document.head.appendChild(authScript);
    };
    document.head.appendChild(firebaseScript);
    
    console.log('🔥 Загружаем Firebase...');
}

const firebaseConfig = {
    apiKey: "AIzaSyCYTyHQ6B6WovINxyI1R8Qnn7JXS8WnnE8",
    authDomain: "crm-pshub.firebaseapp.com",
    databaseURL: "https://crm-pshub-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "crm-pshub",
    storageBucket: "crm-pshub.firebasestorage.app",
    messagingSenderId: "720773477998",
    appId: "1:720773477998:web:3d3c61747c42833f7f987f"
};

// Простой DataSync без сложных импортов
class DataSync {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        // Ждем загрузки Firebase
        if (typeof firebase === 'undefined') {
            setTimeout(() => this.init(), 500);
            return;
        }
        
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.db = firebase.database();
            this.initialized = true;
            console.log('✅ Firebase инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации Firebase:', error);
        }
    }
    
    async saveData(dataType, data) {
        // Сначала всегда сохраняем локально
        localStorage.setItem(dataType, JSON.stringify(data));
        
        // Потом пробуем в Firebase
        if (this.initialized && this.db) {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser'));
                if (user) {
                    await this.db.ref(`users/${user.username}/${dataType}`).set(data);
                    console.log(`✅ ${dataType} синхронизированы`);
                }
            } catch (error) {
                console.log(`⚠️ ${dataType} сохранены только локально`);
            }
        }
        
        return { success: true };
    }
    
    async loadData(dataType) {
        // Сначала пробуем Firebase
        if (this.initialized && this.db) {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser'));
                if (user) {
                    const snapshot = await this.db.ref(`users/${user.username}/${dataType}`).once('value');
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        localStorage.setItem(dataType, JSON.stringify(data));
                        return data;
                    }
                }
            } catch (error) {
                console.log('⚠️ Загружаем из localStorage');
            }
        }
        
        // Если Firebase не сработал, берем из localStorage
        const localData = localStorage.getItem(dataType);
        return localData ? JSON.parse(localData) : [];
    }
    
    async loadWorkers() {
        if (this.initialized && this.db) {
            try {
                const snapshot = await this.db.ref('workers').once('value');
                if (snapshot.exists()) {
                    const workers = snapshot.val();
                    localStorage.setItem('workers', JSON.stringify(workers));
                    return workers;
                }
            } catch (error) {
                console.log('⚠️ Workers из localStorage');
            }
        }
        
        const workers = localStorage.getItem('workers');
        return workers ? JSON.parse(workers) : [];
    }
    
    async saveWorkers(workers) {
        localStorage.setItem('workers', JSON.stringify(workers));
        
        if (this.initialized && this.db) {
            try {
                await this.db.ref('workers').set(workers);
                console.log('✅ Workers синхронизированы');
            } catch (error) {
                // Игнорируем ошибку Firebase
            }
        }
        
        return { success: true };
    }
}

// Создаем глобальный экземпляр
window.dataSync = new DataSync();