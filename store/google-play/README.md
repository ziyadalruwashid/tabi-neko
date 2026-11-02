# Launching Tabi Neko on Google Play

Everything Google asks for, ready to copy in. The order below is the
quickest path. Google's checks take days, so start step 1 first.

| File | What's in it |
|---|---|
| [`listing.md`](listing.md) | App name and descriptions in English and Arabic, category, links |
| [`forms.md`](forms.md) | Answers for every App content form: Data safety, content rating, ads, audience, app access, permissions, AI |
| [`signing-key.md`](signing-key.md) | Making the upload key and giving it to GitHub |
| [`graphics/`](graphics/) | Icon, feature graphic and phone screenshots |

## Checklist

1. **Developer account:** go to
   [play.google.com/console](https://play.google.com/console) and sign up as
   an **individual**. It's $25 once, and Google verifies your ID, which can
   take a few days.
2. **Upload key:** follow `signing-key.md`, then run **Store build for
   Google Play** in GitHub Actions.
3. **Create the app:** in the Play Console, **Create app** with:
   - name **Tabi Neko: Japan Notebook**
   - default language **English (United States)**
   - **App**, **Free**
   - accept the declarations
4. **App content:** answer every form from `forms.md`. Make the test
   account for reviewers first.
5. **Store listing:** paste the text from `listing.md` and upload the
   graphics, then add the Arabic translation.
6. **Closed test:** this is required for new personal accounts.
   - Go to **Testing → Closed testing → Create track**.
   - Upload `tabi-neko.aab`.
   - Add at least **12 testers** by their Google account emails (friends
     and family are fine).
   - Send them the opt-in link. Each must install the app and keep it for
     **14 days in a row**.
7. **Production:** after the 14 days, choose **Apply for production**,
   answer Google's few questions about the test, then send a release from
   the same `.aab` (or a newer one). Google's review usually takes from a
   few hours to a few days.

## Before each new version

- Run **Store build for Google Play** with a higher version (`1.1`,
  `1.2`…). The version code goes up by itself.
- If what the app keeps about people changes, update the privacy page
  (`js/privacy.js`) and the Data safety form together.
