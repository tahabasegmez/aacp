# Veritabanı Kurulumu

AACP'nin sunucu tarafını sıfırdan ayağa kaldırma rehberi. Sonunda çalışan bir
Supabase projesi, bir Cloudflare Worker ve dolu bir podcast katalogu olur.

> Uygulama sunucusuz da çalışır. `.env` içindeki `APP_API_BASE_URL` boşsa
> senkron, hesap, telemetri ve cihaz yönetimi sessizce kapanır; her şey cihazda
> kalır. Bu rehber yalnızca sunucu tarafını açmak istediğinde gerekir.

---

## 0. Veri nerede yaşıyor

Tek bir karar noktası vardır ve o da veri**nin ömrü**dür:

| Veri | Yer | Neden |
|---|---|---|
| Şovlar, bölümler | **Postgres** | İlişkisel, sorgulanır, sayfalanır, yönetilir |
| Profil, abonelik, ödeme | **Postgres** | Denetim izi ve işlem bütünlüğü ister |
| Takipler, listeler, "sonra dinle" | **Postgres** | "Bu şovu kimler takip ediyor" sorulur |
| Cihaz listesi | **Postgres** | Kullanıcıya gösterilen kalıcı kayıt |
| Kaldığın yer, tercihler, sıra | **Redis → KV → Postgres** | Yüksek yazma hacmi, ilişkisiz, anahtarla okunur |
| Kim çalıyor, ne çalıyor | **Redis (TTL 120 sn)** | Saniyeler içinde eskir, kaybolması zararsız |
| Profil fotoğrafları | **Supabase Storage** | Dosya |

Yerleşim tablosu kodda tek yerdedir: `worker/src/storage/resolveStore.ts`.
NoSQL koleksiyonları için **Redis yoksa KV, o da yoksa Postgres** kullanılır —
eksik yapılandırma servisi düşürmez.

> **Cloudflare KV, oynatma oturumu için kullanılamaz:** 60 saniyeye varan
> eventual consistency "kim çalıyor" sorusunu yanlış cevaplar. Redis yoksa
> oturum `playback_sessions` tablosuna düşer.

---

## 1. Supabase projesi

