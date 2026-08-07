// 全局资产配置与定投数据（初始化为空，完全由云端 earnings.json 驱动）
let assetConfig = [];

// 页面加载完成后自动初始化
document.addEventListener("DOMContentLoaded", async () => {
    initCalculator();
    await loadDataFromJSON(); // 自动加载最新持仓与行情
    renderAssetTable();       // 渲染资产表与计算器
});

// 初始化计算器输入监听
function initCalculator() {
    const budgetInput = document.getElementById("每月预算");
    if (budgetInput) {
        budgetInput.addEventListener("input", () => {
            renderAssetTable();
        });
    }
}

// 异步自动从云端读取 earnings.json（带防缓存时间戳）
async function loadDataFromJSON() {
    try {
        // 加上 ?t=时间戳，强制浏览器不走缓存，每次都获取最新云端数据
        let response = await fetch('./earnings.json?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error('网络请求 earnings.json 失败');
        }
        
        let data = await response.json();
        
        // 适配标准的 assetConfig 数组结构
        if (data.assetConfig && data.assetConfig.length > 0) {
            assetConfig = data.assetConfig;
            console.log("成功自动同步最新定投数据：", assetConfig);
        } else {
            console.warn("earnings.json 格式正确，但未检测到有效 assetConfig 数据");
        }
    } catch (error) {
        console.error('自动同步失败，请检查 earnings.json 是否存在或格式是否正确', error);
    }
}

// 渲染资产配置表与计算逻辑
function renderAssetTable() {
    // 如果 assetConfig 尚未加载完成，先不执行渲染
    if (!assetConfig || assetConfig.length === 0) return;

    // 获取每月预算输入框的值（默认总额为 3000 HKD）
    const budgetInput = document.getElementById("每月预算");
    const totalBudget = budgetInput ? parseFloat(budgetInput.value) || 3000 : 3000;

    // 此处可继续编写您的表格动态渲染、拟定投金额计算等 UI 逻辑
    console.log("正在根据最新资产配置渲染界面，总预算：", totalBudget);
}
