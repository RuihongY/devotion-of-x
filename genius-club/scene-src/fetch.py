#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch one photograph per scene mood from Wikimedia Commons and grade it
into a unified dark, cinematic night tone for 梦醒00:42 (Genius Club).
Attribution goes to ../scenes/credits.json + CREDITS.md.
Requires: python3 + Pillow. Pattern follows ../../scene-src/fetch_scenes.py.
"""

import json, os, re, sys, time, urllib.parse, urllib.request, html

from PIL import Image, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "scenes")
os.makedirs(OUT, exist_ok=True)
UA = "GeniusClubDream/1.0 (non-commercial fan game)"

# mood -> ordered search queries (specific -> generic) + tone
SCENES = {
  "street": (["city street night neon signs", "night street neon rain asia",
              "narrow street night lights", "city street night"], "cold"),
  "bank":   (["bank lobby interior marble", "bank interior hall",
              "bank counter interior", "grand lobby interior"], "cool"),
  "bar":    (["dim bar interior night", "bar counter dark pub interior",
              "pub interior dark wood", "bar interior night"], "amber"),
  "roof":   (["city skyline night rooftop view", "rooftop view night city lights",
              "city night from above", "skyline night"], "cold"),
  "lib":    (["old library interior bookshelves", "library reading room books dark",
              "antique library interior", "library interior"], "amber"),
  "city":   (["futuristic skyscrapers night glass", "modern city towers night blue",
              "business district skyscrapers night", "skyscraper night"], "cool"),
  "house":  (["abandoned house room interior", "old abandoned interior dark room",
              "derelict room interior", "abandoned interior"], "dark"),
  "plaza":  (["clock tower night illuminated", "city clock tower night",
              "clock tower dusk", "clock tower"], "cold"),
  "reality":(["modern office interior evening", "open plan office interior",
              "office desks interior", "office interior"], "warm"),
  "title":  (["city skyline night long exposure", "night city panorama lights",
              "cityscape night lights", "city night"], "cold"),
}

# tone -> (brightness, saturation, tint RGB, tint alpha)
TONE = {
  "warm":  (0.80, 0.62, (58, 42, 18), 0.20),
  "amber": (0.78, 0.62, (74, 52, 16), 0.22),
  "cool":  (0.68, 0.55, (16, 32, 44), 0.24),
  "cold":  (0.80, 0.52, (34, 54, 72), 0.20),
  "dark":  (0.55, 0.48, (10, 10, 18), 0.30),
}

def api(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def strip(s):
    return re.sub("<[^>]+>", "", html.unescape(s or "")).strip()

def search(query):
    d = api({
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": query, "gsrnamespace": "6", "gsrlimit": "12",
        "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "1600",
    })
    pages = d.get("query", {}).get("pages", {})
    out = []
    for p in sorted(pages.values(), key=lambda x: x.get("index", 999)):
        ii = p.get("imageinfo", [{}])[0]
        out.append({
            "title": p.get("title", ""),
            "mime": ii.get("mime", ""),
            "w": ii.get("thumbwidth", 0), "h": ii.get("thumbheight", 0),
            "thumb": ii.get("thumburl", ""),
            "desc": ii.get("descriptionurl", ""),
            "meta": ii.get("extmetadata", {}),
        })
    return out

def pick(cands):
    good = [c for c in cands
            if c["mime"] in ("image/jpeg", "image/png") and c["w"] >= 1100 and c["thumb"]]
    land = [c for c in good if c["w"] >= c["h"]]
    return (land or good or [None])[0]

def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())

def grade(src, dst, tone):
    b, s, tint, ta = TONE[tone]
    im = Image.open(src).convert("RGB")
    # cover-fit to 1600x900
    W, H = 1600, 900
    ratio = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * ratio), round(im.height * ratio)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = (im.height - H) // 2
    im = im.crop((x, y, x + W, y + H))
    im = ImageEnhance.Color(im).enhance(s)
    im = ImageEnhance.Brightness(im).enhance(b)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    tint_im = Image.new("RGB", im.size, tint)
    im = Image.blend(im, tint_im, ta)
    im.save(dst, "JPEG", quality=80, optimize=True)

def main():
    only = set(sys.argv[1:])
    creditf = os.path.join(OUT, "credits.json")
    cred = json.load(open(creditf)) if os.path.exists(creditf) else {}
    raw = os.path.join(HERE, "raw")
    os.makedirs(raw, exist_ok=True)

    for mood, (queries, tone) in SCENES.items():
        if only and mood not in only:
            continue
        chosen = None
        for q in queries:
            try:
                chosen = pick(search(q))
            except Exception as e:
                print("  ! search error", mood, q, e); chosen = None
            if chosen:
                print(f"[{mood}] '{q}' -> {chosen['title']} ({chosen['w']}x{chosen['h']})")
                break
            time.sleep(0.3)
        if not chosen:
            print(f"[{mood}] no candidate — CSS gradient fallback stays")
            continue
        rawp = os.path.join(raw, mood + ".img")
        try:
            download(chosen["thumb"], rawp)
            grade(rawp, os.path.join(OUT, mood + ".jpg"), tone)
        except Exception as e:
            print("  ! fetch/grade failed", mood, e); continue

        m = chosen["meta"]
        cred[mood] = {
            "title": chosen["title"].replace("File:", ""),
            "artist": strip(m.get("Artist", {}).get("value", "")) or "Unknown",
            "license": strip(m.get("LicenseShortName", {}).get("value", "")) or "see source",
            "url": chosen["desc"],
        }
        time.sleep(0.3)

    json.dump(cred, open(creditf, "w"), ensure_ascii=False, indent=2)
    lines = ["# Scene image credits\n",
             "Background photographs are sourced from **Wikimedia Commons** and graded",
             "for this non-commercial fan project. Each is listed with its author and",
             "license. Please honor the license terms if you reuse them.\n"]
    for mood in SCENES:
        if mood in cred:
            c = cred[mood]
            lines.append(f"- **{mood}** — {c['title']} · {c['artist']} · {c['license']} · <{c['url']}>")
    open(os.path.join(OUT, "CREDITS.md"), "w").write("\n".join(lines) + "\n")
    print("\nDone. Graded scenes in", OUT)

if __name__ == "__main__":
    main()
