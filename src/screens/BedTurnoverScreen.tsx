import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { Checkbox } from '../components/Checkbox';
import { UserSessionData } from '../services/authService';

interface BedTurnoverScreenProps {
  sessionData: UserSessionData;
  onBack: () => void;
}

interface HousekeepingBed {
  id: string;
  bedNo: string;
  floorInfo: string;
  wardType: string;
  origin: string;
  intimationNo: string;
  genderType: string;
  pendingText: string;
  status: 'UNCLEANED' | 'CLEANED';
  wardCategory: '3rd Floor' | '4th Floor' | '5th Floor' | '2nd Floor';
  bedCategory: 'Double Occ' | 'General Ward' | 'Special';
}

export const BedTurnoverScreen = ({ sessionData, onBack }: BedTurnoverScreenProps) => {
  const insets = useSafeAreaInsets();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'Pending' | 'Cleaned'>('Pending');
  
  // Dropdown filter states
  const [selectedWard, setSelectedWard] = useState<string>('All');
  const [selectedBedType, setSelectedBedType] = useState<string>('All');
  const [showWardMenu, setShowWardMenu] = useState(false);
  const [showBedTypeMenu, setShowBedTypeMenu] = useState(false);

  // Beds data
  const [beds, setBeds] = useState<HousekeepingBed[]>([
    {
      id: '1',
      bedNo: 'Bed 305A',
      floorInfo: 'DOUBLE OCC.-3RD FLR.',
      wardType: 'DOUBLE OCC (N)',
      origin: 'DISCHARGE',
      intimationNo: '',
      genderType: 'ALL',
      pendingText: 'Pending 1 Day 0 hours',
      status: 'UNCLEANED',
      wardCategory: '3rd Floor',
      bedCategory: 'Double Occ',
    },
    {
      id: '2',
      bedNo: 'Bed 517C',
      floorInfo: 'NEW GENERAL WARD - 5TH FLR.',
      wardType: 'GENERAL WARD (N)',
      origin: 'DISCHARGE',
      intimationNo: '',
      genderType: 'ALL',
      pendingText: 'Pending 1 Day 14 hours',
      status: 'UNCLEANED',
      wardCategory: '5th Floor',
      bedCategory: 'General Ward',
    },
    {
      id: '3',
      bedNo: 'Bed 418A',
      floorInfo: 'DOUBLE OCC - 4TH FLR.',
      wardType: 'DOUBLE OCC (N)',
      origin: 'DISCHARGE',
      intimationNo: '',
      genderType: 'ALL',
      pendingText: 'Pending 2 Days 1 hour',
      status: 'UNCLEANED',
      wardCategory: '4th Floor',
      bedCategory: 'Double Occ',
    },
    {
      id: '4',
      bedNo: 'Bed 102B',
      floorInfo: 'SPECIAL WARD - 2ND FLR.',
      wardType: 'SPECIAL (N)',
      origin: 'DISCHARGE',
      intimationNo: '11029',
      genderType: 'FEMALE',
      pendingText: 'Cleaned Today at 10:45 AM',
      status: 'CLEANED',
      wardCategory: '2nd Floor',
      bedCategory: 'Special',
    },
  ]);

  // Selected bed IDs for bulk actions
  const [selectedBedIds, setSelectedBedIds] = useState<Record<string, boolean>>({});

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showCustomAlert = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
    });
  };

  // Filter list
  const pendingBeds = beds.filter(b => b.status === 'UNCLEANED');
  const cleanedBeds = beds.filter(b => b.status === 'CLEANED');

  const visibleBeds = (activeTab === 'Pending' ? pendingBeds : cleanedBeds).filter(b => {
    const matchesWard = selectedWard === 'All' || b.wardCategory === selectedWard;
    const matchesBedType = selectedBedType === 'All' || b.bedCategory === selectedBedType;
    return matchesWard && matchesBedType;
  });

  // Select all functionality (only for visible pending beds)
  const isAllSelected = visibleBeds.length > 0 && visibleBeds.every(b => selectedBedIds[b.id]);
  const handleSelectAll = (checked: boolean) => {
    const updated = { ...selectedBedIds };
    visibleBeds.forEach(b => {
      if (checked) {
        updated[b.id] = true;
      } else {
        delete updated[b.id];
      }
    });
    setSelectedBedIds(updated);
  };

  const toggleSelectBed = (id: string, checked: boolean) => {
    const updated = { ...selectedBedIds };
    if (checked) {
      updated[id] = true;
    } else {
      delete updated[id];
    }
    setSelectedBedIds(updated);
  };

  // Mark selected as cleaned
  const handleMarkCleanedBulk = () => {
    const selectedIds = Object.keys(selectedBedIds).filter(id => selectedBedIds[id]);
    if (selectedIds.length === 0) {
      showCustomAlert('Housekeeping', 'Please select at least one bed to mark as cleaned.', 'warning');
      return;
    }

    setBeds(prev => prev.map(b => {
      if (selectedIds.includes(b.id)) {
        return {
          ...b,
          status: 'CLEANED',
          pendingText: `Cleaned Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        };
      }
      return b;
    }));

    setSelectedBedIds({});
    showCustomAlert('Success', `${selectedIds.length} bed(s) successfully marked as cleaned!`, 'success');
  };

  const handleMarkCleanedSingle = (id: string) => {
    setBeds(prev => prev.map(b => {
      if (b.id === id) {
        return {
          ...b,
          status: 'CLEANED',
          pendingText: `Cleaned Today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        };
      }
      return b;
    }));

    const updated = { ...selectedBedIds };
    delete updated[id];
    setSelectedBedIds(updated);

    showCustomAlert('Success', 'Bed successfully marked as cleaned!', 'success');
  };

  const handleUpdateIntimation = (id: string, value: string) => {
    setBeds(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, intimationNo: value };
      }
      return b;
    }));

    // Auto mark/unmark checkbox based on value being non-empty
    setSelectedBedIds(prev => {
      const updated = { ...prev };
      if (value.trim() !== '') {
        updated[id] = true;
      } else {
        delete updated[id];
      }
      return updated;
    });
  };

  const countSelected = Object.keys(selectedBedIds).filter(id => selectedBedIds[id]).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >

      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.backBtn}
            onPress={onBack}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerSubtitle}>HOUSEKEEPING</Text>
            <Text style={styles.headerTitle}>Bed Turnover</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Metrics Cards */}
        <View style={styles.metricsRow}>
          {/* Pending Card */}
          <View style={styles.metricCardWrapper}>
            <Text style={styles.groupLabel}>AWAITING</Text>
            <View style={[styles.metricCard, styles.pendingBorder]}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.metricIconCircle, styles.pendingBg]}>
                  <Text style={styles.clockIcon}>🕒</Text>
                </View>
                <Text style={styles.metricNumber}>{pendingBeds.length}</Text>
              </View>
              <Text style={styles.metricLabel}>Pending cleaning</Text>
            </View>
          </View>

          {/* Cleaned Card */}
          <View style={styles.metricCardWrapper}>
            <Text style={styles.groupLabel}>TODAY</Text>
            <View style={[styles.metricCard, styles.cleanedBorder]}>
              <View style={styles.metricCardHeader}>
                <View style={[styles.metricIconCircle, styles.cleanedBg]}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <Text style={styles.metricNumber}>{cleanedBeds.length}</Text>
              </View>
              <Text style={styles.metricLabel}>Cleaned & ready</Text>
            </View>
          </View>
        </View>

        {/* Dropdown Filters Row */}
        <View style={styles.filtersRow}>
          {/* Ward Filter */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.dropdownBtn}
              onPress={() => {
                setShowWardMenu(!showWardMenu);
                setShowBedTypeMenu(false);
              }}
            >
              <Text style={styles.dropdownBtnText}>Ward: {selectedWard}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showWardMenu && (
              <View style={styles.dropdownMenu}>
                {['All', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'].map(w => (
                  <TouchableOpacity
                    key={w}
                    style={styles.menuItem}
                    onPress={() => {
                      setSelectedWard(w);
                      setShowWardMenu(false);
                    }}
                  >
                    <Text style={[styles.menuItemText, selectedWard === w && styles.menuItemTextActive]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Bed Type Filter */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.dropdownBtn}
              onPress={() => {
                setShowBedTypeMenu(!showBedTypeMenu);
                setShowWardMenu(false);
              }}
            >
              <Text style={styles.dropdownBtnText}>Bed Type: {selectedBedType}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showBedTypeMenu && (
              <View style={styles.dropdownMenu}>
                {['All', 'Double Occ', 'General Ward', 'Special'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={styles.menuItem}
                    onPress={() => {
                      setSelectedBedType(t);
                      setShowBedTypeMenu(false);
                    }}
                  >
                    <Text style={[styles.menuItemText, selectedBedType === t && styles.menuItemTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Tab Toggle Row */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabToggleBtn, activeTab === 'Pending' && styles.tabToggleBtnActive]}
            onPress={() => {
              setActiveTab('Pending');
              setSelectedBedIds({});
            }}
          >
            <Text style={[styles.tabToggleText, activeTab === 'Pending' && styles.tabToggleTextActive]}>
              Pending Cleaning
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabToggleBtn, activeTab === 'Cleaned' && styles.tabToggleBtnActive]}
            onPress={() => {
              setActiveTab('Cleaned');
              setSelectedBedIds({});
            }}
          >
            <Text style={[styles.tabToggleText, activeTab === 'Cleaned' && styles.tabToggleTextActive]}>
              Cleaned Today
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Header Info */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.bedsCountText}>
            {visibleBeds.length} bed{visibleBeds.length !== 1 ? 's' : ''}
          </Text>
          {activeTab === 'Pending' && visibleBeds.length > 0 && (
            <View style={styles.selectAllContainer}>
              <Checkbox checked={isAllSelected} onChange={handleSelectAll} label="Select all" />
            </View>
          )}
        </View>

        {/* Beds Grid / List */}
        {visibleBeds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No beds match the selected filters.</Text>
          </View>
        ) : (
          visibleBeds.map(bed => (
            <View key={bed.id} style={styles.bedCard}>
              <View style={styles.cardLayoutRow}>
                {/* Left Checkbox (only for Pending uncleaned beds) */}
                {bed.status === 'UNCLEANED' && (
                  <View style={styles.cardCheckboxContainer}>
                    <Checkbox
                      checked={!!selectedBedIds[bed.id]}
                      onChange={(checked) => toggleSelectBed(bed.id, checked)}
                      label=""
                    />
                  </View>
                )}

                {/* Right Card details */}
                <View style={styles.cardMainDetails}>
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.cardBedNo}>{bed.bedNo}</Text>
                      <Text style={styles.cardFloorInfo}>{bed.floorInfo}</Text>
                    </View>
                    <View style={[styles.statusTag, bed.status === 'CLEANED' ? styles.statusTagCleaned : styles.statusTagUncleaned]}>
                      <Text style={[styles.statusTagText, bed.status === 'CLEANED' ? styles.statusTagTextCleaned : styles.statusTagTextUncleaned]}>
                        {bed.status}
                      </Text>
                    </View>
                  </View>

                  {/* 2x2 Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Bed type</Text>
                      <Text style={styles.gridValue}>{bed.wardType}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Origin</Text>
                      <Text style={styles.gridValue}>{bed.origin}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Intimation no.</Text>
                      {bed.status === 'UNCLEANED' ? (
                        <TextInput
                          style={styles.gridInput}
                          value={bed.intimationNo}
                          onChangeText={(text) => handleUpdateIntimation(bed.id, text)}
                          placeholder="Enter no."
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                        />
                      ) : (
                        <Text style={styles.gridValue}>{bed.intimationNo || '—'}</Text>
                      )}
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Gender type</Text>
                      <Text style={styles.gridValue}>{bed.genderType}</Text>
                    </View>
                  </View>

                  {/* Card Footer Divider */}
                  <View style={styles.cardDivider} />

                  {/* Card Footer Row */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.pendingTimeText}>{bed.pendingText}</Text>
                    {bed.status === 'UNCLEANED' && (
                      <TouchableOpacity 
                        activeOpacity={0.7} 
                        onPress={() => handleMarkCleanedSingle(bed.id)}
                      >
                        <Text style={styles.markCleanedLink}>Mark Cleaned</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.bulkActionBtn, countSelected === 0 && styles.bulkActionBtnDisabled]}
          onPress={handleMarkCleanedBulk}
          disabled={countSelected === 0}
        >
          <Text style={styles.bulkActionBtnText}>✓ Mark Cleaned ( {countSelected} )</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.7} 
          style={styles.exitBtn}
          onPress={onBack}
        >
          <Text style={styles.exitBtnText}>Exit</Text>
        </TouchableOpacity>
      {/* Custom Themed Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[
              styles.modalIconCircle,
              alertConfig.type === 'success' && styles.bgSuccess,
              alertConfig.type === 'warning' && styles.bgWarning,
              alertConfig.type === 'info' && styles.bgInfo
            ]}>
              <Text style={styles.modalIcon}>
                {alertConfig.type === 'success' ? '✓' : alertConfig.type === 'warning' ? '⚠' : 'ℹ'}
              </Text>
            </View>
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={styles.modalText}>{alertConfig.message}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalCloseBtn}
              onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalCloseBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  header: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  backArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: -2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 24, // balance arrow offset
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primaryLight,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 5,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  hospitalInfo: {
    color: THEME.colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // space for sticky footer
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCardWrapper: {
    width: '48%',
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  pendingBorder: {
    borderColor: 'rgba(234, 179, 8, 0.15)',
  },
  cleanedBorder: {
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBg: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
  },
  cleanedBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  clockIcon: {
    fontSize: 14,
    color: '#eab308',
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: '#22c55e',
  },
  metricNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 10, // overlay menus on scroll
  },
  dropdownContainer: {
    width: '48%',
    position: 'relative',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownArrow: {
    fontSize: 8,
    color: '#64748b',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 50,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabToggleBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabToggleTextActive: {
    color: '#ffffff',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  bedsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  bedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardLayoutRow: {
    flexDirection: 'row',
  },
  cardCheckboxContainer: {
    marginRight: 12,
    paddingTop: 4,
  },
  cardMainDetails: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardBedNo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardFloorInfo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagUncleaned: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  statusTagCleaned: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTagTextUncleaned: {
    color: '#ea580c',
  },
  statusTagTextCleaned: {
    color: '#16a34a',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  gridInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    height: 28,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
    paddingVertical: 0, // fix android input offset
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTimeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  markCleanedLink: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bulkActionBtn: {
    flex: 2,
    marginRight: 12,
    backgroundColor: '#0d9488', // Teal-green
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkActionBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  bulkActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  exitBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bgSuccess: {
    backgroundColor: '#dcfce7',
  },
  bgWarning: {
    backgroundColor: '#fef9c3',
  },
  bgInfo: {
    backgroundColor: '#e0f2fe',
  },
  modalIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalCloseBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
