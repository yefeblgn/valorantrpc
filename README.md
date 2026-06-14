# ValorantRPC (v3.0)

VALORANT oyun durumunu Discord profilinde göstermeni sağlayan, tamamen yerel çalışan bir Rich Presence uygulaması. Herhangi bir Riot API anahtarı veya giriş bilgisi gerektirmez; oyun verilerini doğrudan bilgisayarındaki yerel Riot Client servisinden okur.

Arayüzü mat OLED siyahı, VALORANT temalı renkler ve iOS benzeri liquid-glass (buzlu cam) butonlarla sıfırdan tasarladık.

## 🚀 Özellikler

* **Sıfır Ayar:** Riot kullanıcı adını, tagini, oynadığın modu ve rankını yerel Riot istemcisi üzerinden otomatik algılar.
* **Tamamen Güvenli:** Hesabına dair hiçbir şifre veya hassas bilgi dışarıya gönderilmez. Uygulama sadece kendi bilgisayarındaki Riot lockfile dosyasını okur.
* **Canlı Durum Takibi:** Lobide, ajan seçerken veya oyundayken (skor, harita, ajan, rank ve RR dahil) her şey anlık olarak Discord profiline yansır.
* **Hafif Arayüz:** Kapat tuşuna bastığında arka plana (sistem tepsisine - tray) küçülür ve çalışmaya devam eder. Windows açılışında otomatik başlama seçeneği mevcuttur.
* **Hızlı Asset Çözümü:** Ajan ve harita görsellerini dahili olarak tutmak yerine doğrudan Riot'un güncel CDN sunucusundan çeker. Bu sayede uygulamanın boyutu 220 MB'tan 78 MB seviyelerine inmiştir.

## 📦 Kurulum ve Geliştirme

Projeyi kendi bilgisayarında çalıştırmak veya geliştirmek istersen:

### Gereksinimler
* Node.js (v18+)
* npm

### Çalıştırma
Bağımlılıkları yükleyip geliştirme modunda başlatmak için:
```bash
npm install
npm run dev
```

### Derleme (Build & Paketleme)
Kurulum dosyasını (.exe) veya taşınabilir (portable) sürümünü oluşturmak için:
```bash
npm run dist
```
Oluşan çıktılar `./release` klasöründe yer alacaktır.

## 💻 Teknolojiler
* **Electron + TypeScript** (Masaüstü konteyneri ve arka plan işlemleri)
* **Vite + React** (Arayüz yapısı)
* **Tailwind CSS + Framer Motion** (Liquid glass tasarımı ve sayfa geçişleri)
* **Radix UI** (Erişilebilir arayüz elementleri)

## 📄 Lisans
[MIT](LICENSE)
