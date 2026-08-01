// 默认资产黄金比例设定
const portfolio = [
    { ticker: "VOO", name: "标普500 ETF", targetRatio: 0.40, currentRatio: 0.35 },
    { ticker: "QQQM", name: "纳斯达克100 ETF", targetRatio: 0.30, currentRatio: 0.28 },
    { ticker: "BOTZ", name: "AI与机器人 ETF", targetRatio: 0.15, currentRatio: 0.18 },
    { ticker: "TQQQ", name: "3倍做多纳指 ETF", targetRatio: 0.15, currentRatio: 0.19 }
];

// 计算定投分配逻辑
function calculateAllocation() {
    const budgetInput = document.getElementById('monthlyBudget');
    const budget = parseFloat(budgetInput.value) || 0;
    const tableBody = document.getElementById('assetTableBody');
    tableBody.innerHTML = '';

    portfolio.forEach(asset => {
        const row = document.createElement('tr');
        
        // 计算实际偏差
        const diff = (asset.currentRatio - asset.targetRatio) * 100;
        const diffTag = diff < 0 
            ? `<span class="tag tag-under">低配 ${Math.abs(diff).toFixed(1)}%</span>` 
            : `<span class="tag tag-over">超配 +${diff.toFixed(1)}%</span>`;

        // 按目标比例自动分拆港币
        const allocatedHKD = (budget * asset.targetRatio).toFixed(2);

        row.innerHTML = `
            <td class="ticker">${asset.ticker}</td>
            <td>${asset.name}</td>
            <td>${(asset.targetRatio * 100).toFixed(0)}%</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${asset.currentRatio * 100}%"></div>
                    </div>
                    <span>${(asset.currentRatio * 100).toFixed(0)}%</span>
                    ${diffTag}
                </div>
            </td>
            <td style="font-weight: bold; color: #2ea44f;">HK$ ${Number(allocatedHKD).toLocaleString()}</td>
        `;
        tableBody.appendChild(row);
    });
}

// 动态读取 earnings.json (方案二)
async function loadEarningsIntel() {
    const container = document.querySelector('.earnings-grid');
    if (!container) return;

    try {
        // 加时间戳强制防止浏览器缓存旧数据
        const response = await fetch('earnings.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('未找到 earnings.json');

        const intelData = await response.json();
        container.innerHTML = '';

        intelData.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'intel-item';

            let badgeClass = 'bullish';
            let badgeText = '看涨 🟢';
            if (item.sentiment === 'neutral') {
                badgeClass = 'neutral';
                badgeText = '中性 🟡';
            } else if (item.sentiment === 'bearish') {
                badgeClass = 'bearish';
                badgeText = '看跌 🔴';
            }

            itemEl.innerHTML = `
                <div class="intel-header">
                    <span class="company">${item.company} (${item.ticker})</span>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <p class="intel-desc">${item.summary}</p>
            `;
            container.appendChild(itemEl);
        });
        console.log("✅ 财报情报加载成功！");
    } catch (error) {
        console.warn("⚠️ 读取 earnings.json 失败，降级显示提示。", error);
        container.innerHTML = `<div class="intel-loading">暂无最新财报数据（支持后台自动刷新）</div>`;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    calculateAllocation();
    loadEarningsIntel();

    // 监听预算输入变动
    document.getElementById('monthlyBudget').addEventListener('input', calculateAllocation);
});