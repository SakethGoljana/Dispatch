# Dispatch — Personalized Bulk WhatsApp Automation Engine
> **Portfolio Case Study & Showcase Documentation**
> **Author & Creator:** Saketh Goljana | Full-Stack Mobile Engineer & Product Designer  
> **Portfolio:** [sakethgoljana.tech](https://sakethgoljana.tech) | **LinkedIn:** [linkedin.com/in/saketh-goljana](https://www.linkedin.com/in/saketh-goljana/) | **GitHub:** [github.com/SakethGoljana](https://github.com/SakethGoljana)  
> **Repository:** [https://github.com/SakethGoljana/Dispatch](https://github.com/SakethGoljana/Dispatch)  
> **Source Conversation ID:** `b053a529-3d0f-48b6-aa24-537d3dce0245`

---

## 📌 Project Executive Summary
* **Product Name**: Dispatch
* **Category**: Mobile Application / Productivity & Business Automation
* **Platforms**: Android (Installable `.apk` & Google Play ready) & iOS
* **Live GitHub Release APK**: [Download dispatch-v1.0.0.apk (Build 6)](https://github.com/SakethGoljana/Dispatch/releases/latest/download/dispatch-v1.0.0.apk)
* **GitHub Repository**: [SakethGoljana/Dispatch](https://github.com/SakethGoljana/Dispatch)
* **EAS Cloud Builds**: [Expo EAS Dashboard](https://expo.dev/accounts/saketh3773/projects/dispatch)
* **OTA Update Channel**: `preview` (Live instant cloud update pipeline active)

---

## 🎯 The Problem Solved
Small businesses, schools, clinics, fitness centers, and service agencies face a common bottleneck: sending individual personalized WhatsApp notifications (payment dues, appointment reminders, delivery dispatches, attendance notices) to dozens or hundreds of clients.
* **The Manual Dilemma**: Copying and pasting names and numbers manually into WhatsApp takes hours and is error-prone.
* **The Bulk Sender Ban Dilemma**: Third-party unofficial bulk WhatsApp spam bots frequently get business numbers permanently banned by Meta for violating anti-spam policies.
* **The Cloud Privacy Dilemma**: Business owners do not want to upload sensitive client contact spreadsheets to third-party databases.

### 💡 The Dispatch Solution
Dispatch processes raw spreadsheets (`.xlsx`, `.xls`, `.csv`), Google Sheets live view links, and copied contact rosters **100% on-device in ephemeral memory**. It compiles dynamic tokens (e.g. `{{Name}}`, `{{Balance}}`, `{{Due Date}}`) into tailored messages, applying Indian currency formatting (`₹12,500`) and regional languages. It then dispatches each message via official 1-tap WhatsApp deep links (`wa.me`) or official Meta Graph API v21.0 with **zero risk of account bans** and **zero server-side data leakage**.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Framework & Runtime** | React Native `0.88.0`, Expo SDK `58.0.0` (Latest 2026 release) |
| **Routing & Navigation** | Expo Router `v4` (File-based routing, tab navigators, modal flows) |
| **Language & Typing** | TypeScript `v6.0`, Strict null checking, Zero compile errors |
| **Cloud CI/CD & OTA** | EAS Build (Cloud Gradle compilation), EAS Update (`expo-updates`) |
| **Spreadsheet Engines** | `xlsx` (SheetJS) binary parser, Google Sheets CSV real-time synchronizer |
| **Storage & State** | React Context + Ephemeral State (`DatasetStore`), AsyncStorage offline cache |
| **Animations** | React Native Native Driver Animated API (60 FPS gradient splash & rippling rings) |
| **Quality & Tests** | Jest `v30`, `ts-jest`, 8 test suites, 70 unit and workflow tests (100% passing) |

---

## ✨ Key Technical Achievements & Features

### 1. Universal Spreadsheet & Live Cloud Sync
* **100% Support for Excel & CSV**: Auto-maps arbitrary column headers (`Name`, `Phone`, `Balance`, `Due Date`, `City`, `Custom Attributes`) using fuzzy token matching.
* **Live Google Sheets Cloud Sync**: Connects to public view links to fetch real-time spreadsheet updates directly without file exports.
* **Digital Text Layer PDF Inspector**: Inspects and extracts structured tabular records from digital PDF exports.

### 2. Universal Audience Filters (Self-Serve Rule Engine)
* Replaced hardcoded school-only filters with a dynamic rule engine.
* Users create custom filters on any column (`Equals`, `Contains`, `Greater than`, `Less than`, `Not Empty`).
* Multi-rule evaluation with interactive filter chips and real-time candidate count calculation.

### 3. Ban-Safe 1-Tap WhatsApp Dispatch & Meta Cloud API
* **1-Tap Direct WhatsApp Deep-Linking**: Uses `wa.me/91<phone>?text=<encoded_text>` to open directly into individual chats with pre-filled customized text.
* **Meta Graph API v21.0 Direct Adapter**: Full official Meta WhatsApp Business Cloud API integration with stored API tokens and phone number IDs.

### 4. 8 Indian Regional Language Presets
* Authentic regional language templates in:
  * English 🇬🇧
  * Hindi (हिंदी) 🇮🇳
  * Marathi (मराठी) 🇮🇳
  * Telugu (తెలుగు) 🇮🇳
  * Tamil (தமிழ்) 🇮🇳
  * Kannada (ಕನ್ನಡ) 🇮🇳
  * Bengali (বাংলা) 🇮🇳
  * Gujarati (ગુજરાતી) 🇮🇳

### 5. Animated Gradient Opening Experience
* Native-driven 60 FPS animated splash sequence:
  * Spring-scale logo entrance
  * Double expanding sonic gradient wave rings (Emerald `#10B981` & Indigo `#6366F1`)
  * Pulsing radial glow aura behind the brand mark
  * Delivered 100% Over-The-Air via EAS Update.

---

## 📋 Suggested JSON Snippet for Portfolio Projects Data

```json
{
  "id": "dispatch-app",
  "title": "Dispatch — Bulk WhatsApp Automation Engine",
  "category": "Mobile App Development",
  "tags": ["React Native", "Expo SDK 58", "TypeScript", "EAS Build", "WhatsApp API"],
  "summary": "Cross-platform mobile application that turns raw Excel, CSV, and Google Sheets into personalized WhatsApp messages with 1-tap dispatch, dynamic filters, and zero account ban risk.",
  "highlights": [
    "100% client-side ephemeral spreadsheet processing for total data privacy",
    "Self-serve dynamic column filter builder & Indian currency token compiler",
    "Over-The-Air (OTA) updates pipeline and 60 FPS native gradient opening animation",
    "8 Indian regional language templates + official Meta Graph API v21.0 integration"
  ],
  "apkUrl": "https://github.com/SakethGoljana/Dispatch/releases/latest/download/dispatch-v1.0.0.apk",
  "githubUrl": "https://github.com/SakethGoljana/Dispatch",
  "role": "Lead Architect & Mobile Engineer"
}
```
