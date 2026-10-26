# Accounts server (Google Firebase, free plan)

Logging in on Tabi Neko is optional. When someone logs in, their My trip is
saved to Firebase so it's the same on every device. The site talks to it from
`js/account.js`; while `FIREBASE` there is empty, accounts are switched off and
trips stay on the phone only.

- **Firebase Authentication** handles email and password, including the
  "Forgot password?" email.
- **Firestore** keeps one document per person, `trips/<user id>`, with the
  trip as a JSON string in the field `data`.

The free (Spark) plan is far more than this site needs; no card is required.

## Setup

1. **Project.** At [console.firebase.google.com](https://console.firebase.google.com),
   *Create a project* (e.g. `tabi-neko`). Google Analytics isn't needed.
2. **Web app.** Project overview → the `</>` (Web) button → nickname
   `Tabi Neko` → *Register app*. Firebase Hosting isn't needed. From the
   `firebaseConfig` it shows, copy `apiKey` and `projectId`.
3. **Email and password login.** Build → *Authentication* → *Get started* →
   *Sign-in method* → *Email/Password* → enable (leave "Email link" off) →
   *Save*.
4. **Database.** Build → *Firestore Database* → *Create database* → pick a
   location (it can't be changed later) → *Start in production mode*.
5. **Rules.** Firestore → *Rules* → replace everything with
   [`firestore.rules`](firestore.rules) → *Publish*.
6. **Switch it on.** Put the two values in `FIREBASE` at the top of
   `js/account.js`.

The `apiKey` is not a secret: it only says which project to talk to. The
rules in step 5 are what keep each person's trip private.

## Optional

- *Authentication → Templates*: change the sender name of the password reset
  email to "Tabi Neko".
- Google Cloud console → *APIs & Services → Credentials*: restrict the API key
  to the site's address (`https://tabi-neko.vercel.app/*`).
