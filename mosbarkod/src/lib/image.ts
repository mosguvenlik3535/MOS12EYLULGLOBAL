/**
 * Yerel görsel işleme yardımcıları.
 * Ürün görselleri sıkıştırılıp (yeniden boyutlandırılıp) dataURL olarak
 * saklanır; böylece internet olmadan da çalışır ve depolama az yer kaplar.
 */

/**
 * Dosyayı okuyup, belirtilen en büyük kenara ölçekleyip JPEG dataURL'e çevirir.
 * PNG/WebP girişleri de kabul edilir; çıktı daima sıkıştırılmış JPEG'tir.
 */
export function fileToDataUrl(file: File, maxDim = 512, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height, 1));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas-desteklenmiyor'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('goruntu-okunamadi'));
    };
    img.src = url;
  });
}
