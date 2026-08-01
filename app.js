// 核心配置文件：定投分配与行情展示标的
const assetConfig = [
    { ticker: 'VOO', name: '标普500 ETF', target: 40, current: 35 },
    { ticker: 'QQQM', name: '纳斯达克100 ETF', target: 30, current: 28 },
    { ticker: 'BOTZ', name: 'AI与机器人 ETF', target: 15, current: 18 },
    { ticker: 'TQQQ', name: '3倍做多纳指 ETF', target: 15, current: 19 }
];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initCalculator();
    renderAssetTable();
    fetchMarketData();  // 获取固定标的的市场行情 (WTD)
    fetchEarningsIntel(); // 获取美股财报情报
});

// 1. 定投计算器逻辑
function initCalculator() {
    const budgetInput = document.getElementById('monthlyBudget');
    if (budgetInput) {
        budgetInput.addEventListener('input', () => {
            renderAssetTable();
        });
    }
}

// 2. 渲染资产配置表
function renderAssetTable() {
    const budget = parseFloat(document.getElementById('monthlyBudget')?.value) || 0;
    const tbody = document.getElementById('assetTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    assetConfig.forEach(item => {
        const diff = item.current - item.target;
        const allocatedAmount = (budget * (item.target / 100)).toFixed(0);
        
        let tagHtml = '';
        if (diff < 0) {
            tagHtml = `<span class="tag tag-under">低配 ${Math.abs(diff).toFixed(1)}%</span>`;
        } else if (diff > 0) {
            tagHtml = `<span class="tag tag-over">超配 +${diff.toFixed(1)}%</span>`;
        } else {
            tagHtml = `<span class="tag">标准</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ticker">${item.ticker}</td>
            <td>${item.name}</td>
            <td>${item.target}%</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(item.current, 100)}%;"></div>
                    </div>
                    <span>${item.current}%</span>
                    ${tagHtml}
                </div>
            </td>
            <td style="color: #3fb950; font-weight: bold;">HK$ ${parseInt(allocatedAmount).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. 直接展示市场行情 (WTD + 实时价格)
async function fetchMarketData() {
    // 预设固定标的的最新市场行情数据 (备用/初始化)
    const marketSnapshot = {
        'VOO': { price: '$510.25', wtd: '+1.85%', bullish: true },
        'QQQM': { price: '$188.40', wtd: '+2.10%', bullish: true },
        'BOTZ': { price: '$31.15', wtd: '-0.42%', bullish: false },
        'TQQQ': { price: '$65.88', wtd: '+6.32%', bullish: true }
    };

    try {
        // 从 earnings.json 读取每周由后台更新的行情快照（如有）
        const response = await fetch('./earnings.json');
        if (response.ok) {
            const data = await response.json();
            if (data.market_data) {
                Object.assign(marketSnapshot, data.market_data);
            }
        }
    } catch (e) {
        console.log('使用内置市场行情快照数据');
    }

    renderMarketCards(marketSnapshot);
}

// 渲染右侧的市场行情卡片
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

// 4. 抓取美股财报情报 (来自 earnings.json)
async function fetchEarningsIntel() {
    const container = document.querySelector('.earnings-grid');
    if (!container) return;

    try {
        const response = await fetch('./earnings.json');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        
        container.innerHTML = '';
        const intelList = data.intel || data;

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
    } catch (error) {
        container.innerHTML = `
            <div class="intel-item">
                <div class="intel-header">
                    <span class="company">微软 (MSFT)</span>
                    <span class="badge bullish">看涨</span>
                </div>
                <p class="intel-desc">Azure 云业务增速超预期，AI Copilot 商业化加速，持续推动 QQQM 及大盘稳步上行。</p>
            </div>
            <div class="intel-item">
                <div class="intel-header">
                    <span class="company">英伟达 (NVDA)</span>
                    <span class="badge bullish">看涨</span>
                </div>
                <p class="intel-desc">Blackwell 架构芯片量产强劲，数据中心需求爆棚，直接拉动 BOTZ 与 TQQQ 的爆发力。</p>
            </div>
            <div class="intel-item">
                <div class="intel-header">
                    <span class="company">Meta (META)</span>
                    <span class="badge bullish">看涨</span>
                </div>
                <p class="intel-desc">广告业务 AI 转化率大幅提升，Llama 生态巩固行业话语权，现金流表现优异。</p>
            </div>
            <div class="intel-item">
                <div class="intel-header">
                    <span class="company">亚马逊 (AMZN)</span>
                    <span class="badge neutral">中性</span>
                </div>
                <p class="intel-desc">AWS 保持稳定增长，但下季度 AI 基础设施资本支出上调引发市场短期观望。</p>
            </div>
        `;
    }
}
