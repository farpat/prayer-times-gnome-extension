# Tests after login (v24 - PASSED 2025-12-11)

## Test Results Summary

| Test | Status | Details |
|------|--------|---------|
| Initialization | PASS | `ui=true, ui.label=true, prayerTimes=true` |
| Polling | PASS | `POLL TICK` every 2s, no errors |
| 24h format change | PASS | Label updates correctly |
| v23 fix (prayerTimes in cache) | PASS | Code present |
| v24 fix (menuItems in ui) | PASS | Code present |

## Latest test logs (2025-12-11 22:36)

```
[PrayerTimes] POLL display: newUse24h=true (raw="true") cachedUse24h=false
[PrayerTimes] Display settings changed (dconf): use24h=true theme=teal
[PrayerTimes] POLL changes: hasLocationChange=false hasDisplayChange=true
[PrayerTimes] POLL: calling _applyTheme(cache)
[PrayerTimes] _applyTheme() START: menu=true, box=true, cache=true
[PrayerTimes] _applyTheme() END
[PrayerTimes] POLL: calling _updateDisplay(ui, cache)
[PrayerTimes] _updateDisplay() START: ui=true, ui.label=true, prayerTimes=true
[PrayerTimes] _updateDisplay: use24h=true, nextPrayer=Fajr at 06:18
[PrayerTimes] _updateDisplay() END: label.text="Fajr 06:18"
[PrayerTimes] POLL TICK END
```

---

## Quick diagnostic commands

```bash
# All logs since boot
journalctl --user -b -g "PrayerTimes" --no-pager

# Recent logs
journalctl --user -b -g "PrayerTimes" --no-pager | tail -30

# JS errors only
journalctl --user -b -p err | grep -i prayer

# Real-time follow
journalctl --user -b -g "PrayerTimes" --no-pager -f

# Check dconf values
dconf dump /org/gnome/shell/extensions/prayer-times/

# Check installed code has v23 fix (prayerTimes in cache)
grep "cache?.prayerTimes" ~/.local/share/gnome-shell/extensions/prayer-times@farrugia/ui/indicator.js

# Check installed code has v24 fix (menuItems in ui)
grep "ui.menuItems" ~/.local/share/gnome-shell/extensions/prayer-times@farrugia/ui/indicator.js
```

## Test change settings via dconf

```bash
# Test 24h format toggle
dconf write /org/gnome/shell/extensions/prayer-times/use-24h-format true
# Watch logs for: Display settings changed (dconf): use24h=true

# Reset
dconf write /org/gnome/shell/extensions/prayer-times/use-24h-format false
```

---

## Fixes applied (history)

### v24 - menuItems in shared UI object

GJS loses `this` context in GLib callbacks. `this._prayerMenuItems` was `undefined` inside `_updateDisplay()` when called from polling callbacks.

**Solution**: Store `menuItems` in the shared `_ui` object (captured by reference):

| Location | Change |
|----------|--------|
| `_ui` type | Added `menuItems: Map<string, unknown> \| null` |
| `_ui` init | Added `menuItems: null` |
| `_createMenu()` | Stores in `this._ui.menuItems` after creation |
| `_updateDisplay()` | Reads from `ui.menuItems \|\| this._prayerMenuItems` |

### v23 - prayerTimes in shared cache

GJS loses `this` context in GLib callbacks. `this._prayerTimes` was `undefined` inside `_updateDisplay()` when called from polling callbacks.

**Solution**: Store `prayerTimes` in the shared `_cache` object (captured by reference):

| Location | Change |
|----------|--------|
| `_cache` type | Added `prayerTimes: PrayerTimes \| null` |
| `_cache` init | Added `prayerTimes: null` |
| `_calculatePrayerTimes()` | Stores in `cache.prayerTimes` after calculation |
| `_updateDisplay()` | Reads from `cache?.prayerTimes \|\| this._prayerTimes` |

---

## Diagnostic table

| Symptom | Cause | Fixed in |
|---------|-------|----------|
| `TypeError: items is undefined` | menuItems not in shared UI | v24 |
| `prayerTimes=false` in `_updateDisplay()` | prayerTimes not in shared cache | v23 |
| `cache=false` in `_applyTheme()` | refs not passed as params | v22 |
| `ui=false` in `_updateDisplay()` | refs not passed as params | v22 |
| `this._cache is undefined` | GJS loses `this` in callbacks | v21 (partial), v22 (complete) |
| `cached=(0,0,0)` | `_initCachedSettings()` failed | v20 |
| `ui.label=false` at init | `_ui` object not created | v20 |
| No `POLL TICK` logs | Polling not started | - |
