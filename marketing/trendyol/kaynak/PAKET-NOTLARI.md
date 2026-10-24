# Yeniden üretim ve içerik doğrulama

- `sales.png`, `stock.png`, `cash.png`, `settings.png`: 1.15.22 tam sürüm arayüzünden, 1600×1050 mantıksal piksel / 2× ölçekle alınmış 3200×2100 gerçek ekran görüntüleri. Yalnızca tarayıcının örnek veritabanı kullanıldı; üretim uygulaması veya gerçek kullanıcı verisi değiştirilmedi. Alkol/tütün ürünleri çekim veri kümesinden çıkarıldı.
- `kapaklar.html`: 5 ayrı 1200×1800 tasarım; fontları `web/assets/fonts/` içindeki OFL lisanslı Manrope dosyalarından okur. Görseller generatif bir modelle uydurulmuş program ekranları değildir.
- Başlıklar, açıklama kartları ve arka planlar tasarım katmanıdır. Ekran görüntülerindeki uygulama arayüzü değiştirilmedi.
- Tam sayfa görsel değil; `#kapak-01` … `#kapak-05` alanlarını Chromium/Playwright ile 1200×1800 JPEG olarak alın. Pillow ile RGB, 96 DPI olarak kaydedin.
- `satis-plani.html` PDF basım kaynağıdır. Metnin asıl kaynağı `belgeler/03-LISTELEME-VE-SATIS-PLANI.md` dosyasıdır.
- `build-package.py` ölçüleri, DPI, 5 görseli, başlık uzunluğunu ve açıklamada dış bağlantı bulunmadığını doğrular; müşteri paketine `kaynak/` klasörünü almaz.
- Lisans kapsamı, satıcı tarafından 1 bilgisayar + ömür boyu kullanım + ilk uzaktan kurulum olarak onaylandı.
- Paket hazırlamak Trendyol'a ürün eklemek, onay almak veya dijital teslimat entegrasyonu kurmak değildir.
