# Office Farm 🌾

A fall-season 3D village that grows from the team's real work.

| Work | What grows | Coins |
|---|---|---|
| Standup in Slack | Crops get watered; the Conference room grows | +30 (once per day) |
| Merged pull request | A new crop is planted; the Bathroom grows | +15 |
| Done Jira ticket | Harvest goes to the Fridge; gardeners plant a flower | +50 |
| Production release | A new fruit tree; the Game room grows | +20 for everyone |
| Builders' work | The Office is built | (same coins as above) |

Coins are spent automatically in the shop (hats, tools, decorations). The Store grows with coins spent.

## How it works

- `data/farm.json` holds the counts per person. A scheduled agent updates it; the game only reads it.
- The site is static (GitHub Pages). It shows names, coins and the village only: no ticket titles or Slack text.
- `js/logic.js` has the rules (coins, auto-shop, building levels). The other files in `js/` draw the village.

Run it locally with any static server, for example `python3 -m http.server`, then open http://localhost:8000.

## Credits

- 3D models: [Kenney](https://kenney.nl) Fantasy Town Kit, Nature Kit and Mini Characters (CC0).
- 3D engine: [three.js](https://threejs.org) (MIT, see `lib/THREE_LICENSE`).
