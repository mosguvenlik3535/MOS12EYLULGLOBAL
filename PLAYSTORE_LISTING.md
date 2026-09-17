# MOSBARKODYAZILIM — Play Store Mağaza Listesi & Başvuru Hazırlığı

> Sürüm: v1.6.1 · Hazırlık: 12 Eylül 2026 · Bu dosyadaki metinler Play Console'a kopyalanabilir.

---

## 1. Uygulama Kimliği

| Alan | Değer |
|---|---|
| Uygulama adı (Play) | **MOS: Barkod Satış Kasa ve Stok** (30 karakter) |
| Kısa ad | MOSBARKOD |
| Paket adı (applicationId) | `com.mosbarkodyazilim.pos` |
| Kategori | İş / Business |
| Uygulama türü | Uygulama (oyun değil) |
| Ücretsiz / Ücretli | Ücretsiz (uygulama içi satın alma: PRO abonelik) |
| İletişim e-postası | m.ortayayla@gmail.com |
| Gizlilik politikası URL | (yayınladığınız `privacy-policy.html` adresi) |

---

## 2. Mağaza metinleri (Türkçe)

### Kısa açıklama (en fazla 80 karakter)
> Yapay zekâ destekli barkod satış, stok ve kasa programı — çevrimdışı çalışır.

### Tam açıklama (en fazla 4000 karakter)

```
MOSBARKOD POS, bakkal, market, manav, butik ve kafe gibi işletmeler için
yapay zekâ destekli, çevrimdışı çalışan barkod satış ve kasa programıdır.

✔ Barkod / kamera / yapay zekâ görüntü tanıma ile hızlı satış (POS)
✔ 3 fiyat seviyesi (F1/F2/F3), tartım ürünleri, maliyet altı satış engeli
✔ Nakit + POS + veresiye ödeme, POS provizyon onayı
✔ Stok, alış faturaları, paket/teslimat siparişleri
✔ Veresiye defteri, giderler, personel ve maaş/avans takibi
✔ Gün sonu raporu, analiz, kasa ve POS kapanışı
✔ Stok sayımı ve fire raporu
✔ Raf etiketi ve barkod yazdırma (ESC/POS)
✔ İmkart (ulaşım kartı) dolum ve bakiye yönetimi

FARKLI PROGRAMLARDAN GEÇİŞ
Mikro, Logo, Paraşüt, Nebim, Zirve ve SAP gibi programların Excel/CSV
çıktılarını sihirbazla içe aktarın; sütunları otomatik eşleyin.

ÇEVRİMDIŞI & ÇOK CİHAZLI
İnternet olmadan da çalışır. Masaüstü ana bilgisayar ile telefonlarınızı
QR/kod ile eşleştirip aynı veriyi gerçek zamanlı paylaşın (WebRTC).

14 DİL & YAPAY ZEKÂ
Türkçe dahil 14 dilde arayüz. Yapay zekâ görsel tanıma ile ürünü
kameradan tanıyın; barkod okutunca ürün bilgisini otomatik getirin.

GÜVENLİ YEDEK
Verilerinizi kendi Google Drive veya Dropbox hesabınıza yedekleyin.

MOSBARKOD PRO (isteğe bağlı abonelik)
Ücretsiz sürümde 100 ürüne kadar kullanabilirsiniz. PRO ile sınırsız ürün
ve satış kaydı, bulut yedekleme ve tüm raporlar açılır.
```

### Özellik grafiği başlığı (opsiyonel)
> Yapay Zekâ Destekli Barkod Satış Programı

---

## 3. Store listing (English)

### Short description (≤ 80 chars)
> AI-powered barcode sales, stock & cash-register — works offline.

### Full description (≤ 4000 chars)

```
MOSBARKOD POS is an AI-powered, offline-first barcode sales and
cash-register program for grocery stores, markets, boutiques and cafés.

✔ Fast POS: barcode / camera / AI visual recognition
✔ 3 price tiers (F1/F2/F3), weighed items, below-cost sale guard
✔ Cash + card (POS) + credit payments, POS authorization
✔ Stock, purchase invoices, package/delivery orders
✔ Credit ledger, expenses, staff & salary tracking
✔ End-of-day report, analytics, cash & POS closing
✔ Stock counting and shrinkage report
✔ Shelf label & barcode printing (ESC/POS)

MIGRATE FROM OTHER SOFTWARE
Import Excel/CSV exports from Mikro, Logo, Paraşüt, Nebim, Zirve and
SAP with an automatic column-mapping wizard.

OFFLINE & MULTI-DEVICE
Works without internet. Pair phones with a desktop master via QR/code and
share the same data in real time (WebRTC).

14 LANGUAGES & AI
Interface in 14 languages. AI visual recognition identifies products from
the camera; barcode lookup fetches product info automatically.

SECURE BACKUP
Back up your data to your own Google Drive or Dropbox account.

MOSBARKOD PRO (optional subscription)
The free tier supports up to 100 products. PRO unlocks unlimited products
and sales, cloud backup and all reports.
```

---

## 4. Veri Güvenliği (Data Safety) formu yanıtları

