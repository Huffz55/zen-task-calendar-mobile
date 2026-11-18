# Zen Task Calendar Mobile 🌸

A calm, offline-first task, calendar, checklist, and Zen focus mobile app built with React Native and Expo.

## 🚀 Tech Stack

- **Framework:** React Native `0.86.3` / Expo SDK `57` (`~57.0.33`) with TypeScript (`~6.0.3`)
- **Navigation:** Expo Router (`~57.0.31`) file-based routing under `src/app/`
- **Storage & Sync:** `@react-native-async-storage/async-storage`, `expo-secure-store`, and optional Firebase sync (`firebase`)
- **Audio Engine:** `expo-audio` (`audioService.ts` & `ambientPlaybackEngine.ts`) for seamless looping ambient soundscapes and a 432 Hz Zen completion chime
- **Notifications:** `expo-notifications` for daily reminders and focus session completion alerts
- **Haptics & UX:** `expo-haptics`, `expo-keep-awake`, `expo-system-ui`, `react-native-safe-area-context`, and swipeable bottom sheets (`SwipeableBottomSheet`)
- **Date Utilities:** `date-fns`
- **Testing & Linting:** Vitest (`vitest`), `eslint-config-expo`, and TypeScript (`tsc --noEmit`)

## 🗂️ Route Structure (`src/app/`)

- `src/app/_layout.tsx` — Root stack, safe-area setup, and global `AppProvider` (`Toast`, `ThemeModal`)
- `src/app/(tabs)/_layout.tsx` — Bottom tab navigator (`BottomNav`) with horizontal swipe tab navigation
- `src/app/(tabs)/index.tsx` — Today screen route
- `src/app/(tabs)/calendar.tsx` — Monthly calendar route
- `src/app/(tabs)/lists.tsx` — Custom checklists route
- `src/app/(tabs)/focus.tsx` — Zen focus timer route
- `src/app/list/[id].tsx` — Dynamic full-screen checklist detail route

## 📱 Screens & Features

1. **Today (`TodayScreen`):** Daily task list, 14-day horizontal `DayStrip`, streak counter, overdue task rollover, quick-add FAB, real-time search and tag filtering (`TaskFilterBar`), `EditTaskModal`, `ZenTriageModal`, and `EveningReviewModal`.
2. **Calendar (`CalendarScreen`):** Full-screen monthly calendar matrix (`CalendarGrid`), task density indicators, selected-day task list, search/tag filtering, and quick scheduling.
3. **Lists (`ListsScreen` & `/list/[id]`):** Categorized custom checklists with progress bars, one-tap item completion, and dedicated detail views.
4. **Zen Focus (`FocusScreen`):** Minimalist focus timer (`ZenTimerView`), breathing exercises (`ZenBreathingModal`), `MiniFocusPlayer`, focus analytics & heatmap (`FocusAnalyticsCard`, `ZenHeatmap`), `KeepAwake`, 5 seamless stereo AAC-LC ambient soundscapes (`AmbientSoundBar`: Rain, Ocean Waves, Forest, Wind, Cozy Fireplace), and a 432 Hz Zen chime.
5. **Themes (`ThemeModal`):** Four curated color palettes — **Sakura Rose**, **Matcha Garden**, **Nordic Breeze**, and **Midnight Silk** (dark mode).
6. **Sync & Privacy:** Local-first persistence with optional encrypted sync (`SyncModal`) and in-app privacy policy (`PrivacyPolicyModal` / `PRIVACY_POLICY.md`).

## 🛠️ Getting Started

```bash
# Install dependencies
npm install

# Start the Expo development server
npm start

# Run on Android / iOS / Web
npm run android
npm run ios
npm run web
```

## ✅ Verification & Testing

```bash
# TypeScript type check
npx tsc --noEmit

# Expo ESLint check
npm run lint

# Unit tests (Vitest)
npm test

# Expo project health check
npx expo-doctor
```

## 📦 Building for Release (EAS)

Release profiles are configured in `eas.json` and `app.json` (`com.zentask.mobile`):

```bash
# Preview Android APK
eas build --platform android --profile preview

# Production Android App Bundle (.aab)
eas build --platform android --profile production
```
