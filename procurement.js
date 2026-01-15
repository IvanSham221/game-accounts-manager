// procurement.js - логика для страницы закупа

let gamesStats = [];
let criticalThreshold = 2; // Порог критичности (меньше этого числа - критично)

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    if (!security || !security.isSessionValid()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Обновляем навигацию
    updateNavigation();
    
    // Инициализируем мобильное меню
    initMobileMenu();
    
    // Загружаем данные и обновляем статистику
    loadAllDataWithSync().then(() => {
        calculateProcurementStats();
        displayCriticalPositions();
    });
});

// Новая функция для анализа тренда продаж
function analyzeSalesTrend(gameId, positionType) {
    const gameSales = sales.filter(sale => {
        const account = accounts.find(acc => acc.id === sale.accountId);
        return account && account.gameId === gameId && sale.positionType === positionType;
    });
    
    if (gameSales.length < 5) return null; // Мало данных для анализа
    
    // Группируем продажи по неделям
    const weeklySales = {};
    gameSales.forEach(sale => {
        const date = new Date(sale.datetime || sale.timestamp);
        const week = getWeekNumber(date);
        const key = `${date.getFullYear()}-W${week}`;
        
        if (!weeklySales[key]) {
            weeklySales[key] = { count: 0, revenue: 0, dates: [] };
        }
        weeklySales[key].count++;
        weeklySales[key].revenue += sale.price;
        weeklySales[key].dates.push(date);
    });
    
    // Сортируем недели
    const sortedWeeks = Object.keys(weeklySales).sort();
    
    if (sortedWeeks.length < 3) return null; // Нужно минимум 3 недели для тренда
    
    // Рассчитываем тренд (простой линейный)
    const salesByWeek = sortedWeeks.map(week => weeklySales[week].count);
    const trend = calculateLinearTrend(salesByWeek);
    
    return {
        weeklyData: sortedWeeks.map(week => ({
            week,
            sales: weeklySales[week].count,
            revenue: weeklySales[week].revenue
        })),
        trend: trend, // в процентах роста/падения в неделю
        confidence: Math.min(100, sortedWeeks.length * 20), // уровень уверенности
        totalWeeks: sortedWeeks.length
    };
}

// Вспомогательная функция для расчета линейного тренда
function calculateLinearTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    // Процент изменения за период
    return avgY !== 0 ? (slope * (n - 1) / avgY) * 100 : 0;
}

