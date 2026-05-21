import asyncio
import re
from bs4 import BeautifulSoup
from services.transport import ProviderTransport

async def main():
    t = ProviderTransport()
    html = await t.get_html("https://kuronime.sbs/nonton-sousou-no-frieren-episode-5/")
    
    soup = BeautifulSoup(html, "html.parser")
    inputs = soup.find_all("input")
    for inp in inputs:
        print(inp)
        
    print("\nRegex search for input name=id:")
    match = re.search(r'input\s+[^>]*name=["\']id["\'][^>]*value=["\']([^"\']+)["\']', html)
    if match:
        print("Found via Regex:", match.group(1))

    match2 = re.search(r'name="id"\s+value="([^"]+)"', html)
    if match2:
        print("Found via Regex 2:", match2.group(1))
        
    match3 = re.search(r'value="([^"]+)"\s+name="id"', html)
    if match3:
        print("Found via Regex 3:", match3.group(1))

asyncio.run(main())
