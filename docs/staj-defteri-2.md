# Staj Defteri — AACP (Anadolu Ajansı Podcast)

## 2. Gün — Proje konusu ve gereksinim analizi

Bugün staj projemizin konusunu netleştirdik. Anadolu Ajansı’nın podcast yayınlarını dinleyebileceğimiz, hem Android hem de iOS’ta çalışacak bir mobil uygulama geliştirmeye karar verdik. Uygulamanın Apple CarPlay desteğinin de olması planlandı. İçerikleri ayrı bir yönetim panelinden girmek yerine kurumun podcast RSS beslemelerinden alacağız.

İlk olarak Apple Podcasts ve Spotify gibi uygulamaları inceleyerek kullanıcıların temel olarak hangi işlemleri yaptığını çıkardım. Şovların listelenmesi ve aranması, bölüm detaylarının gösterilmesi, ses oynatma, kaldığı yerden devam etme, oynatma kuyruğu, “sonra dinle” listesi ve çevrimdışı dinleme başlıca gereksinimler olarak belirlendi. Kullanıcı hesabı açılması ve verilerin farklı cihazlar arasında senkronize edilmesi de sonraki aşamalarda eklenmek üzere plana dahil edildi.

Uygulamanın arka planda ve ekran kilitliyken de ses çalabilmesi özellikle önemliydi. Kilit ekranındaki medya kontrollerinin çalışması ve CarPlay’de sürücünün dikkatini dağıtmayacak sade bir arayüz kullanılması gerektiğini not aldım. Uygulamanın internet bağlantısı veya backend olmadan da temel işlevleriyle çalışabilmesi, senkronizasyonun ise ek bir özellik olması konusunda da fikir birliğine vardık.

Veri kaynağı olarak RSS 2.0 ve iTunes eklentilerinin yeterli olduğunu gördüm. Böylece uygulamayı tek bir podcast sağlayıcısının API’sine bağımlı hâle getirmemiş olduk. Yorum, puanlama, canlı yayın ve video içeriklerini ise bu stajın kapsamı dışında bıraktık. Günün sonunda belirlediğimiz gereksinimleri, ileride vereceğimiz mimari kararlar için bir referans olacak şekilde yazılı hâle getirdim.

## 3. Gün — Geliştirme ortamının hazırlanması

Bugün geliştirme ortamını kurmaya başladım. Proje çapraz platformlu olduğu için platformdan bağımsız kodlama ve testleri Windows makinede, iOS derlemesi ile CarPlay denemelerini macOS ortamında çalıştıracak şekilde bir düzen kurduk. Her geliştiricinin aynı kontrolleri çalıştırabilmesi için `npm run ci` adında bir komut hazırladım. Bu komut tip kontrolünü, ESLint’i ve Jest testlerini sırayla çalıştırıyor.

Projeyi React Native 0.86 ve Yeni Mimari açık olacak şekilde oluşturduk. TypeScript, ESLint ve Prettier ayarlarını yaptım. `core`, `domain`, `data`, `infrastructure`, `presentation`, `carplay` ve `app` klasörleri için path alias tanımladım. Bu sayede dosyalar arasında göreli ve karmaşık importlar yerine katmanları açıkça gösteren importlar kullanabileceğiz.

Bağımlılıkları kurarken `react-native-track-player` gibi bazı paketlerde peer dependency sürüm çakışmalarıyla karşılaştım. Kurulumun her makinede aynı şekilde yapılabilmesi için `.npmrc` dosyasına `legacy-peer-deps` ayarını ekledim. iOS tarafındaki CocoaPods sürümünü de Gemfile üzerinden sabitledim.

Ortam değişkenleri için `react-native-config` kullandık ve `.env.example` dosyasını hazırladım. Bu dosyaya gizli anahtar koymamaya dikkat ettim; çünkü bu değerler uygulama paketine gömülebiliyor. Jest yapılandırmasını tamamladım ve native modüllerin test ortamında kullanılabilmesi için `__mocks__` klasörünü oluşturdum. Böylece geliştirme ortamının temel kurulumu tamamlandı.

## 4. Gün — Mimari ve arayüz tasarımının belirlenmesi

