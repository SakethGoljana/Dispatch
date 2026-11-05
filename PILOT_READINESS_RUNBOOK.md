# SchoolPing — Pilot-Readiness Runbook & Deployment Checklist

**Document Version:** 1.0.0 (Pilot Candidate)  
**Target Audience:** School Principals, Administrative Staff, IT Coordinators, and Development Team.

---

## 1. Executive Summary & Architectural Overview

SchoolPing is a professional, privacy-first mobile communication platform designed for Indian schools. It bridges student data (fee registers, exam results, attendance logs) with WhatsApp communication without manual copy-pasting errors.

### The Two Independent Messaging Modes
SchoolPing implements **one shared data engine** with **two independent messaging adapters**:

| Feature / Attribute | Method A: WhatsApp Link Mode | Method B: Official Business Platform API |
| :--- | :--- | :--- |
| **Sending Mechanism** | Client-side `whatsapp://` click-to-chat intent | Meta WhatsApp Cloud API (`graph.facebook.com`) |
| **Hardware Required** | Teacher's Android smartphone with WhatsApp | Node.js backend server with Meta Cloud credentials |
| **Meta Approval Required?** | None (Free, zero setup, immediate use) | Yes (Meta Business Account & Template approval) |
| **Delivery Verification** | **Honest teacher confirmation** upon return to app | **Automated webhooks** (`sent`, `delivered`, `read`) |
| **Duplicate Send Protection** | In-app queue status tracking (`SENT` / `SKIPPED`) | **Atomic server dispatcher** strictly skips sent IDs |
| **Data Privacy** | 100% on-device local storage | Encrypted server-side tenant isolation (Multi-school) |

> [!IMPORTANT]
> **Zero Hallucinated Delivery Guarantee:** Under Method A, opening a WhatsApp click-to-chat link **never** marks a message as delivered. The teacher must return to the app and explicitly confirm `"Yes, Sent ✓"` or `"Skipped"`.

---

## 2. Spreadsheet Preparation Guide for Schools

SchoolPing is built with a **Universal Spreadsheet Parser** capable of reading **any** Excel (`.xlsx`, `.xls`) or CSV (`.csv`) file, regardless of layout or banner headers.

### 2.1 File Guidelines
- **Supported Formats:** Microsoft Excel (`.xlsx`, `.xls`), Comma-Separated Values (`.csv`).
- **File Banners & School Titles:** School title rows at the top (e.g., *"ST. XAVIER HIGH SCHOOL — ANNUAL FEE REGISTER"*) are **automatically detected and skipped**. The parser identifies the true table header row using semantic scoring.
- **Leading Zeroes & Formatting:** Phone numbers starting with `0` or `+91` are preserved as raw strings; SheetJS is configured with `cellText: true` and `raw: false` so numbers are never converted to scientific notation (`9.87E+09`).

### 2.2 Recommended Spreadsheet Columns
While SchoolPing dynamically adapts to arbitrary column names, organizing files with these columns provides 100% automated mapping:

| Target Field | Recommended Header Names | Description |
| :--- | :--- | :--- |
| **Student Name** | `Student Name`, `NAME`, `Pupil Name`, `Candidate Name` | Student's primary or first name. *(Required)* |
| **Surname / Initial** | `SUR NAME`, `Surname`, `Last Name`, `Initial` | Family name or initial (common in Indian school records). |
| **Parent Mobile** | `Phone No`, `Mobile No`, `Parent Phone`, `WhatsApp No` | 10-digit mobile number or formatted E.164 (`+91...`). *(Required)* |
| **Fee Balance** | `25-26 Bal`, `Total Due`, `Outstanding Fee`, `Balance` | Numeric amount due. |
| **Class** | `Class`, `Std`, `Grade` | Academic class (e.g., `2`, `10`, `UKG`). |
| **Section** | `Section`, `Sec`, `Div` | Class section (e.g., `A`, `B`, `Rose`). |
| **Remarks** | `Remarks`, `Notes` | Additional contextual information. |

