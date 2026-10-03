#!/usr/bin/env python3
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
OUT = f"{D}/out"; os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080
BONE, OX, ORCHID, ORCHID_D, INK = (239, 235, 224), (42, 10, 12), (216, 150, 204), (138, 74, 126), (107, 90, 86)
FONT = "/usr/share/fonts/opentype/inter/Inter-%s.otf"
def font(w, s): return ImageFont.truetype(FONT % w, s)
plan = json.load(open(f"{D}/plan.json"))
segs = plan["segs"]; TOTAL = plan["total"]; LEAD = plan["lead"]
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(" ".join(cmd)[:400]); print(r.stderr[-1500:]); sys.exit(1)

def bg_canvas():
    im = Image.new("RGB", (W, H), BONE)
    g = Image.new("RGB", (W, H), BONE); d = ImageDraw.Draw(g)
    d.ellipse((-300, -400, 900, 500), fill=(243, 221, 238)); d.ellipse((1200, 700, 2300, 1500), fill=(228, 237, 211))
    g = g.filter(ImageFilter.GaussianBlur(220))
    return Image.blend(im, g, 0.55)

def logo(width):
    l = Image.open("/home/user/Reldro/public/brand/logo-oxblood.png").convert("RGBA")
    return l.resize((width, round(l.height * width / l.width)), Image.LANCZOS)

def centered(d, y, text, f, fill):
    w = d.textlength(text, font=f); d.text(((W - w) / 2, y), text, font=f, fill=fill)

def card_title():
    im = bg_canvas().convert("RGBA"); l = logo(560); im.alpha_composite(l, ((W - l.width) // 2, 330))
    d = ImageDraw.Draw(im)
    centered(d, 470, "Frontline safety, connected.", font("SemiBold", 68), OX)
    centered(d, 570, "From the first report to a fix that's verified.", font("Regular", 34), INK)
    im.convert("RGB").save(f"{OUT}/card-title.png")

def card_end():
    im = bg_canvas().convert("RGBA"); l = logo(520); im.alpha_composite(l, ((W - l.width) // 2, 250))
    d = ImageDraw.Draw(im)
    centered(d, 390, "Stop chasing updates.", font("SemiBold", 68), OX)
    centered(d, 480, "Connect your safety operations.", font("SemiBold", 48), ORCHID_D)
    bw, bh = 340, 84; x, y = (W - bw) // 2, 610
    d.rounded_rectangle((x, y, x + bw, y + bh), radius=42, fill=OX)
    f = font("SemiBold", 32); tw = d.textlength("Book a demo", font=f); d.text((x + (bw - tw) / 2, y + 21), "Book a demo", font=f, fill=BONE)
    centered(d, 735, "reldro.com", font("Medium", 30), ORCHID_D)
    im.convert("RGB").save(f"{OUT}/card-end.png")

def shadowed_hole(box, radius, frame_im):
    """Draw soft shadow, then punch a rounded transparent hole. Returns RGBA."""
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((x0, y0 + 14, x1, y1 + 14), radius=radius, fill=(42, 10, 12, 70))
    sh = sh.filter(ImageFilter.GaussianBlur(26)); frame_im.alpha_composite(sh)
    mask = Image.new("L", (W, H), 255); ImageDraw.Draw(mask).rounded_rectangle(box, radius=radius, fill=0)
    frame_im.putalpha(mask)
    return frame_im

def frame_desktop():
    box = (160, 36, 1760, 936)  # 1600x900 window
    im = bg_canvas().convert("RGBA")
    im = shadowed_hole(box, 18, im); im.save(f"{OUT}/frame-desktop.png")
    return box

def frame_phone():
    ph, pw = 900, round(900 * 390 / 844)           # screen 416x900
    bez = 16; x0 = (W - pw) // 2 - 10; y0 = 32
    im = bg_canvas().convert("RGBA"); d = ImageDraw.Draw(im)
    d.rounded_rectangle((x0 - bez, y0 - bez, x0 + pw + bez, y0 + ph + bez), radius=62, fill=(26, 8, 10))
    d.rounded_rectangle((x0 - bez + 3, y0 - bez + 3, x0 + pw + bez - 3, y0 + ph + bez - 3), radius=59, outline=(70, 40, 44), width=2)
    # left copy
    d.text((150, 380), "FROM THE FIELD", font=font("SemiBold", 24), fill=ORCHID_D)
    f = font("SemiBold", 64)
    for k, line in enumerate(["Reporting starts", "where the work", "happens."]): d.text((150, 430 + k * 80), line, font=f, fill=OX)
    # right chips
    chips = ["Pick what you're reporting", "Describe it in your words", "Or speak instead", "Add photos", "Share your name, or don't"]
    cf = font("Medium", 28)
    for k, c in enumerate(chips):
        cw = d.textlength(c, font=cf) + 64; cx = 1560 - 0; cy = 330 + k * 92
        x = 1262; d.rounded_rectangle((x, cy, x + cw, cy + 64), radius=32, fill=(255, 255, 255), outline=(214, 205, 190), width=2)
        d.ellipse((x + 20, cy + 24, x + 36, cy + 40), fill=ORCHID)
        d.text((x + 50, cy + 14), c, font=cf, fill=OX)
    box = (x0, y0, x0 + pw, y0 + ph)
    m = Image.new("L", (W, H), 255); ImageDraw.Draw(m).rounded_rectangle(box, radius=44, fill=0)
    im.putalpha(m); im.save(f"{OUT}/frame-phone.png")
    return box

def still_clip(png, secs, out):
    run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", png, "-t", str(secs), "-r", "30", "-vf", f"scale={W}:{H},format=yuv420p",
         "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", out])

def fade(inp, out, secs, fin=0.3, fout=0.3):
    run(["ffmpeg", "-v", "error", "-y", "-i", inp, "-vf", f"fade=t=in:st=0:d={fin}:color=0xEFEBE0,fade=t=out:st={secs-fout:.2f}:d={fout}:color=0xEFEBE0",
         "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30", out])


def card_mid():
    im = bg_canvas().convert("RGBA"); l = logo(520); im.alpha_composite(l, ((W - l.width) // 2, 300))
    d = ImageDraw.Draw(im)
    centered(d, 450, "All of it, in one place.", font("SemiBold", 66), OX)
    centered(d, 545, "Reports, follow-up, fixes, and checks, connected.", font("Regular", 32), INK)
    im.convert("RGB").save(f"{OUT}/card-mid.png")

def card_statement():
    im = bg_canvas().convert("RGBA"); d = ImageDraw.Draw(im)
    centered(d, 360, "Safety isn't about logging data.", font("SemiBold", 76), OX)
    centered(d, 470, "It's about making sure the work", font("SemiBold", 76), ORCHID_D)
    centered(d, 570, "actually gets done.", font("SemiBold", 76), ORCHID_D)
    im.convert("RGB").save(f"{OUT}/card-statement.png")

def scene_clip(sid, box, frame, length):
    x0, y0, x1, y1 = box; out = f"{OUT}/{sid}.mp4"
    vf = (f"[0:v]fps=30,scale={x1-x0+4}:{y1-y0+4}:flags=lanczos,setsar=1[v];"
          f"[2:v][v]overlay={x0-2}:{y0-2}:shortest=1[b];[b][1:v]overlay=0:0:format=auto,format=yuv420p[o]")
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{D}/frames/{sid}/list.txt", "-loop", "1", "-i", frame,
         "-f", "lavfi", "-i", f"color=c=0xEFEBE0:s={W}x{H}:r=30", "-filter_complex", vf, "-map", "[o]", "-t", str(length), "-r", "30",
         "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", out])
    return out

# ---------- build ----------
card_title(); card_mid(); card_statement(); card_end(); dbox = frame_desktop(); pbox = frame_phone()
cardmap = {"title": "card-title", "card3": "card-mid", "statement": "card-statement", "end": "card-end"}
parts = []
for sg in segs:
    sid, ln = sg["id"], sg["len"]; final = f"{OUT}/{sid}-f.mp4"
    if not (os.path.exists(final) and os.environ.get("REUSE")):
        if sid in cardmap: src = f"{OUT}/{sid}-raw.mp4"; still_clip(f"{OUT}/{cardmap[sid]}.png", ln, src)
        elif sid == "phone": src = scene_clip(sid, pbox, f"{OUT}/frame-phone.png", ln)
        else: src = scene_clip(sid, dbox, f"{OUT}/frame-desktop.png", ln)
        fade(src, final, ln, 0.25, 0.25)
    parts.append(final); print("clip", sid, ln)
with open(f"{OUT}/concat.txt", "w") as f:
    for p in parts: f.write(f"file '{p}'\n")
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{OUT}/concat.txt", "-c", "copy", f"{OUT}/video-silent.mp4"])

ms = int(LEAD * 1000)
run(["ffmpeg", "-v", "error", "-y", "-i", f"{D}/narration.wav", "-filter_complex",
     f"[0:a]aresample=48000,aformat=channel_layouts=mono,adelay={ms}|{ms},loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:{TOTAL:.2f}[aout]",
     "-map", "[aout]", "-ac", "1", "-ar", "48000", f"{OUT}/vo.wav"])
# ---------- captions: timed from the pauses in the recording (see plan.py) ----------
cues = [(c["start"], c["end"], c["text"]) for c in plan["cues"]]

def ts(t, sep): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)):03d}"
with open(f"{OUT}/reldro-demo.srt", "w") as f:
    for i, (a, b, c) in enumerate(cues, 1): f.write(f"{i}\n{ts(a, ',')} --> {ts(b - 0.04, ',')}\n{c}\n\n")
