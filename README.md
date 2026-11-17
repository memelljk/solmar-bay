# solmar-bay
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/memelljk/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/memelljk/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is an original open-world crime game for the desktop browser, built for the make.fun gta6-01 bounty. No libraries, no assets, no network: every street, building, car, sound and song is drawn and synthesised from code.

## The game

You are **Rio**, new in the sun-soaked coastal city of **Solmar Bay**. Your dispatcher **Lina** has jobs; the fixer **Marco** has bigger plans. Explore the city on foot or behind the wheel, steal any car on the street, outrun the Solmar Bay police as your wanted level climbs, and work through five story missions — from a first parcel run at the Marina to a downtown bank vault and a getaway to the safehouse.

What is in the city:

- **A city to explore** — the Marina bay, Old Town, Downtown, North Hills, the Port and South Beach, with roads, sidewalks, parks, beaches, docks and hundreds of buildings, all generated from a seed.
- **On foot and by car** — walk, run, enter any car, steal traffic cars (the cops notice), arcade driving with handbrake drifts, damage and smoke.
- **Traffic and pedestrians** — cars drive the road grid and brake for the car ahead; pedestrians stroll the sidewalks and flee from gunfire.
- **Wanted level 0–5** — crimes raise your heat; patrol cars ram you and foot officers chase you down; hide long enough and the heat fades.
- **Five story missions** — parcel runs, a timed pickup, a marked sports car to steal, armed dock thugs to clear, and the big bank score — plus bonus packages and a five-checkpoint street race.
- **Combat** — fists up close, a pistol with mouse aim and reloads, armed enemies who shoot back.
- **HUD and minimap** — money, health, wanted stars, game clock, speedometer, ammo, mission objective, a live minimap and a big map (P).
- **Save and continue** — progress autosaves and resumes from the title screen.
- **Sound** — a WebAudio engine hum, sirens, gunshots and a looping bassline, all synthesised live (M to mute).

## How to play

Serve `game/` with any static server (`node serve.ts`, then open http://localhost:8080) and play with keyboard and mouse. No network request is made at runtime.

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive |
| Shift | Run |
| E | Enter / exit car |
| F | Steal the nearest car |
| Mouse + click | Aim · punch close, shoot far |
| Space | Handbrake |
| R | Reload |
| M | Mute |
| Esc | Pause |
| P | Big map |
| 1 / 2 / 3 | New game / Continue / How to play (title screen) |

## Originality

Solmar Bay, Rio, Lina, Marco, the districts, the missions and the music are all original to this entry. Nothing is taken from any commercial game: no names, characters, map, art or music from GTA or any other series. The code is split into one-job modules under `game/src/` (`world.js` builds the city, `vehicles.js` drives the cars, `police.js` runs the wanted system, `missions.js` tells the story, and so on), and the screenshots in `screenshots/` are real renders of the game itself.

## Development

- `node serve.ts` — play locally at http://localhost:8080
- `MAKEFUN_OUTPUT_DIR=out node main.ts` — build the hand-in bundle (game + screenshots + dossier.json)
- `node cli/makefun.mjs check --kit . --repo <repo>` (from the kit) — run the gate checks
