# Privacy Policy — Kanso / Gizlilik Politikası — Kanso

**Effective Date / Yürürlük Tarihi:** 2026-11-22  
**Application / Uygulama:** Kanso

---

## English

**Kanso** keeps your tasks, checklists, notes, and focus history on your phone by default.

### 1. What Stays on Your Device

Kanso works offline and saves your data locally on your device:

* **Tasks & Notes:** Task titles, notes, subtasks, dates, recurrence rules, tags, and completion status.
* **Lists & Organization:** Checklists, list items, custom tags, and folder names.
* **Focus History:** Focus timer session lengths, timestamps, and linked task titles.
* **Preferences & Local Reminders:** Theme, language, sound and haptic settings, plus local morning, evening, and task reminder schedules.

On Android, automated system cloud and ADB backups of local app storage are turned off (`android:allowBackup="false"`).

### 2. Optional Cloud Sync (Off by Default)

* **Off Until You Turn It On:** Cloud Sync starts disabled. Kanso does not start Firebase or send anything in the background unless you explicitly turn on Cloud Sync or pair another device inside **Cloud Sync**.
* **How It Works:** When you enable Cloud Sync, your tasks, lists, and focus sessions sync over encrypted **HTTPS** using **Google Firebase Cloud Firestore**, a random pairing key (`ZEN-XXXX-XXXX`), and **Firebase Anonymous Authentication**.
* **No Account or Personal Info:** Kanso never asks for your name, email address, phone number, location, contacts, or advertising ID.
* **Hardware Key Storage:** Your pairing key is saved in your device’s secure hardware storage (**Android Keystore / iOS Keychain**). You can turn off Cloud Sync anytime from the Cloud Sync panel and go back to local-only without losing local data.

### 3. Permissions

Kanso asks only for permissions tied to features you choose to use:

* **Notifications (Optional):** Used only when you turn on Morning Plan, Evening Summary, task reminders, or Focus Timer completion alerts.
* **Audio Settings / Vibration:** Used for bundled ambient focus sounds and optional haptics. Kanso never accesses your microphone or records audio.
* **Internet Access:** Used only when you turn on optional Cloud Sync or check for app updates via Expo Updates.

### 4. No Ads, Analytics, or External Fonts

* We never sell, rent, or share your data with third parties or data brokers.
* Kanso includes no ad SDKs, no third-party analytics or telemetry libraries (such as Google Analytics, Firebase Analytics, Sentry, Amplitude, or Mixpanel), and no crash or behavior trackers.
* Kanso does not download external web fonts (such as Google Fonts); all icons and fonts are bundled locally or provided by your operating system.

### 5. Export & Permanent Deletion

* **Export Anytime:** Export your tasks and checklists as `.json`, `.ics`, or `.md` from **Settings → Export Data**.
* **Delete Everything Permanently:** Open **Settings → Clear All Data** inside the app to erase your workspace for good. This action:
  1. Immediately closes any active Cloud Sync listeners and cancels pending sync writes.
  2. Permanently deletes your synced workspace documents (`_tasks`, `_lists`, `_focus`) from **Google Firebase Cloud Firestore** if Cloud Sync was used.
  3. Permanently wipes all local tasks, checklists, focus sessions, custom tags, custom folders, scheduled reminders, and your hardware-stored pairing key, returning the app to local-only mode.

### 6. Children's Privacy

Kanso is not aimed at children under 13 and does not knowingly collect personal information from anyone.

### 7. Contact

Questions about Kanso's privacy practices or data deletion? Write to:

* **Support Email:** `[REPLACE_WITH_SUPPORT_EMAIL@example.com]` *(Replace this placeholder with your active support email before store publication.)*

---

## Türkçe (Aydınlatma Metni)

**Kanso**, görevlerini, kontrol listelerini, notlarını ve odak geçmişini varsayılan olarak kendi telefonunda tutar.

### 1. Cihazında Kalan Veriler

**Kanso**, çevrimdışı çalışır ve tüm verilerini doğrudan cihazında saklar:

* **Görevler ve Notlar:** Görev başlıkları, notlar, alt adımlar, tarihler, tekrar kuralları, etiketler ve tamamlanma durumu.
* **Listeler ve Klasörler:** Kontrol listeleri, liste maddeleri, özel etiketler ve klasör adları.
* **Odak Geçmişi:** Odak sayacı oturum süreleri, tarih/saat kayıtları ve bağlı görev başlıkları.
* **Tercihler ve Yerel Hatırlatıcılar:** Tema, dil, ses/titreşim tercihleri ile yerel sabah, akşam ve görev hatırlatıcı saatleri.