// Функция для получения номера недели
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// В функции calculateProcurementStats() обновим расчет скорости продаж:
function calculateProcurementStats() {
    gamesStats = [];
    
    // Для каждой игры считаем статистику
    games.forEach(game => {
        const gameAccounts = accounts.filter(acc => acc.gameId === game.id);
        
        if (gameAccounts.length === 0) return;
        
        let stats = {
            gameId: game.id,
            gameName: game.name,
            totalAccounts: gameAccounts.length,
            totalPositions: 0,
            freePositions: 0,
            soldPositions: 0,
            criticalPositions: 0,
            positionsByType: {
                p2_ps4: { total: 0, free: 0, sold: 0, demandScore: 0, trend: null },
                p3_ps4: { total: 0, free: 0, sold: 0, demandScore: 0, trend: null },
                p2_ps5: { total: 0, free: 0, sold: 0, demandScore: 0, trend: null },
                p3_ps5: { total: 0, free: 0, sold: 0, demandScore: 0, trend: null }
            },
            purchaseAmount: 0,
            revenue: 0,
            // Новые метрики с улучшенным расчетом
            salesLast30Days: 0,
            salesLast14Days: 0,
            salesLast7Days: 0,
            salesVelocity: 0, // Улучшенная скорость продаж
            velocityTrend: 0,  // Тренд скорости (% изменение в неделю)
            turnoverRate: 0,   // Оборачиваемость
            riskScore: 0,      // Общий риск
            priority: 'low'    // Приоритет закупа
        };
        
        // Получаем продажи за разные периоды
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Считаем позиции и продажи
        gameAccounts.forEach(account => {
            stats.purchaseAmount += account.purchaseAmount || 0;
            
            ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
                const count = account.positions[posType] || 0;
                stats.positionsByType[posType].total += count;
                stats.totalPositions += count;
                
                for (let i = 1; i <= count; i++) {
                    const saleInfo = getPositionSaleInfo(account.id, posType, i);
                    if (saleInfo) {
                        stats.positionsByType[posType].sold++;
                        stats.soldPositions++;
                        stats.revenue += saleInfo.price || 0;
                        
                        // Считаем продажи за разные периоды
                        const saleDate = new Date(saleInfo.timestamp || saleInfo.datetime);
                        if (saleDate >= thirtyDaysAgo) {
                            stats.salesLast30Days++;
                            if (saleDate >= fourteenDaysAgo) {
                                stats.salesLast14Days++;
                                if (saleDate >= sevenDaysAgo) {
                                    stats.salesLast7Days++;
                                }
                            }
                        }
                    } else {
                        stats.positionsByType[posType].free++;
                        stats.freePositions++;
                    }
                }
            });
        });
        
        // УЛУЧШЕННЫЙ РАСЧЕТ СКОРОСТИ ПРОДАЖ
        // Используем взвешенное среднее разных периодов
        const velocity30Days = stats.salesLast30Days / 30;
        const velocity14Days = stats.salesLast14Days / 14;
        const velocity7Days = stats.salesLast7Days / 7;
        
        // Весовые коэффициенты: последняя неделя важнее
        const weights = { last7: 0.5, last14: 0.3, last30: 0.2 };
        stats.salesVelocity = 
            (velocity7Days * weights.last7) + 
            (velocity14Days * weights.last14) + 
            (velocity30Days * weights.last30);
        
        // Рассчитываем тренд скорости (рост/падение)
        if (velocity14Days > 0 && velocity7Days > 0) {
            stats.velocityTrend = ((velocity7Days - velocity14Days) / velocity14Days) * 100;
        }
        
        // Анализируем тренд для каждой позиции
        ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
            if (stats.positionsByType[posType].total > 0) {
                const position = stats.positionsByType[posType];
                
                // Анализ тренда продаж для этой позиции
                position.trend = analyzeSalesTrend(game.id, posType);
                
                // УЛУЧШЕННЫЙ РАСЧЕТ СПРОСА
                let demandScore = 0;
                
                // 1. Фактор оборачиваемости (40%)
                const turnover = (position.sold / position.total) * 100;
                demandScore += Math.min(40, turnover * 0.4);
                
                // 2. Фактор доступности (30%)
                const availability = (position.free / position.total) * 100;
                demandScore += Math.min(30, (100 - availability) * 0.3);
                
                // 3. Фактор тренда продаж (30%)
                if (position.trend && position.trend.trend > 10) {
                    demandScore += 30; // Быстрый рост продаж
                } else if (position.trend && position.trend.trend > 5) {
                    demandScore += 20; // Умеренный рост
                } else if (position.trend && position.trend.trend > 0) {
                    demandScore += 10; // Небольшой рост
                } else if (position.trend && position.trend.trend < -10) {
                    demandScore -= 10; // Быстрое падение
                }
                
                position.demandScore = Math.min(100, Math.max(0, demandScore));
                
                // Определяем критические позиции с улучшенной логикой
                if (position.free <= criticalThreshold && position.total > 0) {
                    // Учитываем не только спрос, но и тренд
                    const isHighDemand = position.demandScore > 50;
                    const isGrowing = position.trend && position.trend.trend > 5;
                    
                    if (isHighDemand || isGrowing) {
                        stats.criticalPositions++;
                    }
                }
            }
        });
        
        // Рассчитываем оборачиваемость запасов
        stats.turnoverRate = stats.totalPositions > 0 ? 
            (stats.soldPositions / stats.totalPositions) * 100 : 0;
        
        // УЛУЧШЕННЫЙ РАСЧЕТ РИСКА
        stats.riskScore = calculateEnhancedRiskScore(stats);
        
        // Определяем приоритет закупа
        stats.priority = determineEnhancedProcurementPriority(stats);
        
        gamesStats.push(stats);
    });
    
    console.log('📊 Улучшенная статистика рассчитана для', gamesStats.length, 'игр');
}

