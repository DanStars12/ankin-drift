# ANKIN DRIFT — Five-track MP3 soundtrack

Creator-supplied songs (replacing the old synthesized 3-track soundtrack).

| Filename | In-game title | Scene |
|---|---|---|
| `neon-horizon.mp3` | Neon Horizon | Title |
| `16-battle-beat.mp3` | 16-Battle Beat | Standard battle, loop |
| `trinity.mp3` | TRINITY | Minor / UNIQUE boss |
| `overdrive-nemesis.mp3` | OVERDRIVE NEMESIS | Major boss |
| `the-last-horizon.mp3` | THE LAST HORIZON | Final / ultimate boss |

The actual 5 MP3 files are **not yet committed**. GitHub's connected text-file
editing tool cannot transfer binary MP3 uploads. The creator's supplied original
files are preserved in the downloadable ZIP provided in the conversation.

To add the five files without altering code:
1. Download and extract **ankin-drift-five-bgm-assets.zip** from the conversation.
2. In GitHub choose branch `feature/v13-33-five-mp3-soundtrack` and open this `audio/` folder.
3. Select **Add file → Upload files** and drag the five MP3s from the ZIP's
   extracted `audio/` folder. Commit the files to **this feature branch**.
4. Review the resulting GitHub Actions checks. The PWA validation verifies each
   required MP3 exists before the PR can merge to main.

Do **not** merge this feature into main until all five audio assets have been
uploaded and the full tests pass. Existing archive/saves and SE are unchanged.
