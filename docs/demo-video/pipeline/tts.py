import json, soundfile as sf, numpy as np, sys
from kokoro_onnx import Kokoro
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
voice = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
scenes = json.load(open("script.json"))
out = {}
for s in scenes:
    samples, sr = k.create(s["text"], voice=voice, speed=speed, lang="en-us")
    sf.write(f"{s['id']}.wav", samples, sr)
    out[s["id"]] = round(len(samples) / sr, 2)
    print(s["id"], out[s["id"]], "s")
json.dump(out, open("durations.json", "w"))
print("total", round(sum(out.values()), 1))
