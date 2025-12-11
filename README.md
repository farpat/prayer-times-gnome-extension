# Prayer Times GNOME Extension

Islamic prayer times in the GNOME Shell top panel.

## Features

- Next prayer with urgency indicator (green → orange → red)
- Dropdown menu with all daily prayers
- City search with auto-completion
- Multiple calculation methods
- Customizable thresholds and themes

## Install

**From extensions.gnome.org** (recommended)

[Install Prayer Times](https://extensions.gnome.org/extension/XXX/prayer-times/)

**Manual**

```bash
git clone https://github.com/farrugia/prayer-times-gnome-extension.git
cd prayer-times-gnome-extension
make install
```

Restart GNOME Shell to apply.

## Development

```bash
make install   # Build and install locally
make logs      # Watch extension logs
make zip       # Create ZIP for extensions.gnome.org
```

## License

GPL-3.0