Bugün projenin genel mimarisi üzerinde çalıştım. Bağımlılıkların dış katmanlardan iç katmanlara doğru akması için Clean Architecture kullanmaya karar verdik. `src` altında `core`, `domain`, `data`, `infrastructure`, `presentation`, `carplay` ve `app` katmanlarını oluşturduk.

En çok önem verdiğimiz konu `domain` katmanının React veya React Native bilmemesiydi. Bu katmanda yalnızca saf TypeScript ve iş kuralları bulunacak. Mobil arayüz ile CarPlay birbirini doğrudan çağırmayacak; ikisi de aynı domain use case’lerini kullanacak. Bu kuralların zaman içinde bozulmaması için `dependency-cruiser` ile yasak importları kontrol altına aldım.

Somut sınıfların oluşturulduğu tek nokta olarak `app/di/composeDependencies.ts` dosyasını belirledik. Ekranlara gerçek implementasyonları vermek yerine bunları `DependencyProvider` üzerinden uygulama ağacına aktardım. Ekranlar da `useDependencies()` aracılığıyla yalnızca ihtiyaç duydukları arayüzleri görüyor.

Arayüz için koyu temayı temel aldık. Renkleri, boşlukları, yazı boyutlarını ve köşe yarıçaplarını `tokens.ts` içinde topladım. Ekranların kendi içinde sabit renk kullanmaması ve değerleri `ThemeProvider` üzerinden alması kararlaştırıldı. Alt sekmelerde Ana Sayfa, Ara ve Kütüphane bulunacak; oynatıcı ise tam ekran bir modal olarak açılacak.

## 6. Gün — Domain katmanının yazılması

Bugüne RSS beslemesini inceleyerek başladım. Şov bilgileri `channel` düğümünde, bölüm bilgileri ise `item` düğümlerinde tutuluyor. Başlık, açıklama, yazar ve görsel gibi alanların bir kısmının isteğe bağlı olduğunu gördüm. Ayrıca `itunes:duration` alanı bazı kayıtlarda saniye, bazı kayıtlarda ise saat-dakika-saniye biçiminde gelebiliyor. Bu farklılıkları domain katmanına taşımamak için normalizasyonu daha dış katmanlarda yapmaya karar verdim.

`Show`, `Episode` ve `PodcastFeed` gibi temel varlıkları oluşturdum. Oynatıcı için `PlaybackState` ve `PlaybackProgress`, diğer işlevler için `Playlist`, `Download`, `Preferences`, `User` ve `Page<T>` modellerini yazdım. Varlıkların yanlışlıkla değiştirilememesi için alanları `readonly` olarak tanımladım.

Hata yönetiminde doğrudan exception fırlatmak yerine `Result<T>` tipini kullanmaya başladım. Başarılı sonuçlar `ok(value)`, hatalar ise `fail(error)` olarak dönüyor. Böylece çağıran taraf hata durumunu açıkça ele almak zorunda kalıyor ve arayüz katmanına ham bir exception sızmıyor.

Veri erişimi için repository portlarını tanımladım. Besleme, şov, bölüm, oynatma ilerlemesi, kuyruk, playlist, indirme, takip ve kullanıcı işlemleri için ayrı arayüzler oluşturdum. Ayrıca oynatıcı için `AudioPlayerService` portunu ekledim. Günün sonunda her iş kuralını tek bir sorumluluğa sahip use case sınıfları hâline getirdim. Örneğin `PlayEpisode`, `ContinueEpisode` ve `ToggleFollow` ayrı sınıflar olarak çalışıyor.

## 7. Gün — Data katmanının oluşturulması

Bugün domain katmanında tanımladığım portların implementasyonlarını yazdım. Bu katmanın temel görevi, dış dünyadan gelen verileri domain modellerine çevirmek ve oluşan hataları `Result` tipine dönüştürmek.

`PodcastFeedRepositoryImpl` içinde önce önbelleği kontrol eden, önbellekte veri yoksa beslemeyi kaynaktan çekip tekrar önbelleğe alan bir akış kurdum. Ağ veya ayrıştırma sırasında oluşan hataları `AppError` ile sarıp döndürüyorum. Repository’nin beslemenin RSS’ten mi yoksa başka bir kaynaktan mı geldiğini bilmemesi için `FeedSource` adında bir strateji arayüzü kullandım. Böylece ileride veri kaynağını değiştirmek gerekirse yalnızca bağlama noktasını değiştirmek yeterli olacak.

