# FreshTrades-Bookmarklet für Chrome (Android)

Chrome für Android unterstützt keine Browser-Erweiterungen. Ein **Bookmarklet**
(ein Lesezeichen, das statt einer Webseite ein Skript ausführt) ist die einzige
Möglichkeit, die FreshTrades-Buttons direkt in Chrome auf einer beliebigen
Seite (z. B. der Google-Suche) einzublenden.

Beim Antippen erscheint unten rechts eine schwarz-goldene Leiste mit:

- 🎤 Mikrofon (Frage per Sprache in das Google-Suchfeld)
- 🎯 Sniping (nimmt nach Bestätigung einen Screenshot der Seite auf und lädt ihn herunter)
- 🔊 Vorlesen (liest den Seitentext nach Bestätigung laut vor)
- 💾 Seite speichern unter (speichert den Seitentext nach Bestätigung als Datei)

Der Quellcode steht in [`freshtrades-bookmarklet.js`](freshtrades-bookmarklet.js).

## Installation in Chrome (Android)

Mobiles Chrome erlaubt es nicht, `javascript:`-Code direkt in die Adressleiste
einzutippen. Der zuverlässigste Weg:

1. Öffne auf deinem Handy eine beliebige Seite und speichere sie als Lesezeichen
   (Stern-Symbol in der Adressleiste bzw. Menü → **Lesezeichen hinzufügen**).
2. Öffne **Chrome-Menü (⋮) → Lesezeichen → Lesezeichen-Manager**.
3. Tippe bei dem eben gespeicherten Lesezeichen auf die drei Punkte → **Bearbeiten**.
4. Ersetze den **Namen** durch z. B. `FreshTrades` und die **URL** durch den
   kompletten Code unten (alles in einer Zeile, beginnend mit `javascript:`).
5. Speichern.

Danach: Öffne die gewünschte Seite (z. B. eine Google-Suche), tippe im
Lesezeichen-Manager auf das `FreshTrades`-Lesezeichen — die Leiste erscheint
auf der gerade geöffneten Seite.

> Tipp: Falls dir das auf dem Handy zu fummelig ist, kannst du das Lesezeichen
> stattdessen einmalig am PC in Chrome (mit demselben Google-Konto angemeldet)
> anlegen und bearbeiten — es synchronisiert sich dann automatisch aufs Handy.

## Der Bookmarklet-Code (URL-Feld einfügen)

