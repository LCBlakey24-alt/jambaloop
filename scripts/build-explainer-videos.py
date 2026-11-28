#!/usr/bin/env python3
"""Render the eleven existing game explainers.

Run from any directory with Node, ffmpeg and Pillow installed:
    python scripts/build-explainer-videos.py
Set JAMBALOOP_VIDEOS=tracks,board to rebuild a subset. The slide copy for most
games comes from launcherCopy. Verify the three overrides below whenever rules
change. Music, cover art and fonts are existing self-hosted Jambaloop assets.
"""

import atexit, json, os, shutil, subprocess, tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
stage = Path(tempfile.mkdtemp(prefix="jambaloop-videos-"))
atexit.register(shutil.rmtree, stage, ignore_errors=True)
script = """import {launcherCopy} from './public/home-launcher.js';
import {identityOf} from './public/game-identities.js';
import {modes} from './public/game-config.js';
const ids='classic wheel board dice knockout punchline cards tracks bluff potato showdown'.split(' ');
console.log(JSON.stringify(ids.map(id=>({id,name:modes.find(x=>x[0]===id)[1],...identityOf(id),...launcherCopy(id)}))));"""
data = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", script], cwd=root, text=True))
only = os.getenv("JAMBALOOP_VIDEOS")
if only:
    data = [item for item in data if item["id"] in only.split(",")]
fonts = {
    "classic": "outfit",
    "wheel": "bungee",
    "board": "cinzel",
    "dice": "limelight",
    "knockout": "anton",
    "punchline": "bangers",
    "cards": "fraunces",
    "tracks": "russoone",
    "bluff": "courierprime",
    "potato": "lilitaone",
    "showdown": "unbounded",
}
new = {
    "knockout": [
        "Everyone starts with three lives.",
        "Wrong and missed answers cost a life. Eliminated players can watch.",
        "Six levels get harder. If several players survive, a closest-number question decides it.",
    ],
    "tracks": [
        "A new Trolley Driver takes the lever each round. Everyone gets a turn.",
        "The other players form two teams. Choose a good card, sabotage the other track, then add another good card.",
        "The Driver chooses which track gets hit. The spared team scores. Teams and hands change next round.",
    ],
    "showdown": [
        "Players join two to four balanced teams.",
        "Everyone answers on their own phone.",
        "A team scores the average of its players’ points. The highest team score wins.",
    ],
}


