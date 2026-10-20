import os, json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:3000"
SHOTS = os.environ.get("SHOTS", "/tmp/shots2")
os.makedirs(SHOTS, exist_ok=True)
fails = []
def ok(c, label, extra=""):
    print(("PASS  " if c else "FAIL  ") + label + ("" if c else f"  -> {extra}"))
    if not c: fails.append(label)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # seed content through the admin API (logged-in context shares cookies)
    r = ctx.request.post(BASE + "/api/auth/login", data={"password": "testpass"})
    ok(r.ok, "admin login")
    post = ctx.request.post(BASE + "/api/posts").json()
    ctx.request.patch(f"{BASE}/api/posts/{post['id']}", data={"title": "UI feature post", "content": "## Heading\n\nSome text.", "published": True})
    exp = ctx.request.post(BASE + "/api/experiences").json()
    ctx.request.patch(f"{BASE}/api/experiences/{exp['id']}", data={"company": "Acme UI", "role": "Engineer", "start_date": "2021-01", "is_current": True, "highlights": ["Did things"], "tech": ["React"]})

    # visitors use a fresh, logged-out context
    v = b.new_context(viewport={"width": 1440, "height": 900})
    pg = v.new_page()
    verrs = []
    pg.on("pageerror", lambda e: verrs.append(str(e)))
    pg.on("console", lambda m: verrs.append(m.text) if m.type == "error" and "422" not in m.text else None)

    # contact form
    pg.goto(BASE + "/contact")
    pg.click("button[type=submit]")
    pg.wait_for_selector("#ct-name-err")
    ok(True, "contact shows field errors when empty")
    pg.fill("#ct-name", "Visitor"); pg.fill("#ct-email", "v@example.com"); pg.fill("#ct-message", "Hello, nice portfolio you have here.")
    pg.click("button[type=submit]")
    pg.wait_for_selector("text=/terima kasih|thank/i", timeout=8000)
    ok(True, "contact success state shown")
    pg.screenshot(path=f"{SHOTS}/contact.png")

    # home: pointer effects
    pg.goto(BASE + "/")
    pg.mouse.move(300, 300); pg.mouse.move(420, 360, steps=5)
    pg.wait_for_timeout(200)
    mx = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--mx') || document.querySelector('.hero-grid')?.style.getPropertyValue('--mx') || ''")
    anyvar = pg.evaluate("[...document.querySelectorAll('*')].some(e => e.style.getPropertyValue('--mx'))")
    ok(bool(mx and mx.strip()) or anyvar, "pointer writes --mx css variable", mx)
    ok("Acme UI" in pg.content() or pg.locator("text=Acme UI").count() > 0, "experience on home")
    pg.screenshot(path=f"{SHOTS}/home.png")
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight/2)"); pg.wait_for_timeout(500)
    pg.screenshot(path=f"{SHOTS}/home-mid.png")

    # post: like + comment
    pg.goto(BASE + "/blog/ui-feature-post")
    btn = pg.locator("button[aria-pressed]").first
    before = btn.get_attribute("aria-pressed")
    btn.click(); pg.wait_for_timeout(600)
    ok(btn.get_attribute("aria-pressed") == "true" and before == "false", "like button toggles on")
    pg.reload()
    ok(pg.locator("button[aria-pressed='true']").count() >= 1, "like persists after reload")
    pg.fill("#c-name", "Rina"); pg.fill("#c-body", "Tulisan yang bagus sekali.")
    pg.locator("form:has(#c-body) button[type=submit]").click()
    pg.wait_for_selector("text=Tulisan yang bagus sekali.", timeout=8000)
    ok(True, "comment appears immediately")
    pg.reload()
    ok(pg.locator("text=Tulisan yang bagus sekali.").count() == 1, "comment persists")
    pg.screenshot(path=f"{SHOTS}/post.png", full_page=True)
    ok(not verrs, "no console errors on visitor pages", str(verrs[:3]))

    # admin pages
    for path, text in [("/admin/analytics", "Analitik"), ("/admin/messages", "Visitor"), ("/admin/comments", "Rina"), ("/admin/experience", "Engineer")]:
        page.goto(BASE + path)
        ok(text in page.content(), f"{path} renders", text)
    page.goto(BASE + "/admin/analytics?range=30")
    page.wait_for_timeout(300)
    bars = page.locator("[role=img][aria-label*=tampilan]")
    ok(bars.count() == 30, "chart has one bar per day", str(bars.count()))
    bars.nth(29).hover(); page.wait_for_timeout(200)
    ok(page.locator("[role=status]:has-text('pengunjung')").count() >= 1, "chart tooltip on hover")
    page.screenshot(path=f"{SHOTS}/analytics.png", full_page=True)

    # message open marks read and drops badge
    page.goto(BASE + "/admin/messages")
    ok("Baru" in page.content(), "unread message flagged")
    page.locator("li button[aria-expanded]").first.click(); page.wait_for_timeout(600)
    ok(page.locator("a[href^='mailto:']").count() == 1, "message expands with reply link")
    page.screenshot(path=f"{SHOTS}/messages.png")

    # experience editor autosave
    page.goto(f"{BASE}/admin/experience/{exp['id']}")
    page.fill("#role", "Principal Engineer")
    page.wait_for_timeout(2000)
    got = ctx.request.get(f"{BASE}/api/experiences/{exp['id']}").json()
    ok(got["role"] == "Principal Engineer", "experience editor autosaves", got["role"])
    page.fill("#highlights", "One\nTwo\n\nThree")
    page.wait_for_timeout(2000)
    got = ctx.request.get(f"{BASE}/api/experiences/{exp['id']}").json()
    ok(got["highlights"] == ["One", "Two", "Three"], "highlights split per line", str(got["highlights"]))
    page.screenshot(path=f"{SHOTS}/exp-editor.png")
    ok(not errors, "no console errors in admin", str(errors[:3]))

    ctx.request.delete(f"{BASE}/api/experiences/{exp['id']}")
    ctx.request.delete(f"{BASE}/api/posts/{post['id']}")
    b.close()
print("\n" + (f"{len(fails)} FAILED" if fails else "all passed"))
raise SystemExit(1 if fails else 0)
