# Play Store (Play Console) Hesabı Açma — Sayfa ve Adımlar

> Kaynak: Google'ın resmî yardım sayfaları (Eylül 2026 itibarıyla güncel).
> Hedef: **Kurumsal (Organization) hesap** — POS/Kasa ürünü için profesyonel seçim, kapalı test zorunluluğu yok.

---

## 1. Hesap açma sayfası (linkler)

| Amaç | Bağlantı |
|---|---|
| **Hesap açma (ana)** | https://play.google.com/apps/publish/signup |
| Alternatif giriş | https://play.google.com/console/signup |
| Console ana sayfası | https://play.google.com/console |

> Sayfa önce **Google hesabınızla giriş** yapmanızı ister (Google oturum açma ekranı açılır).
> İsterseniz "Create account → For work or my business" ile şirkete özel yeni bir Google hesabı da açabilirsiniz.

---

## 2. Adım adım (Google'ın resmî sırası)

### Adım 1 — Google hesabıyla giriş
- **18 yaş ve üzeri** olmalısınız.
- İki aşamalı doğrulama (2FA) açık bir Google hesabı kullanın.

### Adım 2 — Geliştirici Dağıtım Sözleşmesi'ni kabul edin
- "Google Play Developer Distribution Agreement" okunup onaylanır.

### Adım 3 — Kayıt ücretini ödeyin
- **25 USD, tek seferlik** (yıllık aidat yok).
- Kabul edilen kartlar: MasterCard, Visa, American Express, Discover (yalnız ABD), Visa Electron (ABD dışı).
- **Ön ödemeli (prepaid) kart kabul edilmez.** Türkiye'den USD ile çekim yapabilen kart gerekir.

### Adım 4 — Hesap türünü seçin
- **Organization (Kurumsal)** seçin. → D-U-N-S numarası **zorunlu**.

### Adım 5 — Kimlik/şirket doğrulaması
- Kurumsal hesap için istenen bilgiler (aşağıda tam liste).

### Adım 6 — (Yalnızca Kişisel hesaplar) Kapalı test
- Kurumsal hesap seçtiğiniz için **bu adım sizi ilgilendirmez** (12 testçi/14 gün zorunluluğu yalnızca kişisel hesaplar içindir).

---

## 3. Kurumsal hesap için gereken bilgiler (hazırlık listesi)

Google'ın "Required information" sayfasına göre **kurumsal hesapta** şunlar istenir:

| Bilgi | Açıklama |
|---|---|
| Geliştirici adı | Play'de görünen ad (ör. "MOSBARKODYAZILIM") — sonradan değiştirilebilir |
| **D-U-N-S numarası** | 9 haneli işletme kimliği (Dun & Bradstreet) — **olmadan kurumsal hesap açılamaz** |
| Kuruluş adı | Ödeme profiline bağlı yasal şirket adı |
| Kuruluş adresi | Yasal adres |
| Kuruluş telefonu | Şirket telefonu |
| Kuruluş web sitesi | Şirket sitesi (yoksa web varlığı) |
| İletişim kişisi | Yetkili temsilci adı |
| İletişim e-postası | Google'ın size ulaşacağı adres (OTP ile doğrulanır) |
| İletişim telefonu | OTP ile doğrulanır |
| Geliştirici e-postası | **Play'de herkese görünür** (ör. destek adresi) |
| Geliştirici telefonu | **Play'de herkese görünür** |

> Not: Kurumsal hesapta yasal şirket adı ve adres, **Google Ödeme Profili'nden** alınır ve doğrulanır. Şirket belgesindeki ad ile Play Console'a yazılan ad **birebir aynı** olmalı (en sık ret sebebi budur).

---

## 4. D-U-N-S numarası (kurumsal hesabın ön şartı)

D-U-N-S, Dun & Bradstreet tarafından işletmelere verilen **9 haneli** ücretsiz kimliktir.

1. **Önce var mı diye kontrol edin** (birçok firma ticaret yaparken almıştır):
   - https://www.dnb.com/duns-number/lookup.html
2. **Yoksa ücretsiz başvurun:**
   - https://www.dnb.com/duns/get-a-duns.html
3. **Süre:** Genel başvuru **30 güne kadar** sürebilir; Play Console amaçlı başvurular Google ortaklığı nedeniyle genelde daha hızlıdır (1–5 iş günü). **Planınızı buna göre yapın.**

