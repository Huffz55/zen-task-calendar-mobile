# Zen Task Calendar Mobile 🌸 (React Native / Expo)

Zen Task Calendar'ın iOS ve Android için sıfırdan tasarlanmış modern, native mobil versiyonudur.

## 🚀 Seçilen Teknoloji Yığını
- **Çatı:** React Native 0.86 / Expo SDK 57 (TypeScript)
- **Navigasyon & Yönlendirme:** **Expo Router (~57.0.26)** dosya tabanlı yönlendirme (`src/app/`)
- **Mimari:** Clean Architecture (Context, Components, Screens, Services, Hooks, Types, Constants)
- **Depolama:** `@react-native-async-storage/async-storage` (Offline-first kalıcı veri saklama)
- **Ses Motoru:** `expo-audio` (Modern ses çalma, arka plan müzikleri, 432Hz Zen çanı)
- **Bildirimler:** `expo-notifications` (Sabah 09:00 görev hatırlatıcısı ve odaklanma tamamlanma bildirimleri)
- **Haptik:** `expo-haptics` (Taptic Engine titreşim geri bildirimleri)
- **Ekran Uyanıklığı:** `expo-keep-awake` (Zen Odak modunda ekran kapanmasını önleme)
- **Güvenli Alan:** `react-native-safe-area-context` (Çentik ve home bar uyumu)
- **Tarih Motoru:** `date-fns`

## 🗂️ Rota Yapısı (`src/app/`)
- `src/app/_layout.tsx`: Root Stack, SafeArea ve global AppProvider (`Toast`, `ThemeModal`)
- `src/app/(tabs)/_layout.tsx`: Alt sekme çubuğu navigatörü (BottomNav entegrasyonu)
- `src/app/(tabs)/index.tsx`: Bugün ekranı rotası
- `src/app/(tabs)/calendar.tsx`: Aylık takvim ekranı rotası
- `src/app/(tabs)/lists.tsx`: Özel listeler ekranı rotası
- `src/app/(tabs)/focus.tsx`: Zen odaklanma sayacı rotası
- `src/app/list/[id].tsx`: Dinamik özel liste tam ekran detay rotası

## 📱 Ekranlar & Yetenekler
1. **Bugün (TodayScreen):** Günlük görevler, yatay 14 günlük hızlı kaydırma çubuğu (`DayStrip`), streak sayacı (`🔥`), gecikmiş görevleri bugüne aktarma (`Rollover`), hızlı görev ekleme FAB, gerçek zamanlı arama & etiket filtreleme (`TaskFilterBar`), görev düzenleme (`EditTaskModal`).
2. **Takvim (CalendarScreen):** Tam ekran aylık takvim matrisi, görev yoğunluk noktaları, seçilen gün detayları, arama/filtreleme ve tek dokunuşla düzenleme & planlama.
3. **Listeler (ListsScreen):** Kategorize edilmiş özel kontrol listeleri, madde bazlı ilerleme çubuğu, tek dokunuşla madde tamamlama, tek dokunuşla tam ekran detay sayfasına geçiş (`/list/[id]`).
4. **Zen Odak (FocusScreen):** Minimalist Pomodoro / odaklanma sayacı, hızlı süre butonları (15m, 25m, 45m, 60m), Keep-Awake entegrasyonu, **Zen Ortam Sesleri** (`AmbientSoundBar`: Yağmur, Okyanus, Orman, Şömine) ve **432 Hz Tibet Zen Çanı** tamamlama sesi.
5. **Tema Sistemi (ThemeModal):** Sakura Rose 🌸, Matcha Garden 🍵, Nordic Breeze 🌊 ve Midnight Silk 🌙 (Tam karanlık mod).
6. **Arama & Etiket Filtreleme:** Görev başlığına göre anlık filtreleme, etiket bazlı dinamik sayaç rozetleri.
7. **Yerel Bildirimler:** Sabah 09:00 günlük görev özeti ve arka planda Zen seansı bittiğinde uyaran bildirimler.

## 🛠️ Çalıştırma Adımları
```bash
# Bağımlılıkları yükleyin (halihazırda yüklüdür)
npm install

# Geliştirme sunucusunu başlatın
npx expo start

# QR kodu Expo Go (iOS / Android) uygulamasından taratın veya emülatörde açın:
# 'a' -> Android Emülatör
# 'i' -> iOS Simülatör
```
