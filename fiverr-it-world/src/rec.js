const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:__dirname+'/rec',size:{width:1280,height:720}}});
const p=await c.newPage();await p.goto('file://'+__dirname+'/video.html');await p.waitForTimeout(1500);
await p.evaluate('start()');await p.waitForFunction('document.title=="done"',{timeout:60000});await p.waitForTimeout(500);
await c.close();await b.close()})();
