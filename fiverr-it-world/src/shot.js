const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:769}});
await p.goto('file://'+__dirname+'/images.html');await p.waitForTimeout(1500);
for(let i=1;i<=5;i++){await p.locator('#s'+i).screenshot({path:`${__dirname}/../fiverr-bild-${i}.png`});}
await b.close()})();