def run(game):
    id = game["id"]
    steps = new.get(id, game["steps"])
    ink = {"cards": "#ff9ab8", "punchline": "#ff9a98"}.get(id, game["accent"])
    bg = game["bg"][1]
    img = (
        Image.open(root / "public/covers" / f"{id}.webp")
        .convert("RGBA")
        .resize((274, 274), Image.Resampling.LANCZOS)
    )
    logo = Image.open(root / "public/branding/jambaloop-logo-white.webp").convert("RGBA")
    logo.thumbnail((196, 42), Image.Resampling.LANCZOS)
    regular = ImageFont.truetype(str(root / "public/fonts/dmsans.woff2"), 34)
    title = ImageFont.truetype(str(root / "public/fonts" / f"{fonts[id]}.woff2"), 36)
    label = ImageFont.truetype(str(root / "public/fonts/dmsans.woff2"), 19)
    bold = ImageFont.truetype(str(root / "public/fonts/dmsans.woff2"), 23)
    for i, step in enumerate(steps):
        im = Image.new("RGB", (960, 540), bg)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((28, 28, 932, 512), radius=22, fill="#101626", outline=ink, width=2)
        im.paste(logo, (54, 51), logo)
        d.text((731, 59), f"HOW TO PLAY  ·  {i+1} / 3", font=label, fill="#d4d7e1")
        d.rounded_rectangle((54, 126, 328, 400), radius=18, fill="#111725")
        mask = Image.new("L", (274, 274))
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 273, 273), radius=16, fill=255)
        im.paste(img, (54, 126), mask)
        d.rounded_rectangle((54, 126, 328, 400), radius=16, outline=ink, width=2)
        d.text((365, 132), game["name"].upper(), font=title, fill=ink, stroke_width=0)
        d.rounded_rectangle((365, 193, 427, 229), radius=18, fill=ink)
        d.text((384, 195), str(i + 1), font=bold, fill="#101626")
        words = step.split()
        lines = []
        line = ""
        for word in words:
            candidate = (line + " " + word).strip()
            if d.textlength(candidate, font=regular) > 508 and line:
                lines.append(line)
                line = word
            else:
                line = candidate
        if line:
            lines.append(line)
        for n, line in enumerate(lines):
            d.text((365, 247 + n * 44), line, font=regular, fill="#f8f8fc")
        d.text((56, 446), "WATCH TOGETHER  ·  PLAY ON YOUR PHONE", font=label, fill="#aebace")
        for j in range(3):
            d.rounded_rectangle(
                (536 + j * 125, 463, 645 + j * 125, 469), radius=3, fill=ink if j == i else "#505467"
            )
        im.save(f"{stage}/{id}-{i}.png")
        # Artwork and instruction card are isolated from the static stage for motion.
        frame = im.convert("RGBA")
        art = frame.crop((52, 124, 331, 403))
        art.save(f"{stage}/{id}-art-{i}.png")
        copy = frame.crop((360, 185, 924, 435))
        copy.save(f"{stage}/{id}-copy-{i}.png")
        base = im.copy()
        erase = ImageDraw.Draw(base)
        erase.rectangle((52, 124, 330, 402), fill="#101626")
        erase.rectangle((360, 185, 923, 434), fill="#101626")
        base.save(f"{stage}/{id}-base-{i}.png")
        dot = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
        ImageDraw.Draw(dot).ellipse((1, 1, 10, 10), fill="#ffffff")
        dot.save(f"{stage}/{id}-dot-{i}.png")
    im = Image.open(f"{stage}/{id}-0.png").convert("RGB")
    im.save(root / "public/videos" / f"{id}.jpg", quality=88, optimize=True)
    # Three animated scenes. Both the illustrated card and the instructions
    # move independently, then each scene clears before the next.
    cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-filter_complex_threads", "1"]
    for i in range(3):
        for layer in ("base", "art", "copy", "dot"):
            cmd += ["-loop", "1", "-framerate", "20", "-t", "8", "-i", f"{stage}/{id}-{layer}-{i}.png"]
    cmd += ["-stream_loop", "-1", "-i", str(root / "public/audio/music" / f"game-{id}.mp3")]
    filters = []
    for i in range(3):
        bg, art, copy, dot = i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3
        filters.append(
            f"[{bg}:v][{art}:v]overlay=x='52+8*sin(2*PI*t/4)':y='124+6*sin(2*PI*t/5)':shortest=1[art{i}]"
        )
        filters.append(f"[{copy}:v]format=rgba,fade=t=in:st=0:d=0.45:alpha=1[text{i}]")
        filters.append(
            f"[art{i}][text{i}]overlay=x='360+if(lt(t,0.6),45*(1-t/0.6),0)':y=185:shortest=1[stage{i}]"
        )
        filters.append(
            f"[stage{i}][{dot}:v]overlay=x='{536+i*125}+100*t/8':y=460:shortest=1,fade=t=in:st=0:d=0.25,fade=t=out:st=7.75:d=0.25,format=yuv420p[v{i}]"
        )
    filters.append("[v0][v1][v2]concat=n=3:v=1:a=0[v]")
    filters.append("[12:a]volume=0.32,afade=t=in:st=0:d=0.4,afade=t=out:st=23:d=1[a]")
    cmd += [
        "-filter_complex",
        ";".join(filters),
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-t",
        "24",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-movflags",
        "+faststart",
        str(root / "public/videos" / f"{id}.mp4"),
    ]
    subprocess.run(cmd, check=True)
    return id


with ThreadPoolExecutor(max_workers=2) as pool:
    for id in pool.map(run, data):
        print("built", id, flush=True)
