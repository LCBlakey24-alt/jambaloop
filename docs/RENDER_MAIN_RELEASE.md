# Jambaloop: controlled release from GitHub main to Render

Existing service (do not create a duplicate):
- Service: **jambaloop-family-test**
- Workspace: **My Workspace**
- Render Dashboard: https://dashboard.render.com/web/srv-dc1i92qfngtc73fo4dug
- Live URL: https://jambaloop-family-test.onrender.com
- Repository: https://github.com/LCBlakey24-alt/jambaloop
- Target branch: **main**
- Region: Frankfurt, plan: Free
- Build: `npm ci`, start: `npm start`, Node: 22
- Automatic deployment: **off** (manually approved releases only)

## Before updating the live service

1. Confirm GitHub Actions for the latest `main` commit are green.
2. Allow all active family game rooms to finish. Rooms, player sessions and avatars are held in server memory and are not guaranteed to survive a deployment.
3. Verify Render service **jambaloop-family-test** still points to the repository above. Do not touch any Rookie Quest Keeper/Slicer services.

## One-time branch switch for the existing service

The existing service was observed deploying from `feature/04-quiz-race-mvp`.
Changing `render.yaml` in GitHub **does not itself switch the branch of the already running Render service** unless a managing Blueprint sync is configured and approved.

In the [existing Render service](https://dashboard.render.com/web/srv-dc1i92qfngtc73fo4dug), open **Settings**, locate the connected Git build source / branch selector (often in Build & Deploy or Update Source), and change the branch to `main`. Keep the repo unchanged and keep automatic deployments **off**. Changing the build source may start a deployment immediately; check **Deploys** before manually triggering a second one.

If no deploy starts, use **Manual Deploy → Deploy latest commit** for the now-selected `main` branch. Do **not** trigger a deploy while the branch still points to `feature/04-quiz-race-mvp`, because it would merely redeploy older code.

## Verification

1. Wait for the new deployment to reach **Live**. Verify its Git commit hash matches the latest `main`.
2. Load the live URL on a desktop/TV browser and a phone. Check all 18 tiles, create a test room, join by QR or room code and toggle Ready.
3. Test at least one quiz (send / locked / reveal), one party vote and one game's final results. Check both portrait and landscape on a phone.
4. Verify narrator recordings separately: only the three MP3 assets already in GitHub are available until the remaining 15 are uploaded.
5. If the deploy fails, consult the Build & Deploy logs on Render, then use the previous known-good deployment or rollback option. Check the connected branch again before another attempt.

The `render.yaml` Blueprint remains an infrastructure template and should not be used to create a second paid or free Jambaloop service accidentally.
