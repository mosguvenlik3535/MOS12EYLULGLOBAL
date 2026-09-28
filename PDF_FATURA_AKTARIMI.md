# PDF alış faturası — v1.15.12

1. Alış Faturası → PDF / Fotoğraf Ekle (en fazla 10 MB; PDF, PNG, JPEG, WebP).
2. Metin içeren PDF için Fatura Kalemlerini Oku. En fazla 30 sayfa.
3. Kontrol ekranında fatura numarası/tarih/vade, para birimi, fatura kuru, ödeme durumu ve toplamları doğrulayın.
4. Her satırı bir stok ürününe eşleyin veya açıkça Yeni ürün oluştur seçin. Eşleştirme önerisi yalnızca benzersiz tam ürün adı eşleşmesidir. Mal kodu barkod yapılmaz. Koli/adet dönüşümü otomatik değildir.
5. Eksik/yanlış satırları düzeltin. Net satır tutarı iskonto sonrası KDV hariç tutardır. Maliyet bu tutarın miktara bölünmesi, KDV ve onayladığınız kurun uygulanmasıyla hesaplanır. Birim fiyat alanı kontrol amaçlıdır.
6. Belgenin döviz toplamı ve TL toplamı kalemlerle uyuşmalıdır (0,05 tolerans). Kur otomatik uygulanmaz; TRY belge için 1, döviz belge için faturadaki kur girilir. TL toplamı/döviz toplamı oranı yalnızca öneri olarak gösterilir. Tarihî belgeye güncel kur uygulanmaz. Aktarım sırasında uygulama para birimi TRY olmalıdır.
7. Onayla ve Fatura Formuna Aktar henüz stok değiştirmez. Tedarikçiyi seçin. Stoğa ekleme seçeneğini kontrol edip Alış Faturasını Onayla ile kaydedin. Yeni ürünlerin barkod/satış fiyatını tamamlayın.

## Koruma ve sınırlar
- Aynı normalize tedarikçi adı + fatura numarası tekrar kaydedilmez. Farklı yazılmış tedarikçi unvanlarını tekleştirmek kullanıcının sorumluluğudur.
- Stok aktarımı ürün ID'siyle yapılır; eski kayıtlar yalnızca benzersiz tam ada göre eşleştirilir. Alt dize eşleşmesi kaldırıldı.
- Ek dosya kaydı başarısızsa yeni fatura/stock işlemi başlatılmaz. Belgeler IndexedDB'de, eski fotoğraflar okunabilir şekilde saklanır. Fatura silinirken ek de silinir; kasa sıfırlama belge arşivini temizler.
- v1.15.13 itibarıyla ekler tam/veri ZIP yedeklerine, otomatik arşivlere ve bulut yedeklerine dahildir. ZIP içindeki backup.json belgeleri base64 olarak içerir. Cihazlar arası canlı senkronizasyon hâlâ ek dosyaları taşımaz. Tarayıcı verilerini silmek veya alan adı değiştirmek ekleri erişilemez kılar.
- Belgeler dış servise gönderilmez. PDF işleyici/worker uygulamaya dahildir.
- OCR yok: taranmış PDF ve fotoğraf eklenebilir ama otomatik okunmaz. Desteklenmeyen tablolar elle satır eklenerek tamamlanır. Her tedarikçi düzeni için hatasız okuma garantisi yoktur.
- Testler paylaşılan ekran görüntülerinin metne geçirilmesi ve bunlardan oluşturulan yapay örnek PDF ile yapıldı. Orijinal kullanıcı PDF'sine erişilemedi. Dosya halka açık depoya eklenmedi.
