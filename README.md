# 🏠 Monopoly Deal - Çevrimiçi

Arkadaşlarla oynayabileceğin tam özellikli Monopoly Deal kart oyunu.

## Kurulum

### Gereksinimler
- Node.js 18+ (Vite kullanılıyor — Node 24 dahil tüm güncel sürümlerle uyumlu)
- npm

### 1. Server Kurulumu
```bash
cd server
npm install
npm start
# Sunucu :3001'de çalışır
```

### 2. Client Kurulumu
```bash
cd client
npm install
npm start
# Tarayıcı :3000'de açılır (Vite)
```

## Nasıl Oynanır

1. **Oda Oluştur**: İsmini gir → "Yeni Oda Oluştur"
2. **Kod Paylaş**: Sarı 4 haneli kodu arkadaşlarına ver
3. **Katıl**: Arkadaşların kodu girip katılır (2-5 oyuncu)
4. **Başlat**: Host "Oyunu Başlat" butonuna basar

## Oyun Kuralları

- Her turda **3 aksiyon** hakkın var
- El sonu max **7 kart**
- Kart oynama seçenekleri:
  - Kartı **oyna** (arazi/aksiyon)
  - **Bankaya koy** (para olarak)
- **3 tam set** tamamlayan kazanır!

## Kartlar

### Aksiyonlar
| Kart | Açıklama |
|------|----------|
| Geç Go! | 2 kart çek |
| Doğum Günüm! | Herkes 2M öder |
| Borç Tahsildarı | Bir oyuncudan 5M al |
| Kira | Arazinden kira topla |
| Joker Kira | Herhangi renk, 1 kişi 2x öder |
| Sly Deal | Tam setten olmayan 1 arazi çal |
| Zorla Takas | Arazi takas et |
| Deal Breaker | Tam seti çal |
| Ev / Otel | Tam sete ekle, kirayı artır |
| Just Say No! | Gelen kartı reddet |

## İnternet Üzerinden Oynamak (Ev Modemi / Keenetic)

Eğer Railway/Render gibi bir servis kullanmadan, kendi bilgisayarın üzerinden Keenetic modem ile dışarıya açıyorsan:

### 1. Modemde Port Yönlendirme (Port Forwarding)
Keenetic panelinde **iki ayrı yönlendirme** kuralı olmalı:
- Dış port `3000` → Bilgisayarının yerel IP'si : `3000` (TCP)
- Dış port `3001` → Bilgisayarının yerel IP'si : `3001` (TCP)

Bilgisayarının yerel IP'sini öğrenmek için `cmd`'de `ipconfig` yaz, "IPv4 Adres" satırına bak (örn. `192.168.1.50`).

### 2. Client `.env` Dosyası (ÇOK ÖNEMLİ)
`client/.env` dosyası oluştur (yoksa `client/.env.example`'ı kopyala) ve **3001 portuna giden adresi** yaz:

```
VITE_SERVER_URL=http://vampir1.logar1932.keenetic.pro:3001
```

Bu olmadan, dışarıdaki oyuncuların tarayıcısı `socket.io`'yu kendi bilgisayarındaki `localhost:3001`'e bağlamaya çalışır ve **asla bağlanamaz**. `.env` dosyasını değiştirdikten sonra `npm start`'ı yeniden başlat (Vite `.env` dosyasını sadece açılışta okur).

### 3. Vite "Blocked request" Hatası
Vite 5+ tanımadığı `Host` adreslerini reddeder. `vite.config.js` içine zaten `allowedHosts` ekledik
(`vampir.logar1932.keenetic.pro` ve `vampir1.logar1932.keenetic.pro`). Farklı bir alan adı kullanıyorsan
`client/vite.config.js` içindeki `allowedHosts` listesine onu da ekle.

### 4. Windows Güvenlik Duvarı (Firewall)
Windows Defender Güvenlik Duvarı, gelen bağlantıları varsayılan olarak engelleyebilir. Node.js'e izin ver:

```
Denetim Masası → Windows Defender Güvenlik Duvarı → Bir uygulamanın güvenlik duvarından geçmesine izin ver
→ "Node.js" işaretli mi kontrol et (yoksa "Başka bir uygulamaya izin ver" ile node.exe'yi ekle)
→ Hem "Özel" hem "Genel" kutucuklarını işaretle
```

Veya hızlı test için PowerShell'i **yönetici olarak** açıp:
```powershell
New-NetFirewallRule -DisplayName "MonopolyDeal3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "MonopolyDeal3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### 5. Test Sırası
1. Önce **aynı Wi-Fi'daki** başka bir cihazdan `http://192.168.1.50:3000` (yerel IP) ile dene — bu çalışıyorsa kod sorunsuz, sorun port yönlendirme/firewall'da.
2. Sonra dışarıdan (mobil data ile, Wi-Fi kapalı) `http://vampir.logar1932.keenetic.pro:3000` dene.
3. Sunucunun ayakta olduğunu doğrula: `http://vampir1.logar1932.keenetic.pro:3001/health` → `{"ok":true,...}` dönmeli. Bu çalışmıyorsa sorun 3001 port yönlendirmesinde.

### Alternatif: Cloudflare Tunnel (Port Yönlendirme Olmadan)
Port yönlendirme/firewall ile uğraşmak istemiyorsan, [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) ile modem ayarına dokunmadan dışarı açabilirsin — `cloudflared tunnel --url http://localhost:3000` gibi tek komutla geçici bir public URL alırsın.

## Deploy (Railway/Render)

Sunucuyu herkesin erişebileceği bir yere deploy et:

```bash
# client/.env dosyası oluştur:
VITE_SERVER_URL=https://senin-sunucun.railway.app
```

Sonra `npm run build` ile production build alıp `dist/` klasörünü yayınlayabilirsin.