// Новая функция для улучшенного расчета риска
function calculateEnhancedRiskScore(stats) {
    let riskScore = 0;
    
    // 1. Риск из-за критических позиций с учетом тренда (макс 40)
    let weightedCritical = 0;
    ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
        const pos = stats.positionsByType[posType];
        if (pos.total > 0 && pos.free <= criticalThreshold) {
            let positionRisk = 10; // Базовый риск
            
            // Увеличиваем риск если позиция популярная
            if (pos.demandScore > 50) positionRisk += 5;
            
            // Увеличиваем риск если продажи растут
            if (pos.trend && pos.trend.trend > 10) positionRisk += 10;
            else if (pos.trend && pos.trend.trend > 5) positionRisk += 5;
            
            // Увеличиваем риск если позиция закончилась
            if (pos.free === 0) positionRisk += 5;
            
            weightedCritical += positionRisk;
        }
    });
    
    riskScore += Math.min(40, weightedCritical);
    
    // 2. Риск из-за скорости продаж и малых остатков (макс 30)
    if (stats.salesVelocity > 0) {
        const daysOfCoverage = stats.freePositions / stats.salesVelocity;
        
        if (daysOfCoverage < 7) {
            riskScore += 30; // Меньше недели запаса
        } else if (daysOfCoverage < 14) {
            riskScore += 20; // 1-2 недели запаса
        } else if (daysOfCoverage < 30) {
            riskScore += 10; // 2-4 недели запаса
        }
    }
    
    // 3. Риск из-за роста продаж при малых запасах (макс 20)
    if (stats.velocityTrend > 20 && stats.freePositions < stats.totalPositions * 0.3) {
        riskScore += 20; // Быстрый рост при малых запасах
    } else if (stats.velocityTrend > 10 && stats.freePositions < stats.totalPositions * 0.5) {
        riskScore += 10; // Умеренный рост при средних запасах
    }
    
    // 4. Риск из-за полного истощения популярных позиций (макс 10)
    const exhaustedPopular = ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].filter(posType => {
        const pos = stats.positionsByType[posType];
        return pos.free === 0 && pos.demandScore > 60;
    }).length;
    
    riskScore += Math.min(10, exhaustedPopular * 5);
    
    return Math.min(100, Math.round(riskScore));
}

// Улучшенная функция определения приоритета
function determineEnhancedProcurementPriority(stats) {
    // Используем улучшенный риск и дополнительные факторы
    
    // Рассчитываем дни до истощения для самой критичной позиции
    let minDaysToExhaustion = Infinity;
    ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
        const pos = stats.positionsByType[posType];
        if (pos.total > 0 && pos.free > 0 && stats.salesVelocity > 0) {
            // Учитываем тренд при прогнозе
            const trendFactor = pos.trend && pos.trend.trend > 0 ? 1.2 : 1.0;
            const daysToExhaustion = pos.free / (stats.salesVelocity * trendFactor);
            minDaysToExhaustion = Math.min(minDaysToExhaustion, daysToExhaustion);
        }
    });
    
    // Определяем приоритет на основе комбинации факторов
    if (stats.riskScore >= 80 || minDaysToExhaustion < 3) {
        return 'critical'; // Чрезвычайно высокий риск или <3 дней запаса
    } else if (stats.riskScore >= 60 || minDaysToExhaustion < 7) {
        return 'high';     // Высокий риск или <7 дней запаса
    } else if (stats.riskScore >= 40 || minDaysToExhaustion < 14) {
        return 'medium';   // Средний риск или <14 дней запаса
    } else {
        return 'low';      // Низкий риск
    }
}

// Расчет риска для игры
function calculateGameRiskScore(stats) {
    let riskScore = 0;
    
    // 1. Риск из-за критических позиций (макс 40 баллов)
    const criticalPercentage = stats.criticalPositions / Object.keys(stats.positionsByType).length * 100;
    riskScore += Math.min(40, criticalPercentage * 0.4);
    
    // 2. Риск из-за скорости продаж (макс 30 баллов)
    // Если скорость продаж высокая, но запасов мало - высокий риск
    if (stats.salesVelocity > 0.1) { // > 0.1 продаж в день
        const freePercentage = stats.freePositions / stats.totalPositions * 100;
        riskScore += Math.min(30, (100 - freePercentage) * stats.salesVelocity * 3);
    }
    
    // 3. Риск из-за популярности позиций (макс 20 баллов)
    const totalDemand = Object.values(stats.positionsByType)
        .reduce((sum, pos) => sum + pos.demandScore, 0);
    const avgDemand = totalDemand / Object.keys(stats.positionsByType).length;
    riskScore += Math.min(20, avgDemand * 0.2);
    
    // 4. Риск из-за полного истощения (макс 10 баллов)
    const exhaustedPositions = Object.values(stats.positionsByType)
        .filter(pos => pos.free === 0 && pos.total > 0).length;
    riskScore += Math.min(10, exhaustedPositions * 5);
    
    return Math.min(100, Math.round(riskScore));
}

