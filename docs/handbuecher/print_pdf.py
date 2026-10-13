import json
import time
import base64
import subprocess
import sys
import itertools
import requests
import websocket

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
DEBUG_PORT = 9522

def render_pdf(html_path, pdf_path):
    proc = subprocess.Popen([
        CHROME, "--headless", "--disable-gpu", "--no-sandbox",
        f"--remote-debugging-port={DEBUG_PORT}",
        "--remote-debugging-address=127.0.0.1",
        "--remote-allow-origins=*",
        "--hide-scrollbars",
        "--force-color-profile=srgb",
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
        else:
            raise RuntimeError("chrome devtools not reachable")

        target = [t for t in tabs if t.get("type") == "page"][0]
        ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=30)
        ws.settimeout(30)
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

        footer_template = """
          <div style="width:100%; font-size:9px; font-family:'Inter','Segoe UI',Arial,sans-serif;
                      color:#b35a1f; text-align:center; padding-top:4px;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        """
        result = send("Page.printToPDF", {
            "printBackground": True,
            "preferCSSPageSize": True,
            "displayHeaderFooter": True,
            "headerTemplate": "<span></span>",
            "footerTemplate": footer_template,
            "marginTop": 0.87,
            "marginBottom": 0.9,
            "marginLeft": 0.71,
            "marginRight": 0.71,
        })
        data = base64.b64decode(result["result"]["data"])
        with open(pdf_path, "wb") as f:
            f.write(data)
        ws.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    html_path, pdf_path = sys.argv[1], sys.argv[2]
    render_pdf(html_path, pdf_path)
    print("OK:", pdf_path)
