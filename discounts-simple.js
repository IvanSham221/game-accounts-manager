// discounts-simple.js - ПРОСТАЯ ВЕРСИЯ
class SimpleDiscountsManager {
    constructor() {
        this.api = new PSStoreAPI();
    }
    
    async checkDiscounts() {
        console.log('🔄 Простая проверка скидок...');
        
        const myGames = JSON.parse(localStorage.getItem('games')) || [];
        
        if (myGames.length === 0) {
            showNotification('❌ Нет игр для проверки', 'error');
            return [];
        }
        
        const results = [];
        
        // Показываем прогресс
        this.showProgress(0, myGames.length);
        
        for (let i = 0; i < myGames.length; i++) {
            const game = myGames[i];
            
            this.showProgress(i + 1, myGames.length, game.name);
            
            try {
                const discounts = await this.checkGame(game);
                
                if (discounts.TR || discounts.UA) {
                    results.push({
                        game: game,
                        discounts: discounts,
                        checkedAt: new Date().toISOString()
                    });
                }
                
                // Минимальная пауза
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.error(`❌ Ошибка ${game.name}:`, error);
            }
        }
        
        this.hideProgress();
        this.saveResults(results);
        
        console.log(`✅ Проверено: ${results.length} игр со скидками`);
        showNotification(`Найдено ${results.length} игр со скидками`, 'success');
        
        return results;
    }
    
    async checkGame(game) {
        const result = { TR: null, UA: null };
        
        if (game.productIds?.TR) {
            try {
                result.TR = await this.api.getGameInfo(game.productIds.TR, 'TR');
            } catch (error) {}
        }
        
        if (game.productIds?.UA) {
            try {
                result.UA = await this.api.getGameInfo(game.productIds.UA, 'UA');
            } catch (error) {}
        }
        
        return result;
    }
    
    showProgress(current, total, gameName = '') {
        const progressEl = document.getElementById('discountsProgress');
        if (!progressEl) return;
        
        const percent = Math.round((current / total) * 100);
        
        progressEl.innerHTML = `
            <div style="text-align: center; padding: 15px;">
                <div class="loading"></div>
                <p style="color: #64748b; margin-top: 10px;">
                    ${gameName ? `Проверяю: <strong>${gameName}</strong><br>` : ''}
                    ${current} из ${total} игр (${percent}%)
                </p>
            </div>
        `;
    }
    
    hideProgress() {
        const progressEl = document.getElementById('discountsProgress');
        if (progressEl) progressEl.innerHTML = '';
    }
    
    saveResults(results) {
        localStorage.setItem('discountsResults', JSON.stringify(results));
        console.log('💾 Результаты сохранены');
    }
}

// Глобальная переменная
window.discountsManager = new SimpleDiscountsManager();