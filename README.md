# RedLineCAD Discord Bot

## Commands
| Command | Description |
|---|---|
| `/civilian name:` | Look up a civilian record |
| `/plate plate:` | Look up a vehicle by plate |
| `/fine player: amount: reason:` | Issue a fine |
| `/pay player: amount:` | Mark a fine as paid |
| `/balance player:` | Check bank balance |
| `/dispatch title: location: priority:` | Create a dispatch call |
| `/status callsign: status:` | Update unit status |
| `/bolo subject: description:` | Issue a BOLO |
| `/units` | View all active units |
| `/calls` | View all active calls |
| `/help` | Show all commands |

## Deploy to Railway
1. Push this folder to a GitHub repo
2. Go to railway.app
3. New Project → Deploy from GitHub
4. Select this repo
5. Add environment variables (see .env.example)
6. Deploy!

## Environment Variables
Copy .env.example to .env and fill in your values.
These must also be set in Railway dashboard under Variables.
