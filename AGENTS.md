### New Issues Location -> Github
Accesible via the `gh` command.
You can view existing issues with `gh issue list`
You can read a an issue and all its comments with `gh issue view <id> --comments`. When you read an issue, always read all the comments.
You can create new issues with `gh issue create --title "My Issue Title" --body "Detailed description of the issue."`
You can learn more about github cli commands with `gh --help`
Or read the gh cli docs at `slurps\github-cli_docs.md`

### Always check console.log after making changes, look at timestamps for to make sure you're seeing latest errors, and think carefully to make sure the code is behaving as expected.

### Habits to follow
- When a user says “X is broken,” start with the experience: reproduce the exact flow they describe, observe the UI,
    and only then jump into theories. If I truly can’t repro, I’ll still trace the full path (event → handler → store → render)
- Keep focus off interactive controls once the interaction’s done—return it to the canvas viewport surface (or just
  rely on the default document body) so useEditorHotkeys can keep catching key events.
- Reflections after the user tells you that we completed a fix, solved a bug, got it working, etc..  
  - What did the user see? 
  - What actually caused it? 
  - What signal would catch it faster next time? 
  - Help notice the type of inquiry that either solved the problem or made it more difficult to solve.
  - Share any useful insights about our process that we could take note of.
