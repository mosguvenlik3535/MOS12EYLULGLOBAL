# GitHub dışı indirme yayını

## Önerilen düzen
- Satış sitesi: `https://mosbarkod.com.tr`
- Dosya dağıtımı: `https://indir.mosbarkod.com.tr`
- Depolama: Cloudflare R2, sadece halka açık kurulum dosyaları için ayrı bucket.

Henüz bucket, DNS veya alternatif indirme URL'si etkinleştirilmedi. Mevcut web bağlantıları GitHub'da kalır; yükleme/HTTPS/indirme doğrulanmadan değiştirilmez.

## Kurulum sırası
1. Cloudflare hesabında alan adınızın DNS düzenini kontrol edin. R2 özel alan adı için alan adı zone'u aynı hesapta bulunmalıdır. Mevcut sitenin ve e-postanın A/CNAME/MX/TXT kayıtlarını koruyun; nameserver değişikliğini plansız yapmayın.
2. R2'de `mospos-downloads` gibi ayrı bir bucket oluşturun. İçine sadece kamuya açık EXE/APK/DMG/AppImage/PWA ZIP koyun; lisans anahtarları, müşteri yedekleri, PDF faturalar ve kimlik bilgileri kesinlikle koymayın.
3. v1.15.19 sürümünden Windows Demo Setup, Demo Portable ve Android Demo APK dosyalarını alın. İsterseniz tam sürüm kurulumlarını da taşıyın. Dosya adlarını değiştirmeden `v1.15.19/` klasörüne yükleyin.
4. R2 → bucket → Settings → Custom Domains → Add yoluyla `indir.mosbarkod.com.tr` bağlayın. Durum Active ve HTTPS hazır olmadan bağlantıları yayına almayın. `r2.dev` üretim yayını için önerilmez.
5. EXE için `application/octet-stream`, APK için `application/vnd.android.package-archive` içerik türü; gerekirse `Content-Disposition: attachment` kullanın. Sürümlü dosyaları değiştirip üstüne yazmayın; yeni sürüm için yeni klasör açın.
6. Aşağıdaki üç URL'yi Windows ve Android gerçek cihazlarda indirerek sınayın. Orijinal ve indirilen dosyanın SHA-256 değerini karşılaştırın. Tarayıcı/işletim sistemi güvenlik uyarılarını gizlemeyin; dosyaları imzalama konusu ayrı bir iştir.
7. `index.html` içindeki üç `data-download` bağlantısını doğrulanan URL'lerle değiştirin. Aynı sayfadaki sürüm metnini de güncelleyin. Özellik sayfası indirme için ana sayfaya yönlendiğinden tek noktadan yönetilir.

## Yayına alınacak URL düzeni (şu an aktif bağlantı değildir)
```
https://indir.mosbarkod.com.tr/v1.15.19/MOSBARKODYAZILIM-Demo-Setup-1.15.19.exe
https://indir.mosbarkod.com.tr/v1.15.19/MOSBARKODYAZILIM-Demo-Portable-1.15.19.exe
https://indir.mosbarkod.com.tr/v1.15.19/app-debug-demo.apk
```

## Hosting alternatifi
Hostinginiz yeterli dosya boyutu, depolama ve trafik sağlıyorsa aynı dosyaları sitenin `/indir/v1.15.19/` dizinine yükleyebilirsiniz. Özellikle EXE/APK sunma politikası, aylık trafik ve bağlantı hızı sağlayıcıyla teyit edilmelidir. Büyük dosyalar için R2'yi web hostinginden ayrı tutmak tercih edilir.

Güncel R2 ücretlerini kullanmadan önce sağlayıcıdan kontrol edin; ücretsiz/sınırsız kullanım taahhüdü yoktur. Hesap ve ödeme bilgilerini sohbet üzerinden paylaşmayın.

Resmî kurulum belgesi: https://developers.cloudflare.com/r2/buckets/public-buckets/