Besleme önbelleği için TTL desteği ekledim. Süresi geçen kayıtlar kullanılmıyor ve besleme yeniden alınıyor. Oynatma ilerlemesi, oynatma kuyruğu ve takip edilen şovlar da benzer bir desenle yerel anahtar-değer deposunda tutuluyor.

“Sonra dinle” özelliğini ayrı bir veri deposu olarak tasarlamadık. Bunun yerine playlist sisteminin bir sistem listesi olarak davranmasını sağladım. Böylece aynı bölümün iki ayrı yerde tutulmasının ve zamanla bu kayıtların birbirinden ayrışmasının önüne geçtik.

## 8. Gün — RSS parser, DTO, mapper ve HTTP istemcisi

Bugün ham XML’in uygulamada kullandığımız domain modellerine dönüşümünü tamamladım. Veri akışını HTTP istemcisi, XML ayrıştırıcı, DTO ve mapper olmak üzere dört parçaya ayırdım.

Önce `HttpClient` portunu tanımlayıp `fetch` API’sini kullanan `FetchHttpClient` sınıfını yazdım. İsteklerin sonsuza kadar beklememesi için `AbortController` ile zaman aşımı ekledim. Geçici ağ hatalarında yeniden deneme yapabilmek için de aynı portu uygulayan `RetryingHttpClient` dekoratörünü kullandım. Yeniden deneme davranışını ortak bir katmana koymak, telefon ve CarPlay tarafında aynı davranışı elde etmemizi sağladı.

XML tarafında `XmlParser` portunu oluşturdum ve `fast-xml-parser` kütüphanesini bunun arkasında tuttum. RSS’in ham yapısını `RssFeedDto`, `RssChannelDto`, `RssItemDto` ve `RssTextNode` tipleriyle modelledim. Temizleme ve dönüştürme işlemlerini DTO’larda değil mapper’da yaptım.

Mapper içinde tekil gelen düğümleri diziye çevirdim, `{#text}` biçimindeki değerleri çıkardım, tarihleri ISO 8601 formatına dönüştürdüm ve kategorileri düzleştirdim. Ses dosyası bulunmayan öğeleri atladım. Bazı beslemelerde aynı `guid` değerinin birden fazla kez kullanıldığını gördüm. Bu durum liste anahtarlarını ve kaldığı yer kayıtlarını bozabileceği için tekrar eden kimliklere `#2`, `#3` gibi ekler vererek benzersiz hâle getirdim. Mapper saf fonksiyonlardan oluştuğu için gerçek bir besleme örneği üzerinden birim testleri de yazdım.

## 9. Gün — İlk arayüz ve ses oynatıcı entegrasyonu

Bugün proje ilk kez ekranda çalışır hâle geldi. React Navigation ile alt sekme ve yığın gezinmesini kurdum. Şov listesi ve şov detay ekranlarının ilk sürümlerini hazırladım. Veriyi ekranlarda doğrudan use case çağırarak almak yerine TanStack Query kancalarıyla sarmaladım. Böylece yükleme, önbellekleme ve yeniden getirme durumları tek bir yerde yönetilebildi. Uzun listelerde performans için FlashList kullandım.

Günün en önemli kısmı `react-native-track-player` entegrasyonuydu. `AudioPlayerService` portunu uygulayan `TrackPlayerAudioService` sınıfını yazdım. Bu sınıf, track-player olaylarını dinleyip bunları domain’deki `PlaybackState` nesnelerine çeviriyor.

iOS’ta arka plan sesinin ve kilit ekranı kontrollerinin çalışması için `Playback` kategorisi ile `SpokenAudio` modunu seçtim. Android’de içerik konuşma olduğu için ses türünü `Speech` yaptım; varsayılan `Music` ayarında kısa kesintilerde sesin kısılması konuşma cümlelerinin kaçırılmasına neden olabiliyordu.

Kurulum sırasında telefon arayüzü ile CarPlay’in aynı anda oynatıcıyı başlatabildiğini fark ettim. Basit bir boolean kontrolü iki eşzamanlı çağrıyı engellemedi ve ikinci çağrıda `player_already_initialized` hatası oluştu. Bu sorunu, devam eden kurulumu bir `setupPromise` içinde tutarak çözdüm. İkinci çağrı aynı promise’i bekliyor; kurulum hata verirse promise temizlenerek sonraki denemeye izin veriliyor.

