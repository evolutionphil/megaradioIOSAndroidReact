import AppKit
import Foundation

// Composes unmodified, real Android screenshots with localized editorial text.
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let wordsURL = URL(fileURLWithPath: CommandLine.arguments[3])
let captions = try JSONSerialization.jsonObject(with: Data(contentsOf: wordsURL)) as! [String:[String:[String]]]
let frames = [("discover","01-discover.png"),("player","02-player.png"),("genres","03-genres.png")]
let only = CommandLine.arguments.count > 4 ? CommandLine.arguments[4] : ""
func color(_ h:UInt32, _ a:CGFloat = 1) -> NSColor { NSColor(srgbRed:CGFloat((h>>16)&255)/255,green:CGFloat((h>>8)&255)/255,blue:CGFloat(h&255)/255,alpha:a) }
func label(_ value:String,_ box:NSRect,_ maxSize:CGFloat,_ minSize:CGFloat,_ weight:NSFont.Weight,_ ink:NSColor) throws -> CGFloat {
    let p=NSMutableParagraphStyle();p.alignment = .left;p.baseWritingDirection = .natural;p.lineBreakMode = .byWordWrapping;p.lineSpacing=3
    for size in stride(from:maxSize,through:minSize,by:-1) {
        let s=NSAttributedString(string:value,attributes:[.font:NSFont.systemFont(ofSize:size,weight:weight),.foregroundColor:ink,.paragraphStyle:p])
        let b=s.boundingRect(with:NSSize(width:box.width,height:1000),options:[.usesLineFragmentOrigin,.usesFontLeading])
        if b.height<=box.height && b.width<=box.width+1 {
            s.draw(with:NSRect(x:box.minX,y:box.midY-b.height/2,width:box.width,height:b.height+1),options:[.usesLineFragmentOrigin,.usesFontLeading]);return size
        }
    }
    throw NSError(domain:"TVCaptionOverflow",code:1,userInfo:[NSLocalizedDescriptionKey:value])
}

var audit=[[String:Any]]()
for locale in captions.keys.sorted() {
    let folder=output.appendingPathComponent(locale)
    let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1280,pixelsHigh:720,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
    let ctx=NSGraphicsContext(bitmapImageRep:rep)!.cgContext;ctx.translateBy(x:0,y:720);ctx.scaleBy(x:1,y:-1)
    NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
    NSGradient(starting:color(0x321039),ending:color(0x100B16))!.draw(in:NSRect(x:0,y:0,width:1280,height:720),angle:20)
    guard let logo=NSImage(contentsOf:source) else { fatalError("Missing brand icon") }
    logo.draw(in:NSRect(x:88,y:195,width:330,height:330),from:NSRect(origin:.zero,size:logo.size),operation:.sourceOver,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
    _ = try label("MegaRadio",NSRect(x:475,y:230,width:715,height:120),100,100,.heavy,.white)
    let caption=captions[locale]!["discover"]![0]
    let size=try label(caption,NSRect(x:480,y:366,width:670,height:115),50,30,.semibold,color(0xF5B5D6))
    NSGraphicsContext.restoreGraphicsState()
    let file=folder.appendingPathComponent("MegaRadio-\(locale)-tv-banner.png")
    try rep.representation(using:.png,properties:[:])!.write(to:file)
    audit.append(["locale":locale,"file":file.path,"caption":caption,"fontSize":size,"width":1280,"height":720])
}
try JSONSerialization.data(withJSONObject:audit,options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent("tv-banner-audit.json"))
print("Rendered \(audit.count) TV banners")
