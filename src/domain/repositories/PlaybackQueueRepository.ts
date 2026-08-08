import { Result } from '@core/error';
import { QueueItem } from '../services';

/** Cihazda saklanan kuyruk — sıra, çalan konum ve değişiklik zamanı. */
export interface StoredQueue {
  readonly items: readonly QueueItem[];
  /** Çalan öğenin konumu; kuyruk boşsa `-1`. */
  readonly index: number;
  /** Son değişiklik (epoch ms) — senkronda son-yazan-kazanır için. */
  readonly updatedAt: number;
}

/**
 * PlaybackQueueRepository — kuyruğun KALICI kopyasının portu.
 *
 * Kuyruğun çalışan hâli oynatıcıdadır (`AudioPlayerService`); bu port yalnızca
 * onu uygulama kapanışına dayanıklı kılar ve hesap açıkken cihazlar arasında
 * taşır. İkisi karıştırılmamalı: oynatıcı "şu an ne çalıyor"un, bu depo
 * "en son neyi sıraya almıştık"ın kaynağıdır.
 */
export interface PlaybackQueueRepository {
  /** Saklanan kuyruk; hiç yazılmadıysa null. */
  get(): Promise<Result<StoredQueue | null>>;

  /** Kuyruğu olduğu gibi yazar (sıra bir bütündür). */
  save(items: readonly QueueItem[], index: number): Promise<Result<void>>;

  /** Kimlik değişiminde kuyruğu siler. */
  clear(): Promise<Result<void>>;
}
