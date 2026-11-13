// Renders the key images from SF Symbols: swift tools/icons.swift com.sclt.teams.sdPlugin/imgs
import AppKit
let out = CommandLine.arguments[1]
func render(_ name: String, _ size: CGFloat, symbol: String, bg: NSColor?, fg: NSColor) {
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size), pixelsHigh: Int(size), bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  if let bg { bg.setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size)).fill() }
  let cfg = NSImage.SymbolConfiguration(pointSize: size * (bg == nil ? 0.7 : 0.45), weight: .semibold)
    .applying(.init(paletteColors: [fg]))
  let sym = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)!.withSymbolConfiguration(cfg)!
  sym.draw(in: NSRect(x: (size - sym.size.width) / 2, y: (size - sym.size.height) / 2, width: sym.size.width, height: sym.size.height))
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
  "teams-on": ("person.2.fill", purple, .white), "teams-off": ("power", amber, .white),
]
for (suffix, scale) in [("", 1.0), ("@2x", 2.0)] {
  for (name, k) in keys { render("\(name)\(suffix)", 72 * scale, symbol: k.0, bg: k.1, fg: k.2) }
  render("plugin\(suffix)", 256 * scale, symbol: "person.2.fill", bg: purple, fg: .white)
  render("category\(suffix)", 28 * scale, symbol: "person.2.fill", bg: nil, fg: .white)
  render("action\(suffix)", 20 * scale, symbol: "person.2.fill", bg: nil, fg: .white)
}