### 2.3 Special Data Handling
1. **Ambiguous Balance Columns:**
   If a register contains multiple balance heads (e.g., `25-26 Bal`, `Up to S2.Bal`, `Upto B2.Bal`, `Up to T2.Bal`), SchoolPing flags this ambiguity and **requires the teacher to explicitly select** which balance column to communicate.
2. **Negative Balances (Advance Payments):**
   Credit balances (e.g., `-1333`) are recognized. By default, the Recipient Filter engine filters out students with non-positive balances (`Balance > 0`), ensuring parents who paid in advance are never sent fee collection reminders.
3. **Sibling Groups Sharing Parent Numbers:**
   If multiple students share the exact same mobile number, SchoolPing flags them as a **Shared Phone Group**. Teachers can inspect these records to avoid confusing parents of multiple enrolled siblings.

---

## 3. Teacher Operator Runbook (Method A — Link Mode)

### Step 1: Import File
1. Open SchoolPing on the Android phone.
2. Tap **"New Campaign"** or **"Import File"**.
3. Select the school spreadsheet (`.xlsx`, `.xls`, or `.csv`) from the device storage.
4. If multiple sheets exist, select the appropriate sheet (e.g., `Class 2 Fees`).
5. Confirm total rows detected.

### Step 2: Verify Column Mappings
1. SchoolPing automatically maps detected columns to **Student Name**, **Parent Phone**, and **Fee Balance**.
2. If ambiguous balance columns are detected, tap the exact balance column intended for this reminder campaign.
3. Tap **"Next: Compose Message →"**.

### Step 3: Compose Personalized Template
1. Choose an existing template or create a new message.
2. Insert dynamic variable chips:
   - `{{STUDENT_NAME}}` — Student's first name.
   - `{{SURNAME}}` — Family name or initial.
   - `{{CLASS_SECTION}}` — Formatted class and section (e.g., `2-A`).
   - `{{OUTSTANDING_BALANCE}}` — Indian currency formatted balance (e.g., `₹12,500`).
   - `{{VARIABLE | default: "value"}}` — Fallback value if cell is empty.
3. Use the live **‹ Student Preview Cycler ›** at the bottom to inspect real student messages before proceeding.

### Step 4: Recipient Selection & Review
1. Use filter pills to filter by:
   - **Outstanding Balance:** All vs. Balance > 0 only.
   - **Class / Section:** Target specific classes or sections.
   - **Phone Validation:** Filter out records with invalid/missing numbers.
2. Inspect the recipient list. Notice phone numbers are privacy-masked (`+91 98765 ***10`).
3. Tap **"Next: Review & Send →"**.

### Step 5: Safe Developer / Teacher Test Send
1. Before sending to real parents, tap **"Send Test to My Number →"** on the Review screen.
2. Enter your personal 10-digit mobile number.
3. WhatsApp will open with the exact personalized message. Inspect formatting, line breaks, and currency symbols.

### Step 6: Process the Recipient Queue
1. For each student in the queue, tap **"Open Chat in WhatsApp →"**.
2. WhatsApp opens directly to the parent's chat with the message prefilled in the text box.
3. Review the text and tap the green **Send** button in WhatsApp.
4. Tap the Android Back button to return to SchoolPing.
5. SchoolPing displays the confirmation modal:  
   *"Did you tap Send in WhatsApp for [Student Name]?"*
6. Tap **"Yes, Sent ✓"** to advance the queue and record the outcome, or **"Skip"** to pass.
7. Repeat until the campaign reaches 100% completion.

---

## 4. Administrator Runbook (Method B — Cloud API Setup)

### 4.1 Prerequisites
- Registered Meta Business Account (Business Manager).
- Approved WhatsApp Business Phone Number ID.
- Meta Developer App with WhatsApp Cloud API configured.
- Permanent System User Access Token with `whatsapp_business_messaging` permissions.

### 4.2 Backend Environment Configuration
In `server/.env`:
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...

JWT_SECRET=<strong-random-key>
JWT_EXPIRES_IN=7d

