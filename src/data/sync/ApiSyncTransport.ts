import { ApiClient } from '@infrastructure/api';
import { SyncRecord } from './SyncTypes';
import { SyncTransport } from './SyncEngine';

interface PullResponse {
  readonly records?: SyncRecord[];
  readonly cursor?: number;
}

interface PushResponse {
  readonly cursor?: number;
}

/** Senkronun ihtiyaç duyduğu kimlik bilgisi. */
export interface AccountPresence {
  /** Cihazda bir HESAP oturumu var mı? (misafir sayılmaz) */
  hasAccount(): boolean;
}

/**
 * ApiSyncTransport — SyncTransport'un AACP backend implementasyonu.
 *
 * Motor ile ağ ayrıntılarını ayırır: farklı bir senkron sağlayıcısına
 * (ör. iCloud/CloudKit) geçilmek istenirse yalnızca bu sınıfın muadili yazılır.
 *
 * **MİSAFİR VERİSİ CİHAZDA KALIR.** Taşıma yalnızca sunucu yapılandırılmışsa
 * VE bir hesap oturumu varsa açıktır. Uygulama her API çağrısında cihaz
 * kimliğiyle anonim bir oturum açabiliyor (katalog, telemetri, bildirim bunu
 * kullanır); bu oturum senkronu da açık tutunca misafirin kaldığı yeri,
 * listeleri ve takipleri sunucuya yazılıyordu. Kütüphane verisi bir HESABA
 * aittir: hesap yoksa gidecek bir yer de yoktur.
 *
 * Kayıt olurken veri kaybolmaz: `SyncEngine.adoptLocalInto()` imleçleri
 * sıfırlayıp tüm yerel veriyi hesaba yükler ve o an hesap çoktan açılmıştır.
 */
export class ApiSyncTransport implements SyncTransport {
  constructor(
    private readonly api: ApiClient,
    private readonly account: AccountPresence,
  ) {}

  get enabled(): boolean {
    return this.api.enabled && this.account.hasAccount();
  }

  async pull(collection: string, since: number): Promise<{ records: SyncRecord[]; cursor: number }> {
    const response = await this.api.get<PullResponse>(
      `/v1/sync/${encodeURIComponent(collection)}?since=${since}`,
    );
    return {
      records: response?.records ?? [],
      cursor: response?.cursor ?? since,
    };
  }

  async push(collection: string, records: readonly SyncRecord[]): Promise<{ cursor: number }> {
    const response = await this.api.post<PushResponse>(
      `/v1/sync/${encodeURIComponent(collection)}`,
      { records },
    );
    return { cursor: response?.cursor ?? 0 };
  }
}
