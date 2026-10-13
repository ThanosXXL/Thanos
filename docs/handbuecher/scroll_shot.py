import json, time, base64, subprocess, sys, itertools, requests, websocket

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
DEBUG_PORT = 9533

def shot(html_path, png_path, scroll_selector=None, width=480, height=760):
    proc = subprocess.Popen([
        CHROME, "--headless", "--disable-gpu", "--no-sandbox",
        f"--remote-debugging-port={DEBUG_PORT}",
        "--remote-debugging-address=127.0.0.1",
        "--remote-allow-origins=*",
        "--hide-scrollbars", "--force-color-profile=srgb",
        f"--window-size={width},{height}",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        for _ in range(30):
            try:
                tabs = requests.get(f"http://127.0.0.1:{DEBUG_PORT}/json").json()
                break
            except Exception:
                time.sleep(0.3)
        target = [t for t in tabs if t.get("type") == "page"][0]
        ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=20)
        ws.settimeout(20)
        _id = itertools.count(1)
        def send(method, params=None):
            msg_id = next(_id)
            ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get("id") == msg_id:
                    return msg
        send("Page.enable")
        send("Page.navigate", {"url": f"file://{html_path}"})
        time.sleep(1.0)
        if scroll_selector:
            send("Runtime.evaluate", {"expression": f"document.querySelector('{scroll_selector}').scrollIntoView({{block:'start'}});"})
            time.sleep(0.3)
        result = send("Page.captureScreenshot", {"format": "png"})
        data = base64.b64decode(result["result"]["data"])
        with open(png_path, "wb") as f:
            f.write(data)
        ws.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    html_path, png_path = sys.argv[1], sys.argv[2]
    sel = sys.argv[3] if len(sys.argv) > 3 else None
    shot(html_path, png_path, sel)
    print("OK:", png_path)