function determineProcurementPriority(stats) {
    if (stats.riskScore >= 80) return 'critical';
    if (stats.riskScore >= 60) return 'high';
    if (stats.riskScore >= 40) return 'medium';
    return 'low';
}

// Отображение критических позиций (упрощенная версия)
// Упрощенная версия - только список критических позиций без статистики
function displayCriticalPositions() {
    const criticalContainer = document.getElementById('criticalPositions');
    const criticalList = document.getElementById('criticalList');
    
    if (!criticalContainer || !criticalList) return;
    
    // Находим все критические позиции
    let criticalGames = [];
    
    gamesStats.forEach(stats => {
        // Считаем только критические позиции
        let gameCriticalPositions = 0;
        const criticalPositionsList = [];
        
        ['p2_ps4', 'p3_ps4', 'p2_ps5', 'p3_ps5'].forEach(posType => {
            const position = stats.positionsByType[posType];
            
            // Если позиций нет или они не в дефиците - пропускаем
            if (position.total === 0) return;
            
            // Критичная позиция = мало осталось И высокий спрос
            if (position.free <= criticalThreshold && position.demandScore > 40) {
                gameCriticalPositions++;
                criticalPositionsList.push({
                    type: posType,
                    free: position.free,
                    total: position.total,
                    sold: position.sold,
                    demandScore: position.demandScore,
                    isExhausted: position.free === 0,
                    trend: position.trend // Добавляем тренд
                });
            }
        });
        
        if (gameCriticalPositions > 0) {
            // Находим самую критичную позицию
            const mostCriticalPosition = [...criticalPositionsList]
                .sort((a, b) => a.free - b.free)[0];

            // Рассчитываем дни до истощения
            let daysToExhaustion = '—';
            if (mostCriticalPosition && stats.salesVelocity > 0) {
                const trendFactor = mostCriticalPosition.trend?.trend > 0 ? 1.3 : 1.0;
                const days = mostCriticalPosition.free / (stats.salesVelocity * trendFactor);
                daysToExhaustion = days < 1 ? '<1' : Math.round(days);
            }
            
            criticalGames.push({
                ...stats,
                criticalPositions: gameCriticalPositions,
                criticalPositionsList: criticalPositionsList.sort((a, b) => b.demandScore - a.demandScore),
                mostCriticalPosition: mostCriticalPosition,
                daysToExhaustion: daysToExhaustion
            });
        }
    });
    
    // Сортируем игры по приоритету
    criticalGames.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    // ПРОСТО ЗАГОЛОВОК С КОЛИЧЕСТВОМ КРИТИЧЕСКИХ ИГР
    criticalContainer.innerHTML = `
        <div style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
            <div style="font-size: 2.5em; font-weight: 700; color: ${criticalGames.length > 0 ? '#dc2626' : '#10b981'};">
                ${criticalGames.length}
            </div>
            <div style="font-size: 1.1em; font-weight: 600; color: #475569;">
                ${criticalGames.length === 0 ? '✅ Нет критических позиций' : '⚠️ Критические позиции'}
            </div>
        </div>
    `;
    
    // Если нет критических позиций
    if (criticalGames.length === 0) {
        criticalList.innerHTML = `
            <div class="empty">
                <div style="font-size: 3em; margin-bottom: 15px;">✅</div>
                <h3>Нет критических позиций</h3>
                <p>Все позиции в достаточном количестве</p>
            </div>
        `;
        return;
    }
    
    // Список критических позиций
    criticalList.innerHTML = `
        <div class="critical-games-list">
            ${criticalGames.map(game => {
                // Группируем позиции
                const ps4Positions = game.criticalPositionsList.filter(p => p.type.includes('ps4'));
                const ps5Positions = game.criticalPositionsList.filter(p => p.type.includes('ps5'));
                
                // Цвет приоритета
                const priorityColors = {
                    'critical': '#dc2626',
                    'high': '#ea580c',
                    'medium': '#d97706',
                    'low': '#65a30d'
                };
                
                // Простой текст приоритета
                const priorityTexts = {
                    'critical': '🔥 СРОЧНО',
                    'high': '⚠️ СКОРО', 
                    'medium': '📋 ПЛАН',
                    'low': '📊 ЗАПАС'
                };
                
                return `
                <div class="critical-game-card" onclick="showGameProcurementDetails(${game.gameId})" 
                     style="border-left: 4px solid ${priorityColors[game.priority] || '#dc2626'}">
                    <div class="critical-game-header">
                        <div>
                            <h3>${game.gameName}</h3>
                            <div style="font-size: 0.9em; color: #64748b; margin-top: 5px;">
                                ${game.criticalPositions} критических позиций
                            </div>
                            <!-- ДОБАВЛЕННЫЙ КОД: скорость продаж и дни до истощения -->
                            <div style="font-size: 0.9em; color: #64748b; margin-top: 5px;">
                                <span title="Скорость продаж">📈 ${game.salesVelocity.toFixed(1)}/день</span>
                                ${game.daysToExhaustion !== '—' ? 
                                    `<span style="margin-left: 10px; color: ${game.daysToExhaustion < 3 ? '#dc2626' : '#d97706'};">
                                        ⏳ ~${game.daysToExhaustion} дн.
                                    </span>` : ''}
                            </div>
                        </div>
                        <div class="game-priority">
                            <span class="priority-badge ${game.priority}" style="background: ${priorityColors[game.priority]}">
                                ${priorityTexts[game.priority]}
                            </span>
                        </div>
                    </div>
                    
                    <div class="critical-positions">
                        ${ps4Positions.length > 0 ? `
                            <div class="platform-section">
                                <div class="platform-label">
                                    <span class="platform-badge ps4">PS4</span>
                                </div>
                                ${ps4Positions.map(pos => `
                                    <div class="critical-position ps4 ${pos.isExhausted ? 'exhausted' : ''}">
                                        <div class="position-info">
                                            <span class="position-name">${getPositionName(pos.type)}</span>
                                        </div>
                                        <div class="position-stats">
                                            <span class="free-count ${pos.isExhausted ? 'exhausted' : ''}">
                                                ${pos.isExhausted ? '🛑 ЗАКОНЧИЛИСЬ' : `${pos.free} свободно`}
                                            </span>
                                            <span class="total-count">из ${pos.total}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        ${ps5Positions.length > 0 ? `
                            <div class="platform-section">
                                <div class="platform-label">
                                    <span class="platform-badge ps5">PS5</span>
                                </div>
                                ${ps5Positions.map(pos => `
                                    <div class="critical-position ps5 ${pos.isExhausted ? 'exhausted' : ''}">
                                        <div class="position-info">
                                            <span class="position-name">${getPositionName(pos.type)}</span>
                                        </div>
                                        <div class="position-stats">
                                            <span class="free-count ${pos.isExhausted ? 'exhausted' : ''}">
                                                ${pos.isExhausted ? '🛑 ЗАКОНЧИЛИСЬ' : `${pos.free} свободно`}
                                            </span>
                                            <span class="total-count">из ${pos.total}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

// Показать детали по игре
function showGameProcurementDetails(gameId) {
    const game = games.find(g => g.id === gameId);
    const stats = gamesStats.find(s => s.gameId === gameId);
    
    if (!game || !stats) return;
    
    const modalContent = document.getElementById('gameDetailsContent');
    
    // Проверяем, есть ли вообще PS4 позиции
    const hasPS4Positions = stats.positionsByType.p2_ps4.total > 0 || stats.positionsByType.p3_ps4.total > 0;
    const hasPS5Positions = stats.positionsByType.p2_ps5.total > 0 || stats.positionsByType.p3_ps5.total > 0;
    
    modalContent.innerHTML = `
        <h2>📊 Статистика: ${game.name}</h2>
        
        <div class="game-stats-overview">
            <div class="stat-card">
                <div class="stat-value">${stats.totalAccounts}</div>
                <div class="stat-label">Аккаунтов</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalPositions}</div>
                <div class="stat-label">Всего позиций</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.freePositions}</div>
                <div class="stat-label">Свободно</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.criticalPositions}</div>
                <div class="stat-label">Критических</div>
            </div>
        </div>
        
        <h3>📈 Детализация по позициям</h3>
        <div class="positions-details">
            ${hasPS4Positions ? `
                <div class="platform-section">
                    <h4 style="color: #4361ee; margin-bottom: 10px;">
                        <i class="fab fa-playstation"></i> PS4 Позиции
                    </h4>
                    ${Object.keys(stats.positionsByType)
                        .filter(posType => posType.includes('ps4') && stats.positionsByType[posType].total > 0)
                        .map(posType => {
                            const pos = stats.positionsByType[posType];
                            const isCritical = pos.free <= criticalThreshold;
                            
                            return `
                                <div class="position-detail ${isCritical ? 'critical' : ''}">
                                    <div class="position-header">
                                        <span class="position-name">${getPositionName(posType)}</span>
                                        <span class="position-status ${isCritical ? 'critical' : 'ok'}">
                                            ${isCritical ? '⚠️ Критично' : '✅ Норма'}
                                        </span>
                                    </div>
                                    <div class="position-stats-bar">
                                        <div class="stats-bar">
                                            <div class="sold-bar" style="width: ${pos.total > 0 ? (pos.sold / pos.total) * 100 : 0}%">
                                                <span>Продано: ${pos.sold}</span>
                                            </div>
                                            <div class="free-bar" style="width: ${pos.total > 0 ? (pos.free / pos.total) * 100 : 0}%">
                                                <span>Свободно: ${pos.free}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            ` : ''}
            
            ${hasPS5Positions ? `
                <div class="platform-section">
                    <h4 style="color: #f72585; margin-bottom: 10px;">
                        <i class="fab fa-playstation"></i> PS5 Позиции
                    </h4>
                    ${Object.keys(stats.positionsByType)
                        .filter(posType => posType.includes('ps5') && stats.positionsByType[posType].total > 0)
                        .map(posType => {
                            const pos = stats.positionsByType[posType];
                            const isCritical = pos.free <= criticalThreshold;
                            
                            return `
                                <div class="position-detail ${isCritical ? 'critical' : ''}">
                                    <div class="position-header">
                                        <span class="position-name">${getPositionName(posType)}</span>
                                        <span class="position-status ${isCritical ? 'critical' : 'ok'}">
                                            ${isCritical ? '⚠️ Критично' : '✅ Норма'}
                                        </span>
                                    </div>
                                    <div class="position-stats-bar">
                                        <div class="stats-bar">
                                            <div class="sold-bar" style="width: ${pos.total > 0 ? (pos.sold / pos.total) * 100 : 0}%">
                                                <span>Продано: ${pos.sold}</span>
                                            </div>
                                            <div class="free-bar" style="width: ${pos.total > 0 ? (pos.free / pos.total) * 100 : 0}%">
                                                <span>Свободно: ${pos.free}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            ` : ''}
            
            ${!hasPS4Positions && !hasPS5Positions ? `
                <div class="empty" style="padding: 20px; text-align: center;">
                    <i class="fas fa-info-circle fa-2x" style="color: #94a3b8;"></i>
                    <p style="margin-top: 10px; color: #64748b;">Нет данных по позициям</p>
                </div>
            ` : ''}
        </div>
        
        <!-- НОВЫЙ РАЗДЕЛ: Рекомендации по закупу -->
        <h3>📋 Рекомендации по закупу</h3>
        <div class="procurement-recommendations">
            ${Object.keys(stats.positionsByType)
                .filter(posType => stats.positionsByType[posType].total > 0)
                .map(posType => {
                    const pos = stats.positionsByType[posType];
                    const recommendation = getEnhancedProcurementRecommendation(posType, pos, stats.salesVelocity);
                    
                    if (!recommendation) return '';
                    
                    return `
                        <div class="recommendation-item ${recommendation.priority}">
                            <div class="recommendation-header">
                                <strong>${getPositionName(posType)}</strong>
                                <span class="recommendation-priority ${recommendation.priority}">
                                    ${recommendation.priority === 'critical' ? '🚨' : 
                                      recommendation.priority === 'high' ? '⚠️' : '📋'}
                                </span>
                            </div>
                            <div class="recommendation-content">
                                <div>${recommendation.text}</div>
                                <div class="recommendation-details">
                                    <span>📦 Докупить: <strong>${recommendation.quantity} шт.</strong></span>
                                    ${recommendation.daysToExhaustion ? 
                                        `<span>⏳ До истощения: <strong>${recommendation.daysToExhaustion} дн.</strong></span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            
            ${Object.keys(stats.positionsByType).every(posType => {
                const pos = stats.positionsByType[posType];
                const rec = getEnhancedProcurementRecommendation(posType, pos, stats.salesVelocity);
                return !rec;
            }) ? `
                <div class="empty" style="padding: 20px; text-align: center;">
                    <i class="fas fa-thumbs-up fa-2x" style="color: #10b981;"></i>
                    <p style="margin-top: 10px; color: #64748b;">Все позиции в норме. Рекомендации не требуются.</p>
                </div>
            ` : ''}
        </div>
        
        <h3>💰 Финансы</h3>
        <div class="financial-stats">
            <div class="financial-item">
                <span>Затраты на закуп:</span>
                <strong class="expense">${stats.purchaseAmount.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div class="financial-item">
                <span>Выручка:</span>
                <strong class="revenue">${stats.revenue.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div class="financial-item">
                <span>Прибыль:</span>
                <strong class="profit ${stats.profit >= 0 ? 'positive' : 'negative'}">
                    ${stats.profit.toLocaleString('ru-RU')} ₽
                </strong>
            </div>
        </div>
        
        <div class="modal-actions">
            <button onclick="addAccountsForGame(${gameId})" class="btn btn-success">
                <i class="fas fa-plus"></i> Добавить аккаунты
            </button>
            <button onclick="generateProcurementPlan(${gameId})" class="btn btn-primary">
                <i class="fas fa-clipboard-list"></i> План закупа
            </button>
            <button onclick="closeModal('gameDetailsModal')" class="btn btn-secondary">
                Закрыть
            </button>
        </div>
    `;
    
    openModal('gameDetailsModal');
}

// УЛУЧШЕННЫЕ РЕКОМЕНДАЦИИ ПО ЗАКУПУ
function getEnhancedProcurementRecommendation(posType, position, salesVelocity) {
    if (position.total === 0) return null;
    
    // Рассчитываем дни до истощения
    let daysToExhaustion = null;
    if (position.free > 0 && salesVelocity > 0) {
        const trendFactor = position.trend?.trend > 0 ? 1.3 : 1.0;
        daysToExhaustion = Math.round(position.free / (salesVelocity * trendFactor));
    }
    
    // Определяем приоритет
    let priority = 'low';
    let text = '';
    let quantity = 0;
    
    // 1. КРИТИЧЕСКИЙ СЛУЧАЙ - уже закончилось
    if (position.free === 0) {
        priority = 'critical';
        text = '🛑 Закончились! Срочно докупить';
        quantity = Math.max(3, Math.ceil(position.total * 0.5));
    }
    // 2. ВЫСОКИЙ ПРИОРИТЕТ - скоро закончится
    else if (position.free <= 2) {
        priority = 'critical';
        text = `⚠️ Осталось мало (${position.free} из ${position.total})`;
        if (daysToExhaustion && daysToExhaustion < 3) {
            text += ` · ⏳ Хватит на ${daysToExhaustion} дня`;
        }
        quantity = Math.max(3, Math.ceil(position.total * 0.5));
    }
    // 3. СРЕДНИЙ ПРИОРИТЕТ - нужно пополнить
    else if (position.free <= 5 || (position.sold / position.total) > 0.7) {
        priority = 'high';
        text = `📊 Нужно пополнить (${position.free} свободно)`;
        if (daysToExhaustion && daysToExhaustion < 7) {
            text += ` · ⏳ Хватит на ${daysToExhaustion} дней`;
        }
        quantity = Math.max(2, Math.ceil(position.total * 0.3));
    }
    // 4. НИЗКИЙ ПРИОРИТЕТ - для поддержания запаса
    else if (position.free <= 10) {
        priority = 'medium';
        text = `📋 Можно докупить для поддержания запаса`;
        if (daysToExhaustion && daysToExhaustion < 14) {
            text += ` · ⏳ Хватит на ${daysToExhaustion} дней`;
        }
        quantity = Math.max(2, Math.ceil(position.total * 0.2));
    }
    // 5. Все ок - рекомендаций нет
    else {
        return null;
    }
    
    // Учитываем скорость продаж для расчета количества
    if (salesVelocity > 0 && daysToExhaustion && daysToExhaustion < 30) {
        const weeksToCover = 4; // Хотим покрыть 4 недели продаж
        const idealQuantity = Math.ceil(salesVelocity * 7 * weeksToCover * 0.5);
        if (idealQuantity > quantity) {
            quantity = idealQuantity;
            text += ` · 🎯 Оптимально на ${weeksToCover} недели продаж`;
        }
    }
    
    return {
        priority,
        text,
        quantity,
        daysToExhaustion
    };
}

// Получить рекомендацию по закупу
function getProcurementRecommendation(posType, position) {
    // Если позиций вообще нет в игре (и они не нужны)
    if (position.total === 0) {
        return ""; // Пустая строка - не показываем рекомендацию
    }
    
    if (position.free === 0) {
        return `🛑 Закончились! Срочно докупить ${Math.max(3, position.total)} позиций`;
    }
    
    if (position.free <= criticalThreshold) {
        const need = Math.max(3, Math.ceil(position.total * 0.5));
        return `⚠️ Мало позиций (${position.free} из ${position.total}). Докупить ${need} шт.`;
    }
    
    if (position.sold / position.total > 0.8) {
        return `📈 Хорошо продается (${Math.round((position.sold / position.total) * 100)}%). Можно докупить 2-3 шт.`;
    }
    
    return `✅ Норма (${position.free} свободно из ${position.total})`;
}

// Добавить аккаунты для игры
function addAccountsForGame(gameId) {
    window.location.href = `add-account.html?game=${gameId}`;
}

// Добавить рекомендованные позиции
function addRecommendedPositions(gameId) {
    if (confirm('Перейти к добавлению аккаунтов для этой игры?')) {
        addAccountsForGame(gameId);
    }
}

// Создать план закупа
function generateProcurementPlan(gameId) {
    const game = games.find(g => g.id === gameId);
    const stats = gamesStats.find(s => s.gameId === gameId);
    
    if (!game || !stats) return;
    
    let plan = `План закупа для игры: ${game.name}\n\n`;
    plan += `Дата создания: ${new Date().toLocaleDateString('ru-RU')}\n`;
    plan += `========================================\n\n`;
    
    Object.keys(stats.positionsByType).forEach(posType => {
        const pos = stats.positionsByType[posType];
        const rec = getProcurementRecommendation(posType, pos);
        
        plan += `${getPositionName(posType)}:\n`;
        plan += `  Текущее состояние: ${pos.free} свободно из ${pos.total}\n`;
        plan += `  Рекомендация: ${rec}\n`;
        plan += `  Статус: ${pos.free <= criticalThreshold ? 'Требуется закуп' : 'Запас достаточный'}\n\n`;
    });
    
    // Копируем в буфер обмена
    navigator.clipboard.writeText(plan).then(() => {
        showNotification('План закупа скопирован в буфер обмена 📋', 'success');
    }).catch(() => {
        // Fallback для старых браузеров
        const textarea = document.createElement('textarea');
        textarea.value = plan;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('План закупа скопирован в буфер обмена 📋', 'success');
    });
}

// Вспомогательные функции
function getPositionName(posType) {
    const names = {
        'p2_ps4': 'П2 PS4',
        'p3_ps4': 'П3 PS4',
        'p2_ps5': 'П2 PS5',
        'p3_ps5': 'П3 PS5'
    };
    return names[posType] || posType;
}

function getRecommendationIcon(action) {
    const icons = {
        'add': 'plus-circle',
        'restock': 'shopping-cart',
        'maintain': 'boxes'
    };
    return icons[action] || 'info-circle';
}

// Обновление данных
function refreshProcurementData() {
    calculateProcurementStats();
    displayCriticalPositions();
    showNotification('Данные по закупу обновлены 🔄', 'info');
}

// Обновление при изменении данных в реальном времени
setInterval(() => {
    if (window.location.pathname.includes('procurement.html')) {
        refreshProcurementData();
    }
}, 30000); // Обновлять каждые 30 секунд
