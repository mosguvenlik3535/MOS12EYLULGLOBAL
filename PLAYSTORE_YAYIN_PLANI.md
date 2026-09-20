# MOSBARKOD — Play Store Yayın Planı ve İlk Yayın Pazar Araştırması

> Hazırlanma: 12 Eylül 2026 · Uygulama sürümü: v1.6.0 · Kapsam: Android (Capacitor) sürümünün Google Play'e taşınması + satın alma pazarı analizi.

---

## 1. Mevcut durum (teknik denetim)

| Kalem | Durum | Play için gerekli mi? |
|---|---|---|
| Platform | Capacitor 7 (WebView) · `appId: com.mosbarkodyazilim.pos` | ✅ hazır |
| Derleme çıktısı | `assembleDebug` → **debug APK** | ❌ Play **AAB + imzalı release** ister |
| `targetSdkVersion` | **35** (Android 15) | ❌ **36 (Android 16) zorunlu** — 31 Ağu 2026'dan beri |
| İmzalama | Keystore / Play App Signing yok | ❌ zorunlu |
| Uygulama ikonu | Capacitor varsayılan ikonu | ❌ marka ikonu gerekir (512×512) |
| Lisans modeli | Çevrimdışı anahtar (MOS-XXXX) + demo (30 satış limiti) | ⚠️ Play politikasıyla çakışıyor (bkz. Bölüm 3) |
| İzinler | Yalnızca `INTERNET` | ✅ temiz (kamera tarayıcı için daha sonra `CAMERA` gerekebilir) |
| `versionCode` / `versionName` | 1 / "1.0" (manuel) | ⚠️ her yayında artırılmalı |

**Kritik bulgu:** Uygulama şu an `targetSdk 35` ile derleniyor. Google Play, **31 Ağustos 2026'dan itibaren** yeni uygulamalar ve güncellemeler için **Android 16 (API 36)** hedeflemeyi zorunlu kıldı. Bu olmadan yayın ekranından geçilemez — ilk teknik iş bu yükseltmedir ([kaynak](https://ecorpit.com/android-target-api-36-play-store-deadline-migration-2026/)).

---

## 2. Play Store yayın gereksinimleri (2026 güncel)

### 2.1 Kayıt ücreti
- **25 USD, tek seferlik** — yıllık aidat yok, sınırsız uygulama. Apple'ın 99 USD/yıl ücretine kıyasla avantaj ([kaynak](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/)).

### 2.2 Hesap türü kararı (en önemli seçim)

| | **Kişisel (Personal)** | **Kurumsal (Organization)** |
|---|---|---|
| Doğrulama | Resmi kimlik + adres + telefon | **D-U-N-S numarası** + şirket belgeleri |
| D-U-N-S | gerekmez | gerekir (ücretsiz, Google ortaklığıyla ~1–5 iş günü) |
| Kapalı test | **12 testçi / 14 gün zorunlu** | **zorunlu DEĞİL** |
| Yayında görünen ad | Kişisel yasal adın | Şirket adı |
| Kurulum süresi | ~1 saat + doğrulama 2–5 gün | D-U-N-S + belge doğrulama (haftalar sürebilir) |

