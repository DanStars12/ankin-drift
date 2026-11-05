# ANKIN DRIFT — v13.33 five-track MP3 soundtrack

The five creator-supplied MP3s below are committed on this feature branch,
replacing the former three synthesized BGM themes.

| Filename | In-game title | Scene |
|---|---|---|
| `neon-horizon.mp3` | Neon Horizon | Title |
| `16-battle-beat.mp3` | 16-Battle Beat | Standard battle, loop |
| `trinity.mp3` | TRINITY | Minor / UNIQUE boss |
| `overdrive-nemesis.mp3` | OVERDRIVE NEMESIS | Major boss |
| `the-last-horizon.mp3` | THE LAST HORIZON | Final / ultimate boss |

The game keeps its existing sound effects and BGM / SFX settings. The
five media assets are precached by the PWA worker for offline playback, including
byte-range responses. The BGM label is styled near the HP HUD and fades out.

**Release gate:** do not merge to `main` until syntax, PWA, desktop/mobile
smoke, audio regression, and performance CI checks all pass.
