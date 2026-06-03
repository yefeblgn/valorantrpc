<div align="center">

  <h1>ValorantRPC 2.0</h1>

  <p>
    <b>VALORANT durumunu Discord'a taşı — sıfır ayar, anahtar yok.</b>
    <br />
    Oynadığın ajan, harita, skor, rank ve modu Discord profilinde otomatik göster.
  </p>

  <p>
    <a href="https://github.com/yefeblgn/valorantrpc/issues">
      <img src="https://img.shields.io/github/issues/yefeblgn/valorantrpc?style=for-the-badge&label=Hatalar&color=eb4034" alt="Issues">
    </a>
    <a href="https://github.com/yefeblgn/valorantrpc/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/yefeblgn/valorantrpc?style=for-the-badge&label=Lisans&color=f1c40f" alt="Lisans">
    </a>
  </p>
</div>

---

## ✨ Öne Çıkanlar

- 🔑 **Anahtarsız & sıfır ayar.** HenrikDev API yok. Riot adı, tag, bölge ve dil
  doğrudan yerel Riot client'tan **otomatik** tespit edilir. Aç ve kullan.
- 🛰️ **Tamamen yerel.** Veri yalnızca Riot'un kendi yerel API'sinden (lockfile +
  entitlements + PD/GLZ) okunur. Şifren veya hesabın hiçbir dış servise gönderilmez.
- 🎯 **Gerçek zamanlı.** Menü, ajan seçimi ve maç durumu (mod · harita · ajan · skor ·
  parti · rank/RR) anlık olarak Discord'a yansır.
- 🖼️ **Hep güncel içerik.** Ajan/harita/rank isim ve görselleri `valorant-api.com`'dan
  çekilir; yeni ajan/harita çıktığında elle güncelleme gerekmez.
- 🪶 **Tray öncelikli, hafif arayüz.** Sistem tepsisinde yaşar; tek tıkla açılan
  kompakt, koyu temalı mini panel.
- 🌐 **TR / EN.** Arayüz ve Discord metinleri için anlık dil değişimi.
- 🚀 **Windows ile başlat** seçeneği.

## 🚀 Kurulum & Çalıştırma

### Hazır .exe
[Releases](https://github.com/yefeblgn/valorantrpc/releases/latest) sayfasından
`ValorantRPC.exe` indir ve çalıştır. Başka bir şey yapman gerekmez.

### Kaynaktan
```bash
pip install -r requirements.txt
python -m vrpc
```

Valorant ve Discord açıkken uygulama gerisini halleder. Pencereyi kapatmak onu tepsiye
gizler; tamamen çıkmak için tepsi menüsünden **Çıkış**.

### Kendi .exe'ni derle
```bash
python build.py    # -> dist/ValorantRPC.exe
```

## 🧠 Nasıl Çalışır?

```
Riot Client (lockfile) ──► yerel kimlik (entitlements, PUUID)
        │
        ├─ /chat/v4/presences ──► durum, mod, parti, seviye, tier, skor
        ├─ core-game / pregame ─► oynanan ajan
        └─ mmr (PD) ────────────► RR
                                   │
valorant-api.com (statik) ─► isim & görseller
                                   │
                                   ▼
                          Discord Rich Presence
```

## 💻 Teknolojiler

- **Python 3** · **pypresence** (Discord RPC) · **requests** (yerel API)
- **pystray** (tepsi) · **customtkinter** + **Pillow** (mini panel)

## 🤝 Katkı

Hata veya öneri için bir [Issue](https://github.com/yefeblgn/valorantrpc/issues) aç,
ya da doğrudan PR gönder.

## 📄 Lisans

[MIT](https://github.com/yefeblgn/valorantrpc/blob/main/LICENSE)
