# MOSBARKODYAZILIM — Gizlilik Politikası / Privacy Policy

> Son güncelleme: 12 Eylül 2026 · Uygulama: MOSBARKODYAZILIM (MOSBARKOD POS) · Geliştirici: MOSBARKODYAZILIM

---

## 1. Özet (Türkçe)

MOSBARKODYAZILIM, **yerel öncelikli (local-first)** bir barkod satış / POS / kasa programıdır. Ürün, satış, müşteri, personel ve ayar verileriniz **yalnızca sizin cihazınızda** saklanır. Geliştirici olarak biz, işletme verilerinizi kendi sunucularımızda **toplamayız, saklamayız ve işlemeyiz**. Uygulamada hesap açma yoktur; reklam yoktur; izleme/analitik SDK'sı yoktur.

### Hangi veriler nerede tutulur?

| Veri | Konum | Ne zaman |
|---|---|---|
| Ürünler, stok, fiyatlar | Cihazda (yerel depolama) | Her zaman yerel |
| Satışlar, raporlar | Cihazda | Her zaman yerel |
| Müşteriler, personel, ayarlar | Cihazda | Her zaman yerel |
| Yapay zekâ görüntü modelleri | Cihazda | Yalnızca siz eğitirseniz |
| Yedekler | **Sizin** Google Drive / Dropbox hesabınız | Yalnızca siz başlatırsanız |

### Üçüncü taraf hizmetler (yalnızca siz kullanırsanız)

1. **Bulut yedekleme (Google Drive / Dropbox):** Yedekleme yapmak isterseniz, verileriniz resmî OAuth ile **kendi** Drive/Dropbox hesabınıza yüklenir. Bu dosyalara geliştirici erişemez.
2. **E-posta (EmailJS, Resend, SMTP, SendGrid, Mailgun, Mailjet, Brevo, SMTP2GO):** Raporu e-postayla göndermek isterseniz, kendi yapılandırdığınız e-posta sağlayıcısı üzerinden gönderilir.
3. **Ürün bilgisi sorgulama (Open Food Facts):** Bir barkodu/ürün adını otomatik tanıtmak isterseniz, yalnızca sorgu metni (barkod/ad) `world.openfoodfacts.org` açık veritabanına gönderilir.
4. **Cihaz eşzamanlama (PeerJS/WebRTC):** Masaüstü ile telefonlarınızı eşleştirmek isterseniz, bağlantı kurulumu için PeerJS sinyal sunucusu (`0.peerjs.com`) kullanılır; satış verileri cihazlar arasında **doğrudan (P2P)** aktarılır.
5. **Google Play Billing:** PRO aboneliği satın alırsanız, ödeme **Google** tarafından işlenir; kart bilgileriniz geliştiriciye **iletilmez**.

### Toplamadıklarımız
- Konum, kişi listesi, rehber, SMS, telefon kayıtları
- Reklam kimlikleri, tarama geçmişi
- Ödeme/kart bilgileri (ödeme tamamen Google tarafından işlenir)

### Kamera
Barkod okuma ve yapay zekâ görsel tanıma için kamera **yalnızca siz taratırken** kullanılır; görüntüler cihaz dışına gönderilmez (yalnızca Open Food Facts sorgusunda barkod/ad metni gider).

### Veri güvenliği
Veriler cihazınızda saklanır; cihazınızın güvenliği sizin kontrolünüzdedir. Uygulama, İnternet iznini yalnızca yukarıdaki isteğe bağlı özellikler için kullanır.

### İletişim
Sorularınız için: **m.ortayayla@gmail.com** · **+90 555 406 61 43**

---

## 2. Summary (English)

MOSBARKODYAZILIM is a **local-first** barcode sales / POS / cash-register program. Your products, sales, customers, staff and settings are stored **only on your device**. We, as the developer, do **not** collect, store or process your business data on any of our servers. There is no account sign-up, no advertising, and no analytics/tracking SDK.

### Where data lives

| Data | Location | When |
|---|---|---|
| Products, stock, prices | On-device (local storage) | Always local |
| Sales, reports | On-device | Always local |
| Customers, staff, settings | On-device | Always local |
| AI vision models | On-device | Only if you train them |
| Backups | **Your own** Google Drive / Dropbox | Only if you initiate |

### Third-party services (only if you use them)

1. **Cloud backup (Google Drive / Dropbox):** backups upload via official OAuth to **your own** account; the developer cannot access them.
2. **Email (EmailJS, Resend, SMTP, SendGrid, Mailgun, Mailjet, Brevo, SMTP2GO):** report emails are sent through a provider **you** configure.
3. **Product lookup (Open Food Facts):** only the query text (barcode/name) is sent to `world.openfoodfacts.org`.
4. **Device sync (PeerJS/WebRTC):** pairing uses the PeerJS signaling server (`0.peerjs.com`); sales data transfers **peer-to-peer** between your own devices.
5. **Google Play Billing:** PRO payments are processed by **Google**; card details are never sent to the developer.

### What we do NOT collect
Location, contacts, SMS/call logs, advertising IDs, browsing history, or payment/card details.

### Camera
Used only while you actively scan, for barcode reading and AI visual recognition; images never leave the device (only the barcode/name text goes to Open Food Facts when you look up a product).

### Contact
**m.ortayayla@gmail.com** · **+90 555 406 61 43**
