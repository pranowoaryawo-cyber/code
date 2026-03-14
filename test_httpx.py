import httpx

def test_httpx():
    url = "https://www.cls.cn/nodeapi/telegraphList?rn=20"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        with httpx.Client(http2=True, verify=False) as client:
            res = client.get(url, headers=headers)
            print("Status code:", res.status_code)
            if res.status_code == 200:
                data = res.json()
                items = data.get("data", {}).get("roll_data", [])
                print(f"Success! Got {len(items)} items.")
                for item in items[:2]:
                    print(item.get("title") or item.get("content")[:50])
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_httpx()
