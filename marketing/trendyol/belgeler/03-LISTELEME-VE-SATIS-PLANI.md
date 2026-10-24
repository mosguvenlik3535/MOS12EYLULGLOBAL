# MOS BARCODE · Trendyol satışa hazırlık dosyası

**Durum:** İlan metni ve 5 görsel hazırdır. Trendyol mağazasına ürün gönderilmemiştir; satışa açılma/onay alınmış sayılmaz.

## 1. Onayladığınız teklif

- Aktif satıcı mağazası.
- MOS BARCODE Masaüstü Full Pro, **1 bilgisayar için ömür boyu kullanım**.
- **İlk uzaktan kurulum dahil.** Sınırsız/ömür boyu destek veya ücretsiz tüm gelecek sürümler vaadi yok.
- Satış bedeli **1.499 TL + KDV**. Mobil lisans, donanım ve yıllık POS entegrasyonu dahil değil.
- Bu ilan tam sürüm içindir; 1.000 satışlık ücretsiz demo satılmıyor.

## 2. Fiyatı doğru girin

KDV oranını muhasebeciniz ve kategori ayarınızla doğrulayın. **%20 KDV uygulanıyorsa:**

| Kalem | Tutar |
|---|---:|
| KDV hariç satış bedeli | 1.499,00 TL |
| %20 KDV | 299,80 TL |
| KDV dahil müşteri toplamı | **1.798,80 TL** |
| Önceki 4.999 TL + %20 KDV'nin aritmetik karşılığı | 5.998,80 TL |

**1.499 TL'yi KDV dahil satış bedeli olarak girmek**, %20 KDV'de KDV hariç geliri 1.249,17 TL'ye düşürür. Önce fiyat alanının KDV dahil/hariç niteliğini panelde doğrulayın. Önerilen müşteri toplamı, %20 oranı doğrulandığında 1.798,80 TL'dir.