Arka plan servisinde oynat/duraklat ve ileri-geri sarma gibi medya kontrollerini bağladım. Arayüzdeki oynatma durumu da Zustand tabanlı store üzerinden bileşenlere aktarılmaya başladı.

## 10. Gün — MMKV, mini oynatıcı ve çevrimdışı dinleme

Bugün yerel depolama üzerinde çalıştım. `react-native-mmkv` kütüphanesini doğrudan ekranlara kullandırmak yerine `KeyValueStorage` portunu tanımladım ve `MmkvKeyValueStorage` adaptörünü yazdım. Test ortamında native modül bulunmadığında bellek içi depoya düşen bir fabrika da ekledim. Bu sayede testlerin gerçek cihaz bağımlılığı azaldı.

Oynatıcı için iki farklı arayüz hazırladım. `MiniPlayer`, sekme çubuğunun üzerinde görünen ve kapak, bölüm adı ile oynat/duraklat düğmesini içeren küçük bir alan olarak çalışıyor. Bunu `GlobalDock` içine yerleştirdim; böylece kullanıcı hangi sekmede olursa olsun oynatıcıya ulaşabiliyor. Mini oynatıcıya dokunulduğunda `PlayerScreen` tam ekran modal olarak açılıyor.

Tam ekran oynatıcıya büyük kapak görseli, ilerleme çubuğu, ileri-geri sarma, hız seçimi ve kuyruk erişimi ekledim. Kapak görselinden baskın renk çıkarıp arka planda kullanmak için `useCoverColor` kancasını yazdım. Renk çıkarılamazsa kimlikten kararlı bir renk üretilecek şekilde yedek davranış ekledim.

Çevrimdışı dinleme özelliğinin ilk hâlini de bugün tamamladım. `Downloader` portu ve `BlobUtilDownloader` adaptörüyle ses dosyaları indiriliyor, indirme bilgileri MMKV’de tutuluyor. iOS’ta uygulamanın Documents dizini yeniden kurulumlarda değişebildiği için mutlak dosya yolunu kaydetmedim; yalnızca dosya adını saklayıp güncel yolu her kullanımda yeniden oluşturdum. Listeleme sırasında dosyanın gerçekten var olup olmadığını da kontrol ederek eski kayıtları temizledim. Ayrıca uyku zamanlayıcısı için store ve bottom sheet bileşenini ekledim.

## 11. Gün — Playlist, kuyruk ve ana ekranlar

Bugün kullanıcı listeleri üzerinde çalıştım. Playlist oluşturma, güncelleme, silme ve bölümleri listeye ekleyip çıkarma işlemleri için use case’leri yazdım. Bunlara karşılık gelen detay ekranı, düzenleme paneli, listeye ekleme paneli ve kapak bileşenlerini oluşturdum. “Sonra dinle” listesini özel bir playlist olarak gösterdim.

Oynatma kuyruğunda iki ayrı kaynak tutmamaya karar verdik. Kuyruğun sıralanması ve oynatılması doğrudan track-player’ın kendi kuyruğuna bırakıldı. Bunun önemli nedeni, kilit ekranı, CarPlay, direksiyon kontrolleri ve telefon arayüzünün aynı sırayı görmesi. İkinci bir kuyruk olsaydı bu yüzeyler zamanla birbirinden ayrılabilirdi.

Kullanıcının elle eklediği bölümleri, çalan bölümün arkasındaki kullanıcı bloğunun sonuna yerleştirdim. Böylece otomatik gelen bölümler ile elle eklenenler birbirine karışmıyor ve ekleme sırası korunuyor. Kuyruk kapanıp açıldığında geri yükleniyor ancak uygulamanın açılması otomatik oynatma isteği sayılmadığı için bu sırada `play()` çağırılmıyor.

Arayüzde ana sayfayı “dinlemeye devam”, şovlar ve son bölümler raflarından oluşan bir yapıya dönüştürdüm. Arama ekranında gecikmeli arama için `useDebounced` kancasını kullandım. Kütüphane ekranında takip edilen şovları, playlist’leri ve indirilen bölümleri bir araya getirdim. Bölüm satırlarına kaydırarak kuyruğa ekleme ve listeye kaydetme işlemlerini de ekledim.

