// adMobService.ts - Platform resolver
// Metro bundler will automatically pick .web.ts for web and .native.ts for native

import { Platform } from 'react-native';

// Re-export from the correct platform file
// Metro handles this automatically with .native.ts and .web.ts extensions
export * from './adMobService.native';
