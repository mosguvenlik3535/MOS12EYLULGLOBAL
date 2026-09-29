# Toptancı alacakları — v1.15.15

**Veresiye Takip → Toptancı Alacakları**

Hesap: müşterilerinizin toptancıya doğrudan yaptığı ödemeler − KDV dahil ürün faturaları − toptancıdan iade / alacak kapatma.

Örnek: 10.000 TL kart ödemesi − 7.500 TL ürün faturası = 2.500 TL toptancıdan alacağınız. Fatura tutarı daha yüksekse aradaki fark borcunuz olarak gösterilir. Toptancılar arası borç/alacak mahsuplaştırılmaz; genel özet bunları ayrı toplar.

1. Toptancı adını yazın veya hesabını seçin. Aynı firma için aynı unvanı kullanın.
2. **Müşteriden doğrudan ödeme:** tarih, TL tutarı, ödeme yapan müşteri, isteğe bağlı slip referansı ve açıklamayı girin. Kart numarası/CVV kaydetmeyin.
3. **Ürün faturası:** mevcut alış faturasını seçin ya da fatura numarası, tarihi ve KDV dahil TL tutarını elle girin. Dövizli faturada TL karşılığını kullanın. Aynı toptancı ve fatura numarası veya aynı bağlı fatura ikinci kez eklenemez.
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