## 12. Gün — Kullanıcı yapısı ve Supabase entegrasyonu

Bugün hesap ve kullanıcı verileriyle ilgili çalışmalara başladım. Uygulama hesapsız da kullanılabileceği için yerel kullanıcı kimliği üreten bir yapı hazırladım. Kullanıcı giriş yaptığında bu yerel kimliğin hesaba bağlanması, isterse de uzaktaki verilerle değiştirilmesi için iki ayrı akış planladım.

Supabase istemcisini uygulamanın her yerinde doğrudan kullanmamak için bir port ve repository adaptörü oluşturdum. Oturum açma, kayıt olma, çıkış yapma ve mevcut oturumu geri yükleme işlemlerini use case’lere bağladım. Ağ bağlantısı yoksa veya Supabase yapılandırılmamışsa uygulamanın tamamen kapanmaması, yerel modda çalışmaya devam etmesi için hata durumlarını kontrollü ele aldım.

Veritabanında kullanıcı verileri için tablolar oluşturup satır düzeyi güvenlik politikalarını tanımladım. Her kullanıcı yalnızca kendi kayıtlarını okuyup değiştirebiliyor. Profil görseli ekleme ekranını ve sunucu tarafındaki görsel doğrulamasını da hazırladım. `AuthSheet`, `AccountPanel` ve `AccountButton` bileşenlerini ekleyerek hesap işlemlerini başlıktaki avatar üzerinden erişilebilir hâle getirdim.

## 13. Gün — Depo seçimi ve senkronizasyon motoru

Bugün kullanıcı verilerinin sunucuda nerede tutulacağına karar verdik. Her veriyi aynı depoya koymak yerine kullanım şekline göre ayırdık. Yüksek yazma hacimli ve anahtarla erişilen ilerleme, tercihler ve kuyruk verileri NoSQL tarafında; sorgulanması gereken takipler, playlist’ler ve kayıtlı bölümler ise Postgres tarafında tutulacak.

Bu seçimi `resolveStore.ts` içinde tek bir yerde topladım. Redis için sıralı kümeleri kullanarak değişen kayıtları imleçten sonra okuyabilen bir depo yazdım. Cloudflare KV küçük veri hacimlerinde kullanılabilecek bir alternatif olarak eklendi; ancak delta okuma desteği olmadığı için kayıt sayısı büyüdüğünde daha maliyetli olabileceğini not ettim. Hiçbir servis bağlı değilse yerel geliştirmeyi kolaylaştırmak için Postgres tabanlı yedek depo devreye giriyor.

İstemci tarafındaki `SyncEngine` koleksiyonlar için aynı akışı uyguluyor: önce yerelde imleçten sonra değişen kayıtları sunucuya gönderiyor, sonra uzaktaki değişiklikleri alıp yerele uyguluyor ve yeni imleci kaydediyor. Aynı kayıt iki tarafta da değişmişse son yazan kazanıyor. Çakışma sayısını kullanıcıya gösterecek şekilde sonuç üretiyorum.

Hesaba geçişte yerel verileri hesaba aktaran `adoptLocalInto()` ve yerel verileri uzaktaki verilerle değiştiren `replaceWithRemote()` akışlarını yazdım. İndirmeler cihaza özel olduğu için senkronizasyona dahil edilmedi. Senkronizasyon en iyi çaba mantığıyla çalışıyor; hata olduğunda ana kullanıcı akışını durdurmuyor.

## 14. Gün — Cloudflare Worker ve backend

Bugün backend’i Cloudflare Workers’a taşıdım. Bu yapının sunucu bakımı gerektirmemesi ve farklı bölgelerde çalışabilmesi bizim için avantaj sağlıyor. Worker içinde küçük ve bağımsız bir router yazdım. İstek bağlamı `Ctx` üzerinden taşınıyor, HTTP hataları ise tek bir noktada yanıt hâline getiriliyor.

Rotaları konu başlıklarına göre ayırdım: oturum işlemleri, katalog, senkronizasyon, oynatma oturumu, paylaşım ve teşhis uçları ayrı dosyalarda bulunuyor. Katalog artık uygulamaya gömülü bir listeden değil, veritabanındaki şov ve bölüm kayıtlarından geliyor. RSS adresinden şov ve bölüm kayıtlarını çıkaran `FeedImporter` ile bunları veritabanına yazan `CatalogImportService` sınıflarını hazırladım.

