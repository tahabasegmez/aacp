import { InMemoryKeyValueStorage } from '@infrastructure';
import { Episode } from '@domain/entities';
import { QueueItem } from '@domain/services';
import { PlaybackQueueRepositoryImpl } from '../PlaybackQueueRepositoryImpl';

const episode = (id: string): Episode => ({
  id,
  showId: 'show1',
  title: `Bölüm ${id}`,
  description: '',
  audioUrl: `https://media/${id}.mp3`,
  durationSec: 600,
  publishedAt: '2026-07-20T00:00:00.000Z',
});

const item = (id: string, source: QueueItem['source'] = 'context'): QueueItem => ({
  episode: episode(id),
  source,
});

const makeSut = () => {
  const storage = new InMemoryKeyValueStorage();
  return { storage, repo: new PlaybackQueueRepositoryImpl(storage) };
};

describe('PlaybackQueueRepositoryImpl', () => {
  it('kuyruğu sırası ve kaynağıyla saklar', async () => {
    const { repo } = makeSut();
    await repo.save([item('a'), item('b', 'user')], 1);

    const got = await repo.get();
    expect(got.ok && got.value?.items.map(i => i.episode.id)).toEqual(['a', 'b']);
    expect(got.ok && got.value?.items[1].source).toBe('user');
    expect(got.ok && got.value?.index).toBe(1);
  });

  it('hiç yazılmadıysa null', async () => {
    const { repo } = makeSut();
    const got = await repo.get();
    expect(got.ok && got.value).toBeNull();
  });

  it('DEĞİŞMEYEN kuyruk yeniden yazılmaz (damga ileri gitmez)', async () => {
    // Açılışta kuyruk oynatıcıya geri yüklenir ve bu, kaydı yeniden tetikler.
    // Damga tazelenseydi hiçbir şey değişmemişken yerel kayıt "en yeni"
    // sayılır ve başka cihazda kurulmuş daha yeni bir sırayı ezerdi.
    const { repo } = makeSut();
    await repo.save([item('a')], 0);
    const before = await repo.get();
    const first = before.ok ? before.value?.updatedAt : 0;

    await new Promise<void>(r => setTimeout(() => r(), 5));
    await repo.save([item('a')], 0);

    const after = await repo.get();
    expect(after.ok ? after.value?.updatedAt : 0).toBe(first);
  });

  it('sıra değişince damga ilerler', async () => {
    const { repo } = makeSut();
    await repo.save([item('a')], 0);
    const before = await repo.get();
    const first = before.ok ? (before.value?.updatedAt ?? 0) : 0;

    await new Promise<void>(r => setTimeout(() => r(), 5));
    await repo.save([item('a'), item('b', 'user')], 0);

    const after = await repo.get();
    expect(after.ok ? (after.value?.updatedAt ?? 0) : 0).toBeGreaterThan(first);
  });

  it('bozuk öğeler ayıklanır', async () => {
    const { storage, repo } = makeSut();
    storage.set(
      'playback_queue_v1',
      JSON.stringify({
        items: [{ episode: { id: 'a' }, source: 'context' }, { source: 'user' }, null],
        index: 0,
        updatedAt: 1,
      }),
    );

    const got = await repo.get();
    expect(got.ok && got.value?.items).toHaveLength(1);
  });

  it('temizlenince null döner', async () => {
    const { repo } = makeSut();
    await repo.save([item('a')], 0);
    await repo.clear();

    const got = await repo.get();
    expect(got.ok && got.value).toBeNull();
  });
});
