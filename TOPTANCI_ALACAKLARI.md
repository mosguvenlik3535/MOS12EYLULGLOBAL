# Toptancı alacakları — v1.15.18

**Veresiye Takip → Toptancı Alacakları**

Hesap: müşterilerinizin toptancıya doğrudan yaptığı ödemeler − KDV dahil ürün faturaları − toptancıdan iade / alacak kapatma.

Örnek: 10.000 TL kart ödemesi − 7.500 TL ürün faturası = 2.500 TL toptancıdan alacağınız. Fatura tutarı daha yüksekse aradaki fark borcunuz olarak gösterilir. Toptancılar arası borç/alacak mahsuplaştırılmaz; genel özet bunları ayrı toplar.

1. Toptancı adını yazın veya hesabını seçin. Aynı firma için aynı unvanı kullanın.
2. **Müşteriden doğrudan ödeme:** tarih, seçilen hesap para birimindeki tutar, ödeme yapan müşteri, isteğe bağlı slip referansı ve açıklamayı girin. Kart numarası/CVV kaydetmeyin.
3. **Ürün faturası:** mevcut alış faturasını seçin ya da fatura numarası, tarihi ve KDV dahil hesap para birimindeki tutarı elle girin. TL hesabında TL karşılığını; USD hesabında USD tutarını kullanın. Aynı toptancı ve fatura numarası veya aynı bağlı fatura ikinci kez eklenemez.
4. Toptancı alacağınızı geri ödediğinde **Toptancıdan iade / alacağı kapatma** hareketi girin.
5. Yanlış kayıtta **İptal** ile onay verin; kayıt silinmez, bakiye hesabından çıkarılır. İptal edilmiş hareketleri göstererek geçmişi inceleyebilirsiniz. Düzeltme için doğru hareketi yeniden girin.

## Muhasebe ve kayıt sınırları
- Ayrı takip defteridir: kendi kasa/POS cironuza gelir, yeni stok veya ek gider oluşturmaz. Müşteri veresiye borcunu ve alış faturasının ödeme durumunu otomatik değiştirmez.
- Burada seçtiğiniz müşteri yalnızca ödemeyi yapan kişidir. Müşteri hesabıyla otomatik mahsuplaşma yapılmaz. Aynı ödemeyi nakit tahsilat olarak kaydetmeyin.
- Bağlı faturadan kayıt anındaki numara/tarih/tutar alınır. Asıl faturanın sonradan düzenlenmesi/silinmesi defterdeki tarihî tutarı değiştirmez; düzeltmek için defter hareketini iptal edip yenisini girin.
- Elle fatura kaydı PDF/stok kaydı oluşturmaz. PDF/fotoğrafı Alış Faturası bölümünde saklayıp o faturayı buradan seçebilirsiniz.
- Veriler tam/veri yedekleri, ZIP ve otomatik/bulut yedeklerine dahildir. Sadece ayar yedeği mevcut defteri değiştirmez. Eski tam/veri yedeklerinde defter boş başlar.
- Kasa/işletme hareketlerini sıfırlama bu defteri de temizler. Önce tam yedek alın.

Doğrulama: bakiye, borç, iade, iptal, mükerrer fatura, eski yedek, ZIP ve ayar yedeği senaryoları; Chromium'da ödeme, fatura seçimi, yeniden açınca kalıcılık, iade/iptal ve diğer hesapların değişmemesi kontrol edildi.

## Alacağa karşı sonradan mal çekişi
Toptancıyı seçip **Alacağımdan Ürün / Mal Çek** düğmesine basın. Tarih, fatura/irsaliye numarası ve KDV dahil hesap para birimindeki tutarı girin veya kayıtlı alış faturasını seçin. **Mal Çekişini Kaydet ve Bakiyeden Düş** ile onaylayın.

Örnek: 10.000 TL ödeme − 7.500 TL ilk fatura = 2.500 TL alacak. Sonradan 1.000 TL mal çekişi kaydedilince kalan alacak 1.500 TL olur. Bir sonraki 500 TL çekişle 1.000 TL kalır. Alacağı aşan çekiş borç olarak gösterilir; kaydetmeden önce ön izlemede uyarılır.

