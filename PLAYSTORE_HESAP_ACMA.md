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

## 9. Kaynaklar (resmî)
- Get started with Play Console: https://support.google.com/googleplay/android-developer/answer/6112435
- Hesap türü seçimi: https://support.google.com/googleplay/android-developer/answer/13634885
- Gerekli bilgiler: https://support.google.com/googleplay/android-developer/answer/13628312
- D-U-N-S sorgulama/başvuru: https://www.dnb.com/duns-number/lookup.html · https://www.dnb.com/duns/get-a-duns.html
