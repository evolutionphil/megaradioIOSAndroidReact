// Tracks how the app was launched: normal / quick_action / siri / assistant
// Sent as GA4 event `app_launch` via analyticsService (fire-and-forget)
import analyticsService from './analyticsService';

export type LaunchSource = 'normal' | 'quick_action' | 'siri' | 'assistant';

let reported = false;

export const reportLaunchSource = (source: LaunchSource) => {
  // 'normal' is the startup baseline — only log it if no fast-access path fired first.
  // Special sources always log (covers warm launches via shortcut/voice too).
  if (source === 'normal' && reported) return;
  reported = true;
  console.log('[LaunchSource]', source);
  analyticsService.logAppLaunch?.(source)?.catch?.(() => {});
};
