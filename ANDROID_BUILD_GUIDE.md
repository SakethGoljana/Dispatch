# SchoolPing — Android Build, Installation & Testing Guide

This guide walks you through testing and building the **SchoolPing** Android app on your Windows computer and Android mobile phone.

---

## 3 Ways to Run & Test SchoolPing on Your Android Phone

| Method | Best For | What You Need | Time Required |
| :--- | :--- | :--- | :--- |
| **Method 1: Expo Go** | **Immediate interactive testing & live coding** | Expo Go app on phone + PC on same Wi-Fi | **2 minutes** |
| **Method 2: Standalone APK** | **Real app installation** without needing PC or Expo Go | Free Expo account + EAS CLI | **~10 minutes (cloud build)** |
| **Method 3: Google Play AAB** | **Official release to schools** via Google Play Store | Google Play Developer Account | Production release |

---

## Method 1: Instant Interactive Testing via Expo Go (Recommended for Today)

This is the fastest and easiest way to see SchoolPing live on your phone with live reload.

### Step 1: Install Expo Go on your phone
1. On your Android phone, open the **Google Play Store**.
2. Search for **"Expo Go"** and tap **Install**.

### Step 2: Start the Development Server on Windows
Open your terminal in VS Code (or PowerShell) in the `SchoolPing` directory and run:

```bash
npx expo start
```

*(Note: If your phone and PC are on different Wi-Fi networks or mobile hotspot, use tunnel mode: `npx expo start --tunnel`)*

### Step 3: Open the App on Your Phone
1. The terminal will display a large QR code.
2. Open the **Expo Go** app on your Android phone.
3. Tap **"Scan QR code"** and point your phone camera at the QR code on your PC screen.
4. SchoolPing will bundle and load immediately on your device!

> [!TIP]
> **Live Reloading:** Any changes you make to the source code will instantly refresh on your phone in real time without restarting.

---

## Method 2: Building a Standalone Installable Android APK (No PC Connection Needed)

A **standalone APK (`.apk`)** is an independent Android application package. Once installed on your phone:
- It has its own SchoolPing icon on your home screen.
- It does **not** require Expo Go.
- It does **not** need your computer to be running.
- You can share the `.apk` file directly with teachers via WhatsApp or Google Drive.

EAS (Expo Application Services) builds the APK in the cloud, so you **do not need** Android Studio, Java SDK, or Gradle installed on Windows.

### Step 1: Log in to EAS (Free)
If you haven't created a free Expo account, sign up at [expo.dev/signup](https://expo.dev/signup).

In your terminal, run:
```bash
npx eas-cli@latest login
```
Enter your Expo username and password.

### Step 2: Configure EAS Project
Link your project to your Expo account:
```bash
npx eas-cli@latest project:init
```

### Step 3: Trigger the Cloud APK Build
Run this single command:
```bash
npx eas-cli@latest build -p android --profile preview
```

### What Happens Next?
1. EAS uploads your project code and assets (`app.json`, icons).
2. Cloud build servers compile the native Android APK.
3. Once completed (usually 5–10 minutes), EAS prints:
   - A **web download link**.
   - A **QR code** on your terminal screen.
4. Scan the QR code or open the link on your Android phone to download and install `SchoolPing.apk`!

---

## Method 3: Google Play Store Release (Production App Bundle / AAB)

When you are ready to publish SchoolPing to the Google Play Store:

1. Google Play requires an **Android App Bundle (`.aab`)**, not an `.apk`.
2. Run:
   ```bash
   npx eas-cli@latest build -p android --profile production
   ```
3. EAS will generate the production `.aab` file and handle Android keystore signing automatically.
4. You can download the `.aab` and upload it directly to the **Google Play Console** under Production or Internal Testing.

---

## Step-by-Step Real Hardware Testing Checklist

Once SchoolPing is open on your Android phone, perform this end-to-end test:

1. **Test Excel Import:**
   - Copy a test school spreadsheet (`.xlsx` or `.csv`) onto your phone's internal storage or Google Drive.
   - In SchoolPing, tap **"New Campaign"** $\to$ **"Import File"**.
   - The native Android document picker opens. Select your spreadsheet.
   - Verify that student names, parent phone numbers, and balances load cleanly.
2. **Test WhatsApp Intent (`Link Mode`):**
   - Tap through to **Step 5: Review & Send**.
   - Tap **"Send Test to My Number →"** and type your own 10-digit mobile number.
   - Verify that Android opens WhatsApp with the personalized message and phone number prefilled.
3. **Test Return-to-App Confirmation:**
   - In WhatsApp, tap the Send button.
   - Tap the Android Back button to return to SchoolPing.
   - Verify that SchoolPing shows the confirmation modal: *"Did you tap Send in WhatsApp for [Student Name]?"*
   - Tap **"Yes, Sent ✓"** and confirm that the queue advances to the next student.
4. **Inspect Campaign History:**
   - Tap the **Campaigns** tab at the bottom navigation bar.
   - Confirm that your test campaign shows the correct timestamp, sent tally, and recipient breakdown.
