# Make the upload key (once)

Google Play only accepts an app signed with your own key. You make an
**upload key** once, keep a backup, and give it to GitHub as two secrets.
GitHub then signs every store build for you.

With **Play App Signing** (on by default), Google keeps the real key that
signs the app for people's phones, and this upload key only proves an upload
came from you. If you ever lose it, Google support can reset it, so losing it
isn't the end of the world. Still, keep a backup.

**Never** paste the key file, its text or its password into a chat, an
email, the code or a GitHub issue. It only goes in GitHub's **Secrets**
page.

---

## On a Mac (nothing to install)

1. Open **Terminal** (Spotlight → type `Terminal`).
2. Make a folder for it and go there:
   ```
   mkdir -p ~/TabiNekoKey && cd ~/TabiNekoKey
   ```
3. Make the key (one line, copy all of it):
   ```
   openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 10000 -subj "/CN=Tabi Neko"
   ```
4. Pack it into one password-protected file:
   ```
   openssl pkcs12 -export -inkey key.pem -in cert.pem -name upload -out upload.p12
   ```
   It asks for an **Export Password** twice. Make a strong one (16+
   characters) and save it in your password manager. Nothing shows while
   you type; that's normal.
5. Delete the unprotected copy:
   ```
   rm key.pem cert.pem
   ```
6. Copy the file as text, ready for GitHub:
   ```
   base64 -i upload.p12 | pbcopy
   ```
   It's now on your clipboard. Don't paste it anywhere except step 2 of
   "Give it to GitHub" below.

## On Windows

Install **Git for Windows** (git-scm.com) if you don't have it; it comes with
`openssl`. Open **Git Bash**, then:

```
mkdir -p ~/TabiNekoKey && cd ~/TabiNekoKey
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 10000 -subj "//CN=Tabi Neko"
openssl pkcs12 -export -inkey key.pem -in cert.pem -name upload -out upload.p12
rm key.pem cert.pem
base64 -w0 upload.p12 | clip
```

The rest is the same as on a Mac.

---

## Give it to GitHub

1. Open **github.com/ziyadalruwashid/tabi-neko** → **Settings** →
   **Secrets and variables** → **Actions** → **New repository secret**.
2. Name: `ANDROID_KEYSTORE_BASE64`. Secret: paste (Cmd+V / Ctrl+V). Then
   **Add secret**.
3. **New repository secret** again. Name: `ANDROID_KEYSTORE_PASSWORD`.
   Secret: the password from step 4. Then **Add secret**.

GitHub never shows a secret again, not even to you, and the store build
never prints it.

## Back it up

Keep `upload.p12` (in `~/TabiNekoKey`) and its password somewhere safe
and private, for example your password manager or a USB drive. Don't put it
in iCloud or Google Drive folders that you share, and never in the repo.

## Make a store build

**Actions** → **Store build for Google Play** → **Run workflow** → keep
version `1.0` → **Run workflow**. About 5 minutes later the file is at:

https://github.com/ziyadalruwashid/tabi-neko/releases/download/android-store/tabi-neko.aab

That `.aab` is what you upload in the Play Console. For each later update,
run it again with a higher version, like `1.1`.
