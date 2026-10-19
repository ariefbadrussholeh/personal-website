import os
from playwright.sync_api import sync_playwright
BASE="http://localhost:3000"; S=os.environ["SHOTS"]
def settle(pg):
    h=pg.evaluate("document.body.scrollHeight")
    for y in range(0,h,500):
        pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(120)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(900)
with sync_playwright() as p:
    b=p.chromium.launch()
    d=b.new_context(viewport={"width":1440,"height":900}).new_page()
    m=b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2).new_page()
    for name,path in [("home","/"),("blog","/blog"),("projects","/projects"),("album","/album"),("album-detail","/album/weekend-walks"),("about","/about"),("post","/blog/writing-fast-react-lists")]:
        d.goto(BASE+path); d.wait_for_load_state("networkidle"); settle(d)
        d.screenshot(path=f"{S}/d-{name}.png", full_page=True)
    m.goto(BASE+"/"); m.wait_for_load_state("networkidle"); settle(m)
    m.screenshot(path=f"{S}/m-home.png", full_page=True)
    b.close()
