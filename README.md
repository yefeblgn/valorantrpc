# 🎮 Valorant Discord RPC# 🎮 Valorant Discord RPC# Valorant Discord RPC



Discord'da Valorant oynarken durumunuzu otomatik gösteren modern bir RPC uygulaması.



[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)> Modern ve şık bir Discord Rich Presence uygulaması - Valorant oynarken Discord durumunuzu otomatik güncelleyin!Detaylı bir Valorant Discord Rich Presence uygulaması. Henrik Dev API kullanarak oyun durumunuzu Discord profilinizde gösterir.

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)



## 📋 Özellikler

[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)## 🎮 Özellikler

- ✅ Otomatik Discord durum güncellemesi

- ✅ Rank ve seviye gösterimi[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

- ✅ Oyun modu, harita ve agent bilgisi

- ✅ Modern GUI arayüz[![Discord RPC](https://img.shields.io/badge/discord-rpc-7289da.svg)](https://discord.com/)- ✨ Gerçek zamanlı oyuncu durumu takibi

- ✅ Sistem tepsisi desteği

- ✅ Otomatik güncelleme kontrolü- 🏆 Rank ve RR gösterimi



## 🚀 Kurulum## ✨ Özellikler- 🗺️ Oyun modu ve harita bilgisi



### 1. Gereksinimler- 👥 Parti durumu ve oyuncu sayısı



- Python 3.8+- 🎯 **Otomatik Durum Güncellemesi** - Oyun durumunuz Discord'da anlık olarak gösterilir- 📊 Seviye gösterimi

- Discord (masaüstü)

- Valorant- 🏆 **Rank Gösterimi** - Mevcut rank ve RR bilginiz görünür- 🎨 Rank iconları



### 2. İndirme- 🗺️ **Harita ve Mod Bilgisi** - Oynadığınız harita ve oyun modu gösterilir- ⚙️ Özelleştirilebilir ayarlar



```bash- 🎭 **Agent Seçimi** - Seçtiğiniz agent Discord'da görünür

git clone https://github.com/yefeblgn/valorantrpc.git

cd valorantrpc- 👥 **Parti Bilgisi** - Parti sayısı (Solo, Duo, 5 Stack)## 📋 Gereksinimler

```

- ⏱️ **Süre Takibi** - Maç içinde geçen süre

### 3. Bağımlılıklar

- 🎨 **Modern GUI** - CustomTkinter ile yapılmış premium arayüz- Python 3.8+

```bash

pip install -r requirements.txt- 🔔 **Sistem Tepsisi** - Minimize edildiğinde sistem tepsisinde çalışır- Discord (masaüstü uygulaması çalışıyor olmalı)

```

- 🔄 **Otomatik Güncelleme Kontrolü** - GitHub'dan yeni sürüm bildirimi

### 4. Başlatma



```bash## 🚀 Hızlı Kurulum2. Gerekli paketleri yükleyin:

python gui_v2.py

``````bash



İlk açılışta bilgilerinizi girin:### Gereksinimlerpip install -r requirements.txt

- **Riot ID**: Valorant kullanıcı adınız

- **Tag**: Tag'iniz (# olmadan)```

- **Bölge**: eu, na, ap, kr, latam, br

- **Henrik API** (opsiyonel): Rank ve profil için- Python 3.8 veya üzeri



## ⚙️ Ayarlar- Discord masaüstü uygulaması3. Discord Developer Portal'dan bir uygulama oluşturun:



Uygulama açıldıktan sonra **⚙️ Ayarlar** butonuna tıklayarak:- Valorant (oyun açık olmalı)   - https://discord.com/developers/applications adresine gidin

- Kullanıcı bilgilerini değiştirebilirsiniz

- Henrik API key ekleyebilirsiniz   - "New Application" butonuna tıklayın

- Görünüm ayarlarını düzenleyebilirsiniz

### Adım 1: Projeyi İndirin   - Uygulama adını girin (örn: "Valorant RPC")

### Henrik API

   - Application ID'yi kopyalayın

API key olmadan bazı özellikler çalışmaz:

- ❌ Rank bilgisi```bash

- ❌ Profil kartı

- ❌ Seviye bilgisigit clone https://github.com/yefeblgn/valorantrpc.git `config.json` dosyasını düzenleyin:



API key almak için: [henrikdev.xyz](https://henrikdev.xyz/)cd valorantrpc```json



## 📁 Konfigürasyon```{



Ayarlar otomatik olarak `%LOCALAPPDATA%\ValorantRPC\config.json` konumuna kaydedilir.    "riot_name": "YourRiotName",



**Bölge Kodları:**### Adım 2: Gereksinimleri Yükleyin    "riot_tag": "TAG",

- `eu` - Avrupa

- `na` - Kuzey Amerika    "region": "eu",

- `ap` - Asya-Pasifik

- `kr` - Kore```bash    "discord_client_id": "YOUR_DISCORD_CLIENT_ID",

- `latam` - Latin Amerika

- `br` - Brezilyapip install -r requirements.txt    "update_interval": 15,



## 🎯 Kullanım```    "show_rank": true,



1. Discord'u açın    "show_level": true,

2. Valorant'ı açın

3. Uygulamayı başlatın### Adım 3: Konfigürasyon    "show_party_size": true,

4. RPC otomatik başlar

    "show_elapsed_time": true

**Butonlar:**

- ▶️ **BAŞLAT** - RPC'yi başlatır```bash}

- ■ **DURDUR** - RPC'yi durdurur

- 🔄 **GÜNCELLE** - Yeni sürüm varsa gösterilir# config.json.example dosyasını kopyalayın```

- ⚙️ **Ayarlar** - Ayarlar panelini açar

copy config.json.example config.json

**Sistem Tepsisi:**

- Minimize edildiğinde tepsiye gider## 🎯 Kullanım

- Tepsiden tekrar açılabilir

- Sağ tık → Çıkış# config.json dosyasını açın ve düzenleyin



## 🐛 Sorun Giderme```Programı başlatın:



**Discord bağlanamıyor:**```bash

- Discord masaüstü uygulamasının açık olduğundan emin olun

- Discord'u yeniden başlatın**config.json örneği:**python main.py



**Valorant bağlanamıyor:**```json```

- Valorant'ın açık ve giriş yapılmış olduğundan emin olun

- Uygulamayı yönetici olarak çalıştırın{



**Rank gösterilmiyor:**    "riot_name": "YourRiotName",Program çalışırken:

- Henrik API key ekleyin (⚙️ Ayarlar)

- Riot ID ve Tag bilgilerinin doğru olduğunu kontrol edin    "riot_tag": "TAG",- Discord profilinizde Valorant durumunuz görünecek



## 🔧 Teknolojiler    "region": "eu"- Her 15 saniyede bir (varsayılan) durum güncellenecek



- [valclient](https://github.com/colinhartigan/valclient-python) - Valorant client}- Ctrl+C ile programı durdurabilirsiniz

- [Henrik Dev API](https://henrikdev.xyz/) - Rank ve profil

- [pypresence](https://github.com/qwertyquerty/pypresence) - Discord RPC```

- [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter) - GUI

## ⚙️ Konfigürasyon

## 📝 Lisans

**Önemli Notlar:**

MIT License - [LICENSE](LICENSE)

- `riot_name`: Valorant kullanıcı adınız (# öncesi)### Temel Ayarlar

## 💬 Destek

- `riot_tag`: Tag'iniz (# işareti olmadan)

- [Issues](https://github.com/yefeblgn/valorantrpc/issues) - Sorun bildirin

- [Discussions](https://github.com/yefeblgn/valorantrpc/discussions) - Soru sorun- `region`: Bölgeniz (`eu`, `na`, `ap`, `kr`, `latam`, `br`)- `riot_name`: Riot ID kullanıcı adınız (örn: "PlayerName")



---- `riot_tag`: Riot tagınız (örn: "EUW")



**Made with ❤️ by [yefeblgn](https://github.com/yefeblgn)**### Adım 4: Başlatın!- `region`: Bölgeniz (eu, na, ap, kr, latam, br)



⭐ Beğendiyseniz yıldız verin!- `discord_client_id`: Discord uygulama ID'niz


```bash

python gui_v2.py### Görünüm Ayarları

```

- `show_rank`: Rank bilgisini göster (true/false)

## ⚙️ Konfigürasyon Detayları- `show_level`: Hesap seviyesini göster (true/false)

- `show_party_size`: Parti bilgisini göster (true/false)

### Zorunlu Ayarlar- `show_elapsed_time`: Geçen süreyi göster (true/false)



```json### Performans Ayarları

{

    "riot_name": "YourName",           // Riot ID (# öncesi)- `update_interval`: Güncelleme aralığı (saniye, minimum 10)

    "riot_tag": "TR1",                 // Tag (# sonrası, # olmadan)- `debug_mode`: Debug modu (true/false)

    "region": "eu"                     // Bölge kodu

}## 🎨 Asset Yönetimi

```

Discord uygulamanıza asset'ler eklemeniz gerekiyor:

### Opsiyonel Ayarlar

1. Discord Developer Portal'da uygulamanızı açın

```json2. "Rich Presence" → "Art Assets" bölümüne gidin

{3. Aşağıdaki asset'leri yükleyin:

    "discord_client_id": "1434340968487850135",  // Discord Client ID (varsayılan çalışır)

    "henrik_api_key": "",                        // Henrik API Key (opsiyonel)**Gerekli Asset'ler:**

    "update_interval": 6,                        // Güncelleme süresi (saniye)- `valorant_logo` - Ana Valorant logosu (büyük resim)

    "show_rank": true,                           // Rank göster- `unranked`, `iron`, `bronze`, `silver`, `gold`, `platinum`, `diamond`, `ascendant`, `immortal`, `radiant` - Rank iconları

    "show_level": true,                          // Seviye göster

    "show_party_size": true,                     // Parti bilgisi gösterAsset isimleri önemlidir, tam olarak yukarıdaki gibi olmalıdır.

    "show_elapsed_time": true,                   // Süre göster

    "debug_mode": false                          // Debug modu## 📖 API Bilgisi

}

```Bu proje [Henrik Dev Valorant API](https://docs.henrikdev.xyz/) kullanır.



### Bölge Kodları**Kullanılan Endpoint'ler:**

- `/v1/account/{name}/{tag}` - Hesap bilgileri

| Kod | Bölge |- `/v2/mmr/{region}/{name}/{tag}` - MMR/Rank bilgileri

|-----|-------|- `/v3/matches/{region}/{name}/{tag}` - Maç geçmişi

| `eu` | Avrupa (Europe) |

| `na` | Kuzey Amerika (North America) |**Rate Limiting:**

| `ap` | Asya-Pasifik (Asia-Pacific) |API rate limit'i vardır, `update_interval` değerini çok düşük tutmayın (minimum 10 saniye önerilir).

| `kr` | Kore (Korea) |

| `latam` | Latin Amerika |## 🐛 Sorun Giderme

| `br` | Brezilya (Brazil) |

### "Discord RPC bağlantısı kurulamadı"

## 🎮 Kullanım- Discord masaüstü uygulamasının çalıştığından emin olun

- Discord'u yönetici olarak çalıştırmayı deneyin

1. **Discord'u açın** - Masaüstü uygulaması çalışıyor olmalı- Firewall ayarlarınızı kontrol edin

2. **Valorant'ı açın** - Oyun çalışıyor olmalı

3. **Uygulamayı başlatın** - `python gui_v2.py`### "Geçersiz konfigürasyon"

4. **Otomatik başlar** - Uygulama açılır açılmaz RPC başlar- `config.json` dosyasının doğru formatta olduğunu kontrol edin

- Riot ID ve tag'inizin doğru olduğunu kontrol edin

### GUI Özellikleri- Discord Client ID'nin doğru olduğunu kontrol edin



- 🟢 **Yeşil nokta**: Discord bağlı### "Hesap bilgisi alınamadı"

- 🔴 **Kırmızı nokta**: Valorant bağlı- Riot ID ve tag'inizin doğru olduğunu kontrol edin

- 📊 **Durum kartları**: Anlık durum bilgileri- Bölge ayarınızın doğru olduğunu kontrol edin

- 🎴 **Oyuncu kartı**: Profil, seviye, rank bilgisi- API'nin çalıştığını kontrol edin: https://status.henrikdev.xyz/

- ▶️ **BAŞLAT/DURDUR**: RPC'yi kontrol edin

- 🔄 **GÜNCELLE**: Yeni sürüm varsa gösterilir## 🤝 Katkıda Bulunma



### Sistem TepsisiKatkılarınızı bekliyoruz! Pull request göndermekten çekinmeyin.



Uygulamayı minimize ettiğinizde:## 📝 Lisans

- Sistem tepsisinde çalışmaya devam eder

- Bildirim gönderilirBu proje MIT lisansı altında lisanslanmıştır.

- Tepsiden tekrar açılabilir

- Sağ tık → Çıkış ile kapatılabilir## 🙏 Teşekkürler



## 🛠️ API ve Kaynaklar- [Henrik Dev](https://henrikdev.xyz/) - Valorant API

- [pypresence](https://github.com/qwertyquerty/pypresence) - Discord RPC kütüphanesi

Bu proje şu API'leri kullanır:- [Colin](https://github.com/colinhartigan/valclient.py) - İlham kaynağı



- **[valclient](https://github.com/colinhartigan/valclient-python)** - Lokal Valorant client bağlantısı## ⚠️ Yasal Uyarı

- **[Henrik Dev API](https://henrikdev.xyz/valorant)** - Rank, profil bilgileri

- **[Valorant API](https://valorant-api.com/)** - Harita, agent, rank icon'larıBu proje Riot Games tarafından onaylanmamış veya herhangi bir şekilde Riot Games veya Riot Games'in resmi olarak dahil olduğu herhangi bir kişi ile ilişkilendirilmemiştir. Riot Games ve tüm ilişkili özellikler Riot Games, Inc'in ticari markalarıdır veya tescilli ticari markalarıdır.

- **[pypresence](https://github.com/qwertyquerty/pypresence)** - Discord RPC

## 🐛 Sorun Giderme

### "config.json bulunamadı"

```bash
# config.json.example dosyasını kopyalayın
copy config.json.example config.json

# Ardından config.json'ı düzenleyin
```

### "riot_name ayarlanmamış"

`config.json` içinde `riot_name` ve `riot_tag` değerlerini kendi bilgilerinizle değiştirin.

### "Discord RPC bağlantısı kurulamadı"

1. Discord masaüstü uygulamasının açık olduğundan emin olun
2. Discord'u yönetici olarak çalıştırmayı deneyin
3. Discord'u kapatıp tekrar açın

### "Valorant client'a bağlanılamadı"

1. Valorant'ın açık olduğundan emin olun
2. Oyuna giriş yapmış olmalısınız (menüde veya maçta)
3. Valorant'ı yönetici olarak çalıştırmayı deneyin

### "Hesap bilgisi alınamadı"

1. Riot ID'nizin doğru olduğunu kontrol edin
2. Bölge ayarınızın doğru olduğunu kontrol edin
3. İnternet bağlantınızı kontrol edin
4. Henrik API'nin çalıştığını kontrol edin: https://henrikdev.xyz/valorant

### Debug Modu

Sorun yaşıyorsanız debug modunu açın:

```json
{
    "debug_mode": true
}
```

Ardından uygulamayı terminalde çalıştırın ve log mesajlarını kontrol edin.

## 📚 Dokümantasyon

- [QUICKSTART.md](QUICKSTART.md) - Hızlı başlangıç rehberi
- [CONTRIBUTING.md](CONTRIBUTING.md) - Katkıda bulunma rehberi
- [LICENSE](LICENSE) - MIT Lisansı

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun.

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- [valclient](https://github.com/colinhartigan/valclient-python) - Valorant client API
- [Henrik Dev](https://henrikdev.xyz/) - Valorant API
- [pypresence](https://github.com/qwertyquerty/pypresence) - Discord RPC
- [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter) - Modern GUI

## 📞 İletişim

- GitHub: [@yefeblgn](https://github.com/yefeblgn)
- Issues: [GitHub Issues](https://github.com/yefeblgn/valorantrpc/issues)

---

Made with ❤️ by [yefeblgn](https://github.com/yefeblgn)

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
