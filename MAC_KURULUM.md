# MOS POS — Mac kurulumu

- **Apple Silicon (M serisi):** `MOS-POS-1.15.11-arm64.dmg`
- **Intel:** `MOS-POS-1.15.11-x64.dmg`

İşlemcinizi Apple menüsü → Bu Mac Hakkında ekranından öğrenebilirsiniz.
Electron 31 tabanı macOS 10.15 ve üzerini gerektirir; Apple Silicon cihazlarda macOS 11 ve üzeri kullanılır.

1. İşlemcinize uygun DMG dosyasını resmi GitHub sürüm sayfasından indirin.
2. DMG'yi açıp uygulamayı Applications / Uygulamalar klasörüne sürükleyin.
3. Uygulamalar klasöründen açın. Uygulama dosyasının adı uyumluluk için MOSBARKODYAZILIM; ekran adı MOS POS'tur.
4. Barkod taramak için istendiğinde kamera iznini verin.

## İmza ve güvenlik

Bu paketler Apple Developer ID ile imzalanmamıştır ve Apple noter onayı yoktur.
macOS tanınmayan geliştirici uyarısıyla açılışı engelleyebilir. Yalnızca resmi kaynaktan indirdiğiniz dosyaya güveniyorsanız macOS'un Sistem Ayarları → Gizlilik ve Güvenlik ekranındaki uygulamaya özel açma iznini kullanın. Gatekeeper'ı sistem genelinde kapatmayın. Kurumsal cihaz politikaları açılışı engelleyebilir.

CI her iki işlemci paketi için derleme, uygulama mimarisi ve Info.plist kontrollerini yapar. Bu, gerçek Mac üzerinde kamera, yazıcı, lisans ve uçtan uca kullanıcı testi yapıldığı anlamına gelmez. Yazıcı için macOS sürücüsü veya ağ yazıcısı gerekebilir.

Pencereyi kapatmak Mac'te uygulamayı sonlandırmaz; Dock simgesinden tekrar açabilirsiniz. Tam çıkış için Cmd+Q kullanın.
