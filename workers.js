// workers.js
class WorkersManager {
    addWorker(workerData) {
        if (!auth.isAdmin()) {
            alert('Недостаточно прав для добавления работников');
            return false;
        }

        const existingWorker = users.find(u => u.username === workerData.username);
        if (existingWorker) {
            alert('Работник с таким логином уже существует');
            return false;
        }

        const newWorker = {
            id: Date.now(),
            ...workerData,
            role: 'worker', 
            created: new Date().toISOString(),
            active: true
        };

        users.push(newWorker);
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    }

    getWorkers() {
        if (!auth.isAdmin()) {
            alert('Недостаточно прав для просмотра списка работников');
            return [];
        }

        return users.map(worker => ({
            ...worker,
            password: '••••••••'
        }));
    }

    deleteWorker(workerId) {
        if (!auth.isAdmin()) {
            alert('Недостаточно прав для удаления работников');
            return false;
        }
        if (workerId === auth.currentUser.id) {
            alert('Нельзя удалить собственный аккаунт');
            return false;
        }

        const workerIndex = users.findIndex(u => u.id === workerId);
        if (workerIndex === -1) return false;

        users.splice(workerIndex, 1);
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    }
}

const workersManager = new WorkersManager();