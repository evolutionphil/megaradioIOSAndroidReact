// ATTModule.m
// Objective-C bridge for the Swift ATT (App Tracking Transparency) native module
// This allows React Native JS to call ATTrackingManager.requestTrackingAuthorization()

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ATTModule, NSObject)
RCT_EXTERN_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getStatus:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
