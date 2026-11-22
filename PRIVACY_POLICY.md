# Privacy Policy — Kanso / Gizlilik Politikası — Kanso

**Effective Date / Yürürlük Tarihi:** 2026-11-22  
**Application / Uygulama:** Kanso

---

## English

**Kanso** ("the App") is built with a local-first architecture designed to keep your tasks, checklists, notes, and focus history private.

### 1. Data Stored Locally on Your Device

By default, **Kanso** operates completely offline and stores your data solely on your device:

* **Tasks & Notes:** Task titles, optional notes, subtasks, due dates, recurrence schedules, tags, and completion status.
* **Checklists & Organization:** Custom lists, list items, custom tags, and folder names.
* **Focus History:** Focus timer session durations, timestamps, and associated task titles.
* **Preferences & Local Reminders:** Theme, language, sound/haptic preferences, and local morning/evening/task notification schedules.

On Android, automated system cloud/ADB extraction of local app storage is disabled (`android:allowBackup="false"`).

### 2. Optional Cloud Sync (Disabled by Default)

* **Strict Opt-In:** Cloud Sync is **off by default**. Kanso does **not** initialize Firebase or send any data to external servers in the background unless you explicitly enable Cloud Sync or pair another device inside **Cloud Sync**.
* **How Sync Works:** When you choose to enable Cloud Sync, your tasks, checklists, and focus sessions are synchronized over encrypted **HTTPS** using **Google Firebase Cloud Firestore** under a randomly generated pairing key (`ZEN-XXXX-XXXX`) and **Firebase Anonymous Authentication**.
* **No Personal Identifiers:** Kanso does **not** ask for or collect your name, email address, phone number, location, contacts, or advertising identifiers.
* **Hardware-Backed Key Protection:** Your sync pairing key is stored using the device's hardware-backed secure storage (**Android Keystore / iOS Keychain**). You can turn off Cloud Sync at any time from the Cloud Sync panel without losing local data.

### 3. Permissions

Kanso only requests minimal permissions needed for its core features:

* **Notifications (Optional):** Used solely when you enable local Morning Plan, Evening Summary, per-task reminders, or Focus Timer completion alerts.
* **Audio Settings / Vibration:** Used for local bundled ambient focus audio and optional haptic feedback. No microphone recording or background audio recording is used.
* **Internet Access:** Used only when you explicitly enable optional Cloud Sync (or when checking for app updates delivered via Expo Updates).

### 4. Third-Party Sharing, Analytics, Ads & External Fonts

* We do **not** sell, rent, or share your data with third parties or data brokers.
* Kanso contains **no** advertising SDKs, **no** third-party analytics or telemetry libraries (such as Google Analytics, Firebase Analytics, Sentry, Amplitude, or Mixpanel), and **no** behavioral trackers.
* Kanso does **not** download external web fonts (e.g., Google Fonts); all icons and fonts are bundled locally or provided by the operating system.

### 5. Data Export & Permanent Deletion

* **Export Your Data:** You can export your tasks and checklists at any time in `.json`, `.ics`, or `.md` format via **Settings → Export Data**.
* **Permanently Delete All Data:** You can permanently erase all your data directly inside the app via **Settings → Clear All Data**. This action:
  1. Immediately disconnects any active Cloud Sync listeners and cancels pending syncs.
  2. Permanently deletes your synced workspace records (`_tasks`, `_lists`, `_focus`) from **Google Firebase Cloud Firestore** (if Cloud Sync was ever used).
  3. Permanently wipes all local tasks, checklists, focus sessions, custom tags, custom folders, scheduled notifications, and your hardware-stored pairing key, returning the app to local-only mode.

### 6. Children's Privacy

Kanso is not directed at children under 13 and does not knowingly collect personal information from anyone.

### 7. Contact

For privacy questions, legal compliance inquiries, or data deletion requests regarding **Kanso**, please contact:

* **Support Email:** `[REPLACE_WITH_SUPPORT_EMAIL@example.com]` *(Replace this placeholder with your active support email before store publication.)*

---

## Türkçe (Aydınlatma Metni)

**Kanso** ("Uygulama"), görevlerini, kontrol listelerini, notlarını ve odak geçmişini gizli tutmak üzere **yerel öncelikli (local-first)** mimariyle geliştirilmiştir.

### 1. Cihazında Yerel Olarak Saklanan Veriler

**Kanso**, varsayılan olarak tamamen çevrimdışı çalışır ve verilerini yalnızca kendi cihazında saklar:

* **Görevler ve Notlar:** Görev başlıkları, isteğe bağlı görev notları, alt adımlar, tarihler, tekrar kuralları, etiketler ve tamamlanma bilgileri.
* **Listeler ve Düzenleme:** Özel kontrol listeleri, liste maddeleri, özel etiketler ve klasör adları.
* **Odak Geçmişi:** Odak zamanlayıcısı oturum süreleri, tarih/saat kayıtları ve ilgili görev başlıkları.
* **Tercihler ve Yerel Hatırlatıcılar:** Tema, dil, ses/titreşim ayarları ve yerel sabah/akşam/görev bildirimi saatleri.

