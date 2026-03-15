# Deployment

Dieses Projekt ist ein statisches Vite-React-Frontend. Der pragmatische Weg fuer deinen Aufbau ist:

1. Lokal bauen.
2. `dist/` auf den Webserver in VLAN 30 kopieren.
3. Dort per Nginx ausliefern.
4. Auf dem Router Pi Port-Forwarding fuer `80` und `443` auf den Webserver setzen.
5. DNS und TLS aktivieren.

## 1. Build erstellen

Fuer Root-Hosting:

```bash
npm ci
npm run build:root
```

Fuer Hosting unter `/lernen/hebendanz/`:

```bash
npm ci
npm run build:subpath
```

Oder frei per Variable:

```bash
VITE_BASE_PATH=/lernen/hebendanz/ npm run build
```

## 2. Dateien auf den Webserver kopieren

Beispiel:

```bash
rsync -avz --delete dist/ deploy@192.168.30.20:/var/www/learnplan-tracker/dist/
```

Annahmen:

- Webserver-IP in VLAN 30: `192.168.30.20`
- Zielpfad: `/var/www/learnplan-tracker/dist`
- Webserver-OS: Debian/Ubuntu mit Nginx

## 3. Nginx auf dem Webserver

### Option A: Domain oder Subdomain auf Root `/`

Datei: `deploy/nginx/learnplan-root.conf`

Kopieren nach:

```bash
sudo cp deploy/nginx/learnplan-root.conf /etc/nginx/sites-available/learnplan.conf
sudo ln -s /etc/nginx/sites-available/learnplan.conf /etc/nginx/sites-enabled/learnplan.conf
sudo nginx -t
sudo systemctl reload nginx
```

Dann Root-Build deployen:

```bash
npm run build:root
```

### Option B: Hosting unter `/lernen/hebendanz/`

Datei: `deploy/nginx/learnplan-subpath.conf`

Dann Subpfad-Build deployen:

```bash
npm run build:subpath
```

Wichtig: Build-Pfad und Nginx-Pfad muessen zusammenpassen. Root-Build mit Subpfad-Nginx oder umgekehrt ist kaputt.

## 4. Router Pi: NAT und Forwarding

Beispiel-Konfiguration liegt in:

- `deploy/router-pi/nftables-web-forward.nft`

Das Beispiel macht drei Dinge:

- `80` und `443` vom WAN auf den Webserver in VLAN 30 weiterleiten
- Antworten wieder per Masquerading ins Internet schicken
- Forwarding in der Filter-Tabelle erlauben

Du musst mindestens diese Platzhalter anpassen:

- `wan_if`
- `lan30_if`
- `web_ip`

Wenn dein Router Pi kein `nftables`, sondern `iptables` oder `ufw` nutzt, muss das in dessen Syntax uebersetzt werden.

## 5. Netzwerk-Check fuer deinen Aufbau

Damit die Seite wirklich "von ueberall" erreichbar ist, muessen diese Punkte stimmen:

- Der Router Pi hat eine oeffentliche IPv4 oder sauberes IPv6.
- Kein CGNAT beim ISP.
- DNS zeigt auf die oeffentliche IP des Router Pi.
- Der Trunk-Port traegt VLAN 30 bis zum Router Pi.
- Der Webserver haengt korrekt in VLAN 30.
- Eingehend sind `80/tcp` und `443/tcp` bis zum Webserver erlaubt.

Wenn dein Anschluss hinter CGNAT haengt, funktioniert klassisches Port-Forwarding aus dem Internet nicht. Dann brauchst du stattdessen z. B. einen Tunnel oder einen externen Reverse Proxy.

## 6. TLS aktivieren

Sobald HTTP von aussen funktioniert und die Domain zeigt, kannst du Let's Encrypt aktivieren:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d lernplan.example.com
```

Danach ist die Seite unter HTTPS erreichbar.

## 7. Minimaler End-to-End-Test

Vom Router oder von einem externen Netz:

```bash
curl -I http://DEINE-DOMAIN
curl -I https://DEINE-DOMAIN
```

Erwartet:

- HTTP antwortet
- HTTPS antwortet
- Nginx liefert `index.html`
- Browser-Konsole zeigt keine `404` auf Assets

## 8. Empfohlene Reihenfolge

1. Auf dem Webserver lokal mit Root-Build testen.
2. Nginx aktivieren.
3. Erst dann NAT-Regeln am Router Pi freischalten.
4. Danach DNS und TLS.

So isolierst du Fehler sauber zwischen App, Webserver und Netzwerk.

## 9. Komplettes Repository auf den Server bringen

Wenn du nicht nur `dist/`, sondern den kompletten Projektstand auf dem Server haben willst, nutze:

```bash
scripts/deploy-origin.sh \
  --target deploy@192.168.30.20 \
  --repo-path /srv/learnplan-tracker \
  --web-root /var/www/learnplan-tracker/dist \
  --base-path /
```

Das Script macht auf dem Server:

- Repository per `rsync` spiegeln
- `npm ci`
- Production-Build erzeugen
- `dist/` in den Webroot kopieren
- Nginx neu laden

Fuer Hosting unter einem Unterpfad:

```bash
scripts/deploy-origin.sh \
  --target deploy@192.168.30.20 \
  --repo-path /srv/learnplan-tracker \
  --web-root /var/www/learnplan-tracker/dist \
  --base-path /lernen/hebendanz/
```

Wenn dein Reverse Proxy die Seite schon veroeffentlicht, braucht der Origin-Webserver nur intern erreichbar zu sein.
