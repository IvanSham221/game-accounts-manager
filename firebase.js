// firebase.js - ПОЛНАЯ СИНХРОНИЗАЦИЯ
const firebaseConfig = {
    apiKey: "AIzaSyCYTyHQ6B6WovINxyI1R8Qnn7JXS8WnnE8",
    authDomain: "crm-pshub.firebaseapp.com",
    databaseURL: "https://crm-pshub-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "crm-pshub",
    storageBucket: "crm-pshub.firebasestorage.app",
    messagingSenderId: "720773477998",
    appId: "1:720773477998:web:3d3c61747c42833f7f987f"
};

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log('✅ Firebase подключен');
} catch (error) {
    console.error('❌ Ошибка Firebase:', error);
}

class FirebaseSync {
    constructor() {
        this.db = firebase.database();
        this.initAllSync();
    }

    // ИНИЦИАЛИЗАЦИЯ ВСЕХ СЛУШАТЕЛЕЙ
    initAllSync() {
        // Слушатель для работников
        this.db.ref('workers').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const workersObj = snapshot.val();
                const workersArray = Object.values(workersObj || {});
                localStorage.setItem('workers', JSON.stringify(workersArray));
                console.log('🔄 Работники синхронизированы');
            }
        });

        // Слушатель для игр
        this.db.ref('games').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const gamesObj = snapshot.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                console.log('🔄 Игры синхронизированы');
            }
        });

        // Слушатель для аккаунтов
        this.db.ref('accounts').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const accountsObj = snapshot.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                console.log('🔄 Аккаунты синхронизированы');
            }
        });

        // Слушатель для продаж
        this.db.ref('sales').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const salesObj = snapshot.val();
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
                console.log('🔄 Продажи синхронизированы');
            }
        });
    }

    // СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ ПРИ ЗАГРУЗКЕ
    async forceFullSync() {
        try {
            console.log('🔄 Начинаем полную синхронизацию...');
            
            // Синхронизируем работников
            const workersSnap = await this.db.ref('workers').once('value');
            if (workersSnap.exists()) {
                const workersObj = workersSnap.val();
                const workersArray = Object.values(workersObj || {});
                localStorage.setItem('workers', JSON.stringify(workersArray));
                console.log('✅ Работники синхронизированы:', workersArray.length);
            }
            
            // Синхронизируем игры
            const gamesSnap = await this.db.ref('games').once('value');
            if (gamesSnap.exists()) {
                const gamesObj = gamesSnap.val();
                const gamesArray = Object.values(gamesObj || {});
                localStorage.setItem('games', JSON.stringify(gamesArray));
                console.log('✅ Игры синхронизированы:', gamesArray.length);
            }
            
            // Синхронизируем аккаунты
            const accountsSnap = await this.db.ref('accounts').once('value');
            if (accountsSnap.exists()) {
                const accountsObj = accountsSnap.val();
                const accountsArray = Object.values(accountsObj || {});
                localStorage.setItem('accounts', JSON.stringify(accountsArray));
                console.log('✅ Аккаунты синхронизированы:', accountsArray.length);
            }
            
            // Синхронизируем продажи
            const salesSnap = await this.db.ref('sales').once('value');
            if (salesSnap.exists()) {
                const salesObj = salesSnap.val();
                const salesArray = Object.values(salesObj || {});
                localStorage.setItem('sales', JSON.stringify(salesArray));
                console.log('✅ Продажи синхронизированы:', salesArray.length);
            }
            
            console.log('✅ Полная синхронизация завершена');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Ошибка полной синхронизации:', error);
            return { success: false, error: error.message };
        }
    }

    // СОХРАНЕНИЕ ДАННЫХ В FIREBASE
    async saveDataToFirebase(dataType, data) {
        try {
            const dataObj = {};
            
            if (Array.isArray(data)) {
                // Если массив, преобразуем в объект с ключами по id
                data.forEach(item => {
                    if (item.id) {
                        dataObj[item.id] = item;
                    } else if (item.username) { // для работников
                        dataObj[item.username] = item;
                    } else {
                        // Генерируем ключ если нет id
                        const key = Date.now() + Math.random();
                        dataObj[key] = item;
                    }
                });
            } else if (typeof data === 'object') {
                // Если объект, используем как есть
                Object.assign(dataObj, data);
            }
            
            // Сохраняем в Firebase
            await this.db.ref(dataType).set(dataObj);
            
            // Также сохраняем локально
            localStorage.setItem(dataType, JSON.stringify(data));
            
            console.log(`✅ Данные "${dataType}" сохранены в Firebase`);
            return { success: true, synced: true };
            
        } catch (error) {
            console.error(`❌ Ошибка сохранения "${dataType}" в Firebase:`, error);
            
            // Сохраняем локально как запасной вариант
            localStorage.setItem(dataType, JSON.stringify(data));
            
            return { success: true, local: true, error: error.message };
        }
    }

    // ЗАГРУЗКА ДАННЫХ ИЗ FIREBASE
    async loadDataFromFirebase(dataType) {
        try {
            const snapshot = await this.db.ref(dataType).once('value');
            if (snapshot.exists()) {
                const dataObj = snapshot.val();
                const dataArray = Object.values(dataObj || {});
                localStorage.setItem(dataType, JSON.stringify(dataArray));
                console.log(`✅ Данные "${dataType}" загружены из Firebase`);
                return dataArray;
            }
            return [];
        } catch (error) {
            console.error(`❌ Ошибка загрузки "${dataType}" из Firebase:`, error);
            const local = localStorage.getItem(dataType);
            return local ? JSON.parse(local) : [];
        }
    }
}

let firebaseSync = null;
try {
    firebaseSync = new FirebaseSync();
} catch (error) {
    console.error('FirebaseSync error:', error);
}

// ГЛОБАЛЬНЫЙ ОБЪЕКТ ДЛЯ СИНХРОНИЗАЦИИ
window.dataSync = {
    // ПОЛНАЯ СИНХРОНИЗАЦИЯ
    forceFullSync: async () => {
        if (firebaseSync) {
            return await firebaseSync.forceFullSync();
        } else {
            console.log('⚠️ Firebase не подключен, используется локальное хранилище');
            return { success: true, local: true };
        }
    },
    
    // СОХРАНЕНИЕ ДАННЫХ
    saveData: async (dataType, data) => {
        if (firebaseSync) {
            return await firebaseSync.saveDataToFirebase(dataType, data);
        } else {
            localStorage.setItem(dataType, JSON.stringify(data));
            return { success: true, local: true };
        }
    },
    
    // ЗАГРУЗКА ДАННЫХ
    loadData: async (dataType) => {
        if (firebaseSync) {
            return await firebaseSync.loadDataFromFirebase(dataType);
        } else {
            const data = localStorage.getItem(dataType);
            return data ? JSON.parse(data) : [];
        }
    },
    
    // СПЕЦИАЛЬНЫЕ МЕТОДЫ ДЛЯ РАБОТНИКОВ
    saveWorkers: async (workers) => {
        return await window.dataSync.saveData('workers', workers);
    },
    
    loadWorkers: async () => {
        return await window.dataSync.loadData('workers');
    },
    
    forceSyncWorkers: async () => {
        return await window.dataSync.loadData('workers');
    }
};