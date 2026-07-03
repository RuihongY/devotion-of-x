#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch a real photograph for each story scene from Wikimedia Commons
(a public, free image library), then grade every image into one unified
dark, cinematic tone so the scenes read clearly but still cohere with the
three.js atmosphere layered on top.

Attribution for every image is written to ../scenes/CREDITS.md.
Requires: python3 (stdlib only) + ImageMagick `magick` on PATH.
"""

import json, os, re, subprocess, sys, time, urllib.parse, urllib.request, html

HERE   = os.path.dirname(os.path.abspath(__file__))
OUT    = os.path.join(HERE, "..", "scenes")
os.makedirs(OUT, exist_ok=True)
UA = "DevotionSuspectX/1.0 (non-commercial fan game; contact yin00473@umn.edu)"

# mood -> ordered search queries (specific -> generic) + cinematic tone
SCENES = {
  "dawn":      (["Tokyo residential street morning","suburban street japan morning",
                 "japanese street early morning","tokyo street"], "coolwarm"),
  "river_day": (["Edogawa river embankment","Arakawa river bank Tokyo",
                 "river bank grass Tokyo","japanese river bank"], "cool"),
  "river_night":(["river embankment night dark","canal night Japan",
                 "river night dark water","Arakawa river night"], "cold"),
  "apartment": (["study room interior desk","home office bookshelf desk",
                 "private study books room","writer study desk","desk lamp room night"], "warm"),
  "nextdoor":  (["tatami room interior","washitsu japanese room",
                 "japanese living room tatami","tatami room"], "warm"),
  "bento":     (["bento shop Japan","japanese bento store",
                 "obento shop counter","japanese food shop night"], "warm"),
  "school":    (["empty japanese classroom","classroom evening empty",
                 "school classroom desks","empty classroom"], "amber"),
  "lab":       (["laboratory interior bench","chemistry laboratory room",
                 "research laboratory indoor","physics laboratory bench","laboratory room"], "cool"),
  "police":    (["office interior night blinds","dark office desks evening",
                 "office window blinds","empty office"], "cool"),
  "interrogation":(["empty room table two chairs","empty concrete room",
                 "empty basement room","empty dim room table","bare room chair"], "dark"),
  "cinema":    (["empty movie theater screen","cinema hall seats",
                 "movie theater interior","cinema screen"], "cold"),
  "snowroad":  (["snowy street lamp night","winter street snow Japan",
                 "snow covered road","snowy street"], "cold"),
}

# tone -> magick grading (brightness, saturation, tint color, colorize %)
TONE = {
  "warm":     ("72", "60", "#3a2a12", "20"),
  "amber":    ("74", "62", "#4a3410", "22"),
  "cool":     ("66", "52", "#10202c", "22"),
  "cold":     ("82", "50", "#223648", "18"),
  "coolwarm": ("74", "58", "#2a2a20", "16"),
  "dark":     ("50", "45", "#0a0a12", "28"),
}

def api(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def strip(s):
    return re.sub("<[^>]+>", "", html.unescape(s or "")).strip()

def search(query):
    """Return list of candidate dicts sorted by search relevance."""
    d = api({
        "action":"query","format":"json","generator":"search",
        "gsrsearch": query, "gsrnamespace":"6", "gsrlimit":"12",
        "prop":"imageinfo","iiprop":"url|size|mime|extmetadata","iiurlwidth":"1600",
    })
    pages = d.get("query", {}).get("pages", {})
    # preserve search order via 'index'
    out = []
    for p in sorted(pages.values(), key=lambda x: x.get("index", 999)):
        ii = p.get("imageinfo", [{}])[0]
        out.append({
            "title": p.get("title",""),
            "mime": ii.get("mime",""),
            "w": ii.get("thumbwidth",0), "h": ii.get("thumbheight",0),
            "thumb": ii.get("thumburl",""),
            "desc": ii.get("descriptionurl",""),
            "meta": ii.get("extmetadata", {}),
        })
    return out

def pick(cands):
    good = [c for c in cands
            if c["mime"] in ("image/jpeg","image/png")
            and c["w"] >= 1200 and c["thumb"]]
    land = [c for c in good if c["w"] >= c["h"]]
    return (land or good or [None])[0]

def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())

def grade(src, dst, tone):
    b, s, tint, cz = TONE[tone]
    subprocess.run([
        "magick", src,
        "-resize", "1600x900^", "-gravity", "center", "-extent", "1600x900",
        "-modulate", f"{b},{s},100",
        "-brightness-contrast", "-4x14",
        "-fill", tint, "-colorize", cz,
        "-quality", "82", dst,
    ], check=True)

def main():
    only = set(sys.argv[1:])                       # optional: refetch subset
    creditf = os.path.join(OUT, "credits.json")
    cred = {}
    if os.path.exists(creditf):
        cred = json.load(open(creditf))
    raw = os.path.join(HERE, "raw"); os.makedirs(raw, exist_ok=True)

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
            print(f"[{mood}] no candidate — will fall back to gradient")
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
    print("\nDone. Graded scenes in", OUT, "· credits -> scenes/CREDITS.md")

if __name__ == "__main__":
    main()
