# Katkıda Bulunma Rehberi

Valorant Discord RPC projesine katkıda bulunmak istediğiniz için teşekkürler! 🎉

## 🤝 Nasıl Katkıda Bulunabilirsiniz?

### Hata Bildirimi

Bir hata bulduysanız:
1. [Issues](https://github.com/yefeblgn/valorantrpc/issues) sayfasına gidin
2. Benzer bir issue olmadığını kontrol edin
3. Yeni bir issue açın ve şunları ekleyin:
   - Hatanın açıklaması
   - Hatayı tekrarlama adımları
   - Beklenen davranış
   - Ekran görüntüleri (varsa)
   - Sistem bilgileri (OS, Python versiyonu)

### Özellik İsteği

Yeni bir özellik önerisi için:
1. [Issues](https://github.com/yefeblgn/valorantrpc/issues) sayfasında "Feature Request" açın
2. Özelliği detaylıca açıklayın
3. Kullanım senaryolarını ekleyin
4. Olası implementasyon fikirlerinizi paylaşın

### Pull Request

Kod katkısı yapmak için:

1. **Fork & Clone**
   ```bash
   git clone https://github.com/yefeblgn/valorantrpc.git
   cd valorantrpc
   ```

2. **Branch Oluşturun**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Değişiklikleri Yapın**
   - Kod standartlarına uyun (PEP 8)
   - Yorumları Türkçe veya İngilizce yazın
   - Değişikliklerinizi test edin

4. **Commit**
   ```bash
   git commit -m "feat: yeni özellik eklendi"
   ```
   
   Commit mesajları için format:
   - `feat:` - Yeni özellik
   - `fix:` - Hata düzeltmesi
   - `docs:` - Dokümantasyon
   - `style:` - Kod formatı
   - `refactor:` - Kod refactor
   - `test:` - Test ekleme
   - `chore:` - Bakım işleri

5. **Push & PR**
   ```bash
   git push origin feature/amazing-feature
   ```
   GitHub'da Pull Request açın

## 📝 Kod Standartları

### Python Stil Rehberi

- **PEP 8** standartlarına uyun
- **Fonksiyon/Sınıf** dokümantasyonu ekleyin
- **Type hints** kullanın (mümkün olduğunda)
- **Anlamlı değişken isimleri** kullanın

Örnek:
```python
def get_player_rank(player_data: Dict[str, Any]) -> Optional[str]:
    """
    Oyuncu verisinden rank bilgisini çıkarır
    
    Args:
        player_data: Oyuncu verisi dictionary'si
    
    Returns:
        Rank ismi veya None
    """
    if not player_data:
        return None
    
    mmr = player_data.get('mmr', {})
    tier = mmr.get('current_tier', 0)
    
    return get_rank_name(tier)
```

### Dosya Yapısı

```
valorantrpc/
├── main.py              # Ana program
├── config.py            # Konfigürasyon yönetimi
├── valorant_api.py      # API client
├── discord_rpc.py       # Discord RPC
├── presence_builder.py  # Presence oluşturma
├── asset_manager.py     # Asset yönetimi
├── utils.py             # Yardımcı fonksiyonlar
└── setup.py             # Kurulum scripti
```

### Test Etme

Değişikliklerinizi test edin:

1. **Temel test**
   ```bash
   python main.py
   ```

2. **Farklı senaryolar**
   - Oyunda olma durumu
   - Menüde olma durumu
   - Farklı oyun modları
   - Farklı rank'ler

3. **Hata durumları**
   - API erişilemez
   - Discord kapalı
   - Geçersiz config

## 🎯 Öncelikli Geliştirme Alanları

### Yüksek Öncelik
- [ ] Live match tracking iyileştirmeleri
- [ ] Agent gösterimi
- [ ] Performans optimizasyonları
- [ ] Hata yönetimi geliştirmeleri

### Orta Öncelik
- [ ] GUI eklentisi
- [ ] Otomatik başlatma (Windows startup)
- [ ] İstatistik görüntüleme
- [ ] Multi-account desteği

### Düşük Öncelik
- [ ] Özel temalar
- [ ] Webhook entegrasyonu
- [ ] Web dashboard
- [ ] Mobile bildirimler

## 🐛 Bilinen Sorunlar

Üzerinde çalışılması gereken bilinen sorunlar için [Issues](https://github.com/yefeblgn/valorantrpc/issues) sayfasına bakın.

## 📚 Kaynaklar

- [Henrik Dev API Docs](https://docs.henrikdev.xyz/)
- [Discord RPC Docs](https://discord.com/developers/docs/rich-presence/overview)
- [pypresence Documentation](https://qwertyquerty.github.io/pypresence/html/index.html)
- [Valorant API](https://valorant-api.com/)

## 💬 İletişim

- **Issues**: GitHub Issues üzerinden
- **Discussions**: GitHub Discussions bölümünde
- **Email**: [yefeblgn@gmail.com]

## 📜 Lisans

Bu projeye katkıda bulunarak, katkılarınızın MIT Lisansı altında lisanslanmasını kabul etmiş olursunuz.

## 🙏 Teşekkürler

Katkılarınız için teşekkür ederiz! Her türlü katkı değerlidir:
- 🐛 Hata bildirimleri
- 💡 Özellik önerileri  
- 📝 Dokümantasyon iyileştirmeleri
- 💻 Kod katkıları
- ⭐ Yıldız vererek projeyi destekleme

Birlikte harika bir proje yapıyoruz! 🚀