- **12 testçi / 14 gün kuralı:** 13 Kasım 2023'ten sonra açılan **kişisel** hesaplarda, üretime çıkmadan önce en az 12 testçinin **14 ardışık gün** kapalı test izinde "kayıtlı" kalması gerekir. 20'den 12'ye Aralık 2024'te indirildi ([kaynak](https://primetestlab.com/blog/google-play-changed-20-to-12-testers)). Kurumsal hesaplar bu şarttan muaftır.
- **Kimlik doğrulama:** Eylül 2026'dan itibaren **tüm yeni kişisel hesaplar** için zorunlu kimlik doğrulaması başladı ([kaynak](https://testerbee.com/blog/google-play-developer-verification-2026)).

> **Öneri:** İşletmeye yönelik bir POS/kasa ürünü olduğu için **kurumsal hesap** açılması önerilir (profesyonel görünüm + kapalı test zorunluluğu yok). Tek şart: kayıtlı şirket + D-U-N-S. Şirket yoksa kişisel hesap açılıp 12 testçi/14 gün süreci işletilebilir.

### 2.3 Teknik zorunluluklar
1. **`compileSdkVersion` ve `targetSdkVersion` → 36** (Android 16).
2. **Android App Bundle (AAB)** formatı (`.aab`) — APK değil.
3. **İmzalama:** Google Play App Signing önerilir — upload key'i sizde, uygulama anahtarı Google'da. Keystore kaybolursa uygulama güncellenemez → **keystore güvenli yedeklenmeli** (GitHub Secrets).
4. **`versionCode`** her sürümde artırılmalı (ör. 2, 3, …).
5. **İkon:** 512×512 PNG, adaptif ikon, marka logosu.
6. **`usesCleartextTraffic`/mixed content** ayarları gözden geçirilmeli (şu an `allowMixedContent: true`; Play, HTTPS zorunlu tutar — yerel LAN sync için istisna gerekebilir).

### 2.4 Store listing (mağaza sayfası)
- Uygulama adı, kısa açıklama (80 karakter), tam açıklama (4000 karakter).
- **Ekran görüntüleri:** telefon ≥ 2, tablet opsiyonel; 7"/10" tablet önerilir (POS için tablet ekranı önemli).
- **Özellik grafiği** (feature graphic, 1024×500).
- **Uygulama videosu** (opsiyonel ama dönüşümü artırır).
- **İçerik derecelendirme anketi** (IARC — birkaç dakika).
- **Veri güvenliği (Data Safety) formu:** toplanan veriler (ürünler, satışlar → lokal; yedek → bulut) beyan edilmeli.
- **Gizlilik politikası URL'si zorunlu** (uygulama veri topluyorsa; Google Drive/Dropbox yedekleme ve EmailJS entegrasyonu nedeniyle bir gizlilik politikası sayfası gerekir).
- **Destek e-postası:** `m.ortayayla@gmail.com` zaten mevcut.

---

## 3. Ödeme ve monetizasyon politikası (kritik)

Google Play'de dağıtılan bir uygulama, **dijital içerik/özellik kilidini açmak için** Google Play'in faturalandırma sistemini (**Play Billing**) kullanmak zorundadır. Uygulama dışından (örn. web sitesinden) satılan bir lisans anahtarının Play sürümündeki özellikleri açması, çoğu bölgede **politika ihlali** sayılır ve uygulamanın reddine/kaldırılmasına yol açar ([kaynak](https://shopapper.com/fix-google-play-in-app-billing-requirement-rejection/)).

**Bu, mevcut çevrimdışı lisans anahtarı (MOS-XXXX) modeliyle doğrudan çakışır.** Mevcut model masaüstü (EXE/AppImage) için gayet uygundur; ancak Play sürümünde aynen kullanılamaz.

**Play komisyonu (2026):**
- İlk 1 milyon USD yıllık gelirde **%10 hizmet bedeli + %5 faturalandırma ≈ %15** (ABD/İngiltere/EEA'de 30 Haziran 2026'dan beri); Türkiye'de eski yapıya göre **ilk 1M USD'de %15, üzerinde %30** referans alınabilir ([kaynak](https://ecorpit.com/google-play-service-fee-split-2026-app-economics/)).
- ABD'de Epic kararı sonrası harici ödeme/bağlantıya izin var, ama **Türkiye dahil ABD dışı bölgelerde geçerli değil** ([kaynak](https://technologylaw.fkks.com/post/102lroc/google-allows-external-payments-following-upheld-injunction)).

---

## 4. Pazar araştırması (satın alma pazarı)

### 4.1 Türkiye — muhasebe/ön muhasebe SaaS (aylık, KDV hariç)

| Ürün | Başlangıç | Üst paket | Model |
|---|---|---|---|
| Paraşüt | 150 TL/ay (yalnız e-fatura) | 940 TL/ay (ön muhasebe + e-fatura) | Bulut SaaS |
| Mikro e-Portal | 150 TL/ay | — | Bulut SaaS |
| Logo İşbaşı | 463 TL/ay | 738 TL/ay (e-Dönüşüm + ön muhasebe) | Bulut SaaS |
| BizimHesap | 870 TL/ay | 1.100 TL/ay | Bulut SaaS |
| KolayBi | ~1.000 TL/ay | 12.000 TL/yıl | Bulut SaaS |

### 4.2 Türkiye — masaüstü lisans (tek seferlik / yıllık yenileme)

| Ürün | Fiyat | Not |
|---|---|---|
| WOLVOX Hızlı Satış Paket 1 | 19.450 TL (liste 29.850 TL) | Perakende POS |
| WOLVOX Hızlı Satış Paket 2 | 31.300 TL | + terazi, banka, döviz |
| Logo GO 3 (1 kullanıcı) | 32.400 TL | Ticari |
| Luca Net KOBİ | 25.200 TL (5 hesap) | Muhasebeci ekosistemi |
| Mikro Jump | 52.650 TL + 21.950 TL/yıl | ERP |

> Kaynak: [eticaretradari.com](https://eticaretradari.com/muhasebe-programi-fiyatlari/), [ozmconsultancy.com](https://ozmconsultancy.com/turkiyede-on-muhasebe-programlari-parasut-logo-isbasi-bizimhesap-kolaybi-luca-ve-mikro-jump-kapsamli-karsilastirmasi/), [akinsoft.com.tr](https://www.akinsoft.com.tr/programlar/detay/wolvox-hizli-satis-programi--wwh9), [karekod.org](https://www.karekod.org/blog/logo-yazilim-fiyatlari-go3-tiger3-bordro-e-fatura-fiyati/)

### 4.3 Play Store — doğrudan rakipler (global)

| Uygulama | İndirme | Puan | Model |
|---|---|---|---|
| Zobaze POS | 1M+ | 4.7★ | Ücretsiz çekirdek + opsiyonel premium abonelik |
| Retail Plus POS | — | — | "Abonelik yok", tamamen ücretsiz |
| Loyverse POS | geniş | yüksek | Ücretsiz çekirdek + eklenti ($5–25/ay) |
| Square | geniş | yüksek | Ücretsiz plan + $49–149/ay konuma göre |

> Kaynak: [fitsmallbusiness.com](https://fitsmallbusiness.com/best-pos-apps/), [Google Play — Zobaze](https://play.google.com/store/apps/details?id=com.zobaze.pos)

### 4.4 Pazar okuması
- Pazar **iki kutuplu**: (a) Türkiye'de güçlü yerel SaaS/desktop oyuncular (150–1.100 TL/ay SaaS, 20–50 bin TL tek seferlik lisans), (b) Play'de **freemium** POS uygulamaları (ücretsiz çekirdek + küçük eklenti/abonelik).
- MOSBARKOD'un **farklılaştırıcıları**: yapay zekâ görüntü tanıma, 14 dil, çevrimdışı çalışma, WebRTC masaüstü+telefon senkronizasyonu, Mikro/Logo/Paraşüt/Nebim/Zirve/SAP şablonlarıyla **stok içe aktarma**, ESC/POS fiş yazdırma, tartım ürünleri. Bu özellikler Play'deki ücretsiz global rakiplerin çoğunda yok.
- **Rekabet avantajı stratejisi:** "yerel dil + yerel muhasebe programı entegrasyonu + yapay zekâ" — global freemium rakiplerin Türk esnafa sunamadığı şey.

---

## 5. İlk yayın için fiyatlandırma önerisi

Hedef kitle: bakkal, market, manav, butik, kafe gibi **tek kasalı küçük esnaf** (Türkiye öncelikli).

**Önerilen model (Play sürümü): Freemium + Play Billing**

| Katman | İçerik | Fiyat (ilk yayın) |
|---|---|---|
| **Ücretsiz (Başlangıç)** | Sınırlı: ör. 100 ürün / 250 satış kaydı, tam POS özellikleri | 0 TL |
| **PRO (aylık abonelik)** | Sınırsız ürün/satış, AI tanıma, bulut yedek, tüm raporlar | **149–249 TL/ay** |
| **PRO (yıllık)** | Yıllık, ~%25 indirimli | **1.499–2.499 TL/yıl** |
| **PRO (tek seferlik — opsiyonel)** | Ömür boyu lisans | **2.999–4.999 TL** |

Gerekçe:
- Türk SaaS tabanı 150–1.100 TL/ay; masaüstü lisanslar 19–52 bin TL. 149–249 TL/ay "uygun ama ciddi" bir nokta, ücretsiz küresel rakiplerin (Zobaze, Loyverse) 5–25 USD eklenti fiyatlarıyla da uyumlu.
- **Tek seferlik masaüstü lisansı (EXE/AppImage) mevcut modelde aynen kalabilir** — Play ile çakışmaz; masaüstü Play ekosistemi dışında.
- Play sürümündeki **mevcut offline lisans anahtarı ekranı kaldırılmalı veya yalnızca Play Billing sonrası etkinleştirmeye dönüştürülmeli.**

> Not: Türkiye'de yeni nesil ödeme kaydedici cihaz (YN ÖKC) zorunluluğu POS donanımı pazarını etkiliyor ama **yazılım tarafını** (stok, satış takibi, rapor) etkilemiyor; bu uygulama ÖKC yerine geçmez, ÖKC'nin yanındaki işletme yazılımıdır — pazarlamada bu ayrım netleştirilmeli.

---

## 6. Yol haritası (önerilen sıra)

**Faz A — Teknik hazırlık (bu depoda, ~1 gün)**
1. `targetSdkVersion`/`compileSdkVersion` → **36** (`android/variables.gradle`).
2. Release imzalama + AAB üretimi: keystore üret, GitHub Secrets'a koy, workflow'a `bundleRelease` adımı ekle.
3. `versionCode`/`versionName` otomasyonu (sürümden türet).
4. Marka ikonu (512×512 + adaptif) ve splash.
5. Play Billing entegrasyonu (Capacitor için `cordova-plugin-purchase` veya benzeri) — karar verilen modele göre.

**Faz B — Hesap ve liste (kullanıcı tarafında, 1–3 hafta)**
6. Play Console hesabı aç (kişisel/kurumsal kararına göre; D-U-N-S gerekebilir).
7. Gizlilik politikası sayfası yayınla (kendi sitende).
8. Kapalı test (kişisel hesapta 12 testçi/14 gün) veya doğrudan üretim (kurumsal).
9. Store listing: ekran görüntüleri, özellik grafiği, açıklama (TR + EN), içerik derecelendirme, veri güvenliği formu.

**Faz C — İlk yayın + sonrası**
10. AAB yükle, incelemeye gönder (ilk inceleme 1–7 gün).
11. Yayın sonrası: ASO (anahtar kelime, puan), kullanıcı geri bildirimi, yavaş yayın (staged rollout) ile başla.

---

---

## 6b. Ek — Release imzalama (keystore) kurulumu (yapılacak)

Play Store'a AAB yüklemek için bir **upload key (keystore)** gerekir. CI, anahtarı GitHub Secrets'tan okur.

1. **Yerelde keystore üret** (JDK `keytool` ile):
   ```bash
   keytool -genkeypair -v \
     -keystore mos-release.jks \
     -alias mosbarkod \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -storepass 'GÜÇLÜ-PAROLA' \
     -dname "CN=MOSBARKODYAZILIM, O=MOSBARKODYAZILIM, L=Izmir, ST=Izmir, C=TR"
   ```
2. **Base64'e çevir:**
   ```bash
   base64 -w0 mos-release.jks > mos-release.jks.b64   # içerik tek satır olur
   ```
3. **GitHub Secrets'a ekle** (repo → Settings → Secrets and variables → Actions → New repository secret):
   | Secret adı | Değer |
   |---|---|
   | `MOS_KEYSTORE_BASE64` | `mos-release.jks.b64` içeriği (tek satır) |
   | `MOS_KEYSTORE_PASSWORD` | keystore parolası |
   | `MOS_KEY_ALIAS` | `mosbarkod` |
   | `MOS_KEY_PASSWORD` | anahtar parolası (storepass ile aynıysa aynı değer) |

4. **Keystore dosyasını güvenli bir yerde sakla.** Kaybolursa uygulama güncellenemez; Play App Signing kullanılıyorsa anahtar sıfırlama için Google'a başvurmak gerekir. Dosya **asla** git'e commit edilmemeli (`.gitignore`'a eklendi).

---

## 7. Kaynaklar
- Play Console kayıt ücreti ve hesap türleri: [afkarsoftware.com](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/)
- 12 testçi/14 gün kuralı: [primetestlab.com](https://primetestlab.com/blog/google-play-changed-20-to-12-testers)
- Kimlik doğrulama 2026: [testerbee.com](https://testerbee.com/blog/google-play-developer-verification-2026)
- Target API 36 zorunluluğu: [ecorpit.com](https://ecorpit.com/android-target-api-36-play-store-deadline-migration-2026/)
- Play Billing zorunluluğu: [shopapper.com](https://shopapper.com/fix-google-play-in-app-billing-requirement-rejection/)
- Play komisyonları 2026: [ecorpit.com](https://ecorpit.com/google-play-service-fee-split-2026-app-economics/)
- Türkiye SaaS fiyatları: [eticaretradari.com](https://eticaretradari.com/muhasebe-programi-fiyatlari/)
- Masaüstü lisans fiyatları: [akinsoft.com.tr](https://www.akinsoft.com.tr/programlar/detay/wolvox-hizli-satis-programi--wwh9), [karekod.org](https://www.karekod.org/blog/logo-yazilim-fiyatlari-go3-tiger3-bordro-e-fatura-fiyati/)
- Global POS uygulamaları: [fitsmallbusiness.com](https://fitsmallbusiness.com/best-pos-apps/)