Mal çekişi, mevcut ürün faturası hareketinin açık isimli kullanım şeklidir; ayrı bir ikinci kesinti yapılmaz. Önceden kaydettiğiniz faturayı tekrar eklemeyin. İptal edilen çekişin tutarı bakiyeye geri gelir. Mevcut kayıtlar ve yedekler aynı hesapla çalışmayı sürdürür. Stok veya alış faturası ödeme durumu otomatik değiştirilmez.

## TL, USD ve diğer para birimleri
**Hesap para birimi** alanından TRY (TL), USD, EUR, GBP, BRL, SAR, RUB, CNY, PLN, RON, CHF, CAD, AUD veya AED seçin. Aynı toptancının TL ve USD hesapları ayrı kartlarda görünür. Genel özet de para birimlerine göre ayrıdır; örneğin 2.500 TL ile 380 USD toplanıp tek bir rakam yapılmaz.

- Ödeme, mal çekişi, iade ve iptal yalnızca kaydın kendi para birimindeki bakiyeyi etkiler. 500 USD ödeme − 120 USD mal çekişi = 380 USD alacak.
- Tüm tutarlar KDV dahil, doğrudan seçilen para biriminde ve iki ondalık hassasiyetle saklanır. Kurla TL'ye çevrilmez; genel uygulama para birimi veya kur değişince bu tutarlar değişmez.
- Ödeme başka para birimindeyse (ör. TL kart ödemesi, USD toptancı hesabı) toptancıyla mutabık kaldığınız USD karşılığını girin. Asıl ödeme tutarı ve kullanılan kuru açıklamaya yazın. Otomatik kur dönüşümü veya para birimleri arası bakiye transferi yapılmaz.
- Para birimi değiştirildiğinde form tutarı ve fatura seçimi temizlenir; eski rakam başka para birimiymiş gibi kaydedilmez.
- Kayıtlı fatura seçerken TL hesap için TL genel toplam, USD/EUR vb. hesap için PDF'den aktarılmış aynı para birimindeki orijinal genel toplam kullanılır. Para birimine uygun tutarı olmayan fatura listelenmez; mutabık kaldığınız tutarı belge numarasıyla elle girebilirsiniz. Güncel kurdan tutar tahmin edilmez.
- Aynı fatura TL ve USD hesaplarına ayrı ayrı düşülemez; mükerrer kontrolü para birimleri arasında da geçerlidir.
- Eski, para birimi alanı olmayan kayıtlar TL sayılır; tutarları değiştirilmez. Eski bir kaydı döviz hesabına taşımak için yanlış kaydı iptal edip doğru para birimi ve mutabık tutarla yeniden girin; otomatik geçmiş kur dönüşümü yoktur.
- Tam/veri ZIP ve bulut yedekleri kayıtların para birimini de korur.

## TL bakiyesi yanında yaklaşık USD karşılığı — v1.15.18
TL hesap kartları, genel alacak/borç özeti, seçili bakiye ve çekiş sonrası bakiye yanında **(≈ … USD)** gösterilir. Hesap **TL bakiye ÷ 1 USD karşılığı TL** şeklindedir. USD ve diğer döviz hesaplarına ikinci bir karşılık eklenmez.

Kur ExchangeRate-API'den, erişilemezse Frankfurter'den alınır. Ekran açılışında, açıkken 15 dakikada bir ve **USD Kurunu Yenile** düğmesiyle kontrol edilir. Kaynak, kaynağın kur tarihi ve son alınma zamanı gösterilir. Kaynaklar günlük/referans kur yayımlar; bu gösterim anlık banka alış/satış kotasyonu değildir.

İnternet yoksa son doğrulanmış kur tarihiyle birlikte kullanılır; hata ve 48 saatten eski kur uyarısı gösterilir. Hiç doğrulanmış kur yoksa USD karşılığı hesaplanamadığı yazılır; gömülü tahmini kur kullanılmaz. Kur önbelleği cihaz yerelindedir. Toptancı, müşteri veya bakiye bilgileri kur servisine gönderilmez.

Bu özellik yalnızca gösterimdir; kayıtlı tutarlar, mal çekişleri, TL/USD ayrı hesapları ve yedek verileri değiştirilmez. Fatura maliyetlerinde kullanılan tarihî kurla ilişkili değildir.
