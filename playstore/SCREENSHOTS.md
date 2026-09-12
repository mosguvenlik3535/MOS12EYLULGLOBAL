# MOSBARKOD POS — Ekran Görüntüsü & Grafik Hazırlık Kılavuzu

> Play Store başvurusu için gerekli görseller. Özellik grafiği hazır; ekran görüntülerini
> gerçek cihazdan çekip `playstore/screenshots/` klasörüne koyun.

---

## 1. Hazır varlıklar (bu depoda)

| Dosya | Boyut | Durum |
|---|---|---|
| `playstore/feature-graphic.png` | 1024×500 | ✅ hazır |
| `playstore/icon-512.png` | 512×512 | ✅ hazır |
| `privacy-policy.html` | — | ✅ hazır (barındırın) |

---

## 2. Çekilecek ekranlar (önerilen 6 ekran)

| # | Ekran | Nasıl ulaşılır | Neden önemli |
|---|---|---|---|
| 1 | **Satış / POS** | Sol menü → Satış | Ana kasa ekranı — en kritik görsel |
| 2 | **Ürünler** | Sol menü → Ürünler | Stok/liste yönetimi |
| 3 | **Stok Zekâsı** | Ürünler → "Stok Zekâsı" | ABC analizi, satış hızı (fark yaratan özellik) |
| 4 | **Rapor / Gün Sonu** | Analiz veya Gün Sonu | Raporlama |
| 5 | **Ayarlar (14 dil)** | Sol menü → Ayarlar | Çok dillilik göstergesi |
| 6 | **Stok İçe Aktarma Sihirbazı** | Ürünler → "Excel İçe Aktar" | Mikro/Logo/Paraşüt geçiş desteği |

> İpucu: Gerçek müşteri verisi yerine temiz/demo veriyle çekin (KVKK açısından güvenli).

---

## 3. Boyutlar (Play Console gereksinimleri)

| Cihaz | Minimum | Önerilen |
|---|---|---|
| Telefon | 320 px genişlik | **1080×2400** (9:20) veya 1440×3120 |
| 7" tablet | 320 px genişlik | **800×1280** (portre) veya 1280×800 (yatay) |

- Format: **PNG veya JPEG**, RGB, alfa kanalı yok.
- Her ekran için aynı boyutları kullanın (tutarlı görünüm).
- En az **2 telefon** + **1 tablet** yükleyin (tablet POS için önemli).

---

## 4. Çekim yöntemleri (üç seçenek)

### A) Android telefondan doğrudan
1. Uygulamayı kurun (sideload APK veya Play test sürümü).
2. İlgili ekrana gidin.
3. **Güç + Ses Kısma** tuşlarına birlikte basın → ekran görüntüsü alınır.
4. Fotoğraflar uygulamasından bilgisayara aktarın; GIMP/Photoshop ile boyutlandırın.

### B) Play Console üzerinden (en kolay)
1. Play Console → uygulama → **Store presence → Main store listing → Phone screenshots**.
2. "Screenshot" butonu yanındaki **telefon simgesi (Device Art)** → cihaz bağlayın veya önerilen cihazı kullanın.
3. Uygulama cihazda açılır; ekranı yönlendirip doğrudan Play Console'a yükleyin.

### C) Masaüstü sürümünden (hızlı alternatif)
1. Masaüstü EXE/AppImage'ı açın.
2. Pencereyi **telefon oranına** getirin (örn. 360×780 içerik alanı).
3. İşletim sistemi ekran görüntüsü aracıyla yakalayın (Windows: Win+Shift+S).
4. 1080×2400'e ölçekleyin (kayıpsız büyütme için önce yüksek çözünürlükte yakalayın).

---

## 5. Dosya adlandırma önerisi

```
playstore/screenshots/phone-1-pos.png
playstore/screenshots/phone-2-products.png
playstore/screenshots/phone-3-stock-intel.png
playstore/screenshots/phone-4-reports.png
playstore/screenshots/phone-5-settings.png
playstore/screenshots/phone-6-import.png
playstore/screenshots/tablet-1-pos.png
```

---

## 6. Özellik grafiği notu

`playstore/feature-graphic.png` (1024×500) hazır. Yalnızca şu durumda yenileyin:
- Marka/logo değişirse,
- Tagline değişirse.

Grafiği değiştirmek için kaynak varlıklar: `mosbarkod/public/icons/icon-512.png` (logo) + arka plan `#0a0e13`.
