# MOSBARKOD.COM.TR — MOS BARCODE satış sitesi

Statik HTML/CSS/JS; sunucu veya ödeme kartı verisi toplama yok. Masaüstü öncelikli, responsive Türkçe tasarım.

## Yayın
Mevcut PWA adresini değiştirmeden Pages tanıtımı: https://mosguvenlik3535.github.io/MOS12EYLULGLOBAL/web/

`web/` içeriğini hostinginizin alan adı köküne (`public_html` veya sağlayıcınızın karşılığı) yükleyerek MOSBARKOD.COM.TR üzerinde sunabilirsiniz. HTTPS sertifikası ve DNS, alan adı/hosting panelinden yapılandırılmalıdır. Bu çalışma alan adının DNS veya hosting ayarlarını değiştirmez. Mevcut repo Pages kökünde PWA bulunduğu için körlemesine CNAME eklemeyin; aksi halde program adresini taşırsınız.

Yerel ön izleme: `python3 -m http.server 8080 --bind 0.0.0.0 --directory web`

## Satış ve indirmeler
- Doğrudan Windows/Android demo paketleri v1.15.20: 1.000 tamamlanmış satış; kredi kartı istenmez.
- macOS/Linux/PWA bağlantıları ayrı demo olarak sunulmaz; lisans gerekebilir.
- Full Pro: kullanıcının talep ettiği tek seferlik/ömür boyu model. Masaüstü fiyatı 4.999 TL + KDV; mobil lisanslar dahil değil. WhatsApp üzerinden satın alma talebi. Site ödeme almaz.
- Cihaz sayısı, destek/güncelleme kapsamı ve lisans taşıma teklif aşamasında belirlenmelidir. Play Store aboneliği ayrı kanaldır; bu site programdaki Play Billing ayarlarını değiştirmez.
- Masaüstü hero paneli temsili HTML görselleştirmedir; örnek rakamlar müşteri/performans iddiası değildir. Mobil ekranlar depodaki uygulama görüntüleridir.

## Yayın öncesi ticari tamamlamalar
KDV oranı ve dahil toplam, satıcı ticari unvanı ve adresi, fatura/ödeme altyapısı, cihaz sınırı, destek ve yükseltme koşulları, satış/ön bilgilendirme/iade metinleri onaylanmalıdır. Bunlar olmadan otomatik ödeme açılmadı.

## Güncelleme
İndirme sürümü ve linkleri `index.html` içinde birlikte güncelleyin. Stiller `assets/css/style.css`, menü ve klavyeyle kullanılabilen ekran sekmeleri `assets/js/main.js` içindedir. Güncel çeviriler assets/locales dizininden yüklenir.

Platform logoları: Android/Apple/Linux SVG dosyaları Simple Icons paketinden (CC0, lisans assets/icons içinde); Windows dört bölmeli marka işareti. Markalar ilgili sahiplerine aittir; ortaklık iddiası yoktur.

## Ayrıntılı özellikler ve indirme sunucusu
`ozellikler.html` programın sol menüsündeki 11 ekranı açıklar. Bölüm içerikleri programdaki mevcut davranış ve kurulum sınırlarını belirtir. İndirme kartlarında ilk kurulum Admin PIN'i 0000 gösterilir; değiştirilen kullanıcı PIN'ini etkilemez.

GitHub dışı dağıtım önerisi ve yayın sırası `INDIRME_YAYINI.md` içindedir. Dosyalar yeni sunucuya yüklenip doğrulanana kadar çalışan GitHub bağlantıları korunur.

## public_html için tek ZIP
`python3 web/scripts/package-hosting.py` komutu kaynak siteyi değiştirmeden dağıtım paketi hazırlar. Çıktı: `~/.cache/mospos-hosting/MOSBARKOD-public_html.zip` (yaklaşık 205 MiB).

Paketin kökünde index.html, ozellikler.html, gizlilik-politikasi.html, assets/ ve indir/ bulunur. Üç v1.15.20 demo dosyası resmi sürümden alınır; dosya boyutu ve varsa sağlayıcının SHA-256 özeti doğrulanır. Web sayfasındaki demo URL'leri aynı hostingdeki indir/ klasörüne çevrilir. Mac/Linux için iletişim bağlantısı; iPhone için mevcut harici PWA adresi korunur. Gizlilik metni yerel dosyadır. Hosting/DNS veya ödeme ayarları değiştirilmez.

ZIP'i yalnızca MOSBARKOD.COM.TR için ayrılan public_html içine çıkarın; index.html doğrudan bu dizinde kalmalı. Mevcut dosyalar varsa önce yedekleyin. Çıkardıktan sonra sunucudaki ZIP'i silin. Paket, siteyle birlikte demo EXE/APK'leri de içerdiğinden yeniden yüklemeniz gerekmez.

## MOS BARCODE / mint tasarım / 14 dil — v1.15.20
Ana sayfa ve ayrıntılı özellikler sayfası Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce, Felemenkçe, Lehçe, Rumence, Yunanca, Rusça, Arapça ve Çince dil dosyalarına sahiptir. Seçim `?lang=xx` ve cihaz tercihiyle korunur; Arapça RTL düzeni kullanır. Dil dosyaları `assets/locales` içinde siteyle birlikte sunulur. Ziyaretçi içeriği çeviri servisine gönderilmez.

Çeviriler genel kamuya açık tanıtım metinlerinden derleme aşamasında otomatik üretildi; profesyonel ticari/hukuki çeviri onayı değildir. Fiyat, demo limiti ve Admin PIN'i teknik testlerle korunur. Ticari metinler için ana dili konuşan bir gözden geçirme önerilir.

`python web/scripts/check-locales.py` 14 dilin tüm anahtarlarını kontrol eder. Kaynak değişirse `translate-site.py --catalog` (beautifulsoup4 gerekir) kataloğu yeniler; `translate-site.py` eksik çevirileri üretir. Eksik dil dosyaları yayın ve hosting paketini durdurur.

Uygulamanın görünen marka adı MOS BARCODE'dur. Veri anahtarları, Android paket kimliği ve eski teknik kurulum dosyası adları mevcut kayıt/lisans uyumluluğu için korunur. Uygulama gizlilik belgesi mevcut TR/EN metnini kullanır.

## Özellikler sayfasındaki donanım sunumu
`assets/img/hardware-mint.webp`: marka/model iddiası olmayan, üretilmiş temsili barkod okuyucu ve termal fiş yazıcı görseli. Başlığın yanında kompakt görünür: masaüstünde 128 px, telefonda 80 px genişlik; ayrı bir satır açıp hero alanını uzatmaz. Mint aydınlatma mevcut koyu yeşil zemine karışır. Cihazların yazılım lisansına dahil olmadığı notu ve görsel açıklaması 14 dilde bulunur. WebP 1024×1024, yaklaşık 45 KB; orijinal büyük PNG dağıtıma dahil değildir.

POS Entegrasyonu bölümünde küçük bir notla ayrı yıllık ücret bilgisi gösterilir; not 14 dilde mevcuttur.
