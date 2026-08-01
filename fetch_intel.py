import json
import yfinance as yf

def fetch_real_market_data():
    tickers = ['VOO', 'QQQM', 'BOTZ', 'TQQQ']
    market_data = {}
    
    print("开始抓取 ETF 市场行情...")
    for symbol in tickers:
        try:
            stock = yf.Ticker(symbol)
            # 抓取最近 5 天的数据计算本周涨跌幅 (WTD)
            hist = stock.history(period="5d")
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                start_price = hist['Open'].iloc[0]
                wtd_change = ((current_price - start_price) / start_price) * 100
                
                market_data[symbol] = {
                    "price": f"${current_price:.2f}",
                    "wtd": f"{'+' if wtd_change >= 0 else ''}{wtd_change:.2f}%",
                    "bullish": wtd_change >= 0
                }
                print(f"✅ {symbol}: ${current_price:.2f} ({wtd_change:.2f}%)")
        except Exception as e:
            print(f"❌ 抓取 {symbol} 失败: {e}")
            
    return market_data

def main():
    market_snapshot = fetch_real_market_data()
    
    # 财报情报示例数据
    intel_data = [
        {"company": "微软", "ticker": "MSFT", "sentiment": "看涨", "summary": "Azure 云业务增速超预期，AI Copilot 商业化进程加速。"},
        {"company": "英伟达", "ticker": "NVDA", "sentiment": "看涨", "summary": "Blackwell 架构芯片需求爆棚，数据中心营收再创新高。"},
        {"company": "Meta", "ticker": "META", "sentiment": "看涨", "summary": "广告业务 AI 推荐算法效率提升，现金流表现优异。"},
        {"company": "亚马逊", "ticker": "AMZN", "sentiment": "中性", "summary": "AWS 稳健增长，但下季度 AI 资本支出预期增加。"}
    ]
    
    final_output = {
        "market_data": market_snapshot,
        "intel": intel_data
    }
    
    # 保存到 earnings.json
    with open("earnings.json", "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print("🎉 已成功更新 earnings.json！")

if __name__ == "__main__":
    main()
