// 默认持仓兜底
let assetConfig = [
    { ticker: 'VOO', name: '标普500 ETF', target: 40.0, current: 17.4 },
    { ticker: 'QQQM', name: '纳斯达克100 ETF', target: 35.0, current: 70.1 },
    { ticker: 'BOTZ', name: 'AI与机器人 ETF', target: 15.0, current: 7.4 },
    { ticker: 'TQQQ', name: '3倍做多纳指 ETF', target: 5.0, current: 5.1 }
];

document.addEventListener('DOMContentLoaded', async () => {
    initCalculator();
    await loadDataFromJSON(); // 动态加载 Excel 导出的最新持仓与行情
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

// 核心：读取 GitHub Actions 定时更新的 earnings.json
async function loadDataFromJSON() {
    try {
        const response = await fetch('./earnings.json');
        if (response.ok) {
            const data = await response.json();
            
            // 1. 如果有来自 Excel 的持仓配置，替换本地变量
            if (data.portfolio && data.portfolio.length > 0) {
                assetConfig = data.portfolio;
            }

            // 2. 渲染行情快照
            if (data.market_data) {
                renderMarketCards(data.market_data);
            }

            // 3. 渲染财报情报
            if (data.intel) {
                renderEarningsIntel(data.intel);
            }
        }
    } catch (e) {
        console.log('读取 earnings.json 失败，使用本地预设数据');
    }
}

// 智能纠偏与表格渲染
function renderAssetTable() {
    const budget = parseFloat(document.getElementById('monthlyBudget')?.value) || 0;
    const tbody = document.getElementById('assetTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    let totalDeficit = 0;
    const itemsWithDeficit = assetConfig.map(item => {
        const gap = item.target - item.current;
        const deficit = gap > 0 ? gap : 0;
        totalDeficit += deficit;
        return { ...item, gap, deficit };
    });

    itemsWithDeficit.forEach(item => {
        let allocatedAmount = 0;
        
        if (totalDeficit > 0) {
            allocatedAmount = budget * (item.deficit / totalDeficit);
        } else {
            allocatedAmount = budget * (item.target / 100);
        }

        let tagHtml = '';
        if (item.gap > 0.5) {
            tagHtml = `<span class="tag tag-under">低配 ${item.gap.toFixed(1)}%</span>`;
        } else if (item.gap < -0.5) {
            tagHtml = `<span class="tag tag-over">超配 +${Math.abs(item.gap).toFixed(1)}%</span>`;
        } else {
            tagHtml = `<span class="tag" style="background: rgba(110,118,129,0.2); color: #8b949e;">平衡</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ticker">${item.ticker}</td>
            <td>${item.name}</td>
            <td>${item.target}%</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(item.current, 100)}%; background-color: ${item.gap > 0 ? '#3fb950' : '#f85149'};"></div>
                    </div>
                    <span class="progress-text">${item.current}%</span>
                    ${tagHtml}
                </div>
            </td>
            <td style="color: ${allocatedAmount > 0 ? '#3fb950' : '#8b949e'}; font-weight: bold;">
                HK$ ${Math.round(allocatedAmount).toLocaleString()}
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
