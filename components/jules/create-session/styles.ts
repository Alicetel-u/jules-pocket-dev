import { StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  containerDark: {
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: Spacing.lg,
  },
  errorBanner: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.light.shadowLight,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerDark: {
    backgroundColor: Colors.dark.shadowLight,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 13,
    flex: 1,
  },
  errorClose: {
    color: Colors.light.error,
    fontSize: 18,
    fontWeight: '700',
    paddingLeft: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.icon,
  },
  labelDark: {
    color: Colors.dark.icon,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  charCounter: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  charCounterDark: {
    color: Colors.dark.tabIconDefault,
  },
  selectButton: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonDark: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  selectButtonText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  selectButtonTextDark: {
    color: Colors.dark.text,
  },
  placeholderText: {
    color: Colors.light.tabIconDefault,
  },
  sourceList: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    overflow: 'hidden',
    maxHeight: 300,
  },
  repoSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surfaceSecondary,
  },
  repoSearchContainerDark: {
    borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.dark.surfaceSecondary,
  },
  repoSearchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.icon,
    paddingVertical: 0,
  },
  repoSearchInputDark: {
    color: Colors.dark.icon,
  },
  sourceListDark: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  sourceItemDark: {
    borderBottomColor: Colors.dark.border,
  },
  sourceItemSelected: {
    backgroundColor: Colors.light.shadowLight,
  },
  sourceItemText: {
    fontSize: 14,
    color: Colors.light.icon,
    flex: 1,
  },
  sourceItemTextDark: {
    color: Colors.dark.text,
  },
  sourceItemTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: Spacing.xs,
  },
  hintDark: {
    color: Colors.dark.tabIconDefault,
  },
  textArea: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 15,
    color: Colors.light.text,
    height: 120,
  },
  textAreaDark: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
  },
  createButton: {
    borderRadius: Radius.lg,
    marginTop: Spacing.xxl,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.light.border,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Spacing.lg,
  },
  createButtonDisabled: {
    shadowOpacity: 0,
  },
  createButtonText: {
    color: Colors.light.surface,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  createButtonTextDisabled: {
    color: Colors.light.tabIconDefault,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  loadingMoreText: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  loadingMoreTextDark: {
    color: Colors.dark.icon,
  },
  endOfList: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  endOfListText: {
    fontSize: 11,
    color: Colors.light.tabIconDefault,
  },
  endOfListTextDark: {
    color: Colors.dark.tabIconDefault,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionHeaderDark: {
    backgroundColor: Colors.dark.surfaceSecondary,
    borderBottomColor: Colors.dark.border,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.icon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderTextDark: {
    color: Colors.dark.icon,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modeButton: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    padding: 14,
    gap: Spacing.sm,
  },
  modeButtonDark: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  modeButtonSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.shadowLight,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.icon,
  },
  modeTitleDark: {
    color: Colors.dark.icon,
  },
  modeTitleSelected: {
    color: Colors.light.primary,
  },
  modeDesc: {
    fontSize: 12,
    color: Colors.light.icon,
    lineHeight: 16,
  },
  modeDescDark: {
    color: Colors.dark.icon,
  },
  modeDescSelected: {
    color: Colors.light.primaryLight,
  },
});