WHATSAPP_API_TOKEN=<Meta-Permanent-Access-Token>
WHATSAPP_PHONE_NUMBER_ID=<Meta-Phone-Number-ID>
WHATSAPP_BUSINESS_ACCOUNT_ID=<Meta-WABA-ID>
WHATSAPP_APP_SECRET=<Meta-App-Secret-For-HMAC>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<Custom-Random-Token>
```

### 4.3 Webhook Handshake Verification
1. In Meta App Dashboard → WhatsApp → Configuration:
   - **Callback URL:** `https://api.schoolping.edu/api/webhooks/whatsapp`
   - **Verify Token:** Value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
2. Meta sends a `GET` challenge handshake request; SchoolPing returns `200 OK` with `hub.challenge`.
3. In Meta Dashboard, subscribe to the `messages` webhook field.

### 4.4 Automated Status Tracking
When messages are sent via Method B:
1. Meta sends asynchronous status updates (`sent` → `delivered` → `read` → `failed`).
2. SchoolPing verifies the `X-Hub-Signature-256` HMAC SHA-256 header.
3. SchoolPing finds the recipient by `providerMessageId` and updates status in real-time.
4. Failed deliveries record the Meta error code (e.g., `131026: Message undeliverable`) in `notes`.

---

## 5. Pre-Pilot 15-Point Quality Assurance Checklist

Prior to initiating live parent communications with any pilot school, verify all 15 points:

- [x] **1. Universal Header Detection:** Table headers correctly identified past school banner titles.
- [x] **2. Ambiguous Balance Protection:** App flags registers with multiple balances and prevents unconfirmed sending.
- [x] **3. Negative Credit Handling:** Credit balances (`-1333`) correctly parsed and excluded from due reminders.
- [x] **4. Phone Number Normalization:** Standard 10-digit, 11-digit (with 0), and 12-digit (with 91) numbers normalized to E.164 (`+91XXXXXXXXXX`).
- [x] **5. Sibling Group Detection:** Records sharing parent numbers are identified with `isSharedPhone` alerts.
- [x] **6. Missing Value Safety:** Missing primary tokens block sending; secondary tokens resolve to explicit fallback strings.
- [x] **7. URL Percent-Encoding:** Line breaks (`\n`), ampersands (`&`), and currency signs (`₹`) are cleanly URL encoded.
- [x] **8. Intent Fallback:** Android `whatsapp://` intent fallback handles uninstalled WhatsApp gracefully with clear UI alert.
- [x] **9. Honest Confirmation:** Method A strictly requires teacher confirmation; opening link never claims delivery.
- [x] **10. Safe Test Mode:** Review screen includes "Send Test to My Number" modal for pre-campaign verification.
- [x] **11. Multi-Tenant Boundary:** Server routes guarantee School A cannot read or modify School B's campaigns or templates.
- [x] **12. Zero Credential Exposure:** Mobile client bundle contains zero API secrets, keys, or database credentials.
- [x] **13. Privacy Redaction:** Parent phone numbers and student names are masked in audit logs (`+91 98765 ***10`).
- [x] **14. HMAC SHA-256 Webhook Verification:** Tampered or unsigned Meta webhooks are rejected with 401 Unauthorized.
- [x] **15. Duplicate-Send Prevention:** Retrying or re-dispatching a campaign strictly skips already sent/delivered recipients.

---

## 6. Support & Emergency Operations

- **Teacher accidentally taps "Skip":**  
  The recipient remains in campaign storage marked as `SKIPPED`. The teacher can re-launch that individual student's chat from the Campaign Details view at any time.
- **Accidental double-click on Send:**  
  The dispatcher checks atomic status. Any recipient already `API_SENT`, `API_DELIVERED`, or `CONFIRMED_SENT_BY_USER` is ignored with zero duplicate messages sent.
- **Corrupt spreadsheet file:**  
  The parser catches corrupted workbooks and presents a human-readable error banner directing the teacher to check file formatting.
