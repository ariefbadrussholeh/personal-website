import json, sys, os, urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = os.environ.get("SHOTS", "/tmp/shots")
os.makedirs(SHOTS, exist_ok=True)
fails = []
def ok(c, label, extra=""):
    print(("PASS  " if c else "FAIL  ") + label + ("" if c else f"  -> {extra}"))
    if not c: fails.append(label)

def api(path, cookie):
    req = urllib.request.Request(BASE + path, headers={"cookie": cookie})
    return json.load(urllib.request.urlopen(req))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # login via the real form
    page.goto(BASE + "/admin")
    ok("/admin/login" in page.url, "unauthenticated /admin redirects to login", page.url)
    page.fill("#password", "salah"); page.click("button[type=submit]")
    page.wait_for_selector("#login-error")
    ok(True, "wrong password shows error")
    page.fill("#password", "testpass"); page.click("button[type=submit]")
    page.wait_for_url(BASE + "/admin")
    page.screenshot(path=f"{SHOTS}/admin-dashboard.png")
    cookie = "; ".join(f"{c['name']}={c['value']}" for c in ctx.cookies())

    # remove leftovers from earlier aborted runs
    for old in api("/api/posts", cookie):
        if old["title"] == "Editor smoke test":
            urllib.request.urlopen(urllib.request.Request(BASE + f"/api/posts/{old['id']}", method="DELETE", headers={"cookie": cookie}))

    # new post
    page.goto(BASE + "/admin/blog")
    page.click("text=Tulisan baru")
    page.wait_for_url("**/admin/blog/*")
    post_id = page.url.rstrip("/").split("/")[-1]
    page.wait_for_selector(".tiptap")

    page.fill("#title", "Editor smoke test")
    page.keyboard.press("Enter")           # moves to summary
    page.keyboard.type("Short summary here")

    ed = page.locator(".tiptap")
    ed.click()
    page.keyboard.type("## Big heading")   # markdown shortcut: '## ' becomes h2
    page.keyboard.press("Enter")
    page.keyboard.type("Plain paragraph with **bold** and `code`.")
    page.keyboard.press("Enter")
    page.keyboard.type("- first item")
    page.keyboard.press("Enter")
    page.keyboard.type("second item")
    page.keyboard.press("Enter"); page.keyboard.press("Enter")   # leave list

    # slash menu
    page.keyboard.type("/code")
    page.wait_for_selector("[role=listbox]")
    page.screenshot(path=f"{SHOTS}/editor-slash.png")
    page.keyboard.press("Enter")
    page.keyboard.type("const x = 1;")
    ok(page.locator(".tiptap pre").count() == 1, "slash menu inserts code block")
    page.keyboard.press("ArrowDown"); page.keyboard.press("ArrowDown")

    # image via file picker (toolbar button)
    with page.expect_file_chooser() as fc:
        page.click("button[aria-label='Sisipkan gambar']")
    fc.value.set_files("public/samples/photo-3.jpg")
    page.wait_for_selector(".tiptap img", timeout=15000)
    ok(True, "image upload inserts <img>")

    page.screenshot(path=f"{SHOTS}/editor-full.png")

    # Autosave is debounced; wait until the server actually has the final text.
    import time
    data = {}
    for _ in range(40):
        data = api(f"/api/posts/{post_id}", cookie)
        if "![" in data["content"] and data["excerpt"] and data["title"]:
            break
        time.sleep(0.5)
    md = data["content"]
    print("---- markdown saved ----\n" + md + "\n------------------------")
    ok(data["title"] == "Editor smoke test", "title autosaved")
    ok(data["excerpt"] == "Short summary here", "summary autosaved")
    ok("## Big heading" in md, "heading serialized to markdown")
    ok("**bold**" in md and "`code`" in md, "inline marks serialized")
    ok("- first item" in md and "- second item" in md, "list serialized")
    ok("```" in md and "const x = 1;" in md, "code block serialized")
    ok("![" in md and "/storage/v1/object/public/uploads/" in md, "image serialized with Storage URL")
    ok(data["slug"] == "editor-smoke-test", "slug from title", data["slug"])

    # reload: markdown must come back as the same rich content
    page.reload(); page.wait_for_selector(".tiptap h2")
    ok(page.locator(".tiptap h2").inner_text() == "Big heading", "reload restores heading")
    ok(page.locator(".tiptap strong").count() == 1 and page.locator(".tiptap ul li").count() == 2, "reload restores marks + list")
    ok(page.locator(".tiptap pre").count() == 1 and page.locator(".tiptap img").count() == 1, "reload restores code + image")

    # publish and view publicly (new anonymous context)
    page.click("text=Publikasikan")
    page.wait_for_selector("text=Batalkan terbit")
    for _ in range(40):
        if api(f"/api/posts/{post_id}", cookie)["published"]: break
        time.sleep(0.5)
    anon = b.new_context(viewport={"width": 1440, "height": 900}).new_page()
    anon.goto(BASE + "/blog/editor-smoke-test")
    ok(anon.locator("article h2").first.inner_text() == "Big heading", "public page renders heading")
    ok(anon.locator("article pre").count() == 1, "public page renders code block")
    ok(anon.locator("article img").count() >= 1, "public page renders image")
    anon.screenshot(path=f"{SHOTS}/post-public.png", full_page=True)

    # cleanup through the UI delete flow
    page.click("text=Hapus tulisan"); page.click("[role=alertdialog] button.btn-danger")
    page.wait_for_url("**/admin/blog")
    ok(True, "delete via dialog returns to list")

    real = [e for e in errors if "favicon" not in e and "Failed to load resource" not in e]
    ok(not real, "no browser console errors", str(real[:3]))
    b.close()

print("\nFAILED: " + ", ".join(fails) if fails else "\nall passed")
sys.exit(1 if fails else 0)
