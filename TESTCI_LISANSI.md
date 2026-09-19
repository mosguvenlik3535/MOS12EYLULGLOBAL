# Testçi Lisansı — Tek Cihaza Bağlı Ücretsiz PRO

14 günlük kapalı testi tamamlayan testçilere uygulamayı **ücretsiz PRO** olarak
vermek için kullanılan sistem. Sunucu yoktur, internet gerekmez.

## Nasıl çalışır?

```
Testçinin telefonu                 Siz (geliştirici)               Testçinin telefonu
──────────────────                 ─────────────────               ──────────────────
Cihaz Kimliği üretir  ──KOD──▶     cihaz kodunu imzalar   ──KOD──▶  kodu girer
MOS-3F2A-9C11-7B04    (WhatsApp)   (gizli anahtarla)      (WhatsApp) PRO açılır ✅
```

- Üretilen kod **yalnızca o telefonda** çalışır. Başka telefona kurulursa
  uygulama açılır ama **PRO kapanır** (ücretsiz katman) ve üstte kırmızı bir
  uyarı şeridi çıkar.
- Süre: **1 yıl** (isterseniz `--months` ile değiştirilir).
- Telefon değiştirirlerse yeni cihaz kodunu gönderirler, siz yeni kod verirsiniz.

## 1) Testçiden cihaz kodunu alın

Testçi uygulamada:

**Ayarlar → (Lisans kartı) → Cihaz Kimliği → KOPYALA**

Ekranda `MOS-3F2A-9C11-7B04` gibi bir kod görür. Bunu size WhatsApp'tan atar.

## 2) Kodu siz üretin

```bash
cd mosbarkod
node tools/tester-license.mjs --device MOS-3F2A-9C11-7B04 --name "Ahmet Yılmaz"
```

Çıktı:

```
MTEST1.3F2A9C117B04.260919.270919.tI88m4Q7aXlBZJJc...
```

Bu kodu WhatsApp'tan testçiye gönderin.

**Birden fazla testçi için (hepsi bir kerede):**

```bash
node tools/tester-license.mjs \
  --device MOS-3F2A-9C11-7B04 --name "Ahmet" \
  --device MOS-77AA-11BB-22CC --name "Mehmet"
```

Ya da bir liste dosyasıyla (`cihazlar.txt`, her satır: `CihazKodu, Ad`):

```bash
node tools/tester-license.mjs --liste cihazlar.txt
```

### Seçenekler

| Seçenek | Anlamı | Varsayılan |
|---|---|---|
| `--device` / `-d` | Cihaz kodu (tekrarlanabilir) | — (zorunlu) |
| `--name` / `-n` | Testçinin adı (yalnızca kayıt) | boş |
| `--months` / `-m` | Kaç ay geçerli | 12 |
| `--exp` | Bitiş tarihi (`GG.AA.YYYY`) | — |
| `--key` | Gizli anahtar dosyası | `tools/tester-private.key` |
| `--liste` | "CihazKodu, Ad" listesi | — |

Üretilen kodlar `mosbarkod/tools/tester-kayitlari.csv` dosyasına da yazılır
(kim, hangi cihaz, hangi tarihe kadar).

## 3) Testçi kodu girer

**Ayarlar → (Lisans kartı) → Etkinleştirme Kodu → yapıştır → ETKİNLEŞTİR**

Ekranda `✓ TESTÇİ LİSANSI · 19.09.2027` yazar ve PRO özellikler açılır.

## ⚠️ Gizli anahtar — EN ÖNEMLİ KISIM

- Dosya: `mosbarkod/tools/tester-private.key`
- **Depoya yüklenmez** (`.gitignore` içinde) ve **ASLA paylaşılmaz**.
- Bu anahtar olmadan **yeni kod üretemezsiniz**. Kaybederseniz eski kodlar
  çalışmaya devam eder ama yenilerini üretmek için yeni anahtar + uygulama
  güncellemesi gerekir.
- **Yedeğini alın** (harici disk / e-posta kendinize / yazıcıdan çıktı).

## Sık sorulanlar

**2. telefonda ne olur?**
Kod orada geçersizdir. Uygulama çalışır ama PRO kapanır; üstte
*"Bu lisans BAŞKA BİR TELEFONA kayıtlı"* uyarısı çıkar. Satış yapılabilir,
ancak Excel içe aktarma, etiket stüdyosu, stok zekâsı gibi PRO özellikler kapalıdır.

**Telefon değiştirirse?**
Yeni telefonda uygulamayı kurup **Ayarlar → Cihaz Kimliği**'ni size gönderir.
Siz yeni kod üretirsiniz. Eski kod eski telefonda kalmaya devam eder; isterseniz
eski kodu iptal etmek için yeni bir anahtar çifti gerekir (şimdilik gerek yok).

**Uygulamayı silip yeniden kurarsa?**
Cihaz kimliği Android kimliğine bağlı olduğu için **çoğunlukla aynı kalır**;
kod çalışmaya devam eder. Nadiren (cihaz sıfırlama) değişirse yeni kod istenir.

**Süre dolunca?**
Uygulama süre bitişinde PRO'yu kapatır ve uyarı gösterir. Yeni kod üretip
gönderirsiniz (aynı cihaz koduyla `--months 12`).

## Teknik özet

- İmza: **ECDSA P-256 + SHA-256**, ham `r‖s` (WebCrypto) biçimi.
- Uygulamada **yalnızca GENEL anahtar** var → kod **doğrulanır**, üretilemez.
- Kod biçimi: `MTEST1.<cihaz12hex>.<verilişYYMMDD>.<bitişYYMMDD>.<imza>`.
- Cihaz parmak izi: Android kimliği + uygulama içi kalıcı kimlik + ekran/ortam
  sinyalleri (klonlamayı zorlaştırır).
- Kontrol her açılışta yapılır; geçersizse PRO kilidi kapatılır.
