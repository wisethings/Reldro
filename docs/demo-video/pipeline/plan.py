import json, os
D = os.path.dirname(os.path.abspath(__file__))
dur = json.load(open(f"{D}/durations.json"))
LEAD, GAP, TAIL = 0.3, 0.35, 1.2
blocks = [f"n{i}" for i in range(1, 9)]
weights = {
 "n1": [("title", .62), ("ov", .38)],
 "n2": [("phone", .55), ("acts", .45)],
 "n3": [("card3", 1)],
 "n4": [("queue", .45), ("detail", .55)],
 "n5": [("linked", .30), ("inv", .35), ("act", .35)],
 "n6": [("insp", .33), ("talks", .33), ("comp", .34)],
 "n7": [("sites", .48), ("insights", .52)],
 "n8": [("statement", .55), ("end", .45)],
}
starts, t = {}, 0.0
segs = []
for b in blocks:
    starts[b] = t
    span = LEAD + dur[b] + (TAIL if b == "n8" else GAP)
    for sid, w in weights[b]: segs.append({"id": sid, "len": round(span * w, 3), "block": b})
    t += span
plan = {"segs": segs, "starts": starts, "audio_at": {b: round(starts[b] + LEAD, 3) for b in blocks}, "total": round(t, 3)}
json.dump(plan, open(f"{D}/plan.json", "w"), indent=1)
if __name__ == "__main__": print(plan["total"], [(s["id"], s["len"]) for s in segs])
