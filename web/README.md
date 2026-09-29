# MOSBARKOD.COM.TR — MOS POS satış sitesi

Statik HTML/CSS/JS; sunucu veya ödeme kartı verisi toplama yok. Masaüstü öncelikli, responsive Türkçe tasarım.

## Yayın
Mevcut PWA adresini değiştirmeden Pages tanıtımı: https://mosguvenlik3535.github.io/MOS12EYLULGLOBAL/web/

`web/` içeriğini hostinginizin alan adı köküne (`public_html` veya sağlayıcınızın karşılığı) yükleyerek MOSBARKOD.COM.TR üzerinde sunabilirsiniz. HTTPS sertifikası ve DNS, alan adı/hosting panelinden yapılandırılmalıdır. Bu çalışma alan adının DNS veya hosting ayarlarını değiştirmez. Mevcut repo Pages kökünde PWA bulunduğu için körlemesine CNAME eklemeyin; aksi halde program adresini taşırsınız.

Yerel ön izleme: `python3 -m http.server 8080 --bind 0.0.0.0 --directory web`

## Satış ve indirmeler
- Doğrudan Windows/Android demo paketleri v1.15.18: 25 tamamlanmış satış; kredi kartı istenmez.
- macOS/Linux/PWA bağlantıları ayrı demo olarak sunulmaz; lisans gerekebilir.
- Full Pro: kullanıcının talep ettiği tek seferlik/ömür boyu model. Fiyat uydurulmadı; WhatsApp üzerinden teklif talebi. Site ödeme almaz.
- Cihaz sayısı, destek/güncelleme kapsamı ve lisans taşıma teklif aşamasında belirlenmelidir. Play Store aboneliği ayrı kanaldır; bu site programdaki Play Billing ayarlarını değiştirmez.
- Masaüstü hero paneli temsili HTML görselleştirmedir; örnek rakamlar müşteri/performans iddiası değildir. Mobil ekranlar depodaki uygulama görüntüleridir.

## Yayın öncesi ticari tamamlamalar
Fiyat/KDV, satıcı ticari unvanı ve adresi, fatura/ödeme altyapısı, cihaz sınırı, destek ve yükseltme koşulları, satış/ön bilgilendirme/iade metinleri onaylanmalıdır. Bunlar olmadan otomatik ödeme açılmadı.

## Güncelleme
İndirme sürümü ve linkleri `index.html` içinde birlikte güncelleyin. Stiller `assets/css/style.css`, menü ve klavyeyle kullanılabilen ekran sekmeleri `assets/js/main.js` içindedir. Eski çeviri sözlüğü bu tasarımda yüklenmez; yeni metinlerin EN/DE sürümleri henüz hazırlanmadı.