Android cihazlarda uygulama verilerinin otomatik sistem ve ADB yedeklemesi kapalıdır (`android:allowBackup="false"`).

### 2. İsteğe Bağlı Bulut Eşitleme (Varsayılan Olarak Kapalı)

* **Açmadıkça Çalışmaz:** Bulut Eşitleme kapalı başlar. Sen **Bulut Eşitleme** ekranından açmadıkça ya da başka bir cihaz bağlamadıkça Kanso arka planda Firebase başlatmaz ve dış sunuculara hiçbir veri göndermez.
* **Nasıl Eşitlenir:** Eşitlemeyi açtığında görevlerin, listelerin ve odak oturumların şifreli **HTTPS** üzerinden, rastgele üretilen bir eşleştirme anahtarı (`ZEN-XXXX-XXXX`) ve **Firebase Anonim Kimlik Doğrulama** ile **Google Firebase Cloud Firestore** üzerinde eşitlenir.
* **Kişisel Bilgi İstenmez:** Kanso ad, soyad, e-posta, telefon numarası, konum, rehber veya reklam kimliği istemez ve toplamaz.
* **Güvenli Anahtar Saklama:** Eşleştirme anahtarın cihazının donanım destekli güvenli deposunda (**Android Keystore / iOS Keychain**) tutulur. İstediğin an Bulut Eşitlemeyi kapatıp yerel verilerini kaybetmeden yalnızca cihaz içi kullanıma dönebilirsin.

### 3. İzinler

Kanso yalnızca kullandığın özelliklerin gerektirdiği izinleri ister:

* **Bildirimler (İsteğe Bağlı):** Yalnızca sen Sabah Planı, Akşam Özeti, görev hatırlatıcısı veya Odak bitiş uyarısını açtığında kullanılır.
* **Ses Ayarları / Titreşim:** Uygulama içindeki ortam seslerini çalmak ve isteğe bağlı titreşim vermek için kullanılır. Mikrofon erişimi veya ses kaydı yoktur.
* **İnternet Erişimi:** Yalnızca isteğe bağlı Bulut Eşitlemeyi açtığında veya Expo Updates üzerinden uygulama güncellemelerini denetlerken kullanılır.

### 4. Reklam, Analitik ve Dış Font Yok

* Verilerin üçüncü taraflara satılmaz, kiralanmaz ve paylaşılmaz.
* Kanso’da reklam SDK’ları, üçüncü taraf analitik veya telemetri kütüphaneleri (Google Analytics, Firebase Analytics, Sentry, Amplitude, Mixpanel vb.) ya da davranış izleme araçları bulunmaz.
* Kanso internetten harici yazı tipi (ör. Google Fonts) indirmez; tüm simge ve yazı tipleri uygulama içinde yer alır veya işletim sisteminden gelir.

### 5. Dışa Aktarma ve Kalıcı Silme

* **İstediğin Zaman Dışa Aktar:** Görevlerini ve listelerini **Ayarlar → Verileri Dışa Aktar** bölümünden `.json`, `.ics` veya `.md` olarak dışa aktarabilirsin.
* **Her Şeyi Kalıcı Olarak Sil:** Uygulama içinde **Ayarlar → Tüm Verileri Sil** seçeneğine dokunarak tüm verilerini kalıcı olarak temizleyebilirsin. Bu işlem:
  1. Aktif tüm Bulut Eşitleme dinleyicilerini anında kapatır ve bekleyen gönderimleri iptal eder.
  2. Daha önce Bulut Eşitleme kullanıldıysa **Google Firebase Cloud Firestore** üzerindeki çalışma alanı kayıtlarını (`_tasks`, `_lists`, `_focus`) kalıcı olarak siler.
  3. Cihazdaki tüm görevleri, listeleri, odak geçmişini, özel etiket ve klasörleri, zamanlanmış bildirimleri ve güvenli depodaki eşleştirme anahtarını kalıcı olarak temizler; uygulamayı yeniden yalnızca cihaz içi moda geçirir.

### 6. Çocukların Gizliliği

Kanso 13 yaş altındaki çocuklara yönelik değildir ve bilerek kimseden kişisel bilgi toplamaz.

### 7. İletişim

**Kanso** gizlilik politikası, KVKK/GDPR kapsamındaki hakların veya veri silme taleplerin için iletişim adresi:

* **Destek E-postası:** `[DESTEK_EPOSTA_ADRESINIZ@ornek.com]` *(Mağaza yayını öncesinde bu yer tutucuyu aktif destek e-posta adresinizle değiştirin.)*