Yeni bölüm taraması için cron tetikleyicisi kullandım. Her şovu tek bir turda arka arkaya taramak yerine aktif şovları okuyup her birini Cloudflare Queue’ya ayrı bir iş olarak gönderen `FeedWatcher` yapısını oluşturdum. Böylece şov sayısı arttığında tek bir çalıştırma penceresine bağlı kalmıyoruz. Yerel geliştirmede kuyruk bağlı değilse sınırlı sayıdaki iş doğrudan çalıştırılıyor.

`ShowScanner` beslemeleri `ETag` ve `Last-Modified` bilgileriyle koşullu olarak istiyor. Besleme değişmemişse sunucunun `304 Not Modified` yanıtıyla içeriği tekrar indirmesini önlüyoruz. Yeni bölüm bulunduğunda kayıt veritabanına ekleniyor ve takipçilere APNs üzerinden bildirim gönderiliyor.

## 15. Gün — Apple CarPlay entegrasyonu

Bugün CarPlay yüzeyinin ilk kapsamlı sürümünü hazırladım. CarPlay katmanında iş kuralı yazmamaya, mobil uygulamayla aynı domain use case’lerini kullanmaya dikkat ettim. Buradaki kod daha çok CarPlay şablonlarının yaşam döngüsü ve etkileşimleriyle ilgileniyor.

`CarPlayController` içinde bağlantı kurulduğunda oynatıcının hazır olup olmadığını kontrol ediyor, Now Playing şablonunu ve kök şablonu oluşturuyor, ardından oynatma durumunu dinlemeye başlıyorum. Uygulama telefondan açılmadan doğrudan araç ekranından başlatılabildiği için oynatıcı kurulumunu CarPlay bağlantısında da çağırmak gerektiğini fark ettim.

Kök ekranı Ana Sayfa, Kütüphane, İndirilenler ve Şimdi Çalan sekmelerinden oluşan bir `TabBarTemplate` olarak tasarladım. Sürücü dikkatini dağıtmamak için listelerin uzunluğunu sınırladım. CarPlay uzak görselleri kabul etmediği için kapakları önceden indirip `ArtworkCache` üzerinden yerel `file://` adresleriyle vermem gerekti.

Entegrasyon sırasında Now Playing şablonunun sistem tarafından paylaşılan tek bir örnek olduğunu gördüm. Aynı örneği yığına iki kez eklemek çökmeye yol açtığı için `TemplateStack` sınıfını yazdım. Yeniden bağlantılarda şablonların tekrar tekrar oluşturulması da aynı dokunuşun birden fazla işlenmesine neden oluyordu; mevcut şablonları yeniden kullanarak bu sorunu giderdim.

Sesli komut için `ResolveVoiceQuery` use case’ini ekledim. Native taraf yalnızca kullanıcının söylediği metni iletiyor, hangi bölümün çalınacağına ise domain katmanı karar veriyor.

## 16. Gün — Cihazlar arası oynatma

Bugün aynı hesapta aynı anda yalnızca bir cihazın ses çalması kuralı üzerinde çalıştım. Bu kuralı istemcide tutmak yerine sunucuda uygulamaya karar verdik; çünkü farklı cihazların aynı anda karar vermesi güvenilir olmayacaktı.

Sunucuda hesabın aktif cihazını, cihaz listesini, “ne çalıyor” bilgisini ve bekleyen komutu tek bir `PlaybackSession` nesnesinde tutan `PlaybackSessionStore` sınıfını yazdım. Oturuma 120 saniyelik TTL koydum. Böylece uygulama kapanır veya cihaz bağlantısı kesilirse ayrıca bırakma isteği gelmese bile aktif cihaz durumu bir süre sonra kendiliğinden düşüyor.

Redis’i ana depo, Postgres’i yedek olarak belirledik. Cloudflare KV’yi burada kullanmadık; çünkü nihai tutarlılık gecikmesi, o anda hangi cihazın çaldığı sorusuna yanlış cevap verilmesine neden olabilir.

