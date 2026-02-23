import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

export type SortOption = 'popular' | 'az' | 'za';
export type ViewMode = 'grid' | 'list';

interface SortBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const SortBottomSheet: React.FC<SortBottomSheetProps> = ({
  visible,
  onClose,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
}) => {
  const { t } = useTranslation();
  
  const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: 'popular', label: t('popular', 'Popular') },
    { key: 'az', label: t('sort_az', 'A-Z') },
    { key: 'za', label: t('sort_za', 'Z-A') },
  ];
  
  const handleSortSelect = (option: SortOption) => {
    onSortChange(option);
    onClose(); // Close modal after selection
  };

  const handleViewModeSelect = (mode: ViewMode) => {
    onViewModeChange(mode);
    // Don't close modal for view mode change - user might want to change sort too
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle Bar */}
          <View style={styles.handleBarContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Sort Options */}
          <View style={styles.sortOptions}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortRow}
                onPress={() => handleSortSelect(option.key)}
                activeOpacity={0.7}
                data-testid={`sort-option-${option.key}`}
              >
                <Text style={styles.sortLabel}>{option.label}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    sortOption === option.key && styles.radioOuterSelected,
                  ]}
                >
                  {sortOption === option.key && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* View Mode Toggle */}
          <View style={styles.viewModeContainer}>
            <Text style={styles.viewModeLabel}>{t('grid', 'Grid')}</Text>
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'grid' && styles.viewModeButtonActive,
                ]}
                onPress={() => handleViewModeSelect('grid')}
                data-testid="view-mode-grid"
              >
                <Ionicons
                  name="grid"
                  size={20}
                  color={viewMode === 'grid' ? colors.accentPink : colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'list' && styles.viewModeButtonActive,
                ]}
                onPress={() => handleViewModeSelect('list')}
                data-testid="view-mode-list"
              >
                <Ionicons
                  name="menu"
                  size={22}
                  color={viewMode === 'list' ? colors.accentPink : colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: borderRadius.full,
  },
  sortOptions: {
    paddingHorizontal: spacing.lg,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  sortLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accentPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.accentPink,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentPink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  viewModeLabel: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fonts.bold,
    color: colors.text,
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  viewModeButton: {
    padding: spacing.sm,
  },
  viewModeButtonActive: {
    // Active state styling handled by icon color
  },
});

export default SortBottomSheet;
