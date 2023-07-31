# badddie
Backend Architecture via Domain Driven Design: Integration Engine

## Publishing
1. Update code in feature branch
2. Push to github and create PR
3. Upon approval, merge into main
4. Checkout main locally, pull latest changes
5. `yarn release`
6. `gp --follow-tags origin main && yarn publish --no-git-tag-version`
7. When asked for a version, enter the SAME version that is displayed as the current version. This is because
   the version bump has already happened automatically and unfortunately this extra step allows us to
   potentially add a second unnecessary tag if we enter a new version number here.