with open(f"{OUT}/reldro-demo.vtt", "w") as f:
    f.write("WEBVTT\n\n")
    for a, b, c in cues: f.write(f"{ts(a, '.')} --> {ts(b - 0.04, '.')}\n{c}\n\n")
def ats(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f"{h}:{m:02d}:{s:05.2f}"
with open(f"{OUT}/captions.ass", "w") as f:
    f.write("[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n\n[V4+ Styles]\n"
            "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n"
            "Style: Default,Inter,40,&H00E0EBEF,&H00E0EBEF,&H002A0A0C,&HC02A0A0C,0,0,0,0,100,100,0,0,3,14,0,2,200,200,34,1\n\n"
            "[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n")
    for a, b, c in cues: f.write(f"Dialogue: 0,{ats(a)},{ats(b - 0.04)},Default,,0,0,0,,{c}\n")

# ---------- mux ----------
enc = ["-c:v", "libx264", "-crf", "19", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest"]
run(["ffmpeg", "-v", "error", "-y", "-i", f"{OUT}/video-silent.mp4", "-i", f"{OUT}/vo.wav", *enc, f"{OUT}/reldro-demo-nocaptions.mp4"])
run(["ffmpeg", "-v", "error", "-y", "-i", f"{OUT}/video-silent.mp4", "-i", f"{OUT}/vo.wav", "-vf", f"ass={OUT}/captions.ass:fontsdir=/usr/share/fonts/opentype/inter", *enc, f"{OUT}/reldro-demo.mp4"])
run(["ffmpeg", "-v", "error", "-y", "-ss", "45", "-i", f"{OUT}/reldro-demo-nocaptions.mp4", "-frames:v", "1", "-q:v", "2", f"{OUT}/poster.jpg"])
print("TOTAL", TOTAL, "cues", len(cues))
