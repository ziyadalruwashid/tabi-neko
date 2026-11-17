#!/usr/bin/env python3
"""App Store signing for the iOS workflow, with no registered devices.

Xcode's automatic signing archives with a development profile first, and a
development profile needs at least one registered iPhone. An App Store
profile needs none, so the workflow signs manually for the App Store:

  setup    makes a throwaway Apple Distribution certificate (new key and
           CSR here) and an App Store profile through the App Store Connect
           API, puts both in a temporary keychain, and points the App
           target's Release signing at them.
  cleanup  deletes that profile and revokes that certificate, so they never
           pile up (Apple allows only a few distribution certificates).
           Builds already uploaded aren't affected: Apple re-signs them.

Only the standard library and the openssl and security tools are used.
Environment: KEY (path of the .p8), KID, ISS, TEAM, BUNDLE, WORK (a temp dir).
"""
import base64, json, os, subprocess, sys, time, urllib.error, urllib.request

API = "https://api.appstoreconnect.apple.com/v1"
E = os.environ


def run(*cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def der_to_raw(sig):
    # ECDSA DER (SEQUENCE of two INTEGERs) -> 64 bytes r||s, as JWT ES256 wants.
    assert sig[0] == 0x30
    i = 2 if sig[1] < 0x80 else 2 + (sig[1] & 0x7F)
    out = b""
    for _ in range(2):
        assert sig[i] == 0x02
        n = sig[i + 1]
        out += sig[i + 2:i + 2 + n].lstrip(b"\x00").rjust(32, b"\x00")
        i += 2 + n
    return out


def token():
    now = int(time.time())
    head = b64u(json.dumps({"alg": "ES256", "kid": E["KID"], "typ": "JWT"}).encode())
    body = b64u(json.dumps({"iss": E["ISS"], "iat": now, "exp": now + 1000, "aud": "appstoreconnect-v1"}).encode())
    sig = run("openssl", "dgst", "-sha256", "-sign", E["KEY"], input=f"{head}.{body}".encode()).stdout
    return f"{head}.{body}.{b64u(der_to_raw(sig))}"


def call(method, path, data=None):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(data).encode() if data else None,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        try:
            detail = "; ".join(x.get("detail") or x.get("title", "") for x in json.loads(detail)["errors"])
        except Exception:
            pass
        sys.exit(f"::error::App Store Connect said {e.code} to {method} {path.split('?')[0]}: {detail}")


def out(name, value):
    with open(E["GITHUB_OUTPUT"], "a") as f:
        f.write(f"{name}={value}\n")


def setup():
    work, bundle, team = E["WORK"], E["BUNDLE"], E["TEAM"]
    key, csr = f"{work}/dist.key", f"{work}/dist.csr"
    run("openssl", "genrsa", "-out", key, "2048")
    run("openssl", "req", "-new", "-key", key, "-out", csr, "-subj", "/CN=Tabi Neko CI/O=Tabi Neko/C=SA")
    csr_text = open(csr).read()

    ids = call("GET", f"/bundleIds?filter[identifier]={bundle}&limit=50")["data"]
    ids = [x for x in ids if x["attributes"]["identifier"] == bundle]
    if not ids:
        sys.exit(f"::error::The App ID {bundle} isn't registered on this team (developer.apple.com → Identifiers).")
    bundle_id = ids[0]["id"]

    cert = call("POST", "/certificates", {"data": {"type": "certificates", "attributes": {
        "certificateType": "DISTRIBUTION", "csrContent": csr_text}}})["data"]
    out("cert_id", cert["id"])
    der = base64.b64decode(cert["attributes"]["certificateContent"])
    open(f"{work}/dist.cer", "wb").write(der)

    name = f"Tabi Neko CI {E.get('GITHUB_RUN_NUMBER', int(time.time()))}"
    prof = call("POST", "/profiles", {"data": {"type": "profiles",
        "attributes": {"name": name, "profileType": "IOS_APP_STORE"},
        "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bundle_id}},
                          "certificates": {"data": [{"type": "certificates", "id": cert["id"]}]}}}})["data"]
    out("profile_id", prof["id"])
    uuid = prof["attributes"]["uuid"]
    pdir = os.path.expanduser("~/Library/MobileDevice/Provisioning Profiles")
    os.makedirs(pdir, exist_ok=True)
    open(f"{pdir}/{uuid}.mobileprovision", "wb").write(base64.b64decode(prof["attributes"]["profileContent"]))

    # A temporary keychain with the key and certificate (and Apple's
    # intermediate certificate, so codesign can build the chain).
    pem = f"{work}/dist.pem"
    run("openssl", "x509", "-inform", "DER", "-in", f"{work}/dist.cer", "-out", pem)
    p12, pw = f"{work}/dist.p12", base64.b16encode(os.urandom(12)).decode()
    legacy = ["-certpbe", "PBE-SHA1-3DES", "-keypbe", "PBE-SHA1-3DES", "-macalg", "sha1"]
    run("openssl", "pkcs12", "-export", "-inkey", key, "-in", pem, "-out", p12, "-passout", f"pass:{pw}", *legacy)
    kc = f"{work}/signing.keychain-db"
    run("security", "create-keychain", "-p", pw, kc)
    run("security", "set-keychain-settings", "-lut", "21600", kc)
    run("security", "unlock-keychain", "-p", pw, kc)
    run("security", "import", p12, "-k", kc, "-P", pw, "-T", "/usr/bin/codesign", "-T", "/usr/bin/security")
    wwdr = f"{work}/wwdr.cer"
    urllib.request.urlretrieve("https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer", wwdr)
    subprocess.run(["security", "import", wwdr, "-k", kc], capture_output=True)
    run("security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", pw, kc)
    current = run("security", "list-keychains", "-d", "user").stdout.decode().split()
    run("security", "list-keychains", "-d", "user", "-s", kc, *[c.strip('"') for c in current])
    out("keychain", kc)
    for f in (key, csr, p12):
        os.remove(f)

    # Sign only the App target this way (its two configurations carry the
    # bundle ID); the Swift packages it links aren't signed on their own.
    proj = E["PROJECT"]
    text = open(proj).read()
    blocks = text.split("buildSettings = {")
    for i, b in enumerate(blocks):
        head, sep, rest = b.partition("};")
        if f"PRODUCT_BUNDLE_IDENTIFIER = {bundle};" in head:
            head = head.replace("CODE_SIGN_STYLE = Automatic;", "CODE_SIGN_STYLE = Manual;")
            head += (f'\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n'
                     f'\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";\n'
                     f"\t\t\t\tDEVELOPMENT_TEAM = {team};\n"
                     f'\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "{name}";\n')
            blocks[i] = head + sep + rest
    open(proj, "w").write("buildSettings = {".join(blocks))
    out("profile_name", name)
    print(f"Signing set up: Apple Distribution certificate and App Store profile \"{name}\".")


def cleanup():
    if E.get("PROFILE_ID"):
        call("DELETE", f"/profiles/{E['PROFILE_ID']}")
    if E.get("CERT_ID"):
        call("DELETE", f"/certificates/{E['CERT_ID']}")
    if E.get("KEYCHAIN"):
        subprocess.run(["security", "delete-keychain", E["KEYCHAIN"]], capture_output=True)
    print("Removed the build's certificate, profile and keychain.")


if __name__ == "__main__":
    {"setup": setup, "cleanup": cleanup}[sys.argv[1]]()
