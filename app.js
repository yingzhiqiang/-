// 全局数据（全部由云端 earnings.json 驱动）
let portfolioData = [];  // [{ticker, name, target, current}]
let marketData = {};     // {VOO: {price, wtd, bullish}}
let intelData = [];      // [{company, ticker, sentiment, summary}]

// 简单转义，防止数据里的特殊字符破坏页面
function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 页面加载完成后自动初始化
document.addEventListener("DOMContentLoaded", async () => {
    initCalculator();
    await loadDataFromJSON();
    renderAssetTable();
    renderMarketSnapshot();
    renderIntel();
});

// 定投计算器输入监听（输入框 id 为 monthlyBudget）
function initCalculator() {
    const budgetInput = document.getElementById("monthlyBudget");
    if (budgetInput) {
        budgetInput.addEventListener("input", () => {
            renderAssetTable();
        });
    }
}

// 异步从云端读取 earnings.json（带防缓存时间戳）
async function loadDataFromJSON() {
    try {
        let response = await fetch('./earnings.json?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error('网络请求 earnings.json 失败');
        }

        let data = await response.json();

        // 持仓：兼容旧 assetConfig 格式与当前 portfolio 格式
        if (data.assetConfig && data.assetConfig.length > 0) {
            portfolioData = data.assetConfig;
        } else if (data.portfolio && data.portfolio.length > 0) {
            portfolioData = data.portfolio;
        } else {
            console.warn("earnings.json 中未检测到有效的持仓数据");
        }
        marketData = data.market_data || {};
        intelData = data.intel || [];
        console.log("成功同步云端数据");
    } catch (error) {
        console.error('自动同步失败，请检查 earnings.json 是否存在或格式是否正确', error);
    }
}

// 渲染资产配置表：标的代码 / 标的全称 / 目标占比 / 实际占比偏差 / 拟定投金额
function renderAssetTable() {
    const tbody = document.getElementById("assetTableBody");
    if (!tbody) return;
    if (!portfolioData || portfolioData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#8b949e;">暂无持仓数据</td></tr>';
        return;
    }

    // 每月预算（输入框 id 为 monthlyBudget）
    const budgetInput = document.getElementById("monthlyBudget");
    const totalBudget = budgetInput ? parseFloat(budgetInput.value) || 3000 : 3000;

    // 智能分配：只给低于目标的标的补仓，按缺口比例分
    const gaps = portfolioData.map(p => Math.max(0, (p.target || 0) - (p.current || 0)));
    const totalGap = gaps.reduce((a, b) => a + b, 0);

    tbody.innerHTML = portfolioData.map((p, i) => {
        const target = p.target || 0;
        const current = p.current || 0;
        const diff = current - target; // 负数为低配
        const diffTxt = (diff > 0 ? "+" : "") + diff.toFixed(1) + "pp";
        const tagCls = diff < 0 ? "tag-under" : (diff > 0 ? "tag-over" : "");
        const tagHtml = diff === 0 ? "—" : '<span class="tag ' + tagCls + '">' + esc(diffTxt) + "</span>";
        const amount = totalGap > 0 ? Math.round(totalBudget * gaps[i] / totalGap) : 0;
        return "<tr>" +
            "<td><span class='ticker'>" + esc(p.ticker) + "</span></td>" +
            "<td>" + esc(p.name) + "</td>" +
            "<td>" + target.toFixed(1) + "%</td>" +
            "<td>" + current.toFixed(1) + "% " + tagHtml + "</td>" +
            "<td>HK$ " + amount.toLocaleString() + "</td>" +
            "</tr>";
    }).join("");
}

// 渲染市场行情快照（WTD 周涨跌）
function renderMarketSnapshot() {
    const box = document.querySelector(".chart-placeholder");
    if (!box) return;
    const tickers = Object.keys(marketData);
    if (tickers.length === 0) {
        box.innerHTML = '<div style="color:#8b949e;">暂无行情数据</div>';
        return;
    }
    box.style.flexDirection = "column";
    box.style.justifyContent = "flex-start";
    box.style.alignItems = "stretch";
    box.style.padding = "16px";
    box.style.gap = "10px";
    box.innerHTML = tickers.map(t => {
        const m = marketData[t] || {};
        const wtd = m.wtd || "--";
        const down = String(wtd).trim().charAt(0) === "-";
        const cls = down ? "bearish" : "bullish";
        return '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span><span class="ticker">' + esc(t) + '</span> ' +
            '<span style="color:#f0f6fc;">' + esc(m.price || "--") + "</span></span>" +
            '<span class="badge ' + cls + '">' + esc(wtd) + "</span>" +
            "</div>";
    }).join("");
}

// 情绪文字统一成中文，badge 颜色跟着走
function normalizeSentiment(s) {
    const map = { bullish: "看涨", bearish: "看跌", neutral: "中性" };
    const zh = map[s] || s || "中性";
    const cls = zh === "看涨" ? "bullish" : (zh === "看跌" ? "bearish" : "neutral");
    return { text: zh, cls: cls };
}

// 渲染美股巨头财报情报区；优先用 AI 生成的 ai_earnings.json，没有则用 earnings.json 里的 intel
async function renderIntel() {
    const grid = document.querySelector(".earnings-grid");
    if (!grid) return;

    let list = intelData;
    try {
        const r = await fetch('./ai_earnings.json?t=' + new Date().getTime());
        if (r.ok) {
            const arr = await r.json();
            if (Array.isArray(arr) && arr.length > 0) list = arr;
        }
    } catch (e) { /* 没有 ai_earnings.json 就用内置 intel */ }

    if (!list || list.length === 0) {
        grid.innerHTML = '<div class="intel-loading">暂无财报情报数据</div>';
        return;
    }

    grid.innerHTML = list.map(item => {
        const s = normalizeSentiment(item.sentiment);
        return '<div class="intel-item">' +
            '<div class="intel-header">' +
            '<span class="company">' + esc(item.company || "") +
            ' <span class="ticker">' + esc(item.ticker || "") + "</span></span>" +
            '<span class="badge ' + s.cls + '">' + esc(s.text) + "</span>" +
            "</div>" +
            '<div class="intel-desc">' + esc(item.summary || "") + "</div>" +
            "</div>";
    }).join("");
}
