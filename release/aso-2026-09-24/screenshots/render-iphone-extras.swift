import AppKit
import Foundation

// Additional App Store artwork from real iOS 1.0.70 (7) Simulator captures.
// Existing seven photographic slides are preserved; these add three features.
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let wordsURL = URL(fileURLWithPath: CommandLine.arguments[3])
let captions = try JSONSerialization.jsonObject(with: Data(contentsOf: wordsURL)) as! [String:[String:[String]]]
let frames = [("search","08-search.png"),("rock-stations","09-rock-stations.png"),("sleep-timer","10-sleep-timer.png")]
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
  for (device,pixelsWide,pixelsHigh) in [("iphone6.5",1284,2778),("iphone6.9",1320,2868),("iphone5.5",1242,2208)] {
    let folder=output.appendingPathComponent(locale).appendingPathComponent(device)
    try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
    for (index,frame) in frames.enumerated() {
        let raw=source.appendingPathComponent(frame.1)
        guard let shot=NSImage(contentsOf:raw) else { throw NSError(domain:"MissingAndroidCapture",code:1,userInfo:[NSLocalizedDescriptionKey:raw.path]) }
        let words=captions[locale]![frame.0]!
        let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:pixelsWide,pixelsHigh:pixelsHigh,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
        let scale=CGFloat(pixelsWide)/1080
        let canvasHeight=CGFloat(pixelsHigh)/scale
        let ctx=NSGraphicsContext(bitmapImageRep:rep)!.cgContext;ctx.translateBy(x:0,y:CGFloat(pixelsHigh));ctx.scaleBy(x:scale,y:-scale)
        NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
        NSGradient(starting:color(0x291334),ending:color(0x0C0915))!.draw(in:NSRect(x:0,y:0,width:1080,height:canvasHeight),angle:90)
        for n in 0..<5 {
            let diameter=CGFloat(480+n*200)
            let ring=NSBezierPath(ovalIn:NSRect(x:960-diameter/2,y:1000-diameter/2,width:diameter,height:diameter))
            ring.lineWidth=2;color(0xFF62AE,0.08).setStroke();ring.stroke()
        }
        _ = try label("MegaRadio",NSRect(x:80,y:49,width:920,height:48),34,34,.bold,color(0xF7B6D6))
        let heading=try label(words[0],NSRect(x:65,y:127,width:950,height:190),82,44,.heavy,.white)
        let subtitle=try label(words[1],NSRect(x:100,y:325,width:880,height:64),29,23,.medium,color(0xDBCCDF))
        let h=canvasHeight-485;let w=h*shot.size.width/shot.size.height
        let box=NSRect(x:(1080-w)/2,y:432,width:w,height:h)
        let bezel=NSBezierPath(roundedRect:box.insetBy(dx:-8,dy:-8),xRadius:36,yRadius:36)
        color(0x56435C).setFill();bezel.fill()
        shot.draw(in:box,from:NSRect(origin:.zero,size:shot.size),operation:.copy,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
        NSGraphicsContext.restoreGraphicsState()
        let filename=String(format:"%02d_%@.png",index+8,frame.0)
        let file=folder.appendingPathComponent(filename)
        try rep.representation(using:.png,properties:[:])!.write(to:file)
        audit.append(["locale":locale,"device":device,"kind":frame.0,"file":file.path,"source":raw.path,"headline":words[0],"caption":words[1],"headingFont":heading,"captionFont":subtitle,"width":pixelsWide,"height":pixelsHigh,"capturedUILanguage":"English","editorialTextLocalized":true,"nativeUIAltered":false])
    }
  }
}
try JSONSerialization.data(withJSONObject:audit,options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent(only.isEmpty ? "iphone-extras-render-audit.json" : "iphone-extras-preview-\(only).json"))
print("Rendered \(audit.count) additional iPhone screenshots; convert to RGB before App Store upload")