Önceki tutar satırını **otomatik olarak referans/liste fiyatına kopyalamayın**. Gerçek önceki fiyat, ilgili fiyat geçmişi, mevzuat ve platform onayı doğrulanmadan üzeri çizili fiyat veya “%70 indirim” iddiası kullanmayın. İlk kez açılan ilanda sitedeki kampanya etiketinin aynen görüneceği garanti değildir. Resmî listeleme PDF'si, perakende ve satış fiyatı arasında %50'den fazla fark olduğunda perakende fiyatının kontrol edilip kaldırılabileceğini belirtir; güncel panel koşulları ayrıca kontrol edilmelidir. [5](https://tymp.mncdn.com/prod/documents/policy/trendyol-urun-listeleme-kurallari.pdf)

**Önerim:** Önce doğru KDV dahil toplamla yayına alın; indirim etiketini platformun uygun gördüğü gerçek fiyat geçmişi üzerinden yönetin. Başlık ve kapaklara fiyat veya indirim etiketi eklemedim.

## 3. Satış açılmadan tamamlanacak kontroller

1. Satıcı desteğine bu ürünün **kendi markanıza ait ticari yazılım / 1 bilgisayar dijital kullanım lisansı** olduğunu belirtin. Uygun kategori, marka kaydı ve dijital ürün satış yetkisini doğrulatın. Benzer barkod programlarının listelenmesi sizin hesabınız için otomatik kategori yetkisi sağlamaz.
2. Dijital lisansın hangi onaylı yolla teslim edileceğini, teslimat süresini ve sipariş kapanışını netleştirin. “Anında teslim” veya “aynı gün kurulum” sözünü kapasiteniz ve sisteminiz doğrulanmadan yazmayın.
3. Trendyol'un resmî değişiklik günlüğü, dijital kodun alternatif teslimat servisi üzerinden müşteriye iletildiğini ve “Digital Goods” olmayan sipariş paketlerinde hata döndüğünü açıklıyor. API bilgilerini bu sohbette paylaşmayın; gerekiyorsa yetkili entegrasyon sağlayıcısını hesabınız üzerinden yapılandırın. [4](https://developers.trendyol.com/changelog/changelog)
4. Sipariş bazlı lisans teslimini, ilk kurulum akışını ve tek bilgisayar koşulunun teknik uygulanmasını doğrulayın. Bu paketin hazırlanması lisans otomasyonu kurulduğu anlamına gelmez.
5. Satacağınız **tam sürüm Windows kurulum paketini** hazır bulundurun. Demo EXE'sini, Android APK'sini veya Play AAB'sini tam sürüm teslimatı yerine göndermeyin. Hedef Windows sürümü, 64-bit mimari, donanım ve sürücü uyumunu temiz bir test bilgisayarında doğrulayın; test edilmemiş asgari RAM/disk/Windows sürümü vaat etmeyin.
6. İlk uzaktan kurulumun randevu saatlerini, kapsamını ve sonrasındaki destek şartlarını yazılı hale getirin. Kullanıcı izni olmadan uzaktan erişmeyin; parola istemeyin ve gereksiz müşteri verisi saklamayın.
7. Lisans taşıma/yeniden kurulum, güncelleme ve iade/cayma bilgilendirmelerini ilgili mevzuat ve Trendyol süreçleriyle uyumlu hazırlayın. “Dijital üründe hiçbir koşulda iade yok” gibi mutlak ifadeler kullanmayın.
8. Faturalandırma, gerçek stok/teslim kapasitesi ve KDV ayarını doğrulayın. Lisans stokunu sınırsız göstermeyin; ilk kurulum kapasitenizi dikkate alın.
9. Marka/kategori/özellik ID'leri ile barkod alanını satıcı panelindeki gerçek değerlerle doldurun. Başka ürüne ait barkod kullanmayın. `MOS-FULLPRO-WIN-1PC` yalnızca önerilen iç model/stok kodudur; kayıtlı barkod değildir.

## 4. Panelde uygulanacak listeleme sırası

- Ürün ekleme ekranını açın; kategori ve marka seçimini satıcı desteğinin doğruladığı bilgilerle yapın.
- Başlığı `01-URUN-BASLIGI.txt` dosyasından alın. Başlık 100 karakterin altındadır. Resmî V2 şeması başlık için 100 karakter sınırı tanımlar. [7](https://developers.trendyol.com/docs/%C3%BCr%C3%BCn-yaratma-v2)
- Açıklamayı `02-URUN-ACIKLAMASI.html` dosyasından veya düz metin sürümünden aktarın. Editörün desteklemediği biçimlendirmeyi kaldırın.
- Görselleri **01, 02, 03, 04, 05** sırasıyla yükleyin. Dosyalar 1200×1800 px, JPEG, RGB ve 96 dpi olarak hazırlanmıştır. Bu ölçü ve çözünürlük resmî ürün oluşturma dokümanında belirtilir; doküman barkod başına en fazla 8 görsel tanımlar. [7](https://developers.trendyol.com/docs/%C3%BCr%C3%BCn-yaratma-v2)
- Görsel 01 ana ürün görseli; 02–05 açıklayıcı ek görsellerdir. Ana görsel sade ve açık zeminlidir; donanım paketi izlenimi yaratmaz. Görsel onayı garanti değildir; kategorinin güncel kurallarına göre panel uyarısını değerlendirin.
- KDV, fiyat, stok, teslimat ve zorunlu kategori alanlarını doğrulayın; önizlemede toplam fiyat ve lisans kapsamını kontrol edin.
- Onaya gönderin, sonra yayındaki sayfayı ayrıca kontrol edin. Ürün gönderiminin başarılı olması satışta olduğu anlamına gelmez; resmî API dokümanı onay sürecindeki/reddedilen ürünlerin yayına çıkmadığını belirtir. [7](https://developers.trendyol.com/docs/%C3%BCr%C3%BCn-yaratma-v2)

**Sonraki adım:** Ürün ekleme ekranındaki kategori, zorunlu özellikler ve dijital teslimat alanlarının ekran görüntüsünü paylaşın. Kişisel bilgiler, API anahtarı ve parolaları kapatın. Alanları birlikte dolduralım; hesap erişimi olmadan sizin adınıza yayına aldığımı söyleyemem.

## 5. Daha iyi satış için uygulama planı

Bunlar satış garantisi değil, ölçülebilir test önerileridir. Reklam veya ücretli işlem başlatılmadı.

### Konumlandırma

“En ucuz” veya “en iyi” gibi doğrulanamayan üstünlük iddiaları yerine **tek bilgisayar + ömür boyu kullanım + ilk uzaktan kurulum** teklifini net anlatın. Müşteri için gerçek fark, satın alma sonrası çalışır kurulum ve açık kapsamdır.

Anahtar kelimeleri doğal kullanın: **barkodlu satış programı, stok takip programı, market programı, bakkal satış programı, manav stok takibi, veresiye takip, kasa takip**. Başlığı tekrar eden kelimelerle doldurmayın; rakip marka kullanmayın. Kelimelerin trafik hacimleri bu çalışmada ölçülmedi.

### İlk 7 gün — operasyonu doğrulayın

- Onay sonrası mobil ürün sayfasını kontrol edin: yazılım satıldığı, donanım dahil olmadığı ve 1 bilgisayar kapsamı ilk bakışta anlaşılmalı.
- Randevu verebileceğiniz kapasiteyle başlayın; örneğin günde gerçekten 2 kurulum yapabiliyorsanız bundan fazla hız taahhüt etmeyin.
- Müşteri sorularını belirlediğiniz çalışma saatlerinde düzenli yanıtlayın. Hız sözü vermek yerine kendi yanıt sürenizi ölçün.
- Teslimat, lisans aktivasyonu, test satışı, yedek alma ve kullanıcıya teslim adımlarını kontrol listesiyle tamamlayın.
- Gerçek satın alanlardan yalnızca platformun izin verdiği yöntemlerle dürüst değerlendirme isteyin. Puan karşılığı indirim/hediye veya sahte yorum kullanmayın.

### Gün 8–14 — kontrollü reklam testi

- Ürün sayfası ve teslimat akışı sorunsuzsa, **onayınızla** 7 gün × 100 TL = en fazla 700 TL toplam test bütçesi düşünülebilir. Bu bütçe otomatik harcanmaz; hesap koşullarına göre değiştirilir.
- Panelde sunulan hedefleme seçeneklerini kullanın. Dış platformlara ait hedefleme özelliklerinin Trendyol'da bulunduğunu varsaymayın.
- Her gün gösterim, tıklama, harcama, sipariş ve iptal/iade sayılarını kaydedin. Ölçüm şablonu `05-OLCUM-SABLONU.csv` dosyasındadır.
- Aynı anda fiyatı, kapak görselini ve başlığı değiştirmeyin. Tek değişkeni değiştirip benzer süre/harcama koşullarında karşılaştırın. İlk deneme için 01 ana görselini koruyun; sonraki testte 02'yi ana görsel olarak denemek platform koşullarına bağlıdır.
- Tıklama düşükse başlık/kapak; tıklama var sipariş yoksa toplam fiyat, uyumluluk, kurulum ve teslimat belirsizliğini inceleyin.
- İade veya kurulum şikâyeti artarsa reklama bütçe eklemek yerine önce teslimatı düzeltin.

### Basit kârlılık hesabı

Gerçek komisyonu, ek hizmet bedellerini, komisyon KDV'sini, iadeleri ve tahsilat kesintilerini sözleşmenizden alın. Aşağıdaki oran **Trendyol'un gerçek komisyonu olduğu iddiası değildir**; yalnızca hesap örneğidir.

%20 ürün KDV'si, KDV dahil tutar üzerinden %20 komisyon, 180 TL kurulum maliyeti ve 50 TL diğer maliyet varsayımıyla:

- KDV hariç ürün geliri: 1.499 TL.
- Örnek komisyon gideri: 1.798,80 × %20 = 359,76 TL (komisyon faturası KDV ve kesintileri ayrıca mutabık kalınmalı).
- Reklam öncesi örnek katkı: 1.499 − 359,76 − 180 − 50 = **909,24 TL**.
- Bu, net kâr veya banka ödemesi değildir; iade, gelir/kurumlar vergisi ve diğer giderler dahil değildir.
- Sipariş başına reklam maliyeti (CPA) = reklam harcaması / reklama atfedilen sipariş sayısı.
- Başabaş CPA üst sınırını gerçek reklam öncesi katkınızdan hesaplayın; hedef kâr ve iade payı için bunun altında bir sınır belirleyin.
- Gösterim veya tıklama tek başına başarı değildir. **Kurulumu tamamlanan, iadesiz sipariş başına katkıyı** izleyin.

## 6. Müşteri soru-cevap şablonları

**Bilgisayar veya barkod okuyucu geliyor mu?**
Hayır. Ürün 1 bilgisayar için Masaüstü Full Pro yazılım lisansıdır. Donanımlar dahil değildir.

**Aylık ücret var mı?**
Masaüstü yazılım kullanım lisansı tek seferliktir. POS entegrasyonu ayrıca yıllık ücrete tabidir; harici servisler ve mobil lisanslar ayrı koşullardadır.

**Kurulum dahil mi?**
İlk uzaktan kurulum dahildir. Uygun bilgisayar, internet ve erişim izni gerekir. Teslimat/kurulum zamanı ilanınızda doğruladığınız süre ve randevu akışına göre belirlenir; burada anında kurulum vaadi verilmez.

**1.000 satıştan sonra kapanır mı?**
Bu ilan ücretsiz demo için değil Full Pro içindir. Full Pro'da demo satış kotası uygulanmaz.

**Telefonumda da kullanabilir miyim?**
Bu ürün Windows masaüstünde 1 bilgisayar lisansı içindir. Android, iPhone/PWA ve Play aboneliği bu fiyata dahil değildir.

**İnternet olmadan çalışır mı?**
Temel satış/stok işlemleri cihazda çalışır. Uzaktan kurulum, güncel döviz kuru ve bulut gibi çevrimiçi hizmetler internet gerektirir.

**Mevcut cihazımla uyumlu mu?**
Bilgisayarın işletim sistemi ve barkod okuyucu/yazıcı/terazi marka-modelini ürün soruları üzerinden iletin; satın almadan önce uyumu kontrol edelim. Tüm cihazlarla koşulsuz uyum sözü verilmez.

## 7. Kaynak ve görsel notları

Görseller, MOS BARCODE 1.15.22'nin gerçek arayüzünden, yalnızca bu çekim için hazırlanmış örnek işletme verileriyle alındı. Ana uygulama kodu değiştirilmedi. Başlıklar ve açıklama kartları tasarım katmanıdır; uygulama ekranı uydurulmadı. Ekrandaki tutarlar kazanç vaadi değildir. Resimler yalnızca dijital yazılımı tanıtır; fiziksel kutu/donanım teslimi ima edilmez.

Resmî kalite standartları ürünün açıkça anlatılmasını, farklı e-ticaret sitesi isim/adreslerinin kullanılmamasını ve indirimlerin yanıltıcı olmamasını ister. Bu nedenle görseller ve kopyalanacak açıklama fiyat, telefon, WhatsApp veya dış site yönlendirmesi içermez. [7](https://akademi.trendyol.com/satici-bilgi-merkezi/detay/204)

Kaynaklar 24 Ekim 2026 tarihinde kontrol edildi. Üçüncü taraf bloglarda farklı ölçüler bulunduğundan teknik ölçüler için resmî V2 dokümanı esas alındı. Panelin güncel kategori koşulları ve onay sonucu belirleyicidir.
