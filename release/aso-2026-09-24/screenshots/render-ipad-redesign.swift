import AppKit
import Foundation

// Store artwork uses real native iPad captures; only the surrounding layout is drawn.
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let onlyLocale = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : nil
let copy = try JSONSerialization.jsonObject(with: Data(contentsOf: root.appendingPathComponent("ipad-redesign-captions.json"))) as! [String:[String:[String]]]
let slides = ["discover", "player", "genres", "country"]
let width = 2064, height = 2752
let appIconURL = root.appendingPathComponent("../../../frontend/assets/megaradio-icon.png").standardizedFileURL
guard let appIcon = NSImage(contentsOf:appIconURL) else { fatalError("Missing original MegaRadio icon") }
var audit = [[String:Any]]()
func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(srgbRed:CGFloat((hex >> 16) & 255)/255, green:CGFloat((hex >> 8) & 255)/255, blue:CGFloat(hex & 255)/255, alpha:alpha)
}
func text(_ value: String, box: NSRect, maximum: CGFloat, minimum: CGFloat, weight: NSFont.Weight, ink: NSColor, alignment: NSTextAlignment = .center) throws -> CGFloat {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment; paragraph.lineBreakMode = .byWordWrapping
    paragraph.baseWritingDirection = .natural; paragraph.lineSpacing = 5
    for size in stride(from:maximum, through:minimum, by:-1) {
        let font = NSFont.systemFont(ofSize:size, weight:weight)
        let label = NSAttributedString(string:value, attributes:[.font:font, .foregroundColor:ink, .paragraphStyle:paragraph])
        let bounds = label.boundingRect(with:NSSize(width:box.width, height:10000), options:[.usesLineFragmentOrigin,.usesFontLeading])
        if bounds.height <= box.height && bounds.width <= box.width + 1 {
            let target = NSRect(x:box.minX, y:box.midY-bounds.height/2, width:box.width, height:bounds.height+1)
            label.draw(with:target,options:[.usesLineFragmentOrigin,.usesFontLeading]); return size
        }
    }
    throw NSError(domain:"iPadCaptionOverflow",code:1,userInfo:[NSLocalizedDescriptionKey:value])
}
func round(_ rect: NSRect, _ radius: CGFloat, _ fill: NSColor) {
    fill.setFill(); NSBezierPath(roundedRect:rect,xRadius:radius,yRadius:radius).fill()
}
for locale in copy.keys.sorted() where onlyLocale == nil || locale == onlyLocale {
  for (index, kind) in slides.enumerated() {
    let source = root.appendingPathComponent("source/ipad-redesign/\(kind).png")
    guard let capture = NSImage(contentsOf:source) else { fatalError("Missing native capture: \(source.path)") }
    let rep = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:width,pixelsHigh:height,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
    let ctx = NSGraphicsContext(bitmapImageRep:rep)!.cgContext
    ctx.translateBy(x:0,y:CGFloat(height));ctx.scaleBy(x:1,y:-1)
    NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
    let dark = index == 0 || index == 3
    let backgrounds:[UInt32] = [0x211334,0xFFF0E7,0xEEE8FF,0x271229]
    let accents:[UInt32] = [0xA977FF,0xFF865A,0x9868EB,0xEC70AE]
    let ink = color(dark ? 0xFFFFFF : 0x271936)
    let secondary = color(dark ? 0xE1D6EF : 0x66566F)
    let accent=color(accents[index])
    color(backgrounds[index]).setFill();NSRect(x:0,y:0,width:width,height:height).fill()
    // Broad geometry gives each card its own color while keeping a single visual system.
    accent.withAlphaComponent(dark ? 0.18 : 0.15).setFill()
    NSBezierPath(ovalIn:NSRect(x:-480+index*180,y:780,width:3000,height:2800)).fill()
    for n in 0..<3 {
        let ring=NSBezierPath(ovalIn:NSRect(x:-460-n*85,y:1110+n*100,width:2900+n*170,height:2300+n*170))
        ring.lineWidth=3;accent.withAlphaComponent(0.22).setStroke();ring.stroke()
    }
    NSGraphicsContext.saveGraphicsState()
    let logoRect=NSRect(x:148,y:92,width:80,height:80)
    NSBezierPath(roundedRect:logoRect,xRadius:21,yRadius:21).addClip()
    appIcon.draw(in:logoRect,from:.zero,operation:.sourceOver,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
    _ = try text("MegaRadio",box:NSRect(x:249,y:88,width:580,height:88),maximum:62,minimum:62,weight:.bold,ink:ink,alignment:.left)
    _ = try text(String(format:"%02d / 04",index+1),box:NSRect(x:1640,y:104,width:265,height:60),maximum:38,minimum:38,weight:.medium,ink:secondary,alignment:.right)
    let wording=copy[locale]![kind]!
    let headingFont = try text(wording[0],box:NSRect(x:145,y:215,width:1774,height:292),maximum:158,minimum:86,weight:.heavy,ink:ink)
    let subtitleFont = try text(wording[1],box:NSRect(x:220,y:510,width:1624,height:112),maximum:55,minimum:40,weight:.medium,ink:secondary)
    let screen=NSRect(x:287,y:697,width:1490,height:1986.6666667)
    let bezel=screen.insetBy(dx:-29,dy:-29)
    let shadow=NSShadow();shadow.shadowColor=color(0x08010F,0.45);shadow.shadowBlurRadius=55;shadow.shadowOffset=NSSize(width:0,height:24)
    NSGraphicsContext.saveGraphicsState();shadow.set()
    round(bezel,72,color(0x111114));NSGraphicsContext.restoreGraphicsState()
    let edge=NSBezierPath(roundedRect:bezel.insetBy(dx:2,dy:2),xRadius:70,yRadius:70)
    edge.lineWidth=4;color(0x77717E).setStroke();edge.stroke()
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect:screen,xRadius:46,yRadius:46).addClip()
    capture.draw(in:screen,from:.zero,operation:.copy,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
    NSGraphicsContext.restoreGraphicsState()
    let folder=output.appendingPathComponent(locale).appendingPathComponent("ipad13")
    try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
    let file=folder.appendingPathComponent(String(format:"%02d_",index+1)+kind+".png")
    try rep.representation(using:.png,properties:[:])!.write(to:file)
    audit.append(["locale":locale,"kind":kind,"file":file.path,"width":width,"height":height,"headingFont":headingFont,"subtitleFont":subtitleFont,"source":source.lastPathComponent,"nativeUIAltered":false])
  }
}
let report=output.appendingPathComponent(onlyLocale == nil ? "render-audit.json" : "render-audit-\(onlyLocale!).json")
try JSONSerialization.data(withJSONObject:audit,options:[.prettyPrinted,.sortedKeys]).write(to:report)
print("Rendered \(audit.count) iPad store images")
