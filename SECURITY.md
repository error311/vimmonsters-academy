# Security Policy

## Scope

VimMonsters Academy is a small open-source browser game. The main security-sensitive surfaces are:

- the public competition API in [server.js](server.js)
- leaderboard persistence files
- Docker and self-hosted deployments

This project is not designed for high-stakes competition or strong anti-cheat guarantees.

## Reporting

If you find a vulnerability, do not open a public issue with exploit details first.

Report it privately to the maintainer with:

- a short description of the issue
- affected files or endpoints
- reproduction steps
- likely impact
- any suggested fix, if you have one

If private reporting is not available yet, open a minimal public issue without exploit details and ask for a contact path.

## Response Expectations

Best effort:

- acknowledge the report
- reproduce and validate it
- patch it when practical
- credit the reporter if they want credit

There is no SLA, bug bounty, or guaranteed response time.

## Hosting Guidance

If you host this publicly:

- set a strong `COMPETITIVE_SECRET`
- persist `LEADERBOARD_PATH` and `COMPETITION_STATE_PATH` outside the repo
- use HTTPS behind a reverse proxy
- add proxy-level rate limits
- do not run the server as root

Because the game is client-side, a determined attacker can still fake plausible runs. Treat the public leaderboard as abuse-resistant, not cheat-proof.
