"""Plans the demo around a finished narration track: scene lengths follow where each paragraph starts and ends in the audio,
and every caption line is timed from the pauses in the recording (found with ffmpeg silencedetect)."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
LEAD, TAIL = 0.4, 1.3
END = 82.68
# Paragraph boundaries inside the narration (the middle of the pause between two paragraphs).
CUT = {"n1": 0.0, "n2": 7.46, "n3": 20.14, "n4": 24.40, "n5": 32.62, "n6": 47.73, "n7": 61.40, "n8": 72.85}
order = list(CUT)
weights = {
 "n1": [("title", .62), ("ov", .38)],
 "n2": [("phone", .52), ("acts", .48)],
 "n3": [("card3", 1)],
 "n4": [("queue", .45), ("detail", .55)],
 "n5": [("linked", .31), ("inv", .37), ("act", .32)],
 "n6": [("insp", .33), ("talks", .33), ("comp", .34)],
 "n7": [("sites", .38), ("insights", .62)],
 "n8": [("statement", .52), ("end", .48)],
}
segs, starts = [], {}
for i, b in enumerate(order):
    a = 0.0 if i == 0 else CUT[b] + LEAD
    z = (CUT[order[i + 1]] + LEAD) if i + 1 < len(order) else END + LEAD + TAIL
    starts[b] = a
    for sid, w in weights[b]: segs.append({"id": sid, "len": round((z - a) * w, 3), "block": b})
# (speech start, speech end, [caption lines]) in narration time.
SPEECH = [
 (0.0, 7.20, ["Safety management gets messy fast,", "whether you're managing a single facility or juggling multiple sites."]),
 (7.72, 13.26, ["A report comes in, an action item gets assigned,", "and someone has to chase down whether it actually got done."]),
 (13.80, 17.35, ["Between the initial report, the follow-up, and the eventual fix,"]),
 (17.75, 19.83, ["critical details slip through the cracks."]),
 (20.44, 24.05, ["Reldro ties all of that work together in one place."]),
 (24.75, 32.26, ["When an issue pops up, your team gets instant visibility into what happened,", "what needs to be done, and who's on the hook to fix it."]),
 (32.98, 41.25, ["If a major incident occurs, the entire response,", "from the investigation and debrief to the corrective actions,", "is linked directly to the original record."]),
 (41.70, 47.36, ["You can easily trace the root cause, see what needs to change,", "and verify that the fix was completed."]),
 (48.11, 51.16, ["It handles your everyday safety operations the same way."]),
 (51.69, 61.00, ["Audits, certifications, inspections, and routine debriefs", "live in a single hub, giving you a live, accurate picture", "of what's finished and what's overdue."]),
 (61.81, 65.44, ["Instead of forcing your team to fill out another passive spreadsheet,"]),
 (65.89, 72.57, ["Reldro keeps your safety operations connected, clear, and accountable,", "across a single site or multiple sites."]),
 (73.12, 78.20, ["Because safety isn't about logging data.", "It's about making sure the work actually gets done."]),
 (78.64, 79.78, ["Stop chasing updates."]),
 (80.15, 82.68, ["Connect your safety operations with Reldro."]),
]
cues = []
for a, z, lines in SPEECH:
    n = sum(len(l) for l in lines); t = a
    for l in lines:
        d = (z - a) * len(l) / n; cues.append({"start": round(t + LEAD, 3), "end": round(t + d + LEAD, 3), "text": l}); t += d
plan = {"segs": segs, "starts": starts, "total": round(END + LEAD + TAIL, 3), "lead": LEAD, "cues": cues}
json.dump(plan, open(f"{D}/plan.json", "w"), indent=1)
if __name__ == "__main__": print(plan["total"], [(s["id"], s["len"]) for s in segs])
