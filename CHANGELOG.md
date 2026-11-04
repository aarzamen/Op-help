# Changelog

## 1.0.0 — 2026-11-04

The first release: the website and the iPhone app, built from the same code.

### What is in it

- **Website**, hosted on ChatGPT Sites at <https://op-help.annonable.chatgpt.site>: the
  GUIDE, ANALYZE, ORDER, CASEVAC and TOOLS tabs; works offline after one visit and can be
  added to the home screen; every note and plan stays in the browser.
- **iPhone app** (a Capacitor shell around the same build, `ios/`): offline from the first
  launch, exports through the share sheet, DICTATE through on-device Apple Speech. Built
  and installed with `scripts/ios-device.sh`.
- Five-paragraph order worksheet with the course's grading points, METT-T analysis, the
  tasking-statement builder, and PDF and text export of every tab.
- CASEVAC planner: HLZ, CCP and route sketches in a full-screen editor, the 10:1 obstacle
  check, wind components, the 1-hour POI-to-surgical check, the 9-line script with MIST,
  the graded paragraph 4.a, a PNG per sheet and a packet PDF; plans move between devices
  by link or file.
- Named plans, JSON backup and restore, and a typed-confirmation wipe.
- Blackout (red-on-black) mode, a live compass with grid and magnetic north (WMM
  declination and grid convergence), and GET GRID from GPS.

### Known limits

- **Unencrypted on-device storage.** Everything typed into the app sits in the browser's
  (or the app's) local storage in clear text. There is a wipe, but no encryption and no
  login; treat the device accordingly.
- **Course-specific rubric.** The grading points, templates and worked examples follow the
  EULC "Issue a Combat Order" course sheet. Other courses and units grade differently.
- **iOS installs only on the owner's own Apple team's devices.** There is no TestFlight or
  App Store build; the app is built from source with your own Apple team ID (README,
  _iOS app_). Everyone else uses the website.
- **Android compass unchecked.** The compass has not been tested on an Android phone and
  may drift between relative and absolute orientation readings.
