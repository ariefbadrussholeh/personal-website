import os, sys
from playwright.sync_api import sync_playwright
BASE="http://localhost:3000"; S=os.environ["SHOTS"]
with sync_playwright() as p:
    b=p.chromium.launch()
    d=b.new_context(viewport={"width":1440,"height":900}).new_page()
    m=b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2).new_page()
    for name,path in [("home","/"),("blog","/blog"),("post","/blog/writing-fast-react-lists"),("projects","/projects"),("project","/projects/queueline"),("album","/album"),("album-detail","/album/weekend-walks"),("about","/about")]:
        d.goto(BASE+path); d.wait_for_load_state("networkidle"); d.wait_for_timeout(900)
        d.screenshot(path=f"{S}/d-{name}.png", full_page=True)
    for name,path in [("home","/"),("post","/blog/writing-fast-react-lists"),("album-detail","/album/weekend-walks")]:
        m.goto(BASE+path); m.wait_for_load_state("networkidle"); m.wait_for_timeout(900)
        m.screenshot(path=f"{S}/m-{name}.png", full_page=True)
        ow = m.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        print(name, "mobile horizontal overflow px:", ow)
    # lightbox
    d.goto(BASE+"/album/weekend-walks"); d.wait_for_load_state("networkidle")
    d.click("ul button >> nth=1"); d.wait_for_selector("[role=dialog]"); d.wait_for_timeout(500)
    d.screenshot(path=f"{S}/d-lightbox.png")
    d.keyboard.press("ArrowRight"); d.keyboard.press("Escape")
    print("lightbox closes:", d.locator("[role=dialog]").count()==0)
    # mobile nav
    m.goto(BASE+"/"); m.click("button[aria-label='Open menu']"); m.wait_for_timeout(300)
    m.screenshot(path=f"{S}/m-nav.png")
    # admin album editor
    a=b.new_context(viewport={"width":1440,"height":900}).new_page()
    a.goto(BASE+"/admin/login"); a.fill("#password","testpass"); a.click("button[type=submit]"); a.wait_for_url(BASE+"/admin")
    a.goto(BASE+"/admin/album"); a.screenshot(path=f"{S}/a-album-list.png")
    a.click("ul li a >> nth=0"); a.wait_for_selector("text=Seret foto"); a.wait_for_timeout(700)
    a.screenshot(path=f"{S}/a-album-editor.png", full_page=True)
    a.goto(BASE+"/admin/projects"); a.click("ul li a >> nth=0"); a.wait_for_selector(".tiptap"); a.wait_for_timeout(700)
    a.screenshot(path=f"{S}/a-project-editor.png")
    b.close()
