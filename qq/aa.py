import json

from curl_cffi import Session,BrowserType
from pyquery import PyQuery
session = Session()
session.impersonate = BrowserType.chrome136


resp = session.get("https://www.cls.cn/telegraph")
doc = PyQuery(resp.text)

data_text = doc("#__NEXT_DATA__").text()
data = json.loads(data_text)

telegraphList = data["props"]["initialState"]["telegraph"]["telegraphList"]
for telegraph in telegraphList:
    if telegraph["level"] == "B":
        print(telegraph["content"])

