import { KeyValueStorage } from '@core/ports';
import { StoredQueue } from '@domain/repositories';
import { QUEUE_STORAGE_KEY } from '../repositories/PlaybackQueueRepositoryImpl';
import { SyncCollection, SyncCollectionAdapter, SyncRecord } from './SyncTypes';

/**
 * Kuyruğun senkron anahtarı.
 *
 * Kullanıcı başına TEK kayıt vardır: kuyruk bir SIRADIR ve öğelerini ayrı ayrı
 * senkronlamak sıralamayı bozardı — 3. sırayı silen cihazla 2. sıraya ekleyen
 * cihazın kayıtları birleşince kimsenin kurmadığı bir sıra çıkardı. Sıra bir
 * bütün olarak taşınır, son yazan kazanır.
 */
const QUEUE_RECORD_KEY = 'current';

/**
 * QueueSyncAdapter — "sıraya eklenenler"in senkron adaptörü.
 *
 * Kuyruk, kullanıcının kütüphane verisidir: telefonda sıraya aldığı bölüm
 * tabletinde de sırada olmalıdır. Yerleşimi sunucuda `progress` ile aynıdır
 * (NoSQL/Redis): yazma hacmi yüksektir — her sürükle-bırak, her ekleme bir
 * yazmadır — ve ilişkisel bir sorgusu yoktur.
 *
 * MİSAFİRDE hiç gönderilmez; taşıma katmanı hesap yoksa kapalıdır
 * (bkz. ApiSyncTransport).
 */
export class QueueSyncAdapter implements SyncCollectionAdapter {
  readonly collection: SyncCollection = 'queue';

  constructor(private readonly storage: KeyValueStorage) {}

  async localChanges(since: number): Promise<readonly SyncRecord[]> {
    const stored = this.read();
    if (!stored || stored.updatedAt <= since) {
      return [];
    }
    return [
      {
        key: QUEUE_RECORD_KEY,
        value: JSON.stringify({ items: stored.items, index: stored.index }),
        updatedAt: stored.updatedAt,
        deleted: false,
      },
    ];
  }

  async applyRemote(records: readonly SyncRecord[]): Promise<void> {
    const record = records.find(item => item.key === QUEUE_RECORD_KEY);
    if (!record) {
      return;
    }

    const local = this.read();
    // Yerelde daha yeni bir sıra varsa uzak veri yok sayılır.
    if (local && record.updatedAt <= local.updatedAt) {
      return;
    }

    if (record.deleted) {
      this.storage.delete(QUEUE_STORAGE_KEY);
      return;
    }

    const parsed = parseQueue(record.value);
    if (!parsed) {
      return;
    }
    this.storage.set(
      QUEUE_STORAGE_KEY,
      JSON.stringify({ ...parsed, updatedAt: record.updatedAt }),
    );
  }

  async clearLocal(): Promise<void> {
    this.storage.delete(QUEUE_STORAGE_KEY);
  }

  private read(): StoredQueue | null {
    const raw = this.storage.getString(QUEUE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as StoredQueue | null;
      return parsed && Array.isArray(parsed.items) ? parsed : null;
    } catch {
      return null;
    }
  }
}

/** Uzak gövdeyi çözer; bozuk kayıt yerel kuyruğu kirletmesin. */
const parseQueue = (json: string): Pick<StoredQueue, 'items' | 'index'> | null => {
  try {
    const parsed = JSON.parse(json) as Partial<StoredQueue> | null;
    if (!parsed || !Array.isArray(parsed.items)) {
      return null;
    }
    return {
      items: parsed.items.filter(item => !!item?.episode?.id),
      index: typeof parsed.index === 'number' ? parsed.index : -1,
    };
  } catch {
    return null;
  }
};
