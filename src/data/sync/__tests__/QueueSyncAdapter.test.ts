import { InMemoryKeyValueStorage } from '@infrastructure';
import { QueueSyncAdapter } from '../QueueSyncAdapter';

const KEY = 'playback_queue_v1';

const stored = (ids: string[], index: number, updatedAt: number) =>
  JSON.stringify({
    items: ids.map(id => ({
      episode: { id, showId: 's', title: id, description: '', audioUrl: `u/${id}`, durationSec: 1, publishedAt: '' },
      source: 'context',
    })),
    index,
    updatedAt,
  });

const makeSut = () => {
  const storage = new InMemoryKeyValueStorage();
  return { storage, adapter: new QueueSyncAdapter(storage) };
};

describe('QueueSyncAdapter', () => {
  it('kuyruğu TEK kayıt olarak gönderir', async () => {
    const { storage, adapter } = makeSut();
    storage.set(KEY, stored(['a', 'b'], 1, 100));

    const changes = await adapter.localChanges(50);

    expect(changes).toHaveLength(1);
    expect(changes[0].key).toBe('current');
    expect(JSON.parse(changes[0].value).index).toBe(1);
  });

  it('damga imleçten eskiyse gönderilmez', async () => {
    const { storage, adapter } = makeSut();
    storage.set(KEY, stored(['a'], 0, 100));

    expect(await adapter.localChanges(100)).toHaveLength(0);
  });

  it('daha yeni uzak sıra yereli değiştirir', async () => {
    const { storage, adapter } = makeSut();
    storage.set(KEY, stored(['a'], 0, 100));

    await adapter.applyRemote([
      { key: 'current', value: stored(['x', 'y'], 1, 0), updatedAt: 200, deleted: false },
    ]);

    const raw = JSON.parse(storage.getString(KEY) as string);
    expect(raw.items.map((i: { episode: { id: string } }) => i.episode.id)).toEqual(['x', 'y']);
    expect(raw.updatedAt).toBe(200);
  });

  it('yerelde daha yeni sıra varsa uzak yok sayılır', async () => {
    const { storage, adapter } = makeSut();
    storage.set(KEY, stored(['a'], 0, 300));

    await adapter.applyRemote([
      { key: 'current', value: stored(['x'], 0, 0), updatedAt: 200, deleted: false },
    ]);

    const raw = JSON.parse(storage.getString(KEY) as string);
    expect(raw.items.map((i: { episode: { id: string } }) => i.episode.id)).toEqual(['a']);
  });

  it('bozuk uzak gövde yerel kuyruğu kirletmez', async () => {
    const { storage, adapter } = makeSut();
    storage.set(KEY, stored(['a'], 0, 100));

    await adapter.applyRemote([
      { key: 'current', value: 'bu json değil', updatedAt: 200, deleted: false },
    ]);

    const raw = JSON.parse(storage.getString(KEY) as string);
    expect(raw.items.map((i: { episode: { id: string } }) => i.episode.id)).toEqual(['a']);
  });

  it('kimlik değişiminde yerel kuyruk silinir', async () => {
    const { storage, adapter } = makeSut();
    storage.set(KEY, stored(['a'], 0, 100));

    await adapter.clearLocal();

    expect(storage.getString(KEY)).toBeFalsy();
  });
});
