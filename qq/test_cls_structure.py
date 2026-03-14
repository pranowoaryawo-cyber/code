#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试脚本:查看财联社数据结构
用于分析新闻数据中的所有字段,特别是标记字段(如红色、置顶等)
"""

import json
import sys
from curl_cffi import Session, BrowserType
from pyquery import PyQuery

# 设置标准输出编码为UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def fetch_and_analyze():
    """获取并分析财联社数据结构"""
    print("=" * 80)
    print("财联社数据结构分析工具")
    print("=" * 80)
    print()
    
    # 创建session
    session = Session()
    session.impersonate = BrowserType.chrome136
    url = "https://www.cls.cn/telegraph"
    
    try:
        print(f"正在访问: {url}")
        resp = session.get(url, timeout=10)
        print(f"HTTP状态码: {resp.status_code}")
        print()
        
        # 解析HTML
        doc = PyQuery(resp.text)
        
        # 获取__NEXT_DATA__
        data_text = doc("#__NEXT_DATA__").text()
        if not data_text:
            print("[错误] 未找到__NEXT_DATA__元素")
            return
        
        print("[成功] 找到__NEXT_DATA__元素")
        
        # 解析JSON
        data = json.loads(data_text)
        
        # 获取telegraphList
        telegraph_list = data.get("props", {}).get("initialState", {}).get("telegraph", {}).get("telegraphList", [])
        
        if not telegraph_list:
            print("[错误] telegraphList为空")
            return
        
        print(f"[成功] 获取到 {len(telegraph_list)} 条新闻")
        print()
        print("=" * 80)
        print("分析前3条新闻的完整数据结构:")
        print("=" * 80)
        print()
        
        # 分析前3条新闻
        for i, item in enumerate(telegraph_list[:3], 1):
            print(f"\n{'=' * 80}")
            print(f"新闻 #{i}")
            print(f"{'=' * 80}")
            
            # 打印所有字段
            for key, value in item.items():
                # 如果值太长,截断显示
                if isinstance(value, str) and len(value) > 100:
                    value_display = value[:100] + "..."
                else:
                    value_display = value
                
                print(f"{key:20s}: {value_display}")
            
            print()
        
        # 统计所有字段
        print("\n" + "=" * 80)
        print("所有新闻中出现的字段统计:")
        print("=" * 80)
        
        all_keys = set()
        for item in telegraph_list:
            all_keys.update(item.keys())
        
        print(f"\n共发现 {len(all_keys)} 个不同的字段:")
        for key in sorted(all_keys):
            # 统计该字段在多少条新闻中出现
            count = sum(1 for item in telegraph_list if key in item)
            print(f"  - {key:20s} (出现在 {count}/{len(telegraph_list)} 条新闻中)")
        
        # 重点分析可能的标记字段
        print("\n" + "=" * 80)
        print("重点分析:可能的标记字段")
        print("=" * 80)
        
        potential_mark_fields = [
            'level', 'top', 'red', 'important', 'highlight', 'mark', 
            'color', 'style', 'flag', 'priority', 'status', 'type',
            'isTop', 'isRed', 'isImportant', 'isHighlight'
        ]
        
        found_mark_fields = []
        for field in potential_mark_fields:
            if field in all_keys:
                found_mark_fields.append(field)
                print(f"\n找到可能的标记字段: {field}")
                
                # 显示该字段的所有不同值
                values = set()
                for item in telegraph_list:
                    if field in item:
                        values.add(str(item[field]))
                
                print(f"  该字段的所有不同值: {sorted(values)}")
                
                # 显示几个示例
                print(f"  示例:")
                count = 0
                for item in telegraph_list:
                    if field in item and count < 3:
                        print(f"    ID={item.get('id')}, {field}={item[field]}, 标题={item.get('title', '')[:30]}...")
                        count += 1
        
        if not found_mark_fields:
            print("\n未找到明显的标记字段,可能需要进一步分析")
            print("建议检查 'level' 字段或其他字段的值")
        
        # 保存完整数据到文件供进一步分析
        output_file = "图片/dify-plus/qq/cls_data_sample.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(telegraph_list[:10], f, ensure_ascii=False, indent=2)
        print(f"\n[提示] 前10条新闻的完整数据已保存到: {output_file}")
        
    except Exception as e:
        print(f"[错误] {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    fetch_and_analyze()
