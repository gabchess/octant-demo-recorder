Read this file, then follow the steps below to set up the dappsnap plugin for the user.

## Steps

1. Detect the user's shell (`$SHELL`) and resolve the config file:
   - zsh -> `~/.zshrc`
   - bash -> `~/.bashrc` (or `~/.bash_profile` on macOS if `.bashrc` doesn't exist)
   - fish -> `~/.config/fish/config.fish`

2. Check if the dappsnap repo exists locally:
   - Look for `.claude-plugin/plugin.json` in the current directory
   - Check common locations: `~/projects/octant-demo-recorder`, `~/octant-demo-recorder`, `~/git/octant-demo-recorder`, `~/code/octant-demo-recorder`, `~/src/octant-demo-recorder`
   - If found, store the absolute path as `$PLUGIN_DIR`
   - If not found, set `$REPO_FOUND=false`

3. **Before doing anything else**, explain to the user what setup will do and ask for confirmation. Include:
   - How plugins work: `--plugin-dir` tells Claude Code to load `.claude-plugin/plugin.json` from a directory and register all `skills/*/SKILL.md` files as slash commands
   - What dappsnap does: records screencasts of web3 dApps by connecting to Chrome via CDP, driving the browser autonomously, and saving video
   - If repo not found: that we'll clone it from `https://github.com/gabchess/octant-demo-recorder.git`
   - That we'll create a shell alias (e.g. `alias dappsnap='claude --plugin-dir /path/to/repo'`)
   - Why the alias is useful: keeps things isolated -- dappsnap only loads when you use the alias, plain `claude` stays clean
   - That the alias points at the local clone, so editing skill markdown files takes effect immediately
   - Mention `/reload-plugins` for picking up skill changes during a live session
   - **Wait for user confirmation before proceeding. If they cancel, stop.**

4. If repo was not found, ask where to clone it (default: `~/projects/octant-demo-recorder`) and run:
   ```bash
   git clone https://github.com/gabchess/octant-demo-recorder.git "$CLONE_DIR"
   ```
   Set `$PLUGIN_DIR` to the clone location.

5. Run the full setup flow from the setup skill. This walks the user through:
   - Choosing a target URL to record
   - Determining wallet/access requirements
   - Chrome CDP setup and verification
   - MetaMask installation (if needed)
   - App access requirements (token locking, etc.)
   - Alias name selection and shell config writing
   - `.env` configuration

   Invoke: `/dappsnap:setup`

6. After setup completes, tell the user:
   ```
   Setup complete. Your dappsnap plugin is ready.

   To start a new session:
     source [config file] && $ALIAS_NAME

   Inside a session, try:
     /dappsnap:status    -- check Chrome and infrastructure health
     /dappsnap:design    -- plan a custom recording session
     /dappsnap:record    -- record immediately with saved defaults

   DEVELOPING YOUR SETUP
   The alias points at your local clone, so everything is live-editable:

     Skills (skills/*/SKILL.md)
       Edit skill definitions to change recording behavior.
       Run /reload-plugins inside a session to pick up changes.

     No build step for skills. It's all markdown.

   SHARING
   Once you customize your dappsnap setup (different target URLs, actions,
   durations), push your fork and share the repo URL. Anyone can clone it
   and run the root SKILL.md to install your version as a plugin.
   ```
