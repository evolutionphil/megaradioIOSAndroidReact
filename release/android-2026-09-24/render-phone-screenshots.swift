import AppKit
import Foundation

// Composes unmodified, real Android screenshots with localized editorial text.
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let wordsURL = URL(fileURLWithPath: CommandLine.arguments[3])
let captions = try JSONSerialization.jsonObject(with: Data(contentsOf: wordsURL)) as! [String:[String:[String]]]
let frames = [("country","03-country.png"),("discover","01-discover.png"),("player","02-player.png"),("genres","04-genres.png"),("car","05-car.png"),("search","06-search.png")]
let only = CommandLine.arguments.count > 4 ? CommandLine.arguments[4] : ""
func color(_ h:UInt32, _ a:CGFloat = 1) -> NSColor { NSColor(srgbRed:CGFloat((h>>16)&255)/255,green:CGFloat((h>>8)&255)/255,blue:CGFloat(h&255)/255,alpha:a) }
func label(_ value:String,_ box:NSRect,_ maxSize:CGFloat,_ minSize:CGFloat,_ weight:NSFont.Weight,_ ink:NSColor) throws -> CGFloat {
    let p=NSMutableParagraphStyle();p.alignment = .center;p.baseWritingDirection = .natural;p.lineBreakMode = .byWordWrapping;p.lineSpacing=3
    for size in stride(from:maxSize,through:minSize,by:-1) {
        let s=NSAttributedString(string:value,attributes:[.font:NSFont.systemFont(ofSize:size,weight:weight),.foregroundColor:ink,.paragraphStyle:p])
        let b=s.boundingRect(with:NSSize(width:box.width,height:1000),options:[.usesLineFragmentOrigin,.usesFontLeading])
        if b.height<=box.height && b.width<=box.width+1 {
            s.draw(with:NSRect(x:box.minX,y:box.midY-b.height/2,width:box.width,height:b.height+1),options:[.usesLineFragmentOrigin,.usesFontLeading]);return size
        }
    }
    throw NSError(domain:"PhoneCaptionOverflow",code:1,userInfo:[NSLocalizedDescriptionKey:value])
}
var audit=[[String:Any]]()
for locale in captions.keys.sorted() where only.isEmpty || locale == only {
    let folder=output.appendingPathComponent(locale).appendingPathComponent("phone")
    try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
    for (index,frame) in frames.enumerated() {
        let raw=source.appendingPathComponent(frame.1)
        guard let shot=NSImage(contentsOf:raw) else { throw NSError(domain:"MissingAndroidCapture",code:1,userInfo:[NSLocalizedDescriptionKey:raw.path]) }
        let words=captions[locale]![frame.0]!
        let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1080,pixelsHigh:1920,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
        let ctx=NSGraphicsContext(bitmapImageRep:rep)!.cgContext;ctx.translateBy(x:0,y:1920);ctx.scaleBy(x:1,y:-1)
        NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
        NSGradient(starting:color(0x291334),ending:color(0x0C0915))!.draw(in:NSRect(x:0,y:0,width:1080,height:1920),angle:90)
        for n in 0..<5 {
            let diameter=CGFloat(480+n*200)
            let ring=NSBezierPath(ovalIn:NSRect(x:960-diameter/2,y:1000-diameter/2,width:diameter,height:diameter))
            ring.lineWidth=2;color(0xFF62AE,0.08).setStroke();ring.stroke()
        }
        _ = try label("MegaRadio",NSRect(x:80,y:49,width:920,height:48),34,34,.bold,color(0xF7B6D6))
        let heading=try label(words[0],NSRect(x:65,y:127,width:950,height:190),82,44,.heavy,.white)
        let subtitle=try label(words[1],NSRect(x:100,y:325,width:880,height:64),29,23,.medium,color(0xDBCCDF))
        let h:CGFloat=1435;let w=h*shot.size.width/shot.size.height
        let box=NSRect(x:(1080-w)/2,y:432,width:w,height:h)
        let bezel=NSBezierPath(roundedRect:box.insetBy(dx:-8,dy:-8),xRadius:36,yRadius:36)
        color(0x56435C).setFill();bezel.fill()
        shot.draw(in:box,from:NSRect(origin:.zero,size:shot.size),operation:.copy,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
        NSGraphicsContext.restoreGraphicsState()
        let filename=String(format:"MegaRadio-%@-phone-%02d-%@.png",locale,index+1,frame.0)
        let file=folder.appendingPathComponent(filename)
        try rep.representation(using:.png,properties:[:])!.write(to:file)
        audit.append(["locale":locale,"kind":frame.0,"file":file.path,"source":raw.path,"headline":words[0],"caption":words[1],"headingFont":heading,"captionFont":subtitle,"width":1080,"height":1920,"capturedUILanguage":"English","editorialTextLocalized":true])
    }
}
try JSONSerialization.data(withJSONObject:audit,options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent(only.isEmpty ? "phone-render-audit.json" : "phone-render-preview-\(only).json"))
print("Rendered \(audit.count) actual Android phone screenshots")
