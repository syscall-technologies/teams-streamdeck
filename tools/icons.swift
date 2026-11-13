// Renders the key images from SF Symbols: swift tools/icons.swift com.sclt.teams.sdPlugin/imgs
import AppKit
let out = CommandLine.arguments[1]
func render(_ name: String, _ size: CGFloat, symbol: String, bg: NSColor?, fg: NSColor, caption: String? = nil) {
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size), pixelsHigh: Int(size), bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  if let bg { bg.setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size)).fill() }
  let cfg = NSImage.SymbolConfiguration(pointSize: size * (bg == nil ? 0.7 : caption == nil ? 0.45 : 0.36), weight: .semibold)
    .applying(.init(paletteColors: [fg]))
  let sym = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)!.withSymbolConfiguration(cfg)!
  let lift = caption == nil ? 0 : size * 0.1 // make room for the caption below the symbol
  sym.draw(in: NSRect(x: (size - sym.size.width) / 2, y: (size - sym.size.height) / 2 + lift, width: sym.size.width, height: sym.size.height))
  if let caption {
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size * 0.17, weight: .heavy), .foregroundColor: fg, .kern: size * 0.01]
    let text = NSAttributedString(string: caption, attributes: attrs)
    text.draw(at: NSPoint(x: (size - text.size().width) / 2, y: size * 0.1))
  }
  NSGraphicsContext.current = nil
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(out)/\(name).png"))
}
let red = NSColor(red: 0.82, green: 0.2, blue: 0.22, alpha: 1), green = NSColor(red: 0.07, green: 0.6, blue: 0.2, alpha: 1)
let purple = NSColor(red: 0.36, green: 0.37, blue: 0.78, alpha: 1), amber = NSColor(red: 0.85, green: 0.5, blue: 0.1, alpha: 1)
let dark = NSColor(white: 0.13, alpha: 1), dim = NSColor(white: 0.45, alpha: 1)
// name: (symbol, background, foreground); "-na" = not in a call
let keys: [String: (String, NSColor, NSColor)] = [
  "mic-live": ("mic.fill", green, .white), "mic-muted": ("mic.slash.fill", red, .white), "mic-na": ("mic.slash.fill", dark, dim),
  "cam-on": ("video.fill", green, .white), "cam-off": ("video.slash.fill", red, .white), "cam-na": ("video.slash.fill", dark, dim),
  "share-idle": ("rectangle.on.rectangle", purple, .white), "share-on": ("rectangle.on.rectangle", red, .white),
  "share-na": ("rectangle.on.rectangle", dark, dim),
  "leave": ("phone.down.fill", red, .white), "leave-na": ("phone.down.fill", dark, dim),
]
for (suffix, scale) in [("", 1.0), ("@2x", 2.0)] {
  for (name, k) in keys { render("\(name)\(suffix)", 72 * scale, symbol: k.0, bg: k.1, fg: k.2) }
  // Same symbol in both states so the key always reads as Teams; caption says what a press does.
  render("teams-off\(suffix)", 72 * scale, symbol: "person.2.fill", bg: amber, fg: .white, caption: "START")
  render("teams-on\(suffix)", 72 * scale, symbol: "person.2.fill", bg: purple, fg: .white, caption: "TEAMS")
  render("plugin\(suffix)", 256 * scale, symbol: "person.2.fill", bg: purple, fg: .white)
  render("category\(suffix)", 28 * scale, symbol: "person.2.fill", bg: nil, fg: .white)
  render("action\(suffix)", 20 * scale, symbol: "person.2.fill", bg: nil, fg: .white)
}