1. [supabase.com](https://supabase.com) → **New project**. Bölgeyi
   kullanıcılarına yakın seç (ör. Frankfurt).
2. **Project Settings → API** sayfasından şunları not al:
   - `Project URL` → `SUPABASE_URL` (gizli değil)
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_KEY` — **gizli**, RLS'i bypass eder
   - **JWT Settings → JWT Secret** → `SUPABASE_JWT_SECRET` — **gizli**
3. **Authentication → Providers → Email**'i aç.
4. **Authentication → Providers → Anonymous sign-ins**'i aç. Uygulama ilk
   açılışta anonim kullanıcı yaratır; kişi sonra e-posta ile hesaba yükselir ve
   anonimken biriken veri kaybolmaz.

---

## 2. Şemalar

`worker/supabase/` altındaki dosyaları **Supabase Studio → SQL Editor**'da
**sırayla** çalıştır. Hepsi `if not exists` / `create or replace` kullanır,
yani tekrar çalıştırmak güvenlidir.

| Sıra | Dosya | Ne kurar |
|---|---|---|
| 1 | `schema.sql` | `sync_records` (delta senkron), `push_registrations`, `analytics_events` |
| 2 | `schema-02-catalog-and-billing.sql` | `shows`, `episodes`, `profiles`, `subscriptions`, `payments`, `show_follows` |
| 3 | `schema-03-avatars.sql` | `avatars` storage kovası + politikaları |
| 4 | `schema-04-episode-paging.sql` | `published_sort` üretilmiş sütunu, imleç (keyset) indeksleri, arama için trigram indeksleri |
| 5 | `schema-05-feed-scan.sql` | `shows` üzerinde ETag / Last-Modified sütunları (koşullu istek) |
| 6 | `schema-07-playback-devices.sql` | `playback_devices`, `playback_sessions` (Redis yedeği) |

`schema-06` **yoktur** — numara atlanmıştır, eksik dosya arama.

`schema-07` aynı zamanda kendi eski sürümünü temizler (plpgsql fonksiyonları,
`active` sütunu, kısmi tekil indeks). Daha önce çalıştırdıysan tekrar çalıştır.

### Doğrulama

SQL Editor'da:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' order by table_name;
```

Beklenen: `analytics_events`, `episodes`, `payments`, `playback_devices`,
`playback_sessions`, `profiles`, `push_registrations`, `show_follows`, `shows`,
`subscriptions`, `sync_records`.

RLS her tabloda açık olmalı:

```sql
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' order by tablename;
```

> **Güvenlik ilkesi:** yetkilendirme uygulama kodunda değil, veritabanında
> zorunlu kılınır. Worker'da bir hata olsa bile bir kullanıcı başkasının
> satırlarını okuyamaz.

---

## 3. Redis (opsiyonel ama önerilir)

Kaldığın yer, tercihler, oynatma sırası ve oynatma oturumu için. Upstash
uyumlu **REST** arayüzü gerekir (Workers'ta TCP soketi yoktur).

1. [upstash.com](https://upstash.com) → **Create database** (Global önerilir).
2. **REST API** sekmesinden `UPSTASH_REDIS_REST_URL` ve
   `UPSTASH_REDIS_REST_TOKEN` değerlerini al → `REDIS_URL` ve `REDIS_TOKEN`.

Vermezsen KV'ye, o da yoksa Postgres'e düşer. Fark maliyettedir: Redis'te delta
senkron sıralı kümeyle yapılır ve maliyet **değişen** kayıt sayısıyla orantılı
olur; KV bunu desteklemediği için tüm anahtarları listeleyip tek tek okur.

---

## 4. Cloudflare Worker

```sh
cd worker
npm install
npx wrangler login
```

### 4.1 KV namespace ve kuyruk

```sh
npx wrangler kv namespace create USER_STATE      # çıkan id'yi wrangler.toml'a yaz
npx wrangler queues create aacp-feed-scan
```

Kuyruk **ücretsiz katmanda** saklama süresini değiştirmeye izin vermez; 24 saat
sabittir (`--message-retention-period-secs 86400`).

İkisi de opsiyoneldir: KV yoksa NoSQL koleksiyonları Postgres'e düşer, kuyruk
yoksa tarama sınırlı sayıda şov için satır içi çalışır.

### 4.2 Gizli değerler

Yerel geliştirme için `worker/.dev.vars.example` dosyasını `.dev.vars` olarak
kopyala ve doldur. Yayın için her birini ayrıca ekle:

```sh
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put SUPABASE_JWT_SECRET
npx wrangler secret put ADMIN_TOKEN          # openssl rand -hex 24
npx wrangler secret put REDIS_URL            # opsiyonel
npx wrangler secret put REDIS_TOKEN          # opsiyonel
npx wrangler secret put APNS_KEY             # opsiyonel (bildirim)
npx wrangler secret put APNS_KEY_ID
npx wrangler secret put APNS_TEAM_ID
```

Gizli olmayan ayarlar (`SUPABASE_URL`, `CORS_ORIGINS`, APNs bayrakları)
`wrangler.toml` içindeki `[vars]` bloğundadır.

> **`ADMIN_TOKEN` uygulamanın kök `.env`'ine ASLA yazılmaz.**
> `react-native-config` oradaki her değişkeni derlenen IPA'ya gömer; jeton
> uygulamayla birlikte dağıtılırdı.

### 4.3 Yayınla

```sh
npx wrangler dev        # yerel
npx wrangler deploy     # yayın
```

### Doğrulama

```sh
curl https://aacp-api.<hesabın>.workers.dev/health
```

```json
{
  "status": "ok",
  "supabase": true,
  "push": false,
  "storage": {
    "progress": "redis", "preferences": "redis", "queue": "redis",
    "follows": "postgres", "playlists": "postgres", "saved": "postgres"
  }
}
```

`supabase: false` görüyorsan anahtarlar eksik. `storage` alanı hangi deponun
devrede olduğunu söyler — `"postgres (NoSQL bağlı değil)"` yazıyorsa ne Redis
ne KV bağlı demektir.

---

## 5. Katalogu doldurma

Katalog **tek kaynaktan** gelir: sunucudaki `shows` tablosu. Uygulamaya gömülü
şov listesi yoktur.

RSS adreslerinden otomatik aktarım — başlık, açıklama, kapak ve bölümler
feed'den okunur:

```sh
curl -X POST https://<worker>/v1/catalog/import \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedUrls":["https://feeds.example.com/bir-bakista"]}'
```

Sonra bölümleri indirmek için tam tarama (arşivin tamamı):

```sh
curl -X POST https://<worker>/v1/push/scan \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backfill":true}'
```

`backfill` **bir kez** çalıştırılır. Rutin cron turu (30 dakikada bir) yalnızca
yeni bölümlere bakar ve koşullu istekle değişmeyen feed'leri hiç indirmez.

Doğrula:

```sql
select count(*) from public.shows;
select show_slug, count(*) from public.episodes group by 1 order by 2 desc;
```

Ya da uçtan uca:

```sh
curl https://<worker>/v1/catalog
```

---

## 6. Uygulamayı bağla

Kökteki `.env.example`'ı `.env` olarak kopyala:

```ini
APP_ENV=development
APP_API_BASE_URL=https://aacp-api.<hesabın>.workers.dev
```

Değerler **derleme zamanında** gömülür — değiştirdikten sonra Metro'yu yeniden
başlatmak yetmez, uygulamayı yeniden derle.

---

## Sorun giderme

| Belirti | Sebep |
|---|---|
| `/health` → `supabase: false` | `SUPABASE_ANON_KEY` veya `SUPABASE_URL` eksik |
| `storage` → `postgres (NoSQL bağlı değil)` | Ne Redis ne KV bağlı; çalışır ama pahalı |
| Uygulama bölümleri RSS'ten çekiyor | Sunucu erişilemiyor ya da `schema-04` çalıştırılmamış; istemci sessizce RSS yedeğine düşer |
| `permission denied for table …` | RLS açık ama politika yok — ilgili şemayı tekrar çalıştır |
| Katalog boş | `/v1/catalog/import` çalıştırılmamış |
| Bölüm yok ama şovlar var | `push/scan` `backfill:true` ile çalıştırılmamış |
| Cihazlar birbirini görmüyor | İki cihaz da **aynı hesaba** girmiş olmalı; misafir her cihazda ayrı kimliktir |
| Yönetim ucu 401 | `x-admin-token` başlığı yok ya da `ADMIN_TOKEN` sırrı yayınlanmamış |