İstemci tarafında cihaz oturumunu API’ye bağladım. Başka bir cihaz oynatıyorsa `PlaybackElsewhereBar` bilgilendirme çubuğu gösteriliyor. Kullanıcı `DevicesSheet` üzerinden cihazlarını görebiliyor ve oynatmayı devralabiliyor. Devir işlemi hedef cihaza bekleyen bir komut bırakıyor; hedef cihaz bir sonraki senkronizasyon turunda bu komutu alıp bölümü aynı konumdan sürdürüyor.

Ses kesintileri için platformların kendi mekanizmalarını kullandım. iOS’ta `AVAudioSession`, Android’de ExoPlayer ses odağı yönetimi devreye giriyor. Ayrıca iOS’ta AirPlay çıkış seçicisini göstermek için native route picker köprüsünü ekledim.

## 17. Gün — Bölüm listelerinde sayfalama

Bugüne kadar bölüm listelerinde tüm RSS beslemesini indiriyorduk. Yaptığımız ölçümde bazı beslemelerin 4 MB’a kadar büyüdüğünü ve her şov açılışında tüm içeriği tekrar indirmenin uygun olmadığını gördük. Bu nedenle bölüm listesini sunucudan sayfalı hâle getirdim.

Offset yerine keyset, yani imleç tabanlı sayfalama kullandım. Büyük bir offset değerinde veritabanının önceki satırları tekrar sayması maliyeti artırıyor. Ayrıca araya yeni bir bölüm girdiğinde offset sayfalarının sınırları kayıyor ve kullanıcı aynı bölümü iki kez görebiliyor. `(published_sort, guid)` çiftini taşıyan imleç bu iki sorunu da çözüyor.

Sunucu tarafında sayfa boyutundan bir fazla kayıt isteyerek daha fazla sayfa olup olmadığını ayrıca `count` sorgusu çalıştırmadan anlayacak şekilde sorguyu hazırladım. Aynı saniyede yayınlanan bölümlerin atlanmaması için yalnızca tarih değil, GUID ile birlikte karşılaştırma yaptım. İmleci base64 ile kodlarken Türkçe karakter içeren GUID’lerde `btoa` kaynaklı bir hata çıktı. Latin-1 sınırına takılmamak için kodlamayı UTF-8 baytları üzerinden yapacak şekilde düzelttim.

İstemcide API, yerel RSS ve fallback repository’lerini hazırladım. Bir liste sunucudan başladıysa sonraki sayfaların da sunucudan, RSS’ten başladıysa RSS’ten gelmesi gerekiyor. Bu nedenle imleçleri `p:` ve `f:` ön ekleriyle etiketledim. Arayüzde `useInfiniteQuery` kullanarak kullanıcı aşağı kaydırdıkça yeni sayfaların yüklenmesini sağladım.

## 18. Gün — Android ve iOS optimizasyonları

Bugün iki platformun native ayarlarını ve performans sorunlarını gözden geçirdim. iOS tarafında CarPlay scene delegate’ini, `Info.plist` ayarlarını ve gerekli entitlement’ı ekledim. Yalnızca CarPlay sahnesi tanımlandığında telefon ekranının oluşturulmadığını gördüm; bu yüzden telefon için ayrı bir pencere sahnesi de ekledim. React Native Yeni Mimari ile track-player arasındaki uyumsuzlukları ve Podfile kaynaklı derleme sorunlarını giderdim.

Android’de manifestteki izinleri kontrol edip kullanılmayanları kaldırdım. Android 13 ve sonrasında medya bildirimlerinin görünmesi için bildirim izninin çalışma zamanında istenmesi gerektiğini gördüm. İzin verilmediğinde sesin yine de çalması, ancak kontrol kartının gösterilmemesi gerektiğine karar verdik. Böylece bildirim izni oynatmanın değil, kontrol yüzeyinin ön koşulu oldu.

Uzun listelerde FlashList kullanımını artırdım. Satır bileşenlerini `React.memo` ile sarmaladım ve geri çağrıları `useCallback` ile sabitledim. Arama sırasında listenin tamamen yeniden oluşturulmasını engelleyerek kaydırma konumunun korunmasını sağladım. Kapak görselleri için hızlı bir görsel önbelleği kullandım; CarPlay görsellerini de yerel önbelleğe alarak ana iş parçacığında oluşan çökme sorununu çözdüm.

