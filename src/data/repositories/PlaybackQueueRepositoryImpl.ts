import { AppError, Result, fail, ok } from '@core/error';
import { KeyValueStorage } from '@core/ports';
import { PlaybackQueueRepository, StoredQueue } from '@domain/repositories';
import { QueueItem } from '@domain/services';

/** Kuyruğun saklandığı storage anahtarı. */
export const QUEUE_STORAGE_KEY = 'playback_queue_v1';

/**
 * PlaybackQueueRepositoryImpl — kuyruğun cihazdaki kalıcı kopyası.
 *
 * Kuyruğun ÇALIŞAN hâli oynatıcıda yaşar (bkz. AudioPlayerService); burası
 * yalnızca uygulama kapanınca kaybolmaması için tutulan yedektir. Açılışta
 * oynatıcıya geri yüklenir.
 *
 * TEK KAYIT olarak saklanır (`current`): kuyruk bir sıradır, öğeleri ayrı ayrı
 * senkronlamak sıralamayı iki cihaz arasında bozardı — 3. sırayı silen cihazla
 * 2. sıraya ekleyen cihazın kayıtları birleşince ortaya kimsenin kurmadığı bir
 * sıra çıkardı. Sıra bir bütündür; son yazan kazanır.
 */
export class PlaybackQueueRepositoryImpl implements PlaybackQueueRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  async get(): Promise<Result<StoredQueue | null>> {
    try {
      return ok(this.read());
    } catch (error) {
      return fail(AppError.from(error, 'STORAGE'));
    }
  }

  /**
   * Kuyruğu yazar — İÇERİK GERÇEKTEN DEĞİŞTİYSE.
   *
   * Değişmemiş bir sırayı yeniden yazmak `updatedAt`'i ileri alırdı ve bu
   * senkronda zarar verir: uygulama her açılışta saklanan kuyruğu oynatıcıya
   * geri yükler, bu da arayüz yansımasını (ve buradan kaydı) tetikler. Damga
   * her açılışta tazelenseydi, hiçbir şey değişmemiş olsa bile yerel kayıt
   * "en yeni" sayılıp BAŞKA CİHAZDA kurulmuş daha yeni bir sırayı ezerdi.
   */
  async save(items: readonly QueueItem[], index: number): Promise<Result<void>> {
    try {
      const existing = this.read();
      if (existing && existing.index === index && sameItems(existing.items, items)) {
        return ok(undefined);
      }
      const stored: StoredQueue = { items: [...items], index, updatedAt: Date.now() };
      this.storage.set(QUEUE_STORAGE_KEY, JSON.stringify(stored));
      return ok(undefined);
    } catch (error) {
      return fail(AppError.from(error, 'STORAGE'));
    }
  }

  async clear(): Promise<Result<void>> {
    try {
      this.storage.delete(QUEUE_STORAGE_KEY);
      return ok(undefined);
    } catch (error) {
      return fail(AppError.from(error, 'STORAGE'));
    }
  }

  private read(): StoredQueue | null {
    const raw = this.storage.getString(QUEUE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredQueue> | null;
    if (!parsed || !Array.isArray(parsed.items)) {
      return null;
    }
    return {
      // Bozuk/eksik öğeler atlanır: yarım bir bölümle kuyruk kurmak, dokununca
      // çalmayan bir satır demek olurdu.
      items: parsed.items.filter(item => !!item?.episode?.id),
      index: typeof parsed.index === 'number' ? parsed.index : -1,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  }
}

/**
 * İki sıra aynı mı? Kimlik ve kaynak karşılaştırılır.
 *
 * Bölüm gövdesinin tamamı değil: başlık/kapak gibi alanlar katalog
 * tazelendiğinde değişebilir ve bu, kullanıcının SIRASININ değiştiği anlamına
 * gelmez.
 */
const sameItems = (a: readonly QueueItem[], b: readonly QueueItem[]): boolean =>
  a.length === b.length &&
  a.every(
    (item, i) => item.episode.id === b[i].episode.id && item.source === b[i].source,
  );
