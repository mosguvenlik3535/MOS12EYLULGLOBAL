# Yeniden üretim ve içerik doğrulama

- `sales.png`, `stock.png`, `cash.png`, `settings.png`: 1.15.22 tam sürüm arayüzünden, 1600×1050 mantıksal piksel / 2× ölçekle alınmış 3200×2100 gerçek ekran görüntüleri. Yalnızca tarayıcının örnek veritabanı kullanıldı; üretim uygulaması veya gerçek kullanıcı verisi değiştirilmedi. Alkol/tütün ürünleri çekim veri kümesinden çıkarıldı.
- `kapaklar.html`: 5 ayrı 1200×1800 tasarım; fontları `web/assets/fonts/` içindeki OFL lisanslı Manrope dosyalarından okur. Görseller generatif bir modelle uydurulmuş program ekranları değildir.
- Başlıklar, açıklama kartları ve arka planlar tasarım katmanıdır. Ekran görüntülerindeki uygulama arayüzü değiştirilmedi.
- Tam sayfa görsel değil; `#kapak-01` … `#kapak-05` alanlarını Chromium/Playwright ile 1200×1800 JPEG olarak alın. Pillow ile RGB, 96 DPI olarak kaydedin.
- `satis-plani.html` PDF basım kaynağıdır. Metnin asıl kaynağı `belgeler/03-LISTELEME-VE-SATIS-PLANI.md` dosyasıdır.
- `build-package.py` ölçüleri, DPI, 5 görseli, başlık uzunluğunu ve açıklamada dış bağlantı bulunmadığını doğrular; müşteri paketine `kaynak/` klasörünü almaz.
- Lisans kapsamı, satıcı tarafından 1 bilgisayar + ömür boyu kullanım + ilk uzaktan kurulum olarak onaylandı.
- Paket hazırlamak Trendyol'a ürün eklemek, onay almak veya dijital teslimat entegrasyonu kurmak değildir.

## R2 revizyonu

- Satıcı ekranındaki ret metni: görselde “en, çok, satılan” kelimeleri. Eski satış PNG'sinde Türkçe OCR “en / çok / satan” ifadesini doğruladı.
- `sales.png` tekrar gerçek uygulamadan çekildi: yalnızca çekim tarayıcısının örnek satış geçmişi boş; öneri şeridi uygulamanın kendi koşuluyla görünmez. Ayran örnek ürünü sepete ekli. Kategori şeridi gerçek kaydırma konumuyla gıda kategorilerinde.
- `payment-R2.png`: aynı oturumdaki gerçek ödeme penceresinin element ekran görüntüsü. Ana görselde kullanılır.
- Bölüm görüntüleri (sol, üst, sağ, alt piksel): sales-R2=(455,110,3200,1860), stock-R2=(670,710,3200,1860), cash-R2=(455,110,3200,1350), settings-R2=(455,110,2475,1330). Bunlar gerçek görüntülerin kırpılmış bölümleridir; program metinleri boyanmadı, bulanıklaştırılmadı veya değiştirilmedi.
- Rapor kırpımı, normal rapor metni olsa da ret terimiyle çakışan maliyet satırını dışarıda bırakır. Ayarlar kırpımı iletişim kartını dışarıda bırakır.
- Nihai beş JPG, Türkçe Tesseract.js ile kontrol edildi. Kelime sınırlarıyla en/çok/satılan/satan bulunmadı. Sonuçlar ve görüntü SHA-256 özetleri `ocr-R2.json` dosyasındadır. OCR tek başına platform onayı garantisi değildir.
- R1 dosyaları müşteri paketinden çıkarıldı. Yalnızca `*-R2.jpg` dosyaları gönderilir. Küçük revizyon ZIP'i yalnız 5 görsel ve yükleme yönergesidir; tam satış paketi de R2 dosyalarını içerir.
