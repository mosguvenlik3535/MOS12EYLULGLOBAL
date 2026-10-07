# Google Play: 1.000 satışlık demo — v1.15.21

- Paket: `com.mosbarkodyazilim.pos`; sürüm kodu: **11521**.
- Önceki 100 ürün sınırı ve Pro özellik kilitleri kaldırıldı.
- İlk 1.000 yeni tamamlanan normal satış / teslim edilmiş paket siparişi ücretsiz.
- İade, iptal, ödeme penceresini açma, sipariş taslağı ve geçmiş içe aktarma hak tüketmez.
- Limit dolunca yeni satış engellenir; mevcut kayıtlar, raporlar, ayarlar ve yedek erişimi korunur.
- Aktif `mos_pro_aylik` Google Play aboneliği sınırsız satış sağlar. Harici lisans ödeme ekranına yönlendirme yapılmaz.
- Fiyat, Play ürününün yerelleştirilmiş fiyatından alınır; yıllık seçenek vaat edilmez.
- Yeni sayaç eski satış geçmişinden bağımsızdır. Eski Play kurulumları güncellemede 1.000 yeni satış hakkıyla başlar.
- Sayaç uygulama içi veri temizleme / yedekten geri yükleme ile sıfırlanmaz. Bu **kurulum başına yerel** sayaçtır; uygulamayı kaldırma / Android uygulama verilerini silme / depolamaya müdahale karşısında sunucu koruması sağlamaz.
- Donanım, POS entegrasyonu ve dış servis gereksinimleri değişmez.

## Kontroller

- `npm test`: 26 dosya, 261 test başarılı.
- TypeScript `tsc --noEmit` başarılı; `VITE_PLAY=1 npm run build` başarılı.
- Gerçek Play derleme bayrağıyla Chromium UI testi: iptal edilen ödeme hakkı tüketmedi; 999 kullanımda son satış tamamlandı; 1001'inci satış Pro penceresiyle engellendi; limitte Ayarlar erişilebilir; yeniden yükleme ve iş veritabanını temizleme sayacı yenilemedi.
- Billing birim testleri taklit native köprü kullanır; gerçek cihaz satın alma doğrulaması değildir.

## Play Console'a yüklemeden önce

1. Önceki sürümden aynı imzayla güncelleme ve mevcut verileri kontrol edin.
2. İç test kanalında lisans test kullanıcısıyla satın alma, iptal, geri yükleme ve abonelik sona ermesini sınayın.
3. Console'daki en yüksek sürüm kodunun 11521'den küçük olduğunu doğrulayın; Console'a bu ortamdan erişilmedi.
4. Mağaza açıklamasından eski “100 ürün ücretsiz” metnini kaldırın. Önerilen metin:
   **“MOS BARCODE'u ilk 1.000 tamamlanmış satışta ücretsiz deneyin. Ürün sayısı sınırı yoktur. Demo sonrasında yeni satışlara Google Play Pro aboneliğiyle devam edin. Mevcut kayıtlarınıza, raporlarınıza ve yedeklerinize erişiminiz korunur.”**
5. GitHub'daki AAB'nin hazır olması Google Play'de yayımlandığı anlamına gelmez. Üretime gönderme ve Google onayı Console üzerinden tamamlanır.
