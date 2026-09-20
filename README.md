# MOS12EYLULGLOBAL — MOSBARKODYAZILIM

Yapay zekâ destekli, çok dilli (14 dil) **barkod satış / POS / kasa programı**.
Masaüstü ve mobil cihazlar WebRTC üzerinden **eşzamanlı (realtime)** çalışır.

> Kod tabanı: `mosbarkod/` klasörü
> Teknoloji: React 19 · TypeScript · Vite 7 · Tailwind CSS 4

## Özellikler (kısa özet)

- 🛒 Barkod / kamera / yapay zekâ görüntü tanıma ile satış (POS)
- 🏷️ 3 fiyat seviyesi, tartım ürünleri, maliyet altı satış engeli
- 💳 Nakit + POS + veresiye ödeme, POS provizyon onayı
- 📦 Stok, alış faturaları, paket/teslimat siparişleri
- 🪪 Veresiye defteri, giderler, personel ve maaş/avans takibi
- 📊 Gün sonu raporu, analiz, kasa ve POS kapanışı
- 🚌 Ulaşım Kartı (İmkart) dolum ve bakiye yönetimi
- 🔁 WebRTC senkronizasyon: masaüstü ana bilgisayar + telefonlar (QR/kod ile)
- 🌍 14 dil (TR, EN, DE, ES, FR, IT, PT, RU, AR, ZH, PL, RO, EL, NL) + otomatik çeviri
- 📱 PWA (çevrimdışı destek), tema ve ses seçenekleri, otomatik yedekleme

## Kurulum

```bash
cd mosbarkod
npm install
```

## Geliştirme

```bash
npm run dev          # http://localhost:5173
```

## Üretim derlemesi (tek dosya)

```bash
npm run build        # dist/ çıktısı (vite-plugin-singlefile ile tek HTML)
npm run preview
```

## Demo giriş bilgileri

| Adım      | Değer                  |
|-----------|------------------------|
| Lisans    | `MOS-1234-ABCD-9999`   |
| Admin PIN | `0000`                 |
| Kasiyer 1 | `1111`                 |
| Kasiyer 2 | `2222`                 |

## Klasör yapısı

```
mosbarkod/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/               # PWA manifest, servis worker, ikonlar
└── src/
    ├── App.tsx           # Ana uygulama / durum yönetimi
    ├── data.ts           # Tipler, varsayılan durum, demo veriler
    ├── icons.tsx         # SVG ikon seti
    ├── components/       # Shell, LoginGate, LicenseGate, PaymentModal, ...
    ├── screens/          # Pos, Products, Finance, Analytics, Settings, ...
    ├── lib/              # sync, report, email, license, themes, sounds
    ├── locales/          # i18n (14 dil)
    └── utils/
```
