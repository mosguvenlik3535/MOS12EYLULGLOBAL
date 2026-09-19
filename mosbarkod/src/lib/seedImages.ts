/* ---------- gömülü örnek ürün görselleri (v1.14.4) ----------
 *
 * Örnek (seed) ürünlerin fotoğrafları eskiden images.pexels.com adresinden
 * internet üzerinden çekiliyordu. İnternet erişimi olmayan ya da CDN
 * isteğini engelleyen cihazlarda — özellikle Play Store / Android
 * sürümünde — ürün kartları tamamen resimsiz kalıyordu.
 *
 * Görseller artık derleme sırasında uygulamanın içine gömülüyor
 * (`?inline` → data URL), yani internet olmadan da her cihazda görünür.
 *
 * Kullanıcının kendi eklediği görseller (data URL / yerel dosya / kendi
 * URL'si) hiç değiştirilmez, olduğu gibi kullanılır.
 */

import antepFistigi from '../assets/urunler/antep-fistigi.jpg?inline';
import ayran from '../assets/urunler/ayran.jpg?inline';
import biraAcik from '../assets/urunler/bira-acik.jpg?inline';
import biraKutu from '../assets/urunler/bira-kutu.jpg?inline';
import biraKutu2 from '../assets/urunler/bira-kutu-2.jpg?inline';
import biraSise from '../assets/urunler/bira-sise.jpg?inline';
import cay from '../assets/urunler/cay.jpg?inline';
import cikolataBitter from '../assets/urunler/cikolata-bitter.jpg?inline';
import cikolataKaramelli from '../assets/urunler/cikolata-karamelli.jpg?inline';
import cikolataSutlu from '../assets/urunler/cikolata-sutlu.jpg?inline';
import cips from '../assets/urunler/cips.jpg?inline';
import cipsBaharatli from '../assets/urunler/cips-baharatli.jpg?inline';
import cipsNacho from '../assets/urunler/cips-nacho.jpg?inline';
import cipsPatates from '../assets/urunler/cips-patates.jpg?inline';
import domates from '../assets/urunler/domates.jpg?inline';
import dondurmaBar from '../assets/urunler/dondurma-bar.jpg?inline';
import dondurmaCilekli from '../assets/urunler/dondurma-cilekli.jpg?inline';
import dondurmaKakaolu from '../assets/urunler/dondurma-kakaolu.jpg?inline';
import dondurmaKulah from '../assets/urunler/dondurma-kulah.jpg?inline';
import dondurmaVanilya from '../assets/urunler/dondurma-vanilya.jpg?inline';
import gofret from '../assets/urunler/gofret.jpg?inline';
import kahveFiltre from '../assets/urunler/kahve-filtre.jpg?inline';
import kahveTelve from '../assets/urunler/kahve-telve.jpg?inline';
import ekmek from '../assets/urunler/ekmek.jpg?inline';
import elma from '../assets/urunler/elma.jpg?inline';
import limon from '../assets/urunler/limon.jpg?inline';
import maydanoz from '../assets/urunler/maydanoz.jpg?inline';
import muz from '../assets/urunler/muz.jpg?inline';
import patates from '../assets/urunler/patates.jpg?inline';
import fistik from '../assets/urunler/fistik.jpg?inline';
import kola from '../assets/urunler/kola.jpg?inline';
import kuruyemisKarisik from '../assets/urunler/kuruyemis-karisik.jpg?inline';
import misirCerez from '../assets/urunler/misir-cerez.jpg?inline';
import rakiBuyuk from '../assets/urunler/raki-buyuk.jpg?inline';
import rakiKucuk from '../assets/urunler/raki-kucuk.jpg?inline';
import salatalik from '../assets/urunler/salatalik.jpg?inline';
import sigara from '../assets/urunler/sigara.jpg?inline';
import sigaraAltin from '../assets/urunler/sigara-altin.jpg?inline';
import sigaraKirmizi from '../assets/urunler/sigara-kirmizi.jpg?inline';
import sogan from '../assets/urunler/sogan.jpg?inline';
import viski1 from '../assets/urunler/viski-1.jpg?inline';
import viski2 from '../assets/urunler/viski-2.jpg?inline';

export const SEED_IMAGES = {
  antepFistigi,
  ayran,
  biraAcik,
  biraKutu,
  biraKutu2,
  biraSise,
  cay,
  cikolataBitter,
  cikolataKaramelli,
  cikolataSutlu,
  cips,
  cipsBaharatli,
  cipsNacho,
  cipsPatates,
  domates,
  dondurmaBar,
  dondurmaCilekli,
  dondurmaKakaolu,
  dondurmaKulah,
  dondurmaVanilya,
  ekmek,
  elma,
  fistik,
  gofret,
  kahveFiltre,
  kahveTelve,
  kola,
  kuruyemisKarisik,
  limon,
  maydanoz,
  misirCerez,
  muz,
  patates,
  rakiBuyuk,
  rakiKucuk,
  salatalik,
  sigara,
  sigaraAltin,
  sigaraKirmizi,
  sogan,
  viski1,
  viski2,
} as const;

/* Eski kayıtlarda (kullanıcının localStorage'ındaki envanter dahil) ürün
   görselleri pexels adresi olarak saklanıyor. Fotoğraf kimliğine göre
   gömülü görsele çeviriyoruz — böylece eski kurulumlar da otomatik
   düzelir, kullanıcı bir şey yapmak zorunda kalmaz. */
const PEXELS_ID_TO_LOCAL: Record<string, string> = {
  '15875047': SEED_IMAGES.biraKutu, // Tuborg Gold (kutu bira)
  '20329457': SEED_IMAGES.biraSise, // Efes Malt (şişe bira)
  '30664243': SEED_IMAGES.biraAcik, // Corona Extra (açık renk şişe)
  '33123450': SEED_IMAGES.rakiKucuk, // Yeni Rakı 5cl
  '33123433': SEED_IMAGES.rakiBuyuk, // Bozcaada 70cl
  '31758683': SEED_IMAGES.viski1, // Ballantine's
  '34630638': SEED_IMAGES.viski2, // Chivas Regal
  '32651589': SEED_IMAGES.sigara, // Sigara & Tütün
  '10812066': SEED_IMAGES.kola, // Coca-Cola / Meşrubat
  '19141651': SEED_IMAGES.cips, // Cips
  '7375283': SEED_IMAGES.misirCerez, // Mısır Atıştırmalık
  '38935853': SEED_IMAGES.kuruyemisKarisik, // Karışık Lüks Kuru Yemiş
  '8023869': SEED_IMAGES.fistik, // Tuzlu Fıstık
  '10112101': SEED_IMAGES.antepFistigi, // Kavrulmuş Antep Fıstığı
};

/** Ürün görselini çözer: bilinen eski pexels adreslerini gömülü görselle
 *  değiştirir, diğer tüm kaynakları (kullanıcının kendi görselleri) aynen döner. */
export function resolveProductImage(src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  const m = /images\.pexels\.com\/photos\/(\d+)/.exec(src);
  if (m) return PEXELS_ID_TO_LOCAL[m[1]] ?? src;
  return src;
}
