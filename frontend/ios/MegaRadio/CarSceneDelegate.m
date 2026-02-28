//
//  CarSceneDelegate.m
//  MegaRadio
//
//  CarPlay Scene Delegate - Objective-C implementation for better RNCarPlay compatibility
//

#import "CarSceneDelegate.h"
#import "RNCarPlay.h"

// Remote logging helper
static void sendCarPlayLog(NSString *level, NSString *message, NSDictionary *data) {
    NSString *apiUrl = @"https://themegaradio.com/api/logs/remote";
    NSString *apiKey = @"mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw";
    
    NSString *appVersion = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"] ?: @"unknown";
    NSString *buildNumber = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleVersion"] ?: @"unknown";
    NSString *deviceId = [[[UIDevice currentDevice] identifierForVendor] UUIDString] ?: @"unknown";
    
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    [formatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss'Z'"];
    [formatter setTimeZone:[NSTimeZone timeZoneWithName:@"UTC"]];
    NSString *timestamp = [formatter stringFromDate:[NSDate date]];
    
    NSMutableDictionary *logEntry = [NSMutableDictionary dictionaryWithDictionary:@{
        @"level": level,
        @"message": [NSString stringWithFormat:@"[ObjC] %@", message],
        @"timestamp": timestamp
    }];
    if (data) {
        logEntry[@"data"] = data;
    }
    
    NSDictionary *payload = @{
        @"deviceId": [NSString stringWithFormat:@"ios_carplay_%@", [deviceId substringToIndex:MIN(8, deviceId.length)]],
        @"platform": @"ios",
        @"appVersion": appVersion,
        @"buildNumber": buildNumber,
        @"isCarPlayLog": @YES,
        @"logs": @[logEntry]
    };
    
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:payload options:0 error:&error];
    if (error) {
        NSLog(@"[CarSceneDelegate] JSON error: %@", error);
        return;
    }
    
    NSURL *url = [NSURL URLWithString:apiUrl];
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    [request setHTTPMethod:@"POST"];
    [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [request setValue:apiKey forHTTPHeaderField:@"X-API-Key"];
    [request setHTTPBody:jsonData];
    
    NSURLSession *session = [NSURLSession sharedSession];
    [[session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if (error) {
            NSLog(@"[CarSceneDelegate] Log send failed: %@", error);
        }
    }] resume];
}

@implementation CarSceneDelegate

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
   didConnectInterfaceController:(CPInterfaceController *)interfaceController
{
    NSLog(@"[CarSceneDelegate] ===== CarPlay CONNECTED (ObjC) =====");
    sendCarPlayLog(@"info", @"===== CarPlay CONNECTED =====", @{
        @"method": @"didConnectInterfaceController",
        @"hasWindow": @NO
    });
    
    // Set loading template first
    CPListItem *loadingItem = [[CPListItem alloc] initWithText:@"MegaRadio" detailText:@"Yükleniyor..."];
    CPListSection *loadingSection = [[CPListSection alloc] initWithItems:@[loadingItem]];
    CPListTemplate *loadingTemplate = [[CPListTemplate alloc] initWithTitle:@"MegaRadio" sections:@[loadingSection]];
    
    [interfaceController setRootTemplate:loadingTemplate animated:NO completion:^(BOOL success, NSError * _Nullable error) {
        if (success) {
            sendCarPlayLog(@"info", @"Loading template SET", @{@"success": @YES});
        } else {
            sendCarPlayLog(@"error", @"Loading template FAILED", @{@"error": error.localizedDescription ?: @"unknown"});
        }
    }];
    
    // Connect to RNCarPlay - this is the DIRECT method call (not dynamic)
    sendCarPlayLog(@"info", @"Calling RNCarPlay.connect...", @{});
    [RNCarPlay connectWithInterfaceController:interfaceController window:templateApplicationScene.carWindow];
    sendCarPlayLog(@"info", @"RNCarPlay.connect CALLED", @{@"nextStep": @"React Native should receive event"});
    
    // Schedule check
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        CPTemplate *currentTemplate = interfaceController.rootTemplate;
        BOOL isStillLoading = [currentTemplate isKindOfClass:[CPListTemplate class]];
        sendCarPlayLog(isStillLoading ? @"warn" : @"info", 
                       isStillLoading ? @"STILL showing loading after 5s" : @"Template was replaced", 
                       @{@"isStillLoading": @(isStillLoading)});
    });
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
didDisconnectInterfaceController:(CPInterfaceController *)interfaceController
{
    NSLog(@"[CarSceneDelegate] ===== CarPlay DISCONNECTED (ObjC) =====");
    sendCarPlayLog(@"info", @"===== CarPlay DISCONNECTED =====", @{});
    
    [RNCarPlay disconnect];
}

// CRITICAL: State change callbacks - tells React Native when CarPlay goes to background/foreground
- (void)sceneDidEnterBackground:(UIScene *)scene
{
    NSLog(@"[CarSceneDelegate] CarPlay scene entered BACKGROUND");
    sendCarPlayLog(@"info", @"CarPlay scene BACKGROUND", @{});
    [RNCarPlay stateChanged:NO];
}

- (void)sceneWillEnterForeground:(UIScene *)scene
{
    NSLog(@"[CarSceneDelegate] CarPlay scene will enter FOREGROUND");
    sendCarPlayLog(@"info", @"CarPlay scene FOREGROUND", @{});
    [RNCarPlay stateChanged:YES];
}

// iOS 14+ method with window
- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
   didConnectInterfaceController:(CPInterfaceController *)interfaceController
                        toWindow:(CPWindow *)window
{
    NSLog(@"[CarSceneDelegate] ===== CarPlay CONNECTED WITH WINDOW (ObjC iOS 14+) =====");
    sendCarPlayLog(@"info", @"===== CarPlay CONNECTED WITH WINDOW =====", @{
        @"method": @"didConnectInterfaceController:toWindow:",
        @"hasWindow": @YES,
        @"windowBounds": NSStringFromCGRect(window.bounds)
    });
    
    // Set loading template first
    CPListItem *loadingItem = [[CPListItem alloc] initWithText:@"MegaRadio" detailText:@"Yükleniyor..."];
    CPListSection *loadingSection = [[CPListSection alloc] initWithItems:@[loadingItem]];
    CPListTemplate *loadingTemplate = [[CPListTemplate alloc] initWithTitle:@"MegaRadio" sections:@[loadingSection]];
    
    [interfaceController setRootTemplate:loadingTemplate animated:NO completion:^(BOOL success, NSError * _Nullable error) {
        if (success) {
            sendCarPlayLog(@"info", @"Loading template SET (with window)", @{@"success": @YES});
        } else {
            sendCarPlayLog(@"error", @"Loading template FAILED (with window)", @{@"error": error.localizedDescription ?: @"unknown"});
        }
    }];
    
    // Connect to RNCarPlay with window
    sendCarPlayLog(@"info", @"Calling RNCarPlay.connect with window...", @{});
    [RNCarPlay connectWithInterfaceController:interfaceController window:window];
    sendCarPlayLog(@"info", @"RNCarPlay.connect CALLED with window", @{@"nextStep": @"React Native should receive event"});
    
    // Schedule check
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        CPTemplate *currentTemplate = interfaceController.rootTemplate;
        BOOL isStillLoading = [currentTemplate isKindOfClass:[CPListTemplate class]];
        sendCarPlayLog(isStillLoading ? @"warn" : @"info", 
                       isStillLoading ? @"STILL showing loading after 5s" : @"Template was replaced", 
                       @{@"isStillLoading": @(isStillLoading)});
    });
}

@end
