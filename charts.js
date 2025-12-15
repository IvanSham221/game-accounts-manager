// charts.js - Функции для создания графиков Chart.js

// Цветовая палитра для графиков
const CHART_COLORS = {
    blue: '#4361ee',
    purple: '#7209b7',
    pink: '#f72585',
    cyan: '#4cc9f0',
    orange: '#f8961e',
    green: '#4ade80',
    red: '#ef4444',
    yellow: '#fbbf24',
    indigo: '#6366f1',
    teal: '#14b8a6'
};

const CHART_BACKGROUNDS = [
    'rgba(67, 97, 238, 0.7)',
    'rgba(114, 9, 183, 0.7)',
    'rgba(247, 37, 133, 0.7)',
    'rgba(76, 201, 240, 0.7)',
    'rgba(248, 150, 30, 0.7)',
    'rgba(74, 222, 128, 0.7)',
    'rgba(239, 68, 68, 0.7)',
    'rgba(251, 191, 36, 0.7)',
    'rgba(99, 102, 241, 0.7)',
    'rgba(20, 184, 166, 0.7)'
];

const CHART_BORDERS = [
    '#4361ee',
    '#7209b7',
    '#f72585',
    '#4cc9f0',
    '#f8961e',
    '#4ade80',
    '#ef4444',
    '#fbbf24',
    '#6366f1',
    '#14b8a6'
];

