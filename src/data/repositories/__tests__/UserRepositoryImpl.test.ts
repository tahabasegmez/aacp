import { InMemoryKeyValueStorage } from '@infrastructure';
import { UserRepositoryImpl } from '../UserRepositoryImpl';

/** ApiClient'in bu testte kullanılan yüzeyi. */
const apiStub = {
  enabled: true,
  get: async () => undefined,
  post: async () => undefined,
  ensureSession: async () => undefined,
  setToken: () => undefined,
} as unknown as ConstructorParameters<typeof UserRepositoryImpl>[0];

const PROFILE_KEY = 'aacp.user.profile';

const makeSut = () => {
  const storage = new InMemoryKeyValueStorage();
  return { storage, repo: new UserRepositoryImpl(apiStub, storage) };
};

describe('UserRepositoryImpl.hasAccount', () => {
  it('hiç oturum yokken FALSE', () => {
    // Kritik: `isAnonymous(null)` false döner; buradaki kural onunla
    // karıştırılırsa hiç açılmamış cihaz "hesaplı" sayılır ve misafir verisi
    // sunucuya gider.
    const { repo } = makeSut();

    expect(repo.hasAccount()).toBe(false);
  });

  it('anonim kullanıcıda FALSE (misafir)', () => {
    const { storage, repo } = makeSut();
    storage.set(PROFILE_KEY, JSON.stringify({ id: 'u1', createdAt: 1 }));

    expect(repo.hasAccount()).toBe(false);
  });

  it('e-postalı kullanıcıda TRUE (hesap)', () => {
    const { storage, repo } = makeSut();
    storage.set(
      PROFILE_KEY,
      JSON.stringify({ id: 'u1', email: 'kisi@ornek.com', createdAt: 1 }),
    );

    expect(repo.hasAccount()).toBe(true);
  });

  it('çıkıştan sonra FALSE', async () => {
    const { storage, repo } = makeSut();
    storage.set(
      PROFILE_KEY,
      JSON.stringify({ id: 'u1', email: 'kisi@ornek.com', createdAt: 1 }),
    );

    await repo.signOut();

    expect(repo.hasAccount()).toBe(false);
  });
});
