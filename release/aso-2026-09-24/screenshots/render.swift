import AppKit
import Foundation

// CoreText/AppKit supplies script shaping and font fallback for RTL, Indic and CJK text.
// Original phone frames and app screens remain untouched below the caption strip.
func log(_ s: String) { FileHandle.standardError.write(Data((s+"\n").utf8)) }
let args = CommandLine.arguments
let root = URL(fileURLWithPath: args[1])
let originals = URL(fileURLWithPath: args[2])
let output = URL(fileURLWithPath: args[3])
let captions = try JSONSerialization.jsonObject(with: Data(contentsOf: root.appendingPathComponent("captions.json"))) as! [String: [String: [String]]]
var audit = [[String: Any]]()
func fit(_ text: String, rect: NSRect, maxSize: CGFloat, minSize: CGFloat) throws -> (NSAttributedString, CGFloat) {
    let para = NSMutableParagraphStyle(); para.alignment = .center; para.lineBreakMode = .byWordWrapping
    para.baseWritingDirection = .natural
    for size in stride(from: maxSize, through: minSize, by: -1) {
        let font = NSFont(name: "Arial-BoldMT", size: size) ?? NSFont.boldSystemFont(ofSize: size)
        let value = NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: NSColor.white, .paragraphStyle: para])
        let b = value.boundingRect(with: NSSize(width: rect.width, height: 10000), options: [.usesLineFragmentOrigin, .usesFontLeading])
        if b.height <= rect.height && b.width <= rect.width + 1 { return (value,size) }
    }
    throw NSError(domain:"ScreenshotTextOverflow",code:1,userInfo:[NSLocalizedDescriptionKey:text])
}
for (locale, copy) in captions.sorted(by: {$0.key < $1.key}) {
    for (index, kind, filename) in [(1,"discover","2.png"),(2,"favorites","6.png")] {

        let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1284,pixelsHigh:540,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
        let ctx=NSGraphicsContext(bitmapImageRep:rep)!.cgContext
        ctx.translateBy(x:0,y:540);ctx.scaleBy(x:1,y:-1)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
        let hrect=NSRect(x:90,y:66,width:1104,height:240), srect=NSRect(x:105,y:342,width:1074,height:154)
        let (heading,hs)=try fit(copy[kind]![0],rect:hrect,maxSize:112,minSize:50)
        let (subheading,ss)=try fit(copy[kind]![1],rect:srect,maxSize:58,minSize:32)
        heading.draw(with:hrect,options:[.usesLineFragmentOrigin,.usesFontLeading])
        subheading.draw(with:srect,options:[.usesLineFragmentOrigin,.usesFontLeading])
        NSGraphicsContext.restoreGraphicsState()
        let folder=output.appendingPathComponent("caption-layers").appendingPathComponent(locale)
        try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
        let file=folder.appendingPathComponent(kind+".png")
        try rep.representation(using:.png,properties:[:])!.write(to:file)
        audit.append(["locale":locale,"kind":kind,"file":file.path,"headlineFont":hs,"subtitleFont":ss,"source":filename,"unchangedBelowY":540])
    }
}
try JSONSerialization.data(withJSONObject:audit,options:[.prettyPrinted,.sortedKeys]).write(to:root.appendingPathComponent("render-audit.json"))
print("Rendered \(audit.count) localized screenshots")
