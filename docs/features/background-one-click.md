# Background continuation for one-click Jules tasks

The Expo web app cannot execute while Safari is closed or iOS has suspended the page. The
`jules-auto-continue.yml` GitHub Actions workflow therefore checks Jules from GitHub every five
minutes. When a session marked `【ワンボタン完結】` is waiting for feedback, the workflow sends
an explicit approval and tells Jules to continue through the PR.

## One-time setup

1. Open the repository on GitHub.
2. Open **Settings → Secrets and variables → Actions**.
3. Create a repository secret named `JULES_API_KEY` containing the same Jules API key used by the app.
4. Open **Actions → Keep Jules one-click tasks running** and run it once with **Run workflow**.

The key stays encrypted in GitHub Actions and is never committed or included in the web build.
Scheduled GitHub Actions can start later than the nominal five-minute interval, but they continue
to operate when the phone and PC are off.
