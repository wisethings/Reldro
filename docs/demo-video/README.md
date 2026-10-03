# Reldro product demo video

About 84 seconds, 1920x1080, narrated. Made for the website and sales.

| File | Use |
| --- | --- |
| `reldro-demo.mp4` | Main cut with burned-in captions (social, sales email, sales decks) |
| `reldro-demo-nocaptions.mp4` | Same cut without captions (website hero, or when you add your own captions) |
| `reldro-demo.srt`, `reldro-demo.vtt` | Caption files for a website `<video><track>` or YouTube/Vimeo upload |
| `reldro-demo-vo.mp3` | Voice-over only |
| `reldro-demo-poster.jpg` | Poster frame |

Story: a report comes in from a phone, corrective actions and the reports queue, a report linked to its investigation and actions, the root cause, verifying the fix, inspections, toolbox talks and certifications, all sites, the Insights page (hovering and selecting a bar of the reports chart), end card.

The voice-over is the supplied recording "Generated Audio October 02 2026 - 11:38PM" (82.7 seconds), used as is. Scene lengths follow where each paragraph starts and ends in it, and every caption is timed from the pauses in the recording. The screens are the production build running on the fictional Havenbrook Electrical demo data, in a separate database seeded with `prisma/seed.ts`.

## Regenerate

`pipeline/` holds the scripts. Put them in a scratch folder with the narration saved as `narration.wav`. `rec2.js` has the ids of the SR-0003 report, its investigation and its action near the top; update them after reseeding.

1. Seed a fresh database, build, and run `next start -p 3100` against it. Set the SR-0003 action back to Ready to verify (status `COMPLETED`, no `verifiedAt`) before each take, because the scene clicks "Verify the fix".
2. `plan.py` holds the paragraph boundaries and caption times of the narration (find pauses with `ffmpeg -af silencedetect=noise=-35dB:d=0.35`). Edit it for a different recording, then run it.
3. `node auth.js` saves the admin and worker logins, then `node rec2.js` records the segments.
4. `python3 build.py` composes the frames, cards, voice-over, and captions.

The end card says "reldro.com". Change it in `build.py` (`card_end`) if the web address differs.
