// RewardedAdButton.web.tsx
// Web stub - AdMob not available on web

import React from 'react';
import { View } from 'react-native';

interface RewardedAdButtonProps {
  onRewardEarned?: () => void;
}

export const RewardedAdButton: React.FC<RewardedAdButtonProps> = () => {
  // AdMob is not available on web, render nothing
  return null;
};

export default RewardedAdButton;
