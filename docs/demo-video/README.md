# Reldro product demo video

About 86 seconds, 1920x1080, narrated. Made for the website and sales.

| File | Use |
| --- | --- |
| `reldro-demo.mp4` | Main cut with burned-in captions (social, sales email, sales decks) |
| `reldro-demo-nocaptions.mp4` | Same cut without captions (website hero, or when you add your own captions) |
| `reldro-demo.srt`, `reldro-demo.vtt` | Caption files for a website `<video><track>` or YouTube/Vimeo upload |
| `reldro-demo-vo.mp3` | Voice-over only |
| `reldro-demo-poster.jpg` | Poster frame |

Story (follows the narration in `pipeline/script.json`): a report comes in from a phone, corrective actions and the reports queue, a report linked to its investigation and actions, the root cause, verifying the fix, inspections, toolbox talks and certifications, all sites and insights, end card.

The voice-over is synthetic (Kokoro-82M, voice `af_heart`, Apache-2.0). The screens are the production build running on the fictional Havenbrook Electrical demo data, in a separate database seeded with `prisma/seed.ts`.

## Regenerate

`pipeline/` holds the scripts. Put them in a scratch folder with the Kokoro model files. `rec2.js` has the ids of the SR-0003 report, its investigation and its action near the top; update them after reseeding.

1. Seed a fresh database, build, and run `next start -p 3100` against it.
2. `python3 tts.py` writes the voice-over clips (edit `script.json` to change the words), then `python3 plan.py` works out segment lengths.
3. `node auth.js` saves the admin and worker logins, then `node rec2.js` records the segments.
4. `python3 build2.py` composes the frames, cards, voice-over, and captions (captions are in the `CAPS` table).

The end card says "reldro.com". Change it in `build.py` (`card_end`) if the web address differs.
