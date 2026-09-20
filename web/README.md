# MOSBARKODYAZILIM — Tanıtım Sitesi

Statik tanıtım sitesi (saf HTML + CSS + JS, derleme adımı yok). GitHub Pages ile yayınlanır.

## Yayın adresi
`https://mosguvenlik3535.github.io/MOSBARKOD-WEB/` — özel alan adı bağlandıysa `https://alanadiniz.com`

## Dosya düzeni
```
index.html               sayfanın kendisi
assets/css/style.css     tema ve düzen
assets/js/i18n.js        TR / EN / DE sözlük + dil değiştirme
assets/js/main.js        menü, ekran görüntüsü kaydırma
assets/img/              ekran görüntüleri, kapak görseli, uygulama simgesi
CNAME                    özel alan adı (varsa)
```

## Özel alan adı (domain) bağlama
1. Depo kökündeki `CNAME` dosyasına alan adını yazın (örn. `www.mosbarkod.com`), kaydedin.
2. Alan adınızın DNS ayarlarında:
   - **A kaydı** (kök alan adı için) → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - veya **CNAME kaydı** (`www` için) → `mosguvenlik3535.github.io`
3. GitHub → Depo → **Settings → Pages → Custom domain** alanına aynı adresi yazıp kaydedin.
4. "Enforce HTTPS" seçeneğini açın (DNS yayılınca, genelde birkaç saat).

## Güncelleme
`index.html` (metinler `data-i18n` ile) ve `assets/js/i18n.js` (sözlük) düzenlenir;
`main` dalına gönderildiğinde Actions otomatik yayınlar (~1 dk).

## Play Store mağaza girişi için gerekli adresler
- Web sitesi: bu sitenin adresi
- Gizlilik politikası: `https://mosguvenlik3535.github.io/MOS12EYLULGLOBAL/privacy-policy.html`
- E-posta: m.ortayayla@gmail.com
