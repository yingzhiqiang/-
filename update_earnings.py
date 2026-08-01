import os
import json
import google.generativeai as genai

# 获取环境变量中的 API Key
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("错误: 未找到 GEMINI_API_KEY 环境变量！")
    exit(1)

genai.configure(api_key=api_key)

prompt = """
请作为资深美股分析师，分析 MSFT, NVDA, META, AMZN, AAPL 这五家公司最新的财报或市场动态。
请严格按照以下 JSON 格式输出，不要包含 Markdown 标记或多余文本：
[
  {
    "ticker": "股票代码",
    "company": "公司中文名",
    "sentiment": "bullish 或 neutral 或 bearish",
    "summary": "一句话精炼点评（结合对 VOO/QQQM/BOTZ/TQQQ 的影响）"
  }
]
"""

try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)

    clean_json_str = response.text.replace("```json", "").replace("```", "").strip()
    data = json.loads(clean_json_str)
    
    with open('earnings.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print("✅ earnings.json 自动刷新成功！")
except Exception as e:
    print("❌ 解析或写入失败:", e)
    exit(1)