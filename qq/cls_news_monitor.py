#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财联社资讯监控脚本
每分钟获取财联社最新快讯和要闻，并输出到终端
使用curl_cffi模拟Chrome浏览器访问
"""

import json
import sys
import time
import hmac
import hashlib
import base64
from datetime import datetime
from typing import Dict, List, Set
from curl_cffi import Session, BrowserType
from pyquery import PyQuery

# 设置标准输出编码为UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


class CLSNewsMonitor:
    """财联社新闻监控器"""
    
    def __init__(self, skip_history=True, feishu_webhook=None, feishu_secret=None):
        """
        初始化监控器
        
        Args:
            skip_history: 是否跳过历史消息（默认True，只输出新消息）
            feishu_webhook: 飞书机器人 webhook 地址
            feishu_secret: 飞书机器人签名密钥
        """
        self.session = Session()
        self.session.impersonate = BrowserType.chrome136
        self.url = "https://www.cls.cn/telegraph"
        
        # 飞书配置
        self.feishu_webhook = feishu_webhook
        self.feishu_secret = feishu_secret
        
        # 用于去重的ID集合
        self.seen_ids: Set[str] = set()
        # 记录ID的时间戳，用于清理旧ID
        self.id_timestamps: Dict[str, float] = {}
        # ID保留时间（秒），超过此时间的ID将被清理
        self.id_retention_time = 3600  # 1小时
        
        print("=" * 80, flush=True)
        print("财联社资讯监控系统启动", flush=True)
        print(f"监控地址: {self.url}", flush=True)
        print(f"更新频率: 每60秒", flush=True)
        print(f"浏览器模拟: Chrome 136", flush=True)
        if self.feishu_webhook:
            print(f"飞书推送: 已启用（仅推送 level=B 要闻）", flush=True)
        print("=" * 80, flush=True)
        
        # 如果跳过历史消息，先获取一次数据并标记为已见
        if skip_history:
            print("[初始化] 正在加载现有消息，跳过历史输出...", flush=True)
            initial_news = self.fetch_news()
            if initial_news:
                current_time = time.time()
                for news in initial_news:
                    self.seen_ids.add(news["id"])
                    self.id_timestamps[news["id"]] = current_time
                print(f"[初始化] 已加载 {len(initial_news)} 条现有消息，将只输出新消息", flush=True)
            else:
                print("[初始化] 未获取到现有消息", flush=True)
        
        print("=" * 80, flush=True)
        print(flush=True)
    
    def fetch_news(self) -> List[Dict]:
        """
        获取财联社最新资讯
        
        Returns:
            新闻列表，每条新闻包含: id, title, content, time, level
        """
        try:
            # 发送HTTP请求
            resp = self.session.get(self.url, timeout=10)
            
            # 使用PyQuery解析HTML
            doc = PyQuery(resp.text)
            
            # 提取__NEXT_DATA__中的JSON数据
            data_text = doc("#__NEXT_DATA__").text()
            if not data_text:
                print("[警告] 未找到__NEXT_DATA__数据", flush=True)
                return []
            
            # 解析JSON
            data = json.loads(data_text)
            
            # 提取telegraphList
            telegraph_list = data.get("props", {}).get("initialState", {}).get("telegraph", {}).get("telegraphList", [])
            
            if not telegraph_list:
                print("[警告] 未找到telegraphList数据", flush=True)
                return []
            
            # 解析新闻列表
            parsed_news = []
            for item in telegraph_list:
                news_id = str(item.get("id", ""))
                title = item.get("title", "").strip()
                content = item.get("content", "").strip()
                ctime = item.get("ctime", "")
                level = item.get("level", "")
                
                if news_id and (title or content):
                    parsed_news.append({
                        "id": news_id,
                        "title": title,
                        "content": content,
                        "time": ctime,
                        "level": level
                    })
            
            return parsed_news
            
        except Exception as e:
            print(f"[错误] 获取新闻失败: {e}", flush=True)
            return []
    
    def format_time(self, timestamp: str) -> str:
        """
        格式化时间戳
        
        Args:
            timestamp: 时间戳字符串
            
        Returns:
            格式化后的时间字符串
        """
        try:
            if not timestamp:
                return "未知时间"
            
            # 尝试解析时间戳（秒）
            if timestamp.isdigit():
                dt = datetime.fromtimestamp(int(timestamp))
                return dt.strftime("%Y-%m-%d %H:%M:%S")
            
            # 如果已经是格式化的字符串，直接返回
            return timestamp
            
        except Exception:
            return timestamp
    
    def gen_sign(self, timestamp: int) -> str:
        """
        生成飞书签名
        Args:
            timestamp: 时间戳（秒）
            
        Returns:
            签名字符串
        """
        if not self.feishu_secret:
            return ""
        
        # 拼接 timestamp 和 secret
        string_to_sign = f"{timestamp}\n{self.feishu_secret}"
        
        # 使用 HmacSHA256 算法计算签名
        hmac_code = hmac.new(
            string_to_sign.encode("utf-8"),
            digestmod=hashlib.sha256
        ).digest()
        
        # 对签名进行 base64 编码
        sign = base64.b64encode(hmac_code).decode('utf-8')
        
        return sign
    
    def send_to_feishu(self, news: Dict):
        """
        发送新闻到飞书
        
        Args:
            news: 新闻字典
        """
        if not self.feishu_webhook:
            return
        
        try:
            # 获取当前时间
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            # 格式化新闻时间
            time_str = self.format_time(news["time"])
            
            # 构建消息内容
            title = news.get("title", "")
            content = news.get("content", "")
            
            # 构建文本消息（使用特殊符号突出标题）
            message_parts = [
                f"【财联社要闻】",
                f"",
                f"⏰ 推送时间: {current_time}",
                f"📅 新闻时间: {time_str}",
                f"",
                f"🔴 标题: {title}" if title else "",
                f"",
                f"📄 内容: {content}" if content else ""
            ]
            
            message_text = "\n".join([part for part in message_parts if part])
            
            payload = {
                "msg_type": "text",
                "content": {
                    "text": message_text
                }
            }
            
            # 如果有签名密钥，添加签名
            if self.feishu_secret:
                timestamp = int(time.time())
                sign = self.gen_sign(timestamp)
                payload["timestamp"] = str(timestamp)
                payload["sign"] = sign
            
            # 发送请求
            response = self.session.post(
                self.feishu_webhook,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # 检查响应
            if response.status_code == 200:
                result = json.loads(response.text)
                if result.get("code") == 0:
                    print(f"[飞书] 推送成功: {title[:20] if title else content[:20]}...", flush=True)
                else:
                    print(f"[飞书] 推送失败: {result.get('msg', '未知错误')}", flush=True)
            else:
                print(f"[飞书] 推送失败: HTTP {response.status_code}", flush=True)
                
        except Exception as e:
            print(f"[飞书] 推送异常: {e}", flush=True)
    
    def categorize_news(self, news_list: List[Dict]) -> tuple:
        """
        将新闻分类为快讯和要闻
        
        Args:
            news_list: 新闻列表
            
        Returns:
            (快讯列表, 要闻列表)
        """
        flash_news = []
        important_news = []
        
        for news in news_list:
            # level为'B'的是要闻，其他为快讯
            if news.get("level") == "B":
                important_news.append(news)
            else:
                flash_news.append(news)
        
        return flash_news, important_news
    
    def print_news(self, news: Dict, news_type: str):
        """
        打印单条新闻
        
        Args:
            news: 新闻字典
            news_type: 新闻类型（"快讯"或"要闻"）
        """
        # 获取当前时间
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        time_str = self.format_time(news["time"])
        
        # level='B'的要闻使用加粗显示
        is_important = news.get("level") == "B"
        bold_start = "\033[1m" if is_important else ""
        bold_end = "\033[0m" if is_important else ""
        
        print(f"[{current_time}] {bold_start}【{news_type}】 {time_str}{bold_end}", flush=True)
        if news["title"]:
            print(f"{bold_start}标题: {news['title']}{bold_end}", flush=True)
        if news["content"]:
            print(f"内容: {news['content']}", flush=True)
        print("-" * 80, flush=True)
    
    def clean_old_ids(self):
        """清理过期的ID记录"""
        current_time = time.time()
        expired_ids = [
            news_id for news_id, timestamp in self.id_timestamps.items()
            if current_time - timestamp > self.id_retention_time
        ]
        
        for news_id in expired_ids:
            self.seen_ids.discard(news_id)
            del self.id_timestamps[news_id]
        
        if expired_ids:
            print(f"[清理] 清理了 {len(expired_ids)} 条过期记录", flush=True)
    
    def process_news(self, news_list: List[Dict]) -> int:
        """
        处理新闻列表，过滤已见过的新闻并输出
        
        Args:
            news_list: 新闻列表
            
        Returns:
            新增新闻数量
        """
        if not news_list:
            return 0
        
        # 过滤出新新闻
        new_news = []
        current_time = time.time()
        
        for news in news_list:
            news_id = news["id"]
            if news_id not in self.seen_ids:
                new_news.append(news)
                self.seen_ids.add(news_id)
                self.id_timestamps[news_id] = current_time
        
        if not new_news:
            return 0
        
        # 分类新闻
        flash_news, important_news = self.categorize_news(new_news)
        
        # 输出要闻并推送到飞书
        if important_news:
            print(f"\n[要闻] 发现 {len(important_news)} 条新要闻:", flush=True)
            print("=" * 80, flush=True)
            for news in important_news:
                self.print_news(news, "要闻")
                # 推送到飞书
                self.send_to_feishu(news)
        
        # 输出快讯（不推送到飞书）
        if flash_news:
            print(f"\n[快讯] 发现 {len(flash_news)} 条新快讯:", flush=True)
            print("=" * 80, flush=True)
            for news in flash_news:
                self.print_news(news, "快讯")
        
        return len(new_news)
    
    def run(self):
        """运行监控循环"""
        retry_count = 0
        max_retries = 3
        
        while True:
            try:
                start_time = time.time()
                
                # 获取新闻
                news_list = self.fetch_news()
                
                if news_list:
                    # 处理新闻
                    new_count = self.process_news(news_list)
                    
                    # 重置重试计数
                    retry_count = 0
                else:
                    retry_count += 1
                    if retry_count >= max_retries:
                        print(f"[警告] 连续 {max_retries} 次获取失败，将继续尝试...", flush=True)
                        retry_count = 0
                
                # 定期清理过期ID
                self.clean_old_ids()
                
                # 计算等待时间
                elapsed = time.time() - start_time
                wait_time = max(0, 1 - elapsed)
                
                if wait_time > 0:
                    time.sleep(wait_time)
                
            except KeyboardInterrupt:
                print("\n\n" + "=" * 80, flush=True)
                print("监控已停止", flush=True)
                print("=" * 80, flush=True)
                break
            except Exception as e:
                print(f"[错误] 运行错误: {e}", flush=True)
                time.sleep(5)  # 出错后等待5秒再继续


def main():
    """主函数"""
    # 飞书配置
    feishu_webhook = "https://open.feishu.cn/open-apis/bot/v2/hook/1ee7935e-2954-414a-91df-732d673ecd05"
    feishu_secret = "ExCOxQkNPlUhB752PtJfah"
    
    monitor = CLSNewsMonitor(
        skip_history=True,
        feishu_webhook=feishu_webhook,
        feishu_secret=feishu_secret
    )
    monitor.run()


if __name__ == "__main__":
    main()