> D-U-N-S alamıyorsanız (D&B'nin desteklemediği bölge gibi) Google destekle iletişime geçip alternatif doğrulama istenebilir — ancak bu istisnadır, uzatma verilmez. Türkiye'de D-U-N-S alınabildiği için normal yol budur.

---

## 5. Google Ödeme Profili (monetizasyon için)

- Hesap açılırken **Google Ödeme Profili** bağlanır; yasal ad/adres buradan gelir ve güncel tutulmalıdır.
- Play'de para kazanacaksanız (PRO abonelik) ayrıca **merchant hesabı** açılır ve ödeme yönteminiz doğrulanır (komisyonlar bu profile işlenir).

---

## 6. Adım özeti (kontrol listesi)

- [ ] Google hesabı (2FA açık, 18+)
- [ ] D-U-N-S numarası (var mı? → yoksa başvur)
- [ ] Şirket yasal adı + adres belgeleri
- [ ] USD çekim yapabilen kredi/banka kartı (25 USD)
- [ ] Geliştirici adı kararı ("MOSBARKODYAZILIM")
- [ ] Geliştirici e-postası (Play'de görünecek — örn. m.ortayayla@gmail.com)
- [ ] Şirket web sitesi (gizlilik politikası adresi)
- [ ] Hesap açma → https://play.google.com/apps/publish/signup

---

## 8. D-U-N-S 30 gün sürüyorsa — alternatif yollar

D-U-N-S beklemek istemiyorsanız 4 pratik yol var (en hızlıdan en yavaşa):

### Yol A — Kişisel hesap aç, hemen başla (D-U-N-S GEREKMEZ) ⭐ önerilen
- Kişisel (Personal) hesap için **D-U-N-S istenmez**; resmî kimlik doğrulaması yeterli (2–5 gün).
- Karşılığında: **12 testçi / 14 gün** kapalı test zorunluluğu var (bu, 1 aylık D-U-N-S beklemekten çok daha kısa ve sizin kontrolünüzde).
- Mağazada **kişisel yasal adınız** görünür.
- **Önemli:** Google artık kişisel hesabı **sonradan kurumsala dönüştürmeyi resmî olarak destekliyor** (Play Console → Developer account → About you → *Change account type*). Bunun için D-U-N-S + doğrulanmış kurumsal web sitesi + kurumsal ödeme profili gerekir. Yani: **şimdi kişisel aç → uygulama yayında → D-U-N-S gelince yerinde kurumsala yükselt.** (Tek yönlü: kurumsaldan kişisele dönüş yok.)

### Yol B — Hızlandırılmış (ücretli) D-U-N-S
- Dun & Bradstreet, ücretli **ekspres işlem** sunuyor: **1–5 iş günü**, yaklaşık **229 USD** (ülkeye göre değişir).
- Kurumsal hesabı 1. günden istiyorsanız ve bütçe varsa, 1 aylık beklemeyi tamamen ortadan kaldırır.

### Yol C — D-U-N-S zaten var olabilir (önce kontrol edin)
- Türkiye'de birçok firma banka, ihracat veya kamu ihaleleri nedeniyle **zaten D-U-N-S almıştır**.
- Sorgulama: https://www.dnb.com/duns-number/lookup.html — varsa hiç bekleme yok.

### Yol D — D-U-N-S'siz kurumsal (Türkiye için UYGUN DEĞİL)
- D-U-N-S'siz kurumsal doğrulama yalnızca **kamu kurumlarına** veya D&B'nin **desteklemediği bölgelere** tanınan istisnadır. Türkiye D&B kapsamında olduğu için bu yol kapalıdır.

### Süre karşılaştırması (2026 gerçekçi)

| Yol | Yayına çıkış süresi |
|---|---|
| Kurumsal + D-U-N-S zaten var | 1–2 hafta |
| Kişisel + testçi (elle toplama) | 3–6 hafta |
| Kişisel + test servisi | ~16 gün |
| Kurumsal + ücretli ekspres D-U-N-S | ~1–2 hafta |
| Kurumsal + ücretsiz yeni D-U-N-S | 2–6 hafta |

> **Öneri:** Şirket kaydınız hazırsa ve hızlı çıkış istiyorsanız **Yol A** en pratik: kişisel hesap açın, 12 testçiyi (çalışanlar, diğer esnaf) kolayca bulursunuz, uygulama yayına çıkar; paralelde ücretsiz D-U-N-S başvurusu yapın, numara gelince kurumsala yükseltirsiniz. POS uygulaması için 14 günlük gerçek beta testi zaten faydalıdır.

---

## 10. ✅ Kişisel hesap AÇILDI — sıradaki adımlar (kontrol listesi)

> Durum: Kişisel (Personal) Play Console hesabı açıldı. Kişisel hesapta D-U-N-S gerekmez;
> bunun yerine **12 testçi / 14 gün** kapalı test zorunludur. Adımlar:

1. **Kimlik doğrulaması** — Play Console → *Developer account → Account details*. Resmî kimlik + adres belgesi. (2–5 gün)
2. **Cihaz doğrulaması** — yeni kişisel hesaplarda Play Console mobil uygulamasıyla bir Android cihazın doğrulanması istenebilir.
3. **Keystore + GitHub Secret** — imzalı AAB için **zorunlu** (bkz. `PLAYSTORE_YAYIN_PLANI.md` §6b). Bu adım sizde; secret eklenince AAB otomatik üretilir.
4. **AAB üret** — secret eklendikten sonra `v*` tag push'u imzalı AAB'yi otomatik üretir (CI hazır).
5. **Uygulama oluştur** — Play Console → *Create app*; paket adı: `com.mosbarkodyazilim.pos`.
6. **Kapalı test (Closed testing) kur:**
   - *Testing → Closed testing → Create track*
   - AAB yükle → test sürümü olarak yayınla
   - Testçileri e-posta listesiyle ekle (Google hesabı olmalı)
   - **12 testçi × 14 ardışık gün** opt-in + kurulum
7. **Üretim erişimi başvurusu** — 14 gün dolunca *Apply for production access* (3 bölümlü form; inceleme ~7 gün).
8. **Paralel (isteğe bağlı):** D-U-N-S başvurusu → numara gelince *About you → Change account type* ile kurumsala yükselt.
9. **`mos_pro_aylik` abonelik ürünü** — *Monetize → Products → Subscriptions* (299 TL/ay; kod bu kimliği kullanıyor).

### Testçi bulma ipuçları (12 kişi kolay)
- Çalışanlar, aile, komşu esnaf, arkadaşlar.
- Testçiler opt-in linkine tıklayıp uygulamayı **gerçek cihaza kurmalı** ve 14 gün içinde birkaç kez açıp kullanmalı (sadece kurup bırakanlar sayılmaz).
- Sayı 12'nin altına düşerse süreç sıfırlanabilir → güvenlik için **15–20 testçi** ekleyin.
- Testçilerden geri bildirim almak, üretim başvurusu formundaki "testçiler nasıl kullandı, ne geri bildirdi" sorularına cevap yazmanızı kolaylaştırır.

---

## 11. Kişisel hesapla satış (299 TL/ay) onaylanır mı?

**Kısa cevap: Evet, onaylanır.** Fiyat, hesap türünden bağımsız onaylanır.

- Google'ın resmî dokümanı: *"Personal and organization accounts have access to the same functionality and are able to monetize on Google Play using a payments profile."* → Kişisel hesapla abonelik satmak tam desteklenir.
- Red/onay kriteri **fiyat veya hesap türü değil**; uygulamanın politika uyumu (Play Billing kullanımı, veri güvenliği formu, gizlilik politikası).
- Kişisel hesabın asıl şartı: **12 testçi / 14 gün** kapalı test (üretime çıkış kapısı).
- POS/barkod programı "finansal hizmet" sayılmaz (banka/kredi/borsa/kripto değil; ödeme uygulama içinde işlenmez) → bu gerekçeyle kurumsal hesap zorunluluğu doğmaz.

### Dikkat edilmesi gereken tek gerçek fark
Para kazanınca Google, Play'de **tam yasal ad + TAM EV ADRESİNİ** herkese açık gösterir (AB/TR tüketici koruma gereği). Kurumsal hesapta bunun yerine şirket adı/adresi görünür.

### Ödeme almak için
- Ödeme (merchant) profili + **banka hesabı** doğrulaması gerekir (kişisel hesapta yapılabilir).
- Gelir bireysel olarak vergilendirilir (muhasebe konusu, Play engeli değil).

> Sonuç: 299 TL/ay satış kişisel hesapla onaylanır. Ev adresinin görünmesini istemiyorsanız D-U-N-S gelince kurumsala geçiş en temiz çözüm — ama bu satış onayı için değil, gizlilik ve profesyonel görünüm içindir.

---

## 9. Kaynaklar (resmî)
- Get started with Play Console: https://support.google.com/googleplay/android-developer/answer/6112435
- Hesap türü seçimi: https://support.google.com/googleplay/android-developer/answer/13634885
- Gerekli bilgiler: https://support.google.com/googleplay/android-developer/answer/13628312
- D-U-N-S sorgulama/başvuru: https://www.dnb.com/duns-number/lookup.html · https://www.dnb.com/duns/get-a-duns.html