Android cihazlarda yerel uygulama verilerinin otomatik sistem/ADB yedeklemesi güvenlik amacıyla kapalıdır (`android:allowBackup="false"`).

### 2. İsteğe Bağlı Bulut Eşitleme (Varsayılan Olarak Kapalı)

* **Açık Onay (Opt-In):** Bulut Eşitleme **varsayılan olarak kapalıdır**. Kullanıcı **Bulut Eşitleme** ekranından özelliği açıkça başlatmadığı veya başka bir cihazı eşleştirmediği sürece Kanso arka planda Firebase bağlantısı başlatmaz ve hiçbir dış sunucuya veri göndermez.
* **Nasıl Çalışır:** Bulut Eşitlemeyi etkinleştirdiğinde görevlerin, listelerin ve odak oturumların şifreli **HTTPS** bağlantısı üzerinden, rastgele üretilen bir eşleştirme anahtarı (`ZEN-XXXX-XXXX`) ve **Firebase Anonim Kimlik Doğrulama** kullanılarak **Google Firebase Cloud Firestore** üzerinde eşitlenir.
* **Kişisel Kimlik Bilgisi Toplanmaz:** Kanso; ad, soyad, e-posta adresi, telefon numarası, konum, rehber veya reklam kimliği gibi kişisel kimlik verilerini toplamaz.
* **Donanım Tabanlı Güvenlik:** Eşleştirme anahtarın cihazın donanım destekli güvenli deposunda (**Android Keystore / iOS Keychain**) saklanır. Bulut Eşitlemeyi dilediğin zaman Bulut Eşitleme ekranından kapatarak yerel moda dönebilirsin.

### 3. Uygulama İzinleri

Kanso yalnızca temel özellikleri için gereken en az düzeydeki izinleri ister:

* **Bildirimler (İsteğe Bağlı):** Yalnızca yerel Sabah Planı, Akşam Özeti, görev hatırlatıcıları veya Odak Zamanlayıcısı bitiş uyarıları açıldığında kullanılır.
* **Ses Ayarları / Titreşim:** Uygulama içinde gömülü ortam seslerini çalmak ve isteğe bağlı dokunsal geri bildirim sağlamak için kullanılır. Mikrofon kaydı yapılmaz.
* **İnternet Erişimi:** Yalnızca isteğe bağlı Bulut Eşitlemeyi etkinleştirdiğinde (veya uygulama güncellemelerinin denetlenmesinde) kullanılır.

### 4. Üçüncü Taraflarla Paylaşım, Analitik, Reklam ve Dış Yazı Tipleri

* Verilerin üçüncü taraflara **satılmaz, kiralanmaz veya paylaşılmaz**.
* Kanso; reklam SDK’ları, üçüncü taraf analitik veya telemetri kütüphaneleri (Google Analytics, Firebase Analytics, Sentry, Amplitude, Mixpanel vb.) ya da davranışsal takip araçları **içermez**.
* Kanso internetten harici yazı tipi (ör. Google Fonts) **indirmez**; tüm simge ve yazı tipleri uygulama paketinde yerel olarak yer alır veya işletim sistemi tarafından sağlanır.

### 5. Veri Dışa Aktarma ve Kalıcı Silme

* **Verilerini Dışa Aktar:** Görevlerini ve listelerini dilediğin zaman **Ayarlar → Verileri Dışa Aktar** menüsünden `.json`, `.ics` veya `.md` formatında dışa aktarabilirsin.
* **Tüm Verileri Kalıcı Olarak Sil:** Tüm verilerini uygulama içinden tek adımda **Ayarlar → Tüm Verileri Sil** seçeneğiyle kalıcı olarak silebilirsin. Bu işlem:
  1. Aktif tüm Bulut Eşitleme dinleyicilerini anında kapatır ve bekleyen gönderimleri iptal eder.
  2. Daha önce Bulut Eşitleme kullanıldıysa **Google Firebase Cloud Firestore** üzerindeki çalışma alanı kayıtlarını (`_tasks`, `_lists`, `_focus`) kalıcı olarak siler.
  3. Cihazdaki tüm görevleri, listeleri, odak geçmişini, özel etiket ve klasörleri, zamanlanmış bildirimleri ve güvenli depodaki eşleştirme anahtarını kalıcı olarak temizler; uygulamayı yeniden yalnızca cihaz içi moda geçirir.

### 6. Çocukların Gizliliği

Kanso 13 yaşın altındaki çocuklara yönelik değildir ve bilerek kimseden kişisel kimlik bilgisi toplamaz.

### 7. İletişim

**Kanso** gizlilik politikası, KVKK/GDPR kapsamındaki hakların veya veri silme taleplerin için iletişim adresi:

* **Destek E-postası:** `[DESTEK_EPOSTA_ADRESINIZ@ornek.com]` *(Mağaza yayını öncesinde bu yer tutucuyu aktif destek e-posta adresinizle değiştirin.)*
