// firebase.js - С СИНХРОНИЗАЦИЕЙ РАБОТНИКОВ

// Проверяем, загружен ли Firebase
if (typeof firebase === 'undefined') {
    console.log('🔥 Загружаем Firebase...');
    const firebaseScript = document.createElement('script');
    firebaseScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js';
    firebaseScript.onload = function() {
        const databaseScript = document.createElement('script');
        databaseScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js';
        databaseScript.onload = initFirebase;
        document.head.appendChild(databaseScript);
    };
    document.head.appendChild(firebaseScript);
} else {
    initFirebase();
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

let db = null;

function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log('✅ Firebase инициализирован');
        
        // Запускаем синхронизацию работников
        startWorkersSync();
    } catch (error) {
        console.error('❌ Ошибка Firebase:', error);
    }
}

// СИНХРОНИЗАЦИЯ РАБОТНИКОВ
function startWorkersSync() {
    if (!db) return;
    
    // Слушаем изменения в Firebase
    db.ref('workers').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const workers = snapshot.val();
            localStorage.setItem('workers', JSON.stringify(workers));
            console.log('👥 Работники синхронизированы:', workers.length);
            
            // Обновляем UI если на странице workers
            if (typeof displayWorkers === 'function') {
                displayWorkers(workers);
            }
        }
    });
}

class DataSync {
    constructor() {
        this.initialized = false;
        setTimeout(() => {
            this.initialized = !!db;
        }, 1000);
    }
    
    // Сохраняем работников
    async saveWorkers(workers) {
        console.log('💾 Сохраняем работников:', workers.length);
        
        // 1. Сохраняем локально
        localStorage.setItem('workers', JSON.stringify(workers));
        
        // 2. Пробуем сохранить в Firebase
        if (db) {
            try {
                await db.ref('workers').set(workers);
                console.log('✅ Работники сохранены в Firebase');
                return { success: true, synced: true };
            } catch (error) {
                console.error('❌ Ошибка Firebase:', error);
                return { success: true, local: true };
            }
        }
        
        return { success: true, local: true };
    }
    
    // Загружаем работников
    async loadWorkers() {
        console.log('📥 Загружаем работников...');
        
        // 1. Пробуем загрузить из Firebase
        if (db) {
            try {
                const snapshot = await db.ref('workers').once('value');
                if (snapshot.exists()) {
                    const workers = snapshot.val();
                    localStorage.setItem('workers', JSON.stringify(workers));
                    console.log('✅ Работники загружены из Firebase:', workers.length);
                    return workers;
                }
            } catch (error) {
                console.log('⚠️ Не удалось загрузить из Firebase:', error);
            }
        }
        
        // 2. Или из localStorage
        const workers = localStorage.getItem('workers');
        return workers ? JSON.parse(workers) : [];
    }
    
    // Сохраняем данные пользователя
    async saveData(dataType, data) {
        localStorage.setItem(dataType, JSON.stringify(data));
        
        // Пробуем сохранить в Firebase
        if (db) {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser'));
                if (user && user.username) {
                    await db.ref(`users/${user.username}/${dataType}`).set(data);
                }
            } catch (error) {
                // Игнорируем ошибку
            }
        }
        
        return { success: true };
    }
    
    // Загружаем данные
    async loadData(dataType) {
        // Пробуем загрузить из Firebase
        if (db) {
            try {
                const user = JSON.parse(localStorage.getItem('currentUser'));
                if (user && user.username) {
                    const snapshot = await db.ref(`users/${user.username}/${dataType}`).once('value');
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        localStorage.setItem(dataType, JSON.stringify(data));
                        return data;
                    }
                }
            } catch (error) {
                // Игнорируем ошибку
            }
        }
        
        // Или из localStorage
        const data = localStorage.getItem(dataType);
        return data ? JSON.parse(data) : [];
    }
}

// Создаем глобальный экземпляр
const dataSync = new DataSync();
window.dataSync = dataSync;

// Автоматически загружаем работников при старте
if (db) {
    setTimeout(() => {
        dataSync.loadWorkers().then(workers => {
            console.log('👥 Начальная загрузка работников:', workers.length);
        });
    }, 2000);
}