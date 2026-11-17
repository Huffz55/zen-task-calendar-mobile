# Privacy Policy — Zen Task Calendar

**Effective Date:** 2026-11-17

Zen Task Calendar ("the App") is built with a local-first architecture designed to keep your tasks, checklists, and focus history private.

## 1. Data We Collect & How It Is Stored

* **Local-First Storage:** Your tasks, checklists, custom tags, focus sessions, and preferences are stored locally on your device.
* **Optional Cross-Device Cloud Sync:** If you use Cloud Sync, your tasks, checklists, and focus timer sessions are stored in **Google Firebase Cloud Firestore** under a randomly generated pairing key (`ZEN-XXXX-XXXX`) using **Firebase Anonymous Authentication**. We do **not** collect your name, email address, phone number, location, contacts, or advertising identifiers.
* **Device Security:** Sync pairing keys on mobile devices are stored using the platform's hardware-backed secure storage (Android Keystore / iOS Keychain) and transferred strictly over encrypted HTTPS connections.

## 2. Permissions

Zen Task Calendar only requests minimal system capabilities required for its features:

* **Notifications (Optional):** Used solely when you enable local Daily Morning Briefing, Evening Review, or Focus Timer completion reminders.
* **Audio Settings / Vibration:** Used for local ambient focus audio playback and optional haptic feedback. No microphone recording or background media service is used.

## 3. Third-Party Sharing, Analytics & Ads

* We do **not** sell your data.
* We do **not** include third-party advertising SDKs, behavioral trackers, or cross-app analytics.

## 4. Data Export & Deletion

* **Export:** You can export your tasks and checklists at any time in `.json`, `.ics`, or `.md` format from **Settings -> Export Data**.
* **Delete All Data:** You can permanently delete all local data and all synced cloud workspace records at any time directly inside the app via **Settings -> Clear All Data**. This removes your workspace documents from Firebase Firestore and rotates your local device key.

## 5. Children's Privacy

Zen Task Calendar is not directed at children under 13 and does not knowingly collect personal information from anyone.

## 6. Contact

For privacy questions or deletion inquiries, contact the developer via the support contact listed on the Google Play Store listing.
