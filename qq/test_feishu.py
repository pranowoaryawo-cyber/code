#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书webhook测试脚本
用于测试飞书消息推送功能
"""

import sys
import time
import hmac
import hashlib
import base64
import json
from curl_cffi import Session, BrowserType

# 设置标准输出编码为UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 飞书配置
FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/1ee7935e-2954-414a-91df-732d673ecd05"
FEISHU_SECRET = "ExCOxQkNPlUhB752PtJfah"


def gen_sign(timestamp: int, secret: str) -> str:
    """生成飞书签名"""
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(
        string_to_sign.encode("utf-8"), 
        digestmod=hashlib.sha256
    ).digest()
    sign = base64.b64encode(hmac_code).decode('utf-8')
    return sign


def send_test_message(news_type: str, title: str, content: str):
    """发送测试消息到飞书"""
    timestamp = int(time.time())
    sign = gen_sign(timestamp, FEISHU_SECRET)
    
    # 构建消息内容
    message = {
        "timestamp": str(timestamp),
        "sign": sign,
        "msg_type": "text",
        "content": {
            "text": f"【{news_type}】{title}\n{content}"
        }
    }
    
    try:
        session = Session(impersonate=BrowserType.chrome136)
        response = session.post(
            FEISHU_WEBHOOK,
            json=message,
            timeout=10
        )
        
        result = response.json()
        if result.get("code") == 0:
            print(f"✓ 消息发送成功: {news_type}", flush=True)
            print(f"  响应: {result}", flush=True)
        else:
            print(f"✗ 消息发送失败: {news_type}", flush=True)
            print(f"  响应: {result}", flush=True)
            
    except Exception as e:
        print(f"✗ 发送异常: {news_type}", flush=True)
        print(f"  错误: {str(e)}", flush=True)


def main():
    """主函数"""
    print("=" * 80, flush=True)
    print("飞书Webhook测试", flush=True)
    print("=" * 80, flush=True)
    print(f"Webhook URL: {FEISHU_WEBHOOK}", flush=True)
    print(f"Secret: {FEISHU_SECRET}", flush=True)
    print("=" * 80, flush=True)
    
    # 测试1: 发送要闻消息
    print("\n测试1: 发送要闻消息", flush=True)
    send_test_message(
        news_type="要闻",
        title="测试要闻标题",
        content="这是一条测试要闻内容，用于验证飞书webhook功能是否正常。"
    )
    
    time.sleep(2)
    
    # 测试2: 发送快讯消息
    print("\n测试2: 发送快讯消息", flush=True)
    send_test_message(
        news_type="快讯",
        title="测试快讯标题",
        content="这是一条测试快讯内容，用于验证飞书webhook功能是否正常。"
    )
    
    print("\n" + "=" * 80, flush=True)
    print("测试完成", flush=True)
    print("=" * 80, flush=True)


if __name__ == "__main__":
    main()
