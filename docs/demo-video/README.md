# Reldro product demo video

About 88 seconds, 1920x1080, narrated. Made for the website and sales.

| File | Use |
| --- | --- |
| `reldro-demo.mp4` | Main cut with burned-in captions (social, sales email, sales decks) |
| `reldro-demo-nocaptions.mp4` | Same cut without captions (website hero, or when you add your own captions) |
| `reldro-demo.srt`, `reldro-demo.vtt` | Caption files for a website `<video><track>` or YouTube/Vimeo upload |
| `reldro-demo-vo.mp3` | Voice-over only |
| `reldro-demo-poster.jpg` | Poster frame |

Story: report from a phone, safety team queue and incident response, investigation, corrective action with verification, inspections/talks/certifications, all sites at a glance, end card.

The voice-over is synthetic (Kokoro-82M, voice `af_heart`, Apache-2.0). The screens are the production build running on the fictional Havenbrook Electrical demo data, in a separate database seeded with `prisma/seed.ts`.

## Regenerate

`pipeline/` holds the scripts. They expect a scratch folder containing `durations.json`, `r17.txt` (the SR-0017 report id) and the Kokoro model files.

1. Seed a fresh database, build, and run `next start -p 3100` against it.
2. `python3 tts.py` writes the voice-over clips (edit `script.json` to change the words).
3. `node auth.js` saves the admin and worker logins, then `node rec.js` records the scenes.
4. `python3 build.py` composes the frames, cards, voice-over, and captions.

The end card says "reldro.com". Change it in `build.py` (`card_end`) if the web address differs.
