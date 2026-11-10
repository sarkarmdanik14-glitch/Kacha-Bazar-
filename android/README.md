# Mega Bajar - Official Android Mobile Application

**Package Name:** `com.megabazar.app`  
**Target URL:** `https://megabajar.com`  
**Architecture:** Kotlin + Jetpack Compose + Modern Android WebView  
**Target SDK:** 34 (Android 14) • **Min SDK:** 24 (Android 7.0+)  

---

## 📱 Features Included
- **Jetpack Compose UI:** 100% modern declarative UI with Material 3.
- **Full Website Integration:** Connects directly to `https://megabajar.com` preserving cart, login, checkout, and payment gateways (bKash, Nagad, SSLCommerz).
- **Persistent Sessions & Cookies:** Android `CookieManager` retains user login and shopping cart across app restarts.
- **Native Splash Screen:** Elegant Emerald splash screen with breathing logo animation.
- **Pull-To-Refresh:** Built-in `SwipeRefresh` for instant catalog updates.
- **Double-Back-to-Exit:** Pressing back twice exits the app with a friendly Toast confirmation.
- **Offline Screen:** When internet drops, displays a clean connection error screen with "পুনরায় চেষ্টা করুন" (Retry).
- **WebChromeClient File Uploads:** Supports camera capture and photo gallery picker for customer avatars and receipts.
- **External Intent Handlers:** Native support for `tel:`, `mailto:`, WhatsApp (`wa.me`), and payment app redirects.

---

## 🚀 How to Generate the Play Store `.aab` (Android App Bundle)

### Method 1: Using Android Studio (Recommended)
1. Download and extract `MegaBazar_Android_App.zip` (or open the `/android` folder).
2. Open **Android Studio** and click **File > Open**, then select the `android` folder.
3. Allow Gradle to sync dependencies (takes ~1-2 minutes).
4. In the top menu, go to:
   **Build > Generate Signed Bundle / APK...**
5. Select **Android App Bundle (.aab)** and click **Next**.
6. Select your existing release keystore (or click **Create new...** to create your Play Store keystore).
7. Select **release** build variant and click **Finish**.
8. Android Studio will generate the production `app-release.aab` file inside `android/app/release/`.

### Method 2: Command Line (Terminal)
Run this command inside the `android` directory:
```bash
./gradlew bundleRelease
```
The generated `.aab` file will be at:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 📤 Google Play Console Submission Steps
1. Log in to [Google Play Console](https://play.google.com/console).
2. Click **Create app**:
   - App name: **Mega Bajar (মেগা বাজার)**
   - Default language: **Bengali (বাংলা) / English**
   - App or game: **App**
   - Free or paid: **Free**
3. Under **Production > Create new release** (or **Testing > Internal testing**):
4. Upload `app-release.aab`.
5. Enter release notes:
   ```
   মেগা বাজার অফিসিয়াল অ্যান্ড্রয়েড অ্যাপের প্রথম রিলিজ। দ্রুত ও সহজে নিত্যপ্রয়োজনীয় বাজার ও মুদি সামগ্রী অর্ডার করুন।
   ```
6. Click **Save** and **Review release** to publish!
