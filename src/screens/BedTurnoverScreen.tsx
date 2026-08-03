import React, { useState, useEffect } from 'react';
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
import { trackerService } from '../services/trackerService';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SubModuleItem } from './SubModuleSelectionScreen';
import { SearchIcon } from '../components/Icons';

interface BedTurnoverScreenProps {
  sessionData: UserSessionData;
  onBack: () => void;
  visible?: boolean;
  selectedSubModule: SubModuleItem | null;
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
  rawItem?: any;
}

export const BedTurnoverScreen = ({ sessionData, onBack, visible, selectedSubModule }: BedTurnoverScreenProps) => {
  const insets = useSafeAreaInsets();
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'Pending' | 'Cleaned'>('Pending');
  
  // Ward bottom sheet state
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState<{ Cd: number; Dcd: string | null } | null>(null);
  const [showWardModal, setShowWardModal] = useState(false);
  const [wardSearchQuery, setWardSearchQuery] = useState('');

  // Bed Type bottom sheet state
  interface BedTypeItem {
    bed_typ_cd: number;
    bed_typ_dcd: string | null;
  }
  const [bedTypes, setBedTypes] = useState<BedTypeItem[]>([]);
  const [selectedBedType, setSelectedBedType] = useState<{ Cd: number; Dcd: string | null } | null>(null);
  const [showBedTypeModal, setShowBedTypeModal] = useState(false);
  const [bedTypeSearchQuery, setBedTypeSearchQuery] = useState('');

  const [beds, setBeds] = useState<HousekeepingBed[]>([]);
  const [isLoadingBeds, setIsLoadingBeds] = useState(true);
  const [userRights, setUserRights] = useState<{
    access: boolean;
    Save: boolean;
    Delete: boolean;
    Print: boolean;
    Authorise: boolean;
  }>({
    access: true,
    Save: true,
    Delete: true,
    Print: true,
    Authorise: true
  });

  const mapApiBedToHousekeepingBed = (item: any, isCleaned: boolean): HousekeepingBed => {
    const id = String(item?.RowNumber || item?.BedNo || Math.random());
    
    let wardCategory: '3rd Floor' | '4th Floor' | '5th Floor' | '2nd Floor' = '3rd Floor';
    const wrdUpper = (item?.WrdDcd || '').toUpperCase();
    if (wrdUpper.includes('2ND') || item?.FlrNo === 2) wardCategory = '2nd Floor';
    else if (wrdUpper.includes('3RD') || item?.FlrNo === 3) wardCategory = '3rd Floor';
    else if (wrdUpper.includes('4TH') || item?.FlrNo === 4) wardCategory = '4th Floor';
    else if (wrdUpper.includes('5TH') || item?.FlrNo === 5) wardCategory = '5th Floor';

    let bedCategory: 'Double Occ' | 'General Ward' | 'Special' = 'General Ward';
    const dcdUpper = (item?.bedtypdcd || '').toUpperCase();
    if (dcdUpper.includes('DOUBLE')) bedCategory = 'Double Occ';
    else if (dcdUpper.includes('SINGLE') || dcdUpper.includes('ICU') || dcdUpper.includes('NICU') || dcdUpper.includes('SPECIAL')) bedCategory = 'Special';

    let genderType = 'ALL';
    if (item?.PtnSexFlg === 'B') genderType = 'ALL';
    else if (item?.PtnSexFlg === 'M') genderType = 'MALE';
    else if (item?.PtnSexFlg === 'F') genderType = 'FEMALE';
    else if (item?.PtnSexFlg) genderType = item.PtnSexFlg;

    let pendingText = '';
    if (isCleaned) {
      const cleanTime = item?.CleanDt && item.CleanDt !== '1900-01-01T00:00:00'
        ? new Date(item.CleanDt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '10:45 AM';
      pendingText = `Cleaned Today at ${cleanTime}`;
    } else {
      const daysDiff = Math.floor(item?.datehourdiff || 0);
      const hoursDiff = Math.round(((item?.datehourdiff || 0) - daysDiff) * 24);
      if (daysDiff > 0) {
        pendingText = `Pending ${daysDiff} Day${daysDiff !== 1 ? 's' : ''} ${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''}`;
      } else {
        pendingText = `Pending ${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''}`;
      }
    }

    return {
      id,
      bedNo: item?.BedNo || `Bed ${item?.BedTypCd || ''}`,
      floorInfo: item?.WrdDcd || '-',
      wardType: item?.bedtypdcd || '-',
      origin: item?.ReqSource || '-',
      intimationNo: item?.IntimationNo || '',
      genderType,
      pendingText,
      status: isCleaned ? 'CLEANED' : 'UNCLEANED',
      wardCategory,
      bedCategory,
      rawItem: item,
    };
  };

  const fetchBedData = async () => {
    setIsLoadingBeds(true);
    try {
      console.log('Fetching Pending Cleaning and Cleaned Today beds...');
      const cocd = sessionData.coCd || "1";
      const div = sessionData.div || 1;
      const loc = sessionData.loc || 1;

      // Fetch Pending Beds (bedStsCd = 7)
      const pendingRes = await trackerService.getBedsWithParam(sessionData.token, {
        cocd,
        div,
        loc,
        bedStsCd: 7
      });

      // Fetch Cleaned Beds (bedStsCd = 1)
      const cleanedRes = await trackerService.getBedsWithParam(sessionData.token, {
        cocd,
        div,
        loc,
        bedStsCd: 1
      });

      const mappedPending: HousekeepingBed[] = [];
      if (pendingRes && pendingRes.success && pendingRes.data && Array.isArray(pendingRes.data.beds)) {
        pendingRes.data.beds.forEach((item: any) => {
          mappedPending.push(mapApiBedToHousekeepingBed(item, false));
        });
      }

      const mappedCleaned: HousekeepingBed[] = [];
      if (cleanedRes && cleanedRes.success && cleanedRes.data && Array.isArray(cleanedRes.data.beds)) {
        cleanedRes.data.beds.forEach((item: any) => {
          mappedCleaned.push(mapApiBedToHousekeepingBed(item, true));
        });
      }

      console.log(`Beds loaded. Pending: ${mappedPending.length}, Cleaned: ${mappedCleaned.length}`);
      setBeds([...mappedPending, ...mappedCleaned]);
    } catch (err) {
      console.warn('Failed to load Bed Turnover list data:', err);
    } finally {
      setIsLoadingBeds(false);
    }
  };

  const initData = async (isBackground: boolean = false) => {
    if (!isBackground) {
      setIsLoadingBeds(true);
    }
    try {
      const modCd = selectedSubModule?.ModCd ?? 490;
      const subModCd = 1384; // Bed Turnover module code is always 1384
      console.log(`Checking user rights for Bed Turnover module... ModCd: ${modCd}, SubModCd: ${subModCd}`);
      const rightsRes = await trackerService.checkUserRights(
        sessionData.token,
        sessionData.userId,
        modCd,
        subModCd
      );
      console.log('checkUserRights API Response:', JSON.stringify(rightsRes, null, 2));
      if (rightsRes && rightsRes.success && rightsRes.data) {
        console.log('Loaded user rights:', rightsRes.data);
        const hasAccess = rightsRes.data.access !== false;
        setUserRights({
          access: hasAccess,
          Save: rightsRes.data.Save !== false,
          Delete: rightsRes.data.Delete !== false,
          Print: rightsRes.data.Print !== false,
          Authorise: rightsRes.data.Authorise !== false,
        });
        if (!hasAccess) {
          Alert.alert(
            'Access Denied',
            'You do not have permission to access the Bed Turnover module.',
            [{ text: 'OK', onPress: () => onBack() }]
          );
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load user rights, allowing access by default:', err);
    }

    try {
      console.log('Fetching Wards data for Bed Turnover filters...');
      const cocd = sessionData.coCd || "1";
      const div = sessionData.div || 1;
      const loc = sessionData.loc || 1;
      const resWards = await trackerService.getWardList(
        sessionData.token,
        cocd,
        div,
        loc,
        sessionData.userId
      );
      if (resWards && resWards.success && Array.isArray(resWards.data)) {
        const validWards = resWards.data.filter((w: any) => w.Dcd && w.Dcd.trim().length > 0);
        console.log('Loaded Wards items for Bed Turnover filter:', validWards.length);
        setWards(validWards);
      }
    } catch (err) {
      console.warn('Failed to load Wards data:', err);
    }

    try {
      console.log('Fetching Bed Type Master data for filters...');
      const resBedTypes = await trackerService.getBedTypes(sessionData.token);
      if (resBedTypes && resBedTypes.success && Array.isArray(resBedTypes.data)) {
        const validBedTypes = resBedTypes.data.filter((b: any) => b.bed_typ_dcd && b.bed_typ_dcd.trim().length > 0);
        console.log('Loaded Bed Type Master items for dropdown filter:', validBedTypes.length);
        setBedTypes(validBedTypes);
      }
    } catch (err) {
      console.warn('Failed to load Bed Type Master data:', err);
    }
    
    await fetchBedData();
    setHasLoaded(true);
  };

  useEffect(() => {
    initData(false);
  }, [sessionData, selectedSubModule]);

  useEffect(() => {
    if (visible && hasLoaded) {
      console.log('BedTurnoverScreen became visible, refreshing rights and data in background...');
      initData(true);
    }
  }, [visible]);

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
    // 1. Matches Ward
    let matchesWard = true;
    if (selectedWard !== null) {
      const selectedDcd = (selectedWard.Dcd || '').toLowerCase();
      const bedWrdDcd = (b.floorInfo || '').toLowerCase();
      const rawWrdCd = b.rawItem?.WrdCd || b.rawItem?.wrd_cd;
      matchesWard = bedWrdDcd.includes(selectedDcd) || (rawWrdCd !== undefined && String(rawWrdCd) === String(selectedWard.Cd));
    }

    // 2. Matches Bed Type
    let matchesBedType = true;
    if (selectedBedType !== null) {
      const selectedDcd = (selectedBedType.Dcd || '').toLowerCase();
      const bedTypDcd = (b.wardType || '').toLowerCase();
      const rawBedTypCd = b.rawItem?.BedTypCd || b.rawItem?.bed_typ_cd;
      matchesBedType = bedTypDcd.includes(selectedDcd) || (rawBedTypCd !== undefined && String(rawBedTypCd) === String(selectedBedType.Cd));
    }

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
  const handleMarkCleanedBulk = async () => {
    const selectedIds = Object.keys(selectedBedIds).filter(id => selectedBedIds[id]);
    if (selectedIds.length === 0) {
      showCustomAlert('Housekeeping', 'Please select at least one bed to mark as cleaned.', 'warning');
      return;
    }

    // Filter beds that are selected and validate that they have a valid intimation number
    const selectedBeds = beds.filter(b => selectedIds.includes(b.id));
    const invalidBeds = selectedBeds.filter(b => !b.intimationNo || !b.intimationNo.trim() || isNaN(parseInt(b.intimationNo, 10)));
    
    if (invalidBeds.length > 0) {
      const invalidNames = invalidBeds.map(b => b.bedNo).join(', ');
      showCustomAlert('Warning', `Please enter a valid Intimation no. for: ${invalidNames}`, 'warning');
      return;
    }

    try {
      setIsLoadingBeds(true);
      
      // Perform API calls for all selected beds
      for (const bed of selectedBeds) {
        const raw = bed.rawItem || {};
        const reqNo = raw.ReqNo || 0;
        const ipNo = raw.IpNo || 0;
        const docCd = raw.DocCd || 0;
        const bedNo = raw.BedNo || bed.bedNo;

        const now = new Date();
        const pad = (n: number, m = 2) => String(n).padStart(m, '0');
        const updtDtTm = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

        const payload = {
          cocd: sessionData.coCd || "1",
          div: sessionData.div || 1,
          loc: sessionData.loc || 1,
          bedNo: bedNo,
          reqNo: reqNo,
          ipNo: ipNo,
          updateType: 2,
          refNo: bed.intimationNo,
          docCd: docCd,
          bedStsCd: 1,
          updtDtTm: updtDtTm,
          updtUsrId: sessionData.userId || raw.UpdtUsrId || "SSSL",
        };

        console.log('====================================');
        console.log(`Calling changeBedStatus (Bulk) for bed ${bed.bedNo}:`);
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('====================================');

        await trackerService.changeBedStatus(sessionData.token, payload);
      }

      setSelectedBedIds({});
      
      // Fetch fresh response from API only (no dummy response update)
      await fetchBedData();

      showCustomAlert('Success', `${selectedIds.length} bed(s) successfully marked as cleaned!`, 'success');
    } catch (err: any) {
      console.warn('API Error in Bulk changeBedStatus:', err);
      showCustomAlert('Error', err.message || 'An error occurred while changing bed status.', 'warning');
    } finally {
      setIsLoadingBeds(false);
    }
  };

  const handleMarkCleanedSingle = async (id: string) => {
    if (!userRights.Save) {
      showCustomAlert('Access Denied', 'You do not have permission to save changes.', 'warning');
      return;
    }

    const bed = beds.find(b => b.id === id);
    if (!bed) return;

    // Parse the intimation number
    if (!bed.intimationNo || !bed.intimationNo.trim() || isNaN(parseInt(bed.intimationNo, 10))) {
      showCustomAlert('Warning', 'Please enter Intimation no. first.', 'warning');
      return;
    }

    const raw = bed.rawItem || {};
    const reqNo = raw.ReqNo || 0;
    const ipNo = raw.IpNo || 0;
    const docCd = raw.DocCd || 0;
    const bedNo = raw.BedNo || bed.bedNo;

    // Format current date/time to local ISO-like string format: "YYYY-MM-DDTHH:mm:ss.SSS"
    const now = new Date();
    const pad = (n: number, m = 2) => String(n).padStart(m, '0');
    const updtDtTm = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

    const payload = {
      cocd: sessionData.coCd || "1",
      div: sessionData.div || 1,
      loc: sessionData.loc || 1,
      bedNo: bedNo,
      reqNo: reqNo,
      ipNo: ipNo,
      updateType: 2,
      refNo: bed.intimationNo,
      docCd: docCd,
      bedStsCd: 1,
      updtDtTm: updtDtTm,
      updtUsrId: sessionData.userId || raw.UpdtUsrId || "SSSL",
    };

    console.log('====================================');
    console.log('Calling changeBedStatus from BedTurnoverScreen:');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('====================================');

    try {
      setIsLoadingBeds(true);
      const res = await trackerService.changeBedStatus(sessionData.token, payload);
      
      if (res && res.success) {
        const updated = { ...selectedBedIds };
        delete updated[id];
        setSelectedBedIds(updated);

        // Fetch fresh response from API only (no dummy response update)
        await fetchBedData();

        showCustomAlert('Success', res.message || 'Bed successfully marked as cleaned!', 'success');
      } else {
        showCustomAlert('Failure', res?.message || 'Failed to update bed status.', 'warning');
      }
    } catch (err: any) {
      console.warn('API Error in changeBedStatus:', err);
      showCustomAlert('Error', err.message || 'An error occurred while changing bed status.', 'warning');
    } finally {
      setIsLoadingBeds(false);
    }
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

  if (isLoadingBeds) {
    return <LoadingIndicator message="Loading Bed Details." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            <View style={styles.backArrow} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            {/* <Text style={styles.headerSubtitle}>HOUSEKEEPING</Text> */}
            <Text style={styles.headerTitle}>HouseKeeping Bed Turnover</Text>
          </View>
          <View style={styles.liveBadgeAbsolute}>
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
                setWardSearchQuery('');
                setShowWardModal(true);
              }}
            >
              <Text style={styles.dropdownBtnText} numberOfLines={1}>Ward: {selectedWard ? selectedWard.Dcd : 'All'}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Bed Type Filter */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.dropdownBtn}
              onPress={() => {
                setBedTypeSearchQuery('');
                setShowBedTypeModal(true);
              }}
            >
              <Text style={styles.dropdownBtnText} numberOfLines={1}>Bed Type: {selectedBedType ? selectedBedType.Dcd : 'All'}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
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
                          style={[styles.gridInput, !userRights.Save && { backgroundColor: '#e2e8f0', color: '#64748b' }]}
                          value={bed.intimationNo}
                          onChangeText={(text) => handleUpdateIntimation(bed.id, text)}
                          placeholder="Enter no."
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          editable={userRights.Save}
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
                        disabled={!userRights.Save}
                      >
                        <Text style={[styles.markCleanedLink, !userRights.Save && { color: '#94a3b8', opacity: 0.5 }]}>
                          Mark Cleaned
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Custom Themed Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

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

      {/* Ward Selector Bottom Sheet Modal */}
      <Modal
        visible={showWardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWardModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Select Ward</Text>
              <TouchableOpacity
                onPress={() => setShowWardModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.bottomSheetCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Ward Search Input */}
            <View style={styles.bottomSheetSearchWrapper}>
              <SearchIcon color={THEME.colors.textMuted} />
              <TextInput
                style={styles.bottomSheetSearchInput}
                placeholder="Search ward name..."
                placeholderTextColor={THEME.colors.textMuted}
                value={wardSearchQuery}
                onChangeText={setWardSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView 
              style={styles.bottomSheetList} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {wards.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 14, fontWeight: '600' }}>
                    Loading wards list...
                  </Text>
                </View>
              ) : (
                <>
                  {/* Option for All Wards */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.bottomSheetItem,
                      selectedWard === null && styles.bottomSheetItemActive
                    ]}
                    onPress={() => {
                      setSelectedWard(null);
                      setShowWardModal(false);
                    }}
                  >
                    <Text style={[
                      styles.bottomSheetItemText,
                      selectedWard === null && styles.bottomSheetItemTextActive
                    ]}>
                      All Wards
                    </Text>
                    {selectedWard === null && (
                      <Text style={styles.checkmarkIcon}>✓</Text>
                    )}
                  </TouchableOpacity>

                  {/* Filtered ward options */}
                  {wards
                    .filter(w => {
                      if (!wardSearchQuery) return true;
                      return w.Dcd && w.Dcd.toLowerCase().includes(wardSearchQuery.toLowerCase());
                    })
                    .map((w) => {
                      const isSelected = selectedWard?.Cd === w.Cd;
                      return (
                        <TouchableOpacity
                          key={w.Cd}
                          activeOpacity={0.7}
                          style={[
                            styles.bottomSheetItem,
                            isSelected && styles.bottomSheetItemActive
                          ]}
                          onPress={() => {
                            setSelectedWard(w);
                            setShowWardModal(false);
                          }}
                        >
                          <Text style={[
                            styles.bottomSheetItemText,
                            isSelected && styles.bottomSheetItemTextActive
                          ]}>
                            {w.Dcd}
                          </Text>
                          {isSelected && (
                            <Text style={styles.checkmarkIcon}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bed Type Selector Bottom Sheet Modal */}
      <Modal
        visible={showBedTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBedTypeModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Select Bed Type</Text>
              <TouchableOpacity
                onPress={() => setShowBedTypeModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.bottomSheetCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Bed Type Search Input */}
            <View style={styles.bottomSheetSearchWrapper}>
              <SearchIcon color={THEME.colors.textMuted} />
              <TextInput
                style={styles.bottomSheetSearchInput}
                placeholder="Search bed type..."
                placeholderTextColor={THEME.colors.textMuted}
                value={bedTypeSearchQuery}
                onChangeText={setBedTypeSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView 
              style={styles.bottomSheetList} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {bedTypes.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 14, fontWeight: '600' }}>
                    Loading bed types...
                  </Text>
                </View>
              ) : (
                <>
                  {/* Option for All Bed Types */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.bottomSheetItem,
                      selectedBedType === null && styles.bottomSheetItemActive
                    ]}
                    onPress={() => {
                      setSelectedBedType(null);
                      setShowBedTypeModal(false);
                    }}
                  >
                    <Text style={[
                      styles.bottomSheetItemText,
                      selectedBedType === null && styles.bottomSheetItemTextActive
                    ]}>
                      All Bed Types
                    </Text>
                    {selectedBedType === null && (
                      <Text style={styles.checkmarkIcon}>✓</Text>
                    )}
                  </TouchableOpacity>

                  {/* Filtered bed type options */}
                  {bedTypes
                    .filter(t => {
                      const label = t.bed_typ_dcd || '';
                      if (!bedTypeSearchQuery) return true;
                      return label.toLowerCase().includes(bedTypeSearchQuery.toLowerCase());
                    })
                    .map((t) => {
                      const isSelected = selectedBedType?.Cd === t.bed_typ_cd;
                      const label = t.bed_typ_dcd || '';
                      return (
                        <TouchableOpacity
                          key={t.bed_typ_cd}
                          activeOpacity={0.7}
                          style={[
                            styles.bottomSheetItem,
                            isSelected && styles.bottomSheetItemActive
                          ]}
                          onPress={() => {
                            setSelectedBedType({ Cd: t.bed_typ_cd, Dcd: label });
                            setShowBedTypeModal(false);
                          }}
                        >
                          <Text style={[
                            styles.bottomSheetItemText,
                            isSelected && styles.bottomSheetItemTextActive
                          ]}>
                            {label}
                          </Text>
                          {isSelected && (
                            <Text style={styles.checkmarkIcon}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    position: 'relative',
    height: 40,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backArrow: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  liveBadgeAbsolute: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
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
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  bottomSheetCloseText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  bottomSheetSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  bottomSheetSearchInput: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 14,
    color: THEME.colors.textDark,
    height: '100%',
  },
  bottomSheetList: {
    maxHeight: 350,
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bottomSheetItemActive: {
    borderBottomColor: THEME.colors.primary + '33',
  },
  bottomSheetItemText: {
    fontSize: 14.5,
    color: THEME.colors.textDark,
    fontWeight: '500',
    flex: 1,
  },
  bottomSheetItemTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  checkmarkIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginLeft: 8,
  },
});
