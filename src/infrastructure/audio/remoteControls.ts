import { Capability } from 'react-native-track-player';

/**
 * Oynatma kartındaki taşıma tuşları — tek karar noktası.
 * Ürün kararıdır, oynatıcı ayarı değil; servis yalnızca uygular.
 */

/**
 * iOS kartta en fazla üç tuş çizer ve iki çifti birden göstermez:
 * `episode` → ⏮ ⏯ ⏭, `seek` → ⏪ ⏯ ⏩. Seçim uygulama geneldir.
 */
export type RemoteControlLayout = 'episode' | 'seek';

/**
 * Bölüm değiştirme seçildi: araçta sarmadan daha sık gerekir ve sarma zaten
 * sürgüyle yapılabiliyor. Değiştirilirse tek yer burasıdır.
 */
export const REMOTE_CONTROL_LAYOUT: RemoteControlLayout = 'episode';

/** Apple Podcasts'in alışkanlık yarattığı sarma adımları. */
export const SEEK_FORWARD_SEC = 30;
export const SEEK_BACKWARD_SEC = 15;

/**
 * Kumandanın kabul ettiği komutlar.
 *
 * `Stop` yok: Apple onu canlı yayına ayırır ve duraklat yerine "durdur" karesi
 * çizebiliyor. `SeekTo` her düzende açık — sürgü tuşlardan bağımsızdır.
 */
export const remoteCapabilities = (layout: RemoteControlLayout): Capability[] => [
  Capability.Play,
  Capability.Pause,
  Capability.SeekTo,
  ...(layout === 'seek'
    ? [Capability.JumpForward, Capability.JumpBackward]
    : [Capability.SkipToNext, Capability.SkipToPrevious]),
];

/**
 * Android bildiriminde çizilen tuşlar. `SeekTo` dışarıda: tuş değil sürgüdür.
 */
export const notificationCapabilities = (layout: RemoteControlLayout): Capability[] =>
  remoteCapabilities(layout).filter(capability => capability !== Capability.SeekTo);
