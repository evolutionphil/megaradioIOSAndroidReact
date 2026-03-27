//
// Use this file to import your target's public headers that you would like to expose to Swift.
//

// React Native Bridge - use __has_include for framework/static library compatibility
#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#elif __has_include(<React_Core/RCTBridgeModule.h>)
#import <React_Core/RCTBridgeModule.h>
#import <React_Core/RCTEventEmitter.h>
#elif __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#import "RCTEventEmitter.h"
#endif

// RNCarPlay - React Native CarPlay bridge
#if __has_include(<react-native-carplay/RNCarPlay.h>)
#import <react-native-carplay/RNCarPlay.h>
#elif __has_include(<react_native_carplay/RNCarPlay.h>)
#import <react_native_carplay/RNCarPlay.h>
#elif __has_include("RNCarPlay.h")
#import "RNCarPlay.h"
#endif
