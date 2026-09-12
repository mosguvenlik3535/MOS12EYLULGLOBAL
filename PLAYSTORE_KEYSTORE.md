# Play Store İmzalama Anahtarı (Keystore) + GitHub Secret — Adım Adım

> Amaç: Play Store'a yüklenen **imzalı AAB** dosyasını üretmek.
> Keystore = uygulamanızın "imza anahtarı". Bir kez oluşturulur, **kaybolursa uygulama güncellenemez**.
> Bu dosya **asla git'e commit edilmez** (`.gitignore`'da engellendi); GitHub'a şifreli "Secret" olarak konur.

---

## Gereksinim: Java (`keytool`)

Keystore'u üretmek için `keytool` gerekir (JDK ile gelir). Kontrol:

- **Windows:** `Komut İstemi` veya `PowerShell` açın → `keytool` yazın, Enter.
  - "komut bulunamadı" derse Java yok. Ücretsiz JDK kurun: https://adoptium.net → Windows x64 → **.msi** indirip kurun (kurulum "PATH'e ekle" seçeneğini işaretleyin).
- **Mac/Linux:** terminalde `keytool -version` yazın.

> Android Studio kuruluysa `keytool` zaten mevcuttur.

---

## Adım 1 — Keystore üret (komut)

Aşağıdaki komutu **kendi bilgisayarınızda** çalıştırın. `GUCU-PAROLA` yerine **kendi güçlü parolanızı** yazın (harf+rakam+özel karakter, ör. `Mos2026!Kasa`). **Bu parolayı bir yere not edin — unutursanız geri alınamaz.**

### Windows (Komut İstemi / PowerShell)

```
keytool -genkeypair -v -keystore mos-release.jks -alias mosbarkod -keyalg RSA -keysize 2048 -validity 10000 -storepass GUCU-PAROLA -keypass GUCU-PAROLA -dname "CN=MOSBARKODYAZILIM, O=MOSBARKODYAZILIM, L=Izmir, ST=Izmir, C=TR"
```

### Mac / Linux (Terminal)

```bash
keytool -genkeypair -v \
  -keystore mos-release.jks -alias mosbarkod \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass 'GUCU-PAROLA' -keypass 'GUCU-PAROLA' \
  -dname "CN=MOSBARKODYAZILIM, O=MOSBARKODYAZILIM, L=Izmir, ST=Izmir, C=TR"
```

**Sonuç:** Bulunduğunuz klasörde `mos-release.jks` dosyası oluşur.

| Değer | Anlamı | Secret adı |
|---|---|---|
| Parolanız | `storepass` = `keypass` | `MOS_KEYSTORE_PASSWORD` + `MOS_KEY_PASSWORD` |
| `mosbarkod` | alias (takma ad) | `MOS_KEY_ALIAS` |
| dosya | `mos-release.jks` | (base64 edilip) `MOS_KEYSTORE_BASE64` |

> Alias'ı farklı seçtiyseniz sorun değil — yeter ki Secret'a **aynı alias**'ı yazın.

---

## Adım 2 — Keystore'u Base64'e çevir

GitHub Secret yalnızca metin alır; dosyayı tek satırlık base64 metne çevirmeliyiz.

### Windows (PowerShell — önerilen)

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\mos-release.jks")) | Set-Content -NoNewline -Path mos-release.jks.b64
```

### Mac / Linux (Terminal)

```bash
base64 -w0 mos-release.jks > mos-release.jks.b64
```

**Sonuç:** `mos-release.jks.b64` — içinde tek satır, uzun bir harf/rakam dizisi. Bunun **tamamını** kopyalayacaksınız.

> Not: base64 çıktısı ~3–4 KB olur. GitHub secret limiti 48 KB — sorun yok.

---

## Adım 3 — GitHub'a 4 Secret ekle

1. Tarayıcıda repo sayfasını açın: https://github.com/mosguvenlik3535/MOS12EYLULGLOBAL
2. Üst menüde **Settings** → sol menüde **Secrets and variables** → **Actions**
3. Yeşil **New repository secret** butonuna basın.
4. Aşağıdaki **4 secret'ı tek tek** ekleyin (her biri için Name + Value yazıp "Add secret" deyin):

| # | Name (birebir!) | Value (ne yazılacak) |
|---|---|---|
| 1 | `MOS_KEYSTORE_BASE64` | `mos-release.jks.b64` dosyasının **içeriği** (tek satır, tamamı) |
| 2 | `MOS_KEYSTORE_PASSWORD` | Keystore parolanız (örn. `Mos2026!Kasa`) |
| 3 | `MOS_KEY_ALIAS` | `mosbarkod` |
| 4 | `MOS_KEY_PASSWORD` | Aynı parola (örn. `Mos2026!Kasa`) |

⚠️ **İsimler birebir aynı olmalı** (büyük/küçük harf dahil). Yanlış yazılırsa CI imzalı AAB üretemez.

---

## Adım 4 — Bana haber verin

Secret'ları ekledikten sonra **"ekledim" deyin.** Ben bir sürüm tag'i push edip **imzalı AAB'yi otomatik üretirim**. Release'de şu dosya görünür:

```
MOSBARKODYAZILIM-Android-AAB / app-release.aab
```

Bu `.aab` dosyasını Play Console → *Create app* → **Kapalı test** bölümüne yüklersiniz.

---

## ⚠️ Güvenlik kuralları (önemli)

1. **`mos-release.jks` ve `.b64` dosyalarını asla** git'e, e-postaya veya WhatsApp'a yollamayın. Sadece `mos-release.jks` dosyasını **güvenli bir yerde** (harici disk / şifreli bulut) saklayın.
2. Parolayı da ayrı bir yerde saklayın.
3. Keystore kaybolursa Play'e güncelleme yükleyemezsiniz. (Play App Signing aktifken Google'dan anahtar sıfırlama talep edilebilir, ama süreç günler sürer — en iyisi yedekli olmak.)
4. GitHub Secret'lar bir kez kaydedilince **değeri görüntülenemez** (sadece güncellenebilir). Değiştirmek gerekirse yeniden yazın.

---

## Sık sorunlar

| Sorun | Çözüm |
|---|---|
| `keytool` bulunamadı | JDK kurun (adoptium.net) veya Android Studio kullanın |
| PowerShell base64 komutu hata verdi | Komut İstemi yerine **PowerShell**'de çalıştırın; dosya adındaki yolu doğru yazın |
| Base64'te birden fazla satır oldu | `-NoNewline` kullanın; GitHub'a tek satır yapıştırın |
| CI'da "AAB bulunamadı" uyarısı | Secret isimleri yanlış — 4 ismi birebir kontrol edin |
| Parolamı unuttum | Geri alınamaz; yeni keystore üretip 4 secret'ı yenileyin (uygulama henüz yayında değilse sorun yok) |
