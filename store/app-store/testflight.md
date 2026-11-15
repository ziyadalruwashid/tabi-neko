# iPhone app: TestFlight without a Mac

`.github/workflows/ios.yml` builds the app on GitHub's Macs, signs it and
uploads it to TestFlight. It runs from the Actions tab ("Run workflow") and by
itself on every merge to `main` that changes the app or the site. Until the
four secrets below exist it skips itself with a note.

## One-time setup (the owner)

1. **Apple Developer Program**: enrol at developer.apple.com ($99/year,
   identity check, 1–2 days).
2. **App ID**: Certificates, IDs & Profiles → Identifiers → + → App IDs →
   App → Bundle ID `com.ziyadalruwashid.tabineko` (explicit), description
   "Tabi Neko". No extra capabilities are needed. (`com.tabineko.app`, the
   Android ID, was already taken on Apple's side, so the iPhone app has its
   own ID; it's set in `app/ios/App/App.xcodeproj/project.pbxproj`.)
3. **The app in App Store Connect**: appstoreconnect.apple.com → Apps → + →
   New App: iOS, name "Tabi Neko", primary language English, bundle ID
   `com.ziyadalruwashid.tabineko`, SKU `tabineko`.
4. **API key**: App Store Connect → Users and Access → Integrations →
   App Store Connect API → Team Keys → + → name "GitHub", access **Admin**.
   Download the `.p8` file (Apple lets you download it only once) and note
   the **Key ID** and the **Issuer ID** above the list.
5. **Team ID**: developer.apple.com → Account → Membership details.
6. **GitHub secrets**: the repo → Settings → Secrets and variables → Actions
   → New repository secret, four times:
   - `APPLE_TEAM_ID`: the Team ID
   - `APPSTORE_KEY_ID`: the Key ID
   - `APPSTORE_ISSUER_ID`: the Issuer ID
   - `APPSTORE_KEY_P8`: open the `.p8` file in a text editor and paste all
     of it, including the BEGIN and END lines

   Never paste these anywhere else (chat, issues, code).
7. **Run it**: Actions → iOS app → Run workflow. About 15 minutes later the
   build appears in App Store Connect → TestFlight (Apple processes it for
   another 10–30 minutes).
8. **Install it**: TestFlight → Internal Testing → + group → add yourself
   (and up to 100 people on your App Store Connect team). Install Apple's
   TestFlight app on the iPhone and open the invite.

## What's different on iPhone for now

- Sign-in is email and password only. Google sign-in on iOS needs an iOS
  client ID in Firebase, and Apple then requires Sign in with Apple as well;
  both come before the App Store review (not needed for TestFlight).
- `ITSAppUsesNonExemptEncryption` is `false` in `Info.plist` (the app only
  uses standard HTTPS), so App Store Connect doesn't ask about encryption on
  each build.
