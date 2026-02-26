// WatchConnectivityBridge.m
// React Native bridge for WatchConnectivity
// Add this file to the main iOS target (MegaRadio)

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(WatchConnectivityBridge, RCTEventEmitter)

RCT_EXTERN_METHOD(updateFavorites:(NSArray *)favorites)
RCT_EXTERN_METHOD(updateNowPlaying:(NSDictionary *)nowPlaying)
RCT_EXTERN_METHOD(updateGenres:(NSArray *)genres)
RCT_EXTERN_METHOD(updatePlaybackState:(BOOL)isPlaying)
RCT_EXTERN_METHOD(isWatchAppInstalled:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
