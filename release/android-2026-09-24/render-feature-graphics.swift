import AppKit
import Foundation

// Google Play feature artwork, not a simulated app screenshot.
// Native-language captions are composed with the same MegaRadio visual palette.
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let drafts = try JSONSerialization.jsonObject(with: Data(contentsOf: root.appendingPathComponent("play-copy-draft.json"))) as! [String:Any]
let locales = drafts["locales"] as! [String:[String:Any]]
let captionsURL = root.appendingPathComponent("../aso-2026-09-24/screenshots/ipad-redesign-captions.json").standardizedFileURL
let captions = try JSONSerialization.jsonObject(with: Data(contentsOf: captionsURL)) as! [String:[String:[String]]]
var audit = [[String:Any]]()

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(srgbRed:CGFloat((hex >> 16) & 255)/255, green:CGFloat((hex >> 8) & 255)/255, blue:CGFloat(hex & 255)/255, alpha:alpha)
}
func label(_ value:String, _ box:NSRect, _ maxSize:CGFloat, _ minSize:CGFloat, _ weight:NSFont.Weight, _ ink:NSColor, _ align:NSTextAlignment = .left) throws -> CGFloat {
    let style=NSMutableParagraphStyle()
    style.alignment=align;style.baseWritingDirection = .natural
    style.lineBreakMode = .byWordWrapping;style.lineSpacing=2
    for size in stride(from:maxSize,through:minSize,by:-1) {
        let string=NSAttributedString(string:value,attributes:[.font:NSFont.systemFont(ofSize:size,weight:weight),.foregroundColor:ink,.paragraphStyle:style])
        let bounds=string.boundingRect(with:NSSize(width:box.width,height:1000),options:[.usesLineFragmentOrigin,.usesFontLeading])
        if bounds.height <= box.height && bounds.width <= box.width+1 {
            string.draw(with:NSRect(x:box.minX,y:box.midY-bounds.height/2,width:box.width,height:bounds.height+1),options:[.usesLineFragmentOrigin,.usesFontLeading])
            return size
        }
    }
    throw NSError(domain:"FeatureGraphicTextOverflow",code:1,userInfo:[NSLocalizedDescriptionKey:value])
}

for locale in locales.keys.sorted() {
    let sourceLocale=locales[locale]!["editorialSourceLocale"] as! String
    var wording=locales[locale]!["featureCaption"] as? [String] ?? captions[sourceLocale]!["discover"]!
    if sourceLocale == "en-GB" { wording[1] = "Your local sound. A world to discover." }
    if sourceLocale == "en-AU" { wording[1] = "Australian voices. Worldwide discovery." }
    if sourceLocale == "en-CA" { wording[1] = "Local voices, music and world radio." }
    if sourceLocale == "fr-CA" { wording[1] = "Le Québec à l’écoute du monde." }
    if sourceLocale == "es-MX" { wording[1] = "México y el mundo en tu radio." }
    if sourceLocale == "bn" { wording[0] = "বাংলা রেডিও" }
    if sourceLocale == "ja" { wording[0] = "ネットラジオ" }
    let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1024,pixelsHigh:500,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
    let ctx=NSGraphicsContext(bitmapImageRep:rep)!.cgContext
    ctx.translateBy(x:0,y:500);ctx.scaleBy(x:1,y:-1)
    NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
    NSGradient(starting:color(0x301742),ending:color(0x6A285E))!.draw(in:NSRect(x:0,y:0,width:1024,height:500),angle:0)
    // The repeated arcs extend the radio mark, without duplicating the app icon.
    for n in 0..<6 {
        let diameter=CGFloat(225+n*100)
        let ring=NSBezierPath(ovalIn:NSRect(x:790-diameter/2,y:250-diameter/2,width:diameter,height:diameter))
        ring.lineWidth=n == 0 ? 2 : 1
        color(0xFD9DC8,CGFloat(0.20-Double(n)*0.025)).setStroke();ring.stroke()
    }
    // Soundwave motif. It represents live radio, not a product feature or UI.
    let wave:[CGFloat]=[32,60,106,156,208,138,84,122,180,118,66,36]
    for (index,h) in wave.enumerated() {
        let x=CGFloat(659+index*20)
        let bar=NSBezierPath(roundedRect:NSRect(x:x,y:250-h/2,width:10,height:h),xRadius:5,yRadius:5)
        color(index < 5 ? 0xFFCEE5 : 0xF66AAC).setFill();bar.fill()
    }
    _ = try label("MegaRadio",NSRect(x:76,y:80,width:480,height:48),32,32,.bold,color(0xFBC9E4))
    let rtl=["ar-SA","he","ur"].contains(sourceLocale)
    let align:NSTextAlignment=rtl ? .right : .left
    let titleSize=try label(wording[0],NSRect(x:73,y:150,width:520,height:146),66,43,.heavy,.white,align)
    let subtitleSize=try label(wording[1],NSRect(x:77,y:318,width:490,height:78),25,20,.medium,color(0xEFDAF1),align)
    NSGraphicsContext.restoreGraphicsState()
    let folder=output.appendingPathComponent(locale)
    try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
    let file=folder.appendingPathComponent("feature-graphic.png")
    try rep.representation(using:.png,properties:[:])!.write(to:file)
    audit.append(["locale":locale,"file":file.path,"width":1024,"height":500,
                  "headline":wording[0],"caption":wording[1],"headingFont":titleSize,
                  "captionFont":subtitleSize,"assetType":"featureGraphic",
                  "altText":"MegaRadio — \(wording[0]). \(wording[1])"])
}
try JSONSerialization.data(withJSONObject:audit,options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent("feature-render-audit.json"))
print("Rendered \(audit.count) localized Google Play feature graphics")
