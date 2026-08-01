import json
import os
import requests
import re
import pandas as pd

# 标的映射
TICKER_MAP = {
    'VOO': 'gb_voo',
    'QQQM': 'gb_qqqm',
    'BOTZ': 'gb_botz',
    'TQQQ': 'gb_tqqq'
}

# 1. 解析 Excel 表格中的最新持仓与再平衡计划
def parse_excel_portfolio():
    excel_path = "investment_plan.xlsx"
    portfolio_data = []

    if not os.path.exists(excel_path):
        print(f"⚠️ 未找到 {excel_path}，使用预设配置数据")
        return [
            {"ticker": "VOO", "name": "标普500 ETF", "target": 40.0, "current": 17.4},
            {"ticker": "QQQM", "name": "纳斯达克100 ETF", "target": 35.0, "current": 70.1},
            {"ticker": "BOTZ", "name": "AI与机器人 ETF", "target": 15.0, "current": 7.4},
            {"ticker": "TQQQ", "name": "3倍做多纳指 ETF", "target": 5.0, "current": 5.1}
        ]

    try:
        # 读取持仓汇总 Sheet
        df_summary = pd.read_excel(excel_path, sheet_name='持仓汇总')
        name_map = {
            'VOO': '标普500 ETF',
            'QQQM': '纳斯达克100 ETF',
            'BOTZ': 'AI与机器人 ETF',
            'TQQQ': '3倍做多纳指 ETF'
        }

        for idx, row in df_summary.iterrows():
            ticker = str(row['ETF']).strip()
            if ticker in name_map:
                current_pct = round(float(row['实际比例']) * 100, 1)
                target_pct = round(float(row['目标比例']) * 100, 1)
                portfolio_data.append({
                    "ticker": ticker,
                    "name": name_map[ticker],
                    "target": target_pct,
                    "current": current_pct
                })
        print("✅ 成功解析 Excel 持仓汇总表！")
    except Exception as e:
        print(f"❌ 解析 Excel 失败: {e}")

    return portfolio_data

# 2. 从新浪 API 获取美股行情
def fetch_sina_market_data():
    market_data = {}
    codes = ",".join(TICKER_MAP.values())
    url = f"http://hq.sinajs.cn/list={codes}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "http://finance.sina.com.cn/"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = 'gbk'
        lines = response.text.strip().split('\n')

        for ticker, code in TICKER_MAP.items():
            for line in lines:
                if code in line:
                    match = re.search(r'"([^"]*)"', line)
                    if match:
                        items = match.group(1).split(',')
                        if len(items) > 5:
                            current_price = float(items[1])
                            open_price = float(items[5])
                            prev_close = float(items[26]) if len(items) > 26 else open_price
                            base_price = prev_close if prev_close > 0 else open_price
                            wtd_change = ((current_price - base_price) / base_price) * 100 if base_price > 0 else 0

                            market_data[ticker] = {
                                "price": f"${current_price:.2f}",
                                "wtd": f"{'+' if wtd_change >= 0 else ''}{wtd_change:.2f}%",
                                "bullish": wtd_change >= 0
                            }
    except Exception as e:
        print(f"❌ 抓取美股行情失败: {e}")

    return market_data

def main():
    print("🚀 开始更新黑洞资产终端数据...")
    portfolio = parse_excel_portfolio()
    market_snapshot = fetch_sina_market_data()

    intel_data = [
        {"company": "微软", "ticker": "MSFT", "sentiment": "看涨", "summary": "Azure 云业务增速超预期，AI Copilot 商业化进程加速。"},
        {"company": "英伟达", "ticker": "NVDA", "sentiment": "看涨", "summary": "Blackwell 架构芯片需求爆棚，数据中心营收再创新高。"},
        {"company": "Meta", "ticker": "META", "sentiment": "看涨", "summary": "广告业务 AI 推荐算法效率提升，现金流表现优异。"},
        {"company": "亚马逊", "ticker": "AMZN", "sentiment": "中性", "summary": "AWS 稳健增长，但下季度 AI 资本支出预期增加。"}
    ]

    final_output = {
        "portfolio": portfolio,
        "market_data": market_snapshot,
        "intel": intel_data
    }

    with open("earnings.json", "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print("🎉 自动化数据更新完成，已同步至 earnings.json！")

if __name__ == "__main__":
    main()
