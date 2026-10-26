# Accounts server (PocketBase on PocketHost)

Logging in on Tabi Neko is optional. When someone logs in, their My trip is
saved to this server so it's the same on every device. The site talks to it
from `js/account.js`; while `PB_URL` there is empty, accounts are switched off
and the site keeps trips on the phone only.

Login is by a code sent to the person's email (PocketBase "OTP"), so there are
no passwords. Each account has one trip, stored as JSON.

## Setup

1. **Create the server.** Sign up at [pockethost.io](https://pockethost.io),
   create an instance (e.g. `tabineko`), open its admin dashboard and create
   the superuser (admin) account. Keep that password to yourself.

2. **Email codes.** Collections → `users` → the ⚙ (edit) button → *Options*:
   - turn on **OTP**, set the code length to **6** and the duration to **300**
     seconds;
   - optional: under *Mail templates → OTP*, set the subject to
     "Your Tabi Neko code".

   Leave the `users` API rules as PocketBase sets them (anyone can create an
   account; people can only see, change or delete their own).

3. **The `trips` collection.** New collection → *Base*, named `trips`:
   - field `owner`: **Relation** to `users`, single, **required**, with
     **cascade delete** on (deleting an account deletes its trip);
   - field `data`: **JSON**;
   - keep the `created` and `updated` fields the dashboard adds.

   API rules (only the owner can touch a trip, and can't hand it to someone
   else):

   | Rule | Value |
   |---|---|
   | List/Search | `owner = @request.auth.id` |
   | View | `owner = @request.auth.id` |
   | Create | `@request.auth.id != "" && owner = @request.auth.id` |
   | Update | `owner = @request.auth.id && @request.body.owner:isset = false` |
   | Delete | `owner = @request.auth.id` |

4. **Sending email.** Settings → *Mail settings* → use an SMTP server. Without
   a domain of our own, Gmail works: host `smtp.gmail.com`, port `587`, your
   Gmail address as the username, and an **app password** (Google Account →
   Security → 2-Step Verification → App passwords) as the password. Sender
   name "Tabi Neko". Press *Send test email* to check it.

5. **Rate limits.** Settings → *Rate limits*: turn them on (the defaults are
   fine). This stops anyone using the login form to spam an inbox.

6. **Switch it on.** Put the instance address in `PB_URL` at the top of
   `js/account.js`, e.g. `https://tabineko.pockethost.io`.

## Backups

The whole database is one SQLite file. Settings → *Backups* can make them on
a schedule; keep at least a weekly one.
