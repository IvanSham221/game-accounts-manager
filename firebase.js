// firebase.js
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
        this.initWorkersSync();
    }

    initWorkersSync() {
        this.db.ref('workers').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const workersObj = snapshot.val();
                const workersArray = Object.values(workersObj || {});
                localStorage.setItem('workers', JSON.stringify(workersArray));
            }
        });
    }

    async forceSyncWorkers() {
        try {
            const snapshot = await this.db.ref('workers').once('value');
            if (snapshot.exists()) {
                const workersObj = snapshot.val();
                const workersArray = Object.values(workersObj || {});
                localStorage.setItem('workers', JSON.stringify(workersArray));
                console.log('✅ Работники синхронизированы с Firebase');
                return workersArray;
            }
            return [];
        } catch (error) {
            console.error('❌ Ошибка принудительной синхронизации:', error);
            const local = localStorage.getItem('workers');
            return local ? JSON.parse(local) : [];
        }
    }

    async saveWorkers(workersArray) {
        try {
            const workersObj = {};
            workersArray.forEach(worker => {
                workersObj[worker.username] = worker;
            });

            localStorage.setItem('workers', JSON.stringify(workersArray));
            await this.db.ref('workers').set(workersObj);
            
            return { success: true, synced: true };
        } catch (error) {
            localStorage.setItem('workers', JSON.stringify(workersArray));
            return { success: true, local: true };
        }
    }

    async loadWorkers() {
        try {
            const snapshot = await this.db.ref('workers').once('value');
            if (snapshot.exists()) {
                const workersObj = snapshot.val();
                const workersArray = Object.values(workersObj || {});
                localStorage.setItem('workers', JSON.stringify(workersArray));
                return workersArray;
            }
            return [];
        } catch (error) {
            const local = localStorage.getItem('workers');
            return local ? JSON.parse(local) : [];
        }
    }

    async saveData(dataType, data) {
        localStorage.setItem(dataType, JSON.stringify(data));
        return { success: true };
    }

    async loadData(dataType) {
        const data = localStorage.getItem(dataType);
        return data ? JSON.parse(data) : [];
    }
}

let firebaseSync = null;
try {
    firebaseSync = new FirebaseSync();
} catch (error) {
    console.error('FirebaseSync error:', error);
}

window.dataSync = {
    saveWorkers: async (workers) => {
        if (firebaseSync) {
            return await firebaseSync.saveWorkers(workers);
        } else {
            localStorage.setItem('workers', JSON.stringify(workers));
            return { success: true, local: true };
        }
    },
    
    loadWorkers: async () => {
        if (firebaseSync) {
            return await firebaseSync.loadWorkers();
        } else {
            const workers = localStorage.getItem('workers');
            return workers ? JSON.parse(workers) : [];
        }
    },

    forceSyncWorkers: async () => {
        if (firebaseSync) {
            return await firebaseSync.forceSyncWorkers();
        } else {
            const workers = localStorage.getItem('workers');
            return workers ? JSON.parse(workers) : [];
        }
    },
    
    saveData: async (dataType, data) => {
        localStorage.setItem(dataType, JSON.stringify(data));
        return { success: true };
    },
    
    loadData: async (dataType) => {
        const data = localStorage.getItem(dataType);
        return data ? JSON.parse(data) : [];
    }
};