//
// Use this file to import your target's public headers that you would like to expose to Swift.
//

// React Native Bridge
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// RNCarPlay - React Native CarPlay bridge
// This import is REQUIRED for Swift to access the Objective-C RNCarPlay class
// Without this, NSClassFromString("RNCarPlay") will return nil!
#if __has_include(<react-native-carplay/RNCarPlay.h>)
#import <react-native-carplay/RNCarPlay.h>
#elif __has_include("RNCarPlay.h")
#import "RNCarPlay.h"
#endif
