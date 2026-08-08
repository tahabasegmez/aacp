import { ApiSyncTransport } from '../ApiSyncTransport';

/** ApiClient'in bu testte kullanılan yüzeyi. */
const apiStub = (enabled: boolean) =>
  ({
    enabled,
    get: async () => undefined,
    post: async () => undefined,
  }) as unknown as ConstructorParameters<typeof ApiSyncTransport>[0];

describe('ApiSyncTransport.enabled', () => {
  it('MİSAFİRDE kapalıdır — veri cihazda kalır', () => {
    // Uygulama katalog/telemetri için cihaz kimliğiyle anonim oturum açabilir;
    // o oturum senkronu da açsaydı misafirin kütüphanesi sunucuya yazılırdı.
    const transport = new ApiSyncTransport(apiStub(true), { hasAccount: () => false });

    expect(transport.enabled).toBe(false);
  });

  it('hesap varken açılır', () => {
    const transport = new ApiSyncTransport(apiStub(true), { hasAccount: () => true });

    expect(transport.enabled).toBe(true);
  });

  it('sunucu yapılandırılmamışsa hesap olsa da kapalıdır', () => {
    const transport = new ApiSyncTransport(apiStub(false), { hasAccount: () => true });

    expect(transport.enabled).toBe(false);
  });
});
