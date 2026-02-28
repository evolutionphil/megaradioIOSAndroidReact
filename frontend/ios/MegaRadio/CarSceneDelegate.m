//
//  CarSceneDelegate.m
//  MegaRadio
//
//  CarPlay Scene Delegate - Objective-C implementation for better RNCarPlay compatibility
//

#import "CarSceneDelegate.h"
#import "RNCarPlay.h"
#import "MegaRadio-Swift.h"  // For AppDelegate access

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

@implementation CarSceneDelegate {
    CPInterfaceController *_interfaceController;
    CPWindow *_carWindow;
    int _retryCount;
    NSTimer *_retryTimer;
}

// Check if React Native bridge is ready
- (BOOL)isReactNativeBridgeReady {
    // Try to check if RNCarPlay is responding
    Class rnCarPlayClass = NSClassFromString(@"RNCarPlay");
    if (!rnCarPlayClass) {
        return NO;
    }
    
    // Check if the module has registered handlers (connected property)
    // This is a heuristic - we check if the class responds to expected methods
    SEL connectedSel = NSSelectorFromString(@"connected");
    if ([rnCarPlayClass respondsToSelector:connectedSel]) {
        return YES;
    }
    
    return YES; // Assume ready if class exists
}

// Start retry timer for cold-start scenario
- (void)startRetryTimerWithInterfaceController:(CPInterfaceController *)interfaceController window:(CPWindow *)window {
    _interfaceController = interfaceController;
    _carWindow = window;
    _retryCount = 0;
    
    // Stop any existing timer
    [self stopRetryTimer];
    
    // Start retry timer - check every 1 second for 30 seconds
    sendCarPlayLog(@"info", @"Starting cold-start retry timer", @{@"maxRetries": @30, @"intervalSec": @1});
    
    _retryTimer = [NSTimer scheduledTimerWithTimeInterval:1.0
                                                   target:self
                                                 selector:@selector(retryCarPlayConnection)
                                                 userInfo:nil
                                                  repeats:YES];
}

- (void)stopRetryTimer {
    if (_retryTimer) {
        [_retryTimer invalidate];
        _retryTimer = nil;
    }
}

- (void)retryCarPlayConnection {
    _retryCount++;
    
    sendCarPlayLog(@"info", @"Retry attempt", @{
        @"attempt": @(_retryCount),
        @"bridgeReady": @([self isReactNativeBridgeReady])
    });
    
    // Check if template has been replaced (success case)
    if (_interfaceController) {
        CPTemplate *currentTemplate = _interfaceController.rootTemplate;
        
        // If it's no longer a simple list template with "Yükleniyor", we're done
        if ([currentTemplate isKindOfClass:[CPTabBarTemplate class]]) {
            sendCarPlayLog(@"info", @"SUCCESS! TabBar template detected - stopping retry", @{});
            [self stopRetryTimer];
            return;
        }
        
        // Check if it's a list template but NOT our loading template
        if ([currentTemplate isKindOfClass:[CPListTemplate class]]) {
            CPListTemplate *listTemplate = (CPListTemplate *)currentTemplate;
            NSString *title = listTemplate.title;
            if (title && ![title isEqualToString:@"MegaRadio"]) {
                sendCarPlayLog(@"info", @"SUCCESS! Different template detected - stopping retry", @{@"title": title});
                [self stopRetryTimer];
                return;
            }
        }
    }
    
    // Retry connecting to RNCarPlay
    if (_retryCount <= 30 && _interfaceController) {
        sendCarPlayLog(@"info", @"Re-calling RNCarPlay.connect", @{@"attempt": @(_retryCount)});
        [RNCarPlay connectWithInterfaceController:_interfaceController window:_carWindow];
    }
    
    // Stop after max retries
    if (_retryCount >= 30) {
        sendCarPlayLog(@"warn", @"Max retries reached - stopping cold-start retry", @{});
        [self stopRetryTimer];
    }
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
   didConnectInterfaceController:(CPInterfaceController *)interfaceController
{
    NSLog(@"[CarSceneDelegate] ===== CarPlay CONNECTED (ObjC) =====");
    sendCarPlayLog(@"info", @"===== CarPlay CONNECTED =====", @{
        @"method": @"didConnectInterfaceController",
        @"hasWindow": @NO
    });
    
    // CRITICAL: Initialize React Native bridge BEFORE connecting to RNCarPlay
    // This ensures JS runtime exists when CarPlay connects first (cold-start scenario)
    AppDelegate *appDelegate = (AppDelegate *)[[UIApplication sharedApplication] delegate];
    if (appDelegate && ![appDelegate isReactNativeReady]) {
        sendCarPlayLog(@"info", @"React Native NOT ready - initializing from CarPlay scene...", @{});
        [appDelegate initAppFromSceneWithConnectionOptions:nil];
        sendCarPlayLog(@"info", @"React Native initialization triggered", @{});
    } else {
        sendCarPlayLog(@"info", @"React Native already initialized", @{});
    }
    
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
    
    // Start cold-start retry timer - handles case where React Native bridge isn't ready yet
    [self startRetryTimerWithInterfaceController:interfaceController window:templateApplicationScene.carWindow];
}

- (void)templateApplicationScene:(CPTemplateApplicationScene *)templateApplicationScene
didDisconnectInterfaceController:(CPInterfaceController *)interfaceController
{
    NSLog(@"[CarSceneDelegate] ===== CarPlay DISCONNECTED (ObjC) =====");
    sendCarPlayLog(@"info", @"===== CarPlay DISCONNECTED =====", @{});
    
    // Stop retry timer
    [self stopRetryTimer];
    _interfaceController = nil;
    _carWindow = nil;
    
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
    
    // Start cold-start retry timer - handles case where React Native bridge isn't ready yet
    [self startRetryTimerWithInterfaceController:interfaceController window:window];
}

@end
