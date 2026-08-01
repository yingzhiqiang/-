// 默认持仓兜底
let assetConfig = [
    { ticker: 'VOO', name: '标普500 ETF', target: 40.0, current: 17.4 },
    { ticker: 'QQQM', name: '纳斯达克100 ETF', target: 35.0, current: 70.1 },
    { ticker: 'BOTZ', name: 'AI与机器人 ETF', target: 15.0, current: 7.4 },
    { ticker: 'TQQQ', name: '3倍做多纳指 ETF', target: 5.0, current: 5.1 }
];

document.addEventListener('DOMContentLoaded', async () => {
    initCalculator();
    await loadDataFromJSON(); // 动态加载最新持仓与行情
    renderAssetTable();
});

function initCalculator() {
    const budgetInput = document.getElementById('monthlyBudget');
    if (budgetInput) {
        budgetInput.addEventListener('input', () => {
            renderAssetTable();
        });
    }
}

// 读取 GitHub Actions 更新的 earnings.json
async function loadDataFromJSON() {
    try {
        const response = await fetch('./earnings.json');
        if (response.ok) {
            const data = await response.json();
            
            if (data.portfolio && data.portfolio.length > 0) {
                assetConfig = data.portfolio;
            }

            if (data.market_data) {
                renderMarketCards(data.market_data);
            }

            if (data.intel) {
                renderEarningsIntel(data.intel);
            }
        }
    } catch (e) {
        console.log('读取 earnings.json 失败，使用本地预设数据');
    }
}

// 智能定投算法（完全同步 pet.py 逻辑）
function renderAssetTable() {
    const budget = parseFloat(document.getElementById('monthlyBudget')?.value) || 0;
    const tbody = document.getElementById('assetTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // 1. 获取每个 ETF 的偏离度 % (当前 - 目标)
    const devs = {};
    assetConfig.forEach(item => {
        devs[item.ticker] = item.current - item.target;
    });

    // 2. 计算各标的的动态权重
    const BASE_WEIGHT = 10;
    const weights = {};
    let totalWeight = 0;

    assetConfig.forEach(item => {
        const name = item.ticker;
        const dev = devs[name] || 0;

        if (name === "TQQQ") {
            // TQQQ 特殊处理：直接停掉
            weights[name] = 0;
            return;
        }

        // 偏离度为负表示低配，取反 (-dev) 后变为正加成
        let weight = BASE_WEIGHT + (-dev);

        // 权重限制：最低 0.5（保底定投），最高 30（防止极端过度倾斜）
        weight = Math.max(0.5, weight);
        weight = Math.min(30, weight);

        weights[name] = weight;
        totalWeight += weight;
    });

    // 3. 按权重分配预算
    const allocation = {};

    assetConfig.forEach(item => {
        const name = item.ticker;
        if (name === "TQQQ") {
            allocation[name] = 0;
            return;
        }

        if (totalWeight > 0) {
            allocation[name] = Math.floor(budget * weights[name] / totalWeight);
        } else {
            allocation[name] = 0;
        }
    });

    // 4. 修正四舍五入尾差（把差额补到权重最大的标的上）
    let totalAllocated = 0;
    assetConfig.forEach(item => {
        if (item.ticker !== "TQQQ") {
            totalAllocated += allocation[item.ticker] || 0;
        }
    });

    const diff = Math.round(budget - totalAllocated);
    if (diff !== 0) {
        let maxTicker = null;
        let maxWeight = -1;
        assetConfig.forEach(item => {
            if (item.ticker !== "TQQQ" && weights[item.ticker] > maxWeight) {
                maxWeight = weights[item.ticker];
                maxTicker = item.ticker;
            }
        });
        if (maxTicker) {
            allocation[maxTicker] = (allocation[maxTicker] || 0) + diff;
        }
    }

    // 5. 渲染 HTML 表格
    assetConfig.forEach(item => {
        const name = item.ticker;
        const dev = devs[name] || 0;
        const allocatedAmount = allocation[name] || 0;

        // 状态标签
        let tagHtml = '';
        if (name === "TQQQ") {
            tagHtml = `<span class="tag" style="background: rgba(248,81,73,0.15); color: #f85149;">暂停定投</span>`;
        } else if (dev < -5) {
            tagHtml = `<span class="tag tag-under">低配 ${Math.abs(dev).toFixed(1)}%</span>`;
        } else if (dev > 5) {
            tagHtml = `<span class="tag tag-over">高配 +${dev.toFixed(1)}%</span>`;
        } else {
            tagHtml = `<span class="tag" style="background: rgba(110,118,129,0.2); color: #8b949e;">正常</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ticker">${item.ticker}</td>
            <td>${item.name}</td>
            <td>${item.target}%</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(item.current, 100)}%; background-color: ${dev <= 0 ? '#3fb950' : '#f85149'};"></div>
                    </div>
                    <span class="progress-text">${item.current}%</span>
                    ${tagHtml}
                </div>
            </td>
            <td style="color: ${allocatedAmount > 0 ? '#3fb950' : '#8b949e'}; font-weight: bold;">
                HK$ ${allocatedAmount.toLocaleString()}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMarketCards(marketData) {
    const container = document.querySelector('.chart-placeholder');
    if (!container) return;

    let html = '<div style="width: 100%; padding: 15px; display: flex; flex-direction: column; gap: 10px;">';
    html += '<h3 style="font-size: 14px; color: #8b949e; margin-bottom: 5px;">🔥 市场行情快照 (WTD)</h3>';

    Object.keys(marketData).forEach(ticker => {
        const item = marketData[ticker];
        const color = item.bullish ? '#3fb950' : '#f85149';
        
        html += `
            <div style="background: rgba(22, 27, 34, 0.7); border: 1px solid rgba(48, 54, 61, 0.8); border-radius: 6px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-weight: bold; color: #58a6ff; font-size: 14px;">${ticker}</span>
                    <span style="font-size: 12px; color: #8b949e; margin-left: 8px;">${item.price}</span>
                </div>
                <div style="font-weight: bold; color: ${color}; font-size: 13px; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px;">
                    WTD ${item.wtd}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderEarningsIntel(intelList) {
    const container = document.querySelector('.earnings-grid');
    if (!container) return;

    container.innerHTML = '';
    intelList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'intel-item';
        
        let badgeClass = 'neutral';
        if (item.sentiment === '看涨' || item.sentiment === 'Bullish') badgeClass = 'bullish';
        if (item.sentiment === '看跌' || item.sentiment === 'Bearish') badgeClass = 'bearish';

        card.innerHTML = `
            <div class="intel-header">
                <span class="company">${item.company} (${item.ticker})</span>
                <span class="badge ${badgeClass}">${item.sentiment}</span>
            </div>
            <p class="intel-desc">${item.summary}</p>
        `;
        container.appendChild(card);
    });
}
