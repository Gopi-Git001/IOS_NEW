# factory-smoke checks

Base: origin/ios-dev bc8127f. Change: docs/factory-smoke.md only (no code, no UI, so no screenshots).

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass (no output) |
| `npm run test:unit` | pass: tests 522, pass 522, fail 0 |
| `npx expo-doctor` | fail: 19/20 checks; already failing on ios-dev, not caused by this change |

## npm run test:unit (summary)

```
1..359
# tests 522
# suites 25
# pass 522
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

## npx expo-doctor

```
19/20 checks passed. 1 checks failed.
✖ Check that packages match versions required by installed Expo SDK
package               expected  found
expo                  ~58.0.25  58.0.23
expo-blur             ~58.0.6   58.0.5
expo-constants        ~58.0.16  58.0.15
expo-font             ~58.0.12  58.0.11
expo-haptics          ~58.0.8   58.0.7
expo-linear-gradient  ~58.0.4   58.0.3
expo-splash-screen    ~58.0.14  58.0.13
expo-status-bar       ~58.0.5   58.0.4
expo-web-browser      ~58.0.8   58.0.7
9 packages out of date.
```

Fixing this needs dependency bumps (`npx expo install --check`), which this docs-only task does not allow.
