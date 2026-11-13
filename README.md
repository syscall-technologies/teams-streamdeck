<div align="center">

<img src="com.sclt.teams.sdPlugin/imgs/teams-on@2x.png" width="96" alt="Teams Control key">

# Teams Control for Stream Deck

**Mute, camera, share, raise hand and leave for the new Microsoft Teams on macOS, with keys that show the real call state.**

[![macOS 12+](https://img.shields.io/badge/macOS-12%2B-000000?logo=apple&logoColor=white)](#requirements)
[![Stream Deck 7.1+](https://img.shields.io/badge/Stream%20Deck-7.1%2B-6E44FF)](#requirements)
[![Dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen)](com.sclt.teams.sdPlugin/plugin.js)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

<table align="center">
  <tr>
    <td align="center"><img src="com.sclt.teams.sdPlugin/imgs/teams-off@2x.png" width="72" alt="Start Teams"><br><sub><b>Start Teams</b></sub></td>
    <td align="center"><img src="com.sclt.teams.sdPlugin/imgs/mic-muted@2x.png" width="72" alt="Muted"><br><sub><b>Mute</b></sub></td>
    <td align="center"><img src="com.sclt.teams.sdPlugin/imgs/cam-on@2x.png" width="72" alt="Camera on"><br><sub><b>Camera</b></sub></td>
    <td align="center"><img src="com.sclt.teams.sdPlugin/imgs/share-idle@2x.png" width="72" alt="Share"><br><sub><b>Share</b></sub></td>
    <td align="center"><img src="com.sclt.teams.sdPlugin/imgs/hand-lowered@2x.png" width="72" alt="Raise hand"><br><sub><b>Raise hand</b></sub></td>
    <td align="center"><img src="com.sclt.teams.sdPlugin/imgs/leave@2x.png" width="72" alt="Leave"><br><sub><b>Leave</b></sub></td>
  </tr>
</table>

## Why this one

Most Teams plugins talk to Teams' **Third-party app API** (`ws://localhost:8124`). Many organisations turn that API off: the *Manage API* option is missing from **Settings → Privacy**, and the plugins do nothing.

This plugin doesn't use that API. New Teams runs inside Microsoft Edge WebView2, and WebView2 can open a local DevTools port. The plugin connects to it and clicks the meeting's own toolbar buttons (`microphone-button`, `video-button`, `share-button`, `hangup-button`).

- ⚡ **Works in the background.** Teams is never brought to the front, and no keystrokes are simulated.
- 🎯 **Real state.** Keys read the buttons' labels twice a second, so they stay right when you click in Teams itself.
- 🔓 **No Accessibility permission**, and no admin rights needed.
- 🪶 **Tiny.** One plain JavaScript file. No npm, no build step. A state check takes under 1 ms.

## Requirements

- macOS 12 or later, with the **new** Microsoft Teams (`com.microsoft.teams2`)
- Stream Deck app 7.1 or later, with any Stream Deck that has keys

## Install

**[⬇ Download Teams Control for Stream Deck](https://github.com/syscall-technologies/teams-streamdeck/releases/latest/download/com.sclt.teams.streamDeckPlugin)**, then double-click the file. Stream Deck installs it for you.

Then drag the actions from the **Teams Control** category onto keys.

<details>
<summary>Install from source instead</summary>

```sh
git clone https://github.com/syscall-technologies/teams-streamdeck.git
ln -s "$PWD/teams-streamdeck/com.sclt.teams.sdPlugin" \
  ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/
```

Restart the Stream Deck app, then drag the actions onto keys.

</details>

## Use

1. Press **Start Teams**. When the key is amber, it quits Teams and starts it again with the DevTools port open. It turns purple once the port is up. While it's purple, pressing it just brings Teams to the front.
2. Join a meeting. The call keys light up:

| Key | Colour |
|-----|--------|
| Mute | 🟢 mic live · 🔴 muted |
| Camera | 🟢 on · 🔴 off |
| Share | 🟣 opens the Teams share picker · 🔴 sharing (press to stop) |
| Raise hand | 🟣 hand down · 🟠 hand raised (sends Teams' own ⌘⇧K in the background) |
| Leave | 🔴 hangs up |

Outside a call the keys are grey, and pressing one shows the ⚠ alert.

## Is it working?

```sh
curl -s http://127.0.0.1:9222/json/version
```

If that prints an `Edg/…` version, Teams was started with the port open. If the connection is refused, press **Start Teams**.

## Good to know

> [!WARNING]
> While the port is open, **any program running as you on this Mac can control your Teams session through it, including reading its sign-in tokens.** The port only listens on `127.0.0.1`, but if that's a problem for your threat model (or your IT policy), don't use this plugin.

> [!NOTE]
> The port only opens when Teams is started by the **Start Teams** key. If you start Teams from the Dock, or it restarts itself after an update, the call keys go grey until you press **Start Teams** again.

> [!NOTE]
> This relies on the element IDs in Teams' web interface. A Teams update can rename them and break a key until the plugin is updated.

## Hacking

| Path | What |
|------|------|
| [`com.sclt.teams.sdPlugin/plugin.js`](com.sclt.teams.sdPlugin/plugin.js) | The whole plugin. `node plugin.js --selftest` runs its checks |
| [`com.sclt.teams.sdPlugin/manifest.json`](com.sclt.teams.sdPlugin/manifest.json) | Stream Deck manifest |
| [`tools/icons.swift`](tools/icons.swift) | Draws the key images from SF Symbols: `swift tools/icons.swift com.sclt.teams.sdPlugin/imgs` |

To build the installer, use the [Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/intro) (`npm install -g @elgato/cli`):

```sh
streamdeck validate com.sclt.teams.sdPlugin
streamdeck pack com.sclt.teams.sdPlugin -o dist
```

To release, push a signed tag: `git tag -s v1.0.1 -m v1.0.1 && git push origin v1.0.1`. The [release workflow](.github/workflows/release.yml) validates, packs and publishes the installer.

## License

[MIT](LICENSE) © 0xSeb. Not affiliated with or endorsed by Microsoft or Elgato. Microsoft Teams is a trademark of Microsoft.
