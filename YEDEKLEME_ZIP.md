# Belgeler dahil ZIP yedeği — v1.15.13

- Tam ve Sadece Veri yedekleri ilgili faturalara bağlı PDF/fotoğrafları içerir. Eski localStorage fotoğrafları da toplanır. Sadece Ayarlar yedeği işletme belgesi içermez.
- ZIP içindeki `backup.json`, uygulama verileri ve fatura ID'siyle eşleştirilmiş base64 belgelerden oluşur. Base64 ham veriyi büyütür; ZIP sıkıştırması nihai boyutu azaltabilir.
- Otomatik/manuel yerel arşivler IndexedDB'de ZIP olarak tutulur; localStorage'da yalnızca küçük liste kalır. Süre ve 30 kayıt rotasyonu devam eder. Aynı cihazdaki yedek cihaz kaybına karşı korumaz: indirin, paylaşın veya isteğe bağlı bulut yedeğini etkinleştirin.
- Arşivden indirilen yedek, güncel belgeleri değil yedek alındığı andaki belgeleri içerir.
- Bulut şifreleme kapalıysa gerçek `.zip` yüklenir. Açıksa ZIP, mevcut AES-GCM korumasıyla `.mosbc` içinde taşınır. Eski şifreli bulut JSON'ları açılmaya devam eder. Parolayı güvenli saklayın.
- Yedek Yükle JSON ve ZIP kabul eder. Veri ve belge bütünlükleri denetlenir, onaydan sonra belgeler tek IndexedDB işlemiyle değiştirilir. Ayar yedeği belgeleri etkilemez. Eski JSON'da ek yoksa yeni belge yaratılmaz ve mevcut ekler silinmez.
- Dosya ve açılmış JSON sınırı 200 MB. Daha büyük arşivler açık hata verir. Depolama hatası başarı olarak gösterilmez; otomatik yedek son başarı zamanı ilerletilmez.
- Tam yedek müşteri bilgileri, fatura belgeleri ve entegrasyon ayarlarını içerebilir. Şifresiz ZIP'i herkese açık paylaşmayın.
- Gerçek Google Drive/Dropbox hesabıyla yükleme testi yapılmadı; paketleme, şifreli/eski format geri açma ve ikili HTTP aktarımı otomatik testlerle doğrulanır.