Son olarak kuyruk senkronizasyonu ve bölüm değiştiğinde kaldığı yerden devam etme gibi bağlayıcıları tek tek ekranlara değil uygulamanın yaşam döngüsüne bağladım. Çünkü kuyruk kilit ekranından veya CarPlay’den de değişebiliyor; arayüzün bu değişiklikleri her durumda öğrenmesi gerekiyor.

## 19. Gün — Veritabanı iyileştirmeleri

Bugün veritabanı şemasını ve sorgu performansını gözden geçirdim. Şema; temel kullanıcı tabloları, katalog, avatar, bölüm sayfalama, besleme tarama ve cihaz oynatma oturumu gibi konular için sıralı migration dosyalarına ayrılmış durumda. Bu dosyaların hangi sırayla uygulanacağı `DATABASE-SETUP.md` içinde belgeleniyor.

Sayfalama sorgusu `(published_sort, guid)` alanlarına göre çalıştığı için bu iki alan üzerinde bileşik indeks oluşturdum. Beslemelerde yayın tarihi eksik veya hatalı gelebildiğinden sıralama için ham `published_at` değerine güvenmedim; içe aktarma sırasında normalize edilen ayrı bir `published_sort` alanı kullandım.

Besleme taramalarını hızlandırmak için şov tablosuna `feed_etag` ve `feed_modified` alanlarını ekledim. Bir sonraki taramada bu değerler koşullu istekte kullanılıyor ve değişmeyen beslemeler `304` yanıtıyla tekrar indirilmeden geçiliyor. Şovları alfabetik yerine en yeni bölüme göre sıralamak için son bölüm tarihini şov kaydında türetilmiş bir alan olarak güncelledim.

RLS politikalarını da tekrar kontrol ettim. Kullanıcı verileri yalnızca ilgili kullanıcı tarafından okunup yazılabiliyor; katalog ve tarama durumu gibi sadece backend’in kullanması gereken tablolar ise servis anahtarı üzerinden erişiliyor. Yönetici anahtarlarının uygulama paketine girmemesi için bunları `wrangler secret` ile yönetilecek şekilde düzenledim.

## 20. Gün — Proje sunumu ve değerlendirme

Bugün staj projesinin sunumunu yaptık. Sunumu önce uygulamanın çalışan özelliklerini gösterip daha sonra teknik yapıyı anlatacak şekilde hazırladım.

Demo sırasında ana sayfadan bir şov açıp bölüm listesini sayfaladım, bir bölümü oynattım ve uygulamayı arka plana aldıktan sonra kilit ekranı kontrollerini gösterdim. Bir bölümü indirip uçak modunda çalıştırdım. Playlist oluşturma, kuyruğa bölüm ekleme, hesap açma ve ikinci cihazda verilerin görünmesi akışlarını da gösterdim. Son olarak CarPlay simülatöründeki sekmeleri ve sesli komutla bölüm başlatmayı denedim.

Sunumun teknik bölümünde Clean Architecture katmanlarını ve bağımlılıkların yönünü anlattım. Domain katmanının herhangi bir platform kütüphanesine bağlı olmamasının hem mobil hem de CarPlay arayüzünde aynı iş kurallarını kullanmamızı sağladığını örneklerle gösterdim. Port ve adaptör yaklaşımının, oynatıcı veya depolama kütüphanesi değiştirilmek istendiğinde yalnızca ilgili adaptörü etkilemesi de özellikle vurgulandı.

Backend tarafında Cloudflare Worker’ın görevlerini, koleksiyonlara göre depo seçimini ve kuyruk tabanlı besleme taramasını anlattım. Testler bölümünde 361 birim testinin native araç zinciri olmadan çalışabildiğini ve `npm run ci` komutuyla tip kontrolü, lint ve testlerin tek seferde yapılabildiğini gösterdim.

Sunum sonunda tamamlanmamış noktaları da belirttim. Bildirim gönderiminin uçtan uca doğrulaması ve çok dilli arayüz desteği sonraki çalışmalara bırakıldı. Alınan geri bildirimleri not ettikten sonra staj projesini tamamladım. Bu süreçte yalnızca React Native geliştirmeyi değil, gereksinim analizi, mimari karar verme, test yazma ve farklı platformların ihtiyaçlarını birlikte düşünme konusunda da önemli deneyim kazandım.