Play Console'da **Data safety → Start** ile doldurun:

| Soru | Yanıt |
|---|---|
| Veri toplanıyor/aktarılıyor mu? | Evet (yalnızca kullanıcı tetikli) |
| Kullanıcı kimliği | Toplanmıyor |
| Finansal bilgi | Toplanmıyor (ödeme Google Play Billing) |
| Konum | Toplanmıyor |
| Kişisel bilgi (e-posta vb.) | Toplanmıyor (destek e-postası gönüllü) |
| Uygulama etkinliği / tanılama | Toplanmıyor |
| Şifrelenmiş aktarım | Evet (HTTPS/OAuth) |
| Veri silme talebi | "Uygulama içinden veri silinebilir" (yerel veri; uygulamayı kaldırınca silinir) |

> Önemli: Veri **bizim sunucularımızda toplanmıyor**; yalnızca kullanıcı kendi Drive/Dropbox'a yedeklerse ve Open Food Facts sorgusu yaparsa dışarı çıkar. Formda "yerel öncelikli, sunucu yok" şeklinde açıklayın.

**Kamera satırı (v1.8.2+):** uygulama `CAMERA` iznini kullanıyor. Formda:
- "Kamera fotoğrafları ve videoları" → **Toplanmıyor / Paylaşılmıyor** (görüntü yalnız cihaz üzerinde işlenir, hiçbir sunucuya gitmez; barkod kareleri anlık çözülüp bırakılır).
- Açıklama alanına: "Camera is used only for real-time barcode/QR decoding on-device; frames are never stored or transmitted."

---

## 5. Duyarlı izin beyanı (Sensitive permissions declaration)

v1.8.2 ile AndroidManifest'e `android.permission.CAMERA` eklendi (kamera ile barkod okuma + AI görsel tanıma). Play Console, `CAMERA` izni bulunan AAB'lerde **izin gerekçesi (permission justification)** doldurmanızı ister:

**App permissions declaration form — CAMERA için önerilen metin:**

> The app uses the camera to scan product barcodes/QR codes with the device camera (ZXing decoder running inside the Capacitor WebView) so shopkeepers can add and sell products without a separate USB/Bluetooth scanner. Camera frames are processed in real time on the device, are never recorded, never stored and never uploaded. The permission is requested only when the user taps the "Scan with camera" button.

Kontrol listesi:
- [ ] Manifest'te `<uses-feature android:name="android.hardware.camera" android:required="false"/>` tanımlı (kamerayı olmayan cihazları filtrelememesi için) — v1.8.2'de eklendi ✅
- [ ] Play Console → Advanced settings → **App permissions** → CAMERA gerekçesi girildi
- [ ] `RECORD_AUDIO` **istendi mi?** Hayır — mikrofon izni manifest'te yok (`MODIFY_AUDIO_SETTINGS` zararsız, duyarlı izin listesinde değil). Sesli kayıt hiçbir özelliğimiz için kullanılmıyor.
- [ ] Data Safety formunda "Kamera fotoğrafları ve videoları" satırı "toplanmıyor" olarak işaretlendi

> Not: İzin reddedilirse uygulama kamera dışındaki tüm özelliklerle çalışmaya devam eder; POS'ta elle barkod girişi ve USB/Bluetooth okuyucu her zaman geçerlidir. Kamera izni gerektirmeyen işlevleri engellemediğimiz için "kullanılabilirlik" politika ihlali oluşmaz.

---

## 6. İçerik derecelendirmesi (IARC)

- Kategori: Business/Productivity
- Tahmin: **Herkes (Everyone)** — şiddet, cinsellik, kumar, yasa dışı içerik yok.
- Kullanıcı etkileşimi: Var (yerel veri) — ama kullanıcılar arası içerik paylaşımı yok → "Users Interact" işaretlenmez.

---

## 7. Başvuru öncesi kontrol listesi

- [ ] Kurumsal Play Console hesabı + D-U-N-S + kimlik doğrulama
- [ ] Keystore üretildi, 4 GitHub Secret eklendi (bkz. PLAYSTORE_YAYIN_PLANI.md §6b)
- [ ] `privacy-policy.html` bir adreste yayınlandı (GitHub Pages / kendi site)
- [ ] İkon 512×512 (marka) ✅ (`playstore/icon-512.png` hazır)
- [ ] Özellik grafiği 1024×500 ✅ (`playstore/feature-graphic.png` hazır)
- [ ] Ekran görüntüleri: telefon ≥ 2 + 7" tablet ≥ 1 (çekim kılavuzu: `playstore/SCREENSHOTS.md`)
- [ ] `mos_pro_aylik` abonelik ürünü Play Console'da tanımlandı (299 TL/ay)
- [ ] Play Billing test kullanıcıları (lisans testi) eklendi
- [ ] AAB imzalı üretildi ve Play'e yüklendi (secret eklenince otomatik)
- [ ] Data Safety formu dolduruldu (kamera satırı: toplanmıyor/paylaşılmıyor)
- [ ] İçerik derecelendirme anketi tamamlandı
- [ ] CAMERA izni gerekçe formu dolduruldu (bkz. §5)
