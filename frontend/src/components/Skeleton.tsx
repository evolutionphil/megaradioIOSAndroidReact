import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Basic Skeleton component with shimmer effect
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: typeof width === 'number' ? width : width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
};

// Station Card Skeleton
export const StationCardSkeleton: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ 
  size = 'medium' 
}) => {
  const dimensions = {
    small: { width: 80, height: 80, imageSize: 60 },
    medium: { width: 120, height: 140, imageSize: 100 },
    large: { width: 150, height: 170, imageSize: 130 },
  };
  
  const { width, height, imageSize } = dimensions[size];

  return (
    <View style={[styles.stationCard, { width }]}>
      <Skeleton width={imageSize} height={imageSize} borderRadius={12} />
      <Skeleton width="90%" height={14} style={{ marginTop: 8 }} />
      <Skeleton width="60%" height={12} style={{ marginTop: 4 }} />
    </View>
  );
};

// Genre Card Skeleton
export const GenreCardSkeleton: React.FC = () => (
  <View style={styles.genreCard}>
    <Skeleton width="100%" height={100} borderRadius={12} />
  </View>
);

// User Item Skeleton
export const UserItemSkeleton: React.FC = () => (
  <View style={styles.userItem}>
    <Skeleton width={52} height={52} borderRadius={26} />
    <View style={styles.userInfo}>
      <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
      <Skeleton width={80} height={12} />
    </View>
    <Skeleton width={80} height={36} borderRadius={18} />
  </View>
);

// Notification Item Skeleton
export const NotificationItemSkeleton: React.FC = () => (
  <View style={styles.notificationItem}>
    <Skeleton width={48} height={48} borderRadius={24} />
    <View style={styles.notificationContent}>
      <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="50%" height={12} style={{ marginBottom: 4 }} />
      <Skeleton width={60} height={10} />
    </View>
  </View>
);

// Station List Item Skeleton
export const StationListItemSkeleton: React.FC = () => (
  <View style={styles.stationListItem}>
    <Skeleton width={56} height={56} borderRadius={8} />
    <View style={styles.stationListInfo}>
      <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
      <Skeleton width="40%" height={12} />
    </View>
    <Skeleton width={36} height={36} borderRadius={18} />
  </View>
);

// Full Section Skeleton (for home page sections)
export const SectionSkeleton: React.FC<{ 
  title?: boolean; 
  itemCount?: number;
  horizontal?: boolean;
}> = ({ 
  title = true, 
  itemCount = 4,
  horizontal = true
}) => (
  <View style={styles.section}>
    {title && (
      <View style={styles.sectionHeader}>
        <Skeleton width={150} height={20} />
        <Skeleton width={60} height={16} />
      </View>
    )}
    <View style={horizontal ? styles.horizontalList : styles.verticalList}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <StationCardSkeleton key={i} />
      ))}
    </View>
  </View>
);

// Genre Grid Skeleton
export const GenreGridSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <View style={styles.genreGrid}>
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={styles.genreRow}>
        <GenreCardSkeleton />
        <GenreCardSkeleton />
      </View>
    ))}
  </View>
);

// Discover Page Skeleton
export const DiscoverSkeleton: React.FC = () => (
  <View style={styles.discoverContainer}>
    <View style={styles.discoverHeader}>
      <View>
        <Skeleton width={100} height={24} style={{ marginBottom: 4 }} />
        <Skeleton width={180} height={14} />
      </View>
      <Skeleton width={44} height={44} borderRadius={22} />
    </View>
    
    {/* Genre pills */}
    <View style={styles.pillsRow}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} width={70} height={32} borderRadius={16} style={{ marginRight: 8 }} />
      ))}
    </View>
    
    {/* Genre cards */}
    <GenreGridSkeleton rows={4} />
  </View>
);

// Profile Skeleton
export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profileContainer}>
    <Skeleton width={100} height={100} borderRadius={50} style={{ alignSelf: 'center' }} />
    <Skeleton width={150} height={20} style={{ alignSelf: 'center', marginTop: 12 }} />
    <Skeleton width={100} height={14} style={{ alignSelf: 'center', marginTop: 6 }} />
    
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Skeleton width={40} height={20} />
        <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.statItem}>
        <Skeleton width={40} height={20} />
        <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.statItem}>
        <Skeleton width={40} height={20} />
        <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
  stationCard: {
    marginRight: 12,
    alignItems: 'center',
  },
  genreCard: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 14,
  },
  stationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stationListInfo: {
    flex: 1,
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  verticalList: {
    paddingHorizontal: 16,
  },
  genreGrid: {
    paddingHorizontal: 12,
  },
  genreRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  discoverContainer: {
    flex: 1,
    paddingTop: 16,
  },
  discoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  profileContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
});

export default Skeleton;