```
javascript:!function()%7Bif(!window.__freshtradesBar)%7Bwindow.__freshtradesBar%3D!0%3Bvar%20e%3D%22%23FFD700%22%2Ct%3D%22%237A5C00%22%2Cn%3Ddocument.createElement(%22div%22)%3Bn.style.cssText%3D%22position%3Afixed%3Bbottom%3A16px%3Bright%3A16px%3Bz-index%3A2147483647%3Bdisplay%3Aflex%3Bbackground%3A%23000%3Bpadding%3A8px%3Bborder-radius%3A16px%3Bbox-shadow%3A0%206px%2016px%20rgba(0%2C0%2C0%2C.7)%3B%22%2Co(%22%F0%9F%8E%A4%22%2C%22Frage%20per%20Mikrofon%20eingeben%22%2Cfunction()%7Bvar%20e%3Dwindow.SpeechRecognition%7C%7Cwindow.webkitSpeechRecognition%3Bif(e)%7Bvar%20t%3Dnew%20e%3Bt.lang%3D%22de-DE%22%2Ct.onresult%3Dfunction(e)%7Bvar%20t%3De.results%5B0%5D%5B0%5D.transcript%2Cn%3Ddocument.querySelector('input%5Bname%3D%22q%22%5D%2C%20textarea%5Bname%3D%22q%22%5D')%3Bn%3F(n.value%3Dt%2Cn.form%26%26n.form.submit())%3Aalert(%22Erkannt%3A%20%22%2Bt)%7D%2Ct.start()%7Delse%20alert(%22Spracherkennung%20wird%20von%20diesem%20Browser%20nicht%20unterst%C3%BCtzt.%22)%7D)%2Co(%22%F0%9F%8E%AF%22%2C%22Sniping%20%E2%80%93%20Screenshot%20aufnehmen%22%2Cfunction()%7Br(%22Jetzt%20einen%20Screenshot%20der%20aktuellen%20Seite%20aufnehmen%3F%22%2Cfunction()%7Bvar%20e%3Ddocument.createElement(%22script%22)%3Be.src%3D%22https%3A%2F%2Fcdnjs.cloudflare.com%2Fajax%2Flibs%2Fhtml2canvas%2F1.4.1%2Fhtml2canvas.min.js%22%2Ce.onload%3Dfunction()%7Bwindow.html2canvas(document.body).then(function(e)%7Bvar%20t%3Ddocument.createElement(%22a%22)%3Bt.href%3De.toDataURL(%22image%2Fpng%22)%2Ct.download%3D%22freshtrades-sniping-%22%2BDate.now()%2B%22.png%22%2Cdocument.body.appendChild(t)%2Ct.click()%2Ct.remove()%7D)%7D%2Cdocument.body.appendChild(e)%7D)%7D)%2Co(%22%F0%9F%94%8A%22%2C%22Vorlesen%22%2Cfunction()%7Br(%22Die%20aktuelle%20Seite%20jetzt%20vorlesen%3F%22%2Cfunction()%7Bif(%22speechSynthesis%22in%20window)%7Bvar%20e%3Dnew%20SpeechSynthesisUtterance(document.body.innerText.slice(0%2C4e3))%3Be.lang%3D%22de-DE%22%2Cwindow.speechSynthesis.cancel()%2Cwindow.speechSynthesis.speak(e)%7Delse%20alert(%22Sprachausgabe%20wird%20von%20diesem%20Browser%20nicht%20unterst%C3%BCtzt.%22)%7D)%7D)%2Co(%22%F0%9F%92%BE%22%2C%22Seite%20speichern%20unter%22%2Cfunction()%7Br(%22Die%20aktuelle%20Seite%20jetzt%20speichern%3F%22%2Cfunction()%7Bvar%20e%3Dnew%20Blob(%5Bdocument.body.innerText%5D%2C%7Btype%3A%22text%2Fplain%22%7D)%2Ct%3Ddocument.createElement(%22a%22)%3Bt.href%3DURL.createObjectURL(e)%2Ct.download%3D%22freshtrades-seite-%22%2BDate.now()%2B%22.txt%22%2Cdocument.body.appendChild(t)%2Ct.click()%2Ct.remove()%7D)%7D)%2Cdocument.body.appendChild(n)%7Dfunction%20i(n)%7Bn.style.cssText%3D%22padding%3A10px%2016px%3Bborder-radius%3A12px%3Bborder%3A1px%20solid%20%22%2Bt%2B%22%3Bbackground%3Alinear-gradient(180deg%2C%233c3c3c%2C%23141414%2055%25%2C%23000)%3Bcolor%3A%22%2Be%2B%22%3Bbox-shadow%3A0%204px%208px%20rgba(0%2C0%2C0%2C.6)%2Cinset%200%201px%200%20rgba(255%2C255%2C255%2C.18)%2Cinset%200%20-3px%206px%20rgba(0%2C0%2C0%2C.65)%3Btext-shadow%3A0%201px%201px%20%23000%3Bfont-family%3Asans-serif%3B%22%7Dfunction%20o(i%2Co%2Cr)%7Bvar%20a%3Ddocument.createElement(%22button%22)%3Breturn%20a.textContent%3Di%2Ca.title%3Do%2Ca.style.cssText%3D%22width%3A44px%3Bheight%3A44px%3Bmargin-left%3A6px%3Bborder-radius%3A12px%3Bborder%3A1px%20solid%20%22%2Bt%2B%22%3Bbackground%3Alinear-gradient(180deg%2C%233c3c3c%2C%23141414%2055%25%2C%23000)%3Bcolor%3A%22%2Be%2B%22%3Bfont-size%3A18px%3Bbox-shadow%3A0%204px%208px%20rgba(0%2C0%2C0%2C.6)%2Cinset%200%201px%200%20rgba(255%2C255%2C255%2C.18)%2Cinset%200%20-3px%206px%20rgba(0%2C0%2C0%2C.65)%3Btext-shadow%3A0%201px%201px%20%23000%3Bfont-family%3Asans-serif%3B%22%2Ca.addEventListener(%22click%22%2Cr)%2Cn.appendChild(a)%2Ca%7Dfunction%20r(n%2Co)%7Bvar%20r%3Ddocument.createElement(%22div%22)%3Br.style.cssText%3D%22position%3Afixed%3Binset%3A0%3Bbackground%3Argba(0%2C0%2C0%2C.6)%3Bz-index%3A2147483647%3Bdisplay%3Aflex%3Balign-items%3Acenter%3Bjustify-content%3Acenter%3B%22%3Bvar%20a%3Ddocument.createElement(%22div%22)%3Ba.style.cssText%3D%22background%3A%23141414%3Bborder%3A1px%20solid%20%22%2Bt%2B%22%3Bborder-radius%3A14px%3Bpadding%3A20px%3Bmax-width%3A320px%3Btext-align%3Acenter%3Bbox-shadow%3A0%208px%2024px%20rgba(0%2C0%2C0%2C.8)%3B%22%3Bvar%20d%3Ddocument.createElement(%22p%22)%3Bd.textContent%3Dn%2Cd.style.cssText%3D%22color%3A%22%2Be%2B%22%3Bfont-family%3Asans-serif%3Bmargin%3A0%200%2016px%3B%22%3Bvar%20c%3Ddocument.createElement(%22div%22)%3Bc.style.cssText%3D%22display%3Aflex%3Bgap%3A10px%3Bjustify-content%3Acenter%3B%22%3Bvar%20s%3Ddocument.createElement(%22button%22)%3Bs.textContent%3D%22Best%C3%A4tigen%22%2Ci(s)%3Bvar%20p%3Ddocument.createElement(%22button%22)%3Bp.textContent%3D%22Abbrechen%22%2Ci(p)%2Cs.onclick%3Dfunction()%7Bdocument.body.removeChild(r)%2Co()%7D%2Cp.onclick%3Dfunction()%7Bdocument.body.removeChild(r)%7D%2Cc.appendChild(s)%2Cc.appendChild(p)%2Ca.appendChild(d)%2Ca.appendChild(c)%2Cr.appendChild(a)%2Cdocument.body.appendChild(r)%7D%7D()%3B
```

## Einschränkungen

- **Sniping/Screenshot**: lädt zur Laufzeit die freie Bibliothek
  [html2canvas](https://html2canvas.hertzen.com/) von einem CDN nach und
  rendert die Seite als Bild nach. Das ist eine Annäherung an einen echten
  Screenshot (kein Zugriff auf echte Bildschirmaufnahme aus JavaScript
  möglich) — bei manchen Bildern/Werbeanzeigen kann die Darstellung wegen
  Browser-Sicherheitsregeln (CORS) fehlen.
- **Mikrofon** funktioniert nur auf Seiten mit einem Suchfeld namens `q`
  (wie bei Google) und erfordert einmalig die Freigabe der Mikrofon-Berechtigung
  durch Chrome.
- Das Lesezeichen muss auf jeder Seite, auf der du die Leiste sehen willst,
  erneut angetippt werden (Bookmarklets laufen nur für die aktuell offene Seite,
  nicht dauerhaft im Hintergrund).
- Für die **FreshTrades-App** (separate App, siehe `../android-app/`) gelten
  diese Einschränkungen nicht, da sie echte native Android-APIs nutzt.
