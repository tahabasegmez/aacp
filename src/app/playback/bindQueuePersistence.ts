import { Logger } from '@core/logger';
import { PlaybackQueueRepository } from '@domain/repositories';
import { AudioPlayerService } from '@domain/services';
import { usePlayerQueueStore } from '@presentation/stores';
import { syncQueueFromPlayer } from '@presentation/features/player/syncQueueFromPlayer';

/**
 * bindQueuePersistence — kuyruğu cihazda kalıcı kılar ve açılışta geri yükler.
 *
 * Kuyruğun çalışan hâli oynatıcının belleğindedir; uygulama kapanınca kaybolur.
 * Kullanıcının elle sıraya aldığı bölümler ise bir NİYETTİR ve uygulamayı
 * kapatmakla silinmemeli.
 *
 * İki yön vardır ve ikisi de tek bir yerden geçer:
 *
 *  - **Yazma**: arayüz yansıması her değiştiğinde (`playerQueueStore`) kuyruk
 *    diske yazılır. O store, kuyruğu değiştiren HER yolun — uygulama içi
 *    eylemler, kilit ekranı, araç, bölüm sonu — buluştuğu noktadır, bu yüzden
 *    ayrı ayrı kancalamak gerekmez.
 *  - **Okuma**: açılışta saklanan kuyruk oynatıcıya geri yüklenir (çalmadan).
 *
 * Hesap açıkken aynı kayıt sunucuya da gider (`QueueSyncAdapter`); misafirde
 * yalnızca cihazda kalır (bkz. ApiSyncTransport).
 */
export const bindQueuePersistence = (deps: {
  audioPlayer: AudioPlayerService;
  queueRepository: PlaybackQueueRepository;
  logger: Logger;
}): (() => void) => {
  const { queueRepository, logger } = deps;

  // Açılışta geri yükleme, ateşle-unut: arayüz kuyruğu beklemeden açılır.
  void restore(deps).catch(error => {
    logger.warn('Kuyruk geri yüklenemedi', error);
  });

  return usePlayerQueueStore.subscribe(state => {
    void queueRepository.save(state.items, state.index).then(result => {
      if (!result.ok) {
        logger.warn('Kuyruk kaydedilemedi', result.error);
      }
    });
  });
};

/** Saklanan kuyruğu oynatıcıya yükler ve arayüzü tazeler. */
const restore = async (deps: {
  audioPlayer: AudioPlayerService;
  queueRepository: PlaybackQueueRepository;
}): Promise<void> => {
  const stored = await deps.queueRepository.get();
  if (!stored.ok || !stored.value || stored.value.items.length === 0) {
    return;
  }

  // Oynatıcı KURULMADAN kuyruk verilemez: kütüphane `player_not_initialized`
  // ile reddeder ve kuyruk sessizce geri yüklenmemiş olurdu. `setup()` tekrar
  // çağrılabilir ve süren kurulumu bekler, bu yüzden burada beklemek güvenli.
  await deps.audioPlayer.setup();

  await deps.audioPlayer.restoreQueue(stored.value.items, stored.value.index);
  await syncQueueFromPlayer(deps.audioPlayer);
};
