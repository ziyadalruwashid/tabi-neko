# Google Play Console: answers for every form

Each answer below comes from what the app really does, and matches the
privacy page (`js/privacy.js`). If the app changes, change both.

In the Play Console these are under **Policy and programs → App content**.

---

## 1. Privacy policy

```
https://tabi-neko.vercel.app/privacy
```

## 2. Ads

**Does your app contain ads?** → **No**

## 3. App access

**Are all parts of your app available without special access?** → **No, some
parts are restricted (login)**

Add one set of instructions:

- **Name:** `Test account`
- **Username / email:** the test account's email (see below)
- **Password:** its password
- **Other information:** paste the reviewer note:

```
Exploring the map, places, day trips and apps works without an account.
Logging in is needed to plan a trip, ask Apollo (the AI travel chat), use
"Plan my trip" and collect stamps.

To log in: tap More (bottom right) → "Your account" at the top → Log in,
and use the email and password above.

Stamps need you to be at the place in Japan, so they can't be tested
outside Japan. Halal Lens (More → Halal Lens) works anywhere: point the
camera at any food label with Japanese text.

To delete the account: More → Privacy → Delete my account (or More → your
name at the top → Delete my account).
```

**Test account:** make a new account in the app (More → Your account → Create account)
with an email you control, just for Google. Don't use your own account, and
never put its password anywhere else.

## 4. Content rating (IARC questionnaire)

- **Email:** your contact email
- **Category:** **All other app types** (it's a reference / travel app,
  not a game)

Answer **No** to every question, except:

| Question | Answer | Why |
|---|---|---|
| Violence, blood, sexual content, profanity, gambling, horror | **No** | None in the app |
| Controlled substances (drugs, alcohol, tobacco) | **No** | The app only warns about alcohol in food (Halal Lens); it never shows or promotes drinking |
| Does the app let users interact or exchange content with each other? | **No** | Sharing trips was removed; there's no chat between people |
| Does the app share the user's current location with other users? | **No** | Location stays on the phone |
| Does the app allow users to purchase digital goods? | **No** | Free, no purchases |
| Does the app contain AI-generated content? (if asked) | **Yes** | Ask Apollo writes answers with Claude, an AI model |
| Unrestricted internet / web browsing? | **No** | It only opens Google Maps and booking links |

Expected rating: **Everyone / PEGI 3** (it may come back as 12+ because of
the AI chat; both are fine).

## 5. Target audience and content

- **Target age groups:** **18 and over** only (travellers planning a trip,
  and an account with an email is needed)
- **Could your app unintentionally appeal to children?** → **No**
- **Store listing:** no "teacher approved" or Families programme

## 6. News app

**Is your app a news app?** → **No**

## 7. Data safety

### Overview

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (all HTTPS) |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Account deletion URL | `https://tabi-neko.vercel.app/delete-account` |

### Data types: tick only these

| Category → type | Collected | Shared | Ephemeral? | Required? | Purposes |
|---|---|---|---|---|---|
| **Personal info → Email address** | Yes | No | No | Required (only to log in) | App functionality, Account management |
| **Personal info → Name** | Yes | No | No | Optional (a display name you choose) | App functionality, Account management |
| **App activity → Other user-generated content** (your trips, stamps, where you're staying, and reported Apollo answers) | Yes | No | No | Optional | App functionality |
| **Messages → Other in-app messages** (questions to Apollo) | Yes | No | **Yes** (sent to write the answer, not stored) | Optional | App functionality |
| **App activity → In-app search history** (the hotel search box) | Yes | No | **Yes** (sent to OpenStreetMap to find the place, not stored) | Optional | App functionality |

### Do NOT tick these, and why

| Type | Why it's not "collected" |
|---|---|
| Location (approximate or precise) | Used only on the phone (distances, "near me", stamps). Google says data that never leaves the device isn't collected. |
| Photos and videos | Halal Lens reads the photo on the phone; it's never uploaded. |
| Device or other IDs | None are used. |
| App interactions / analytics | Only one total per day (app opens, website visits) with nothing about the person: no ID, no cookie, no IP. That isn't user data. |
| Crash logs / diagnostics | None collected. |

**"Shared" is No everywhere:** Firebase (Google) stores accounts and trips,
Anthropic writes Apollo's answers, and OpenStreetMap finds hotels. Each is a
service provider working for the app, which Google's form doesn't count as
sharing. Nothing goes to advertisers or data brokers.

## 8. Permissions the app asks for

Google may ask you to explain these (or reviewers read them from the
listing):

| Permission | Why |
|---|---|
| **Location** (only while the app is open) | Shows how far places are and what's near you, and checks you're really at a famous place before giving its stamp. It stays on the phone. |
| **Camera** | Halal Lens: photographs a food label or a menu and reads it on the phone. |
| **Notifications** | Trip reminders you turn on yourself (like "your day starts tomorrow"). |

The app doesn't use background location or exact alarms.

## 9. Generative AI

Google Play's AI-generated content policy needs a way to report an offensive
answer from inside the app. Ask Apollo has a **⚑ Report** button under each
answer. Reports are saved to Firestore (`reports`), and only the owner can
read them (Firebase console → Firestore Database → `reports`).

## 10. Government apps, financial features, health

All **No**.