// Отображение всех графиков
function renderAllCharts(periodSales, startDate, endDate) {
    const container = document.getElementById('chartsContainer');
    
    if (periodSales.length === 0) {
        container.innerHTML = `
            <div class="section">
                <h2>📊 Графики за период: ${startDate} - ${endDate}</h2>
                <div class="empty">Нет данных для построения графиков</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="section">
            <h2>📊 Графики за период: ${startDate} - ${endDate}</h2>
            <p style="color: #64748b; margin-bottom: 20px;">
                Всего продаж: ${periodSales.length} • 
                Выручка: ${periodSales.reduce((sum, sale) => sum + sale.price, 0).toLocaleString('ru-RU')} ₽
            </p>
            
            <div class="charts-grid">
                <!-- График 1: Продажи по дням -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3>📈 Динамика продаж по дням</h3>
                        <button onclick="toggleChartType('salesChart')" class="btn btn-small">
                            📊 Сменить тип
                        </button>
                    </div>
                    <canvas id="salesChart" width="400" height="200"></canvas>
                </div>
                
                <!-- График 2: Распределение по играм -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3>🎮 Продажи по играм</h3>
                    </div>
                    <canvas id="gamesChart" width="400" height="200"></canvas>
                </div>
                
                <!-- График 3: Продажи по работникам -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3>👷 Топ работников</h3>
                        <button onclick="toggleWorkersChart()" class="btn btn-small">
                            🔄 Показать %
                        </button>
                    </div>
                    <canvas id="workersChart" width="400" height="200"></canvas>
                </div>
                
                <!-- График 4: Распределение по позициям -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3>🎯 Типы позиций</h3>
                    </div>
                    <canvas id="positionsChart" width="400" height="200"></canvas>
                </div>
                
                <!-- График 5: Прибыль по играм -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3>💰 Прибыльность игр</h3>
                    </div>
                    <canvas id="profitChart" width="400" height="200"></canvas>
                </div>
                
                <!-- График 6: Средний чек по дням -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3>🧾 Средний чек по дням</h3>
                    </div>
                    <canvas id="avgCheckChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>
    `;
    
    // Создаем все графики
    renderSalesByDayChart(periodSales, startDate, endDate);
    renderGamesDistributionChart(periodSales);
    renderWorkersChart(periodSales);
    renderPositionsChart(periodSales);
    renderProfitByGamesChart(periodSales);
    renderAvgCheckChart(periodSales);
}

// 1. График продаж по дням
function renderSalesByDayChart(salesData, startDate, endDate) {
    // Группируем продажи по дням
    const dailySales = {};
    const dailyCount = {};
    
    salesData.forEach(sale => {
        const date = sale.date || new Date(sale.timestamp).toISOString().split('T')[0];
        dailySales[date] = (dailySales[date] || 0) + sale.price;
        dailyCount[date] = (dailyCount[date] || 0) + 1;
    });
    
    // Сортируем даты
    const sortedDates = Object.keys(dailySales).sort((a, b) => a.localeCompare(b));
    const revenues = sortedDates.map(date => dailySales[date]);
    const counts = sortedDates.map(date => dailyCount[date]);
    
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Удаляем старый график если есть
    if (window.salesChartInstance) {
        window.salesChartInstance.destroy();
    }
    
    window.salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Выручка (₽)',
                    data: revenues,
                    borderColor: CHART_COLORS.blue,
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Кол-во продаж',
                    data: counts,
                    borderColor: CHART_COLORS.pink,
                    backgroundColor: 'rgba(247, 37, 133, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                                label += context.parsed.y.toLocaleString('ru-RU') + ' ₽';
                            } else {
                                label += context.parsed.y + ' продаж';
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Выручка (₽)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('ru-RU') + ' ₽';
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Кол-во продаж'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 2. Круговая диаграмма продаж по играм
function renderGamesDistributionChart(salesData) {
    const gamesRevenue = {};
    
    salesData.forEach(sale => {
        gamesRevenue[sale.gameName] = (gamesRevenue[sale.gameName] || 0) + sale.price;
    });
    
    // Сортируем по убыванию
    const sortedGames = Object.entries(gamesRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Берем топ-10 игр
    
    const gameNames = sortedGames.map(([name]) => name);
    const gameRevenues = sortedGames.map(([, revenue]) => revenue);
    
    const ctx = document.getElementById('gamesChart').getContext('2d');
    
    if (window.gamesChartInstance) {
        window.gamesChartInstance.destroy();
    }
    
    window.gamesChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: gameNames,
            datasets: [{
                data: gameRevenues,
                backgroundColor: CHART_BACKGROUNDS,
                borderColor: CHART_BORDERS,
                borderWidth: 1,
                hoverOffset: 20
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${value.toLocaleString('ru-RU')} ₽ (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '50%'
        }
    });
}

// 3. Столбчатая диаграмма топ работников
function renderWorkersChart(salesData) {
    const workersRevenue = {};
    
    salesData.forEach(sale => {
        const workerName = sale.soldByName || 'Неизвестно';
        workersRevenue[workerName] = (workersRevenue[workerName] || 0) + sale.price;
    });
    
    // Сортируем по убыванию, берем топ-8
    const sortedWorkers = Object.entries(workersRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    const workerNames = sortedWorkers.map(([name]) => name);
    const workerRevenues = sortedWorkers.map(([, revenue]) => revenue);
    
    const ctx = document.getElementById('workersChart').getContext('2d');
    
    if (window.workersChartInstance) {
        window.workersChartInstance.destroy();
    }
    
    window.workersChartType = 'bar';
    
    window.workersChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: workerNames,
            datasets: [{
                label: 'Выручка (₽)',
                data: workerRevenues,
                backgroundColor: workerNames.map((name, index) => 
                    name.includes('админ') || name.includes('Иван') ? 
                    CHART_COLORS.pink : 
                    CHART_BACKGROUNDS[index % CHART_BACKGROUNDS.length]
                ),
                borderColor: workerNames.map((name, index) => 
                    name.includes('админ') || name.includes('Иван') ? 
                    CHART_COLORS.red : 
                    CHART_BORDERS[index % CHART_BORDERS.length]
                ),
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toLocaleString('ru-RU')} ₽`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('ru-RU') + ' ₽';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 4. График распределения по позициям
function renderPositionsChart(salesData) {
    const positions = {
        'П2 PS4': 0,
        'П3 PS4': 0,
        'П2 PS5': 0,
        'П3 PS5': 0
    };
    
    salesData.forEach(sale => {
        const posName = sale.positionName || getPositionName(sale.positionType);
        if (positions[posName] !== undefined) {
            positions[posName] += 1;
        }
    });
    
    const positionNames = Object.keys(positions);
    const positionCounts = Object.values(positions);
    
    const ctx = document.getElementById('positionsChart').getContext('2d');
    
    if (window.positionsChartInstance) {
        window.positionsChartInstance.destroy();
    }
    
    window.positionsChartInstance = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: positionNames,
            datasets: [{
                data: positionCounts,
                backgroundColor: [
                    'rgba(67, 97, 238, 0.7)',
                    'rgba(114, 9, 183, 0.7)',
                    'rgba(76, 201, 240, 0.7)',
                    'rgba(248, 150, 30, 0.7)'
                ],
                borderColor: [
                    CHART_COLORS.blue,
                    CHART_COLORS.purple,
                    CHART_COLORS.cyan,
                    CHART_COLORS.orange
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} продаж (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });
}

// 5. График прибыльности игр
function renderProfitByGamesChart(salesData) {
    const gamesProfit = {};
    
    salesData.forEach(sale => {
        const account = window.accounts.find(acc => acc.id === sale.accountId);
        if (account) {
            const totalPositions = account.positions.p2_ps4 + account.positions.p3_ps4 + 
                                  account.positions.p2_ps5 + account.positions.p3_ps5;
            const costPerPosition = totalPositions > 0 ? (account.purchaseAmount || 0) / totalPositions : 0;
            const profit = sale.price - costPerPosition;
            
            gamesProfit[sale.gameName] = (gamesProfit[sale.gameName] || 0) + profit;
        }
    });
    
    // Сортируем по прибыли, берем топ-7
    const sortedGames = Object.entries(gamesProfit)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);
    
    const gameNames = sortedGames.map(([name]) => name);
    const gameProfits = sortedGames.map(([, profit]) => profit);
    
    // Определяем цвета (зеленый для прибыли, красный для убытков)
    const backgroundColors = gameProfits.map(profit => 
        profit >= 0 ? 'rgba(74, 222, 128, 0.7)' : 'rgba(239, 68, 68, 0.7)'
    );
    
    const borderColors = gameProfits.map(profit => 
        profit >= 0 ? CHART_COLORS.green : CHART_COLORS.red
    );
    
    const ctx = document.getElementById('profitChart').getContext('2d');
    
    if (window.profitChartInstance) {
        window.profitChartInstance.destroy();
    }
    
    window.profitChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: gameNames,
            datasets: [{
                label: 'Прибыль (₽)',
                data: gameProfits,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y', // Горизонтальные бары
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const profit = context.raw;
                            const sign = profit >= 0 ? '+' : '';
                            return `Прибыль: ${sign}${profit.toLocaleString('ru-RU')} ₽`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('ru-RU') + ' ₽';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 6. График среднего чека по дням
function renderAvgCheckChart(salesData) {
    const dailyStats = {};
    
    salesData.forEach(sale => {
        const date = sale.date || new Date(sale.timestamp).toISOString().split('T')[0];
        if (!dailyStats[date]) {
            dailyStats[date] = {
                total: 0,
                count: 0
            };
        }
        dailyStats[date].total += sale.price;
        dailyStats[date].count += 1;
    });
    
    // Сортируем даты
    const sortedDates = Object.keys(dailyStats).sort((a, b) => a.localeCompare(b));
    const avgChecks = sortedDates.map(date => 
        dailyStats[date].count > 0 ? dailyStats[date].total / dailyStats[date].count : 0
    );
    
    const ctx = document.getElementById('avgCheckChart').getContext('2d');
    
    if (window.avgCheckChartInstance) {
        window.avgCheckChartInstance.destroy();
    }
    
    window.avgCheckChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Средний чек (₽)',
                data: avgChecks,
                borderColor: CHART_COLORS.orange,
                backgroundColor: 'rgba(248, 150, 30, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: CHART_COLORS.orange,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const date = sortedDates[context.dataIndex];
                            const salesCount = dailyStats[date].count;
                            return [
                                `Средний чек: ${context.parsed.y.toLocaleString('ru-RU')} ₽`,
                                `Продаж за день: ${salesCount}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('ru-RU') + ' ₽';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Вспомогательные функции
function toggleChartType(chartId) {
    if (chartId === 'salesChart' && window.salesChartInstance) {
        const newType = window.salesChartInstance.config.type === 'line' ? 'bar' : 'line';
        window.salesChartInstance.config.type = newType;
        window.salesChartInstance.update();
    }
}

function toggleWorkersChart() {
    if (window.workersChartInstance) {
        const newType = window.workersChartInstance.config.type === 'bar' ? 'doughnut' : 'bar';
        window.workersChartInstance.config.type = newType;
        window.workersChartInstance.update();
    }
}

// Функция для получения имени позиции (из script.js)
function getPositionName(positionType) {
    const names = {
        'p2_ps4': 'П2 PS4',
        'p3_ps4': 'П3 PS4',
        'p2_ps5': 'П2 PS5',
        'p3_ps5': 'П3 PS5'
    };
    return names[positionType] || positionType;
}