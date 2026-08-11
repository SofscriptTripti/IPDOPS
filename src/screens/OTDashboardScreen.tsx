import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { SearchIcon, CalendarIcon, UserIcon, MiniCheckIcon, MiniWarningIcon } from '../components/Icons';
import { UserSessionData } from '../services/authService';
import { trackerService } from '../services/trackerService';
import { LoadingIndicator } from '../components/LoadingIndicator';

interface OTDashboardScreenProps {
  sessionData: UserSessionData;
  onBack: () => void;
  onEditBooking: (item: OtCallRegisterItem) => void;
  refreshSignal?: number;
}

export interface OtCallRegisterItem {
  id: number;
  otBookingDate: string | null;
  actualSurgeryDate: string | null;
  otName: string | null;
  surgeryName: string | null;
  patientName: string | null;
  ageSex: string | null;
  patientNo: string | null;
  fromTime: string | null;
  toTime: string | null;
  surgeonDoctor: string | null;
  robotic: string | null;
  admissionDate: string | null;
  ward: string | null;
  tpaSelf: string | null;
  rescheduleDate: string | null;
  cathlabAdvice: string | null;
  status: string | null;
  cbc: string | null;
  creat: string | null;
  ptInr: string | null;
  vdrlHiv: string | null;
  xray: string | null;
  echo2d: string | null;
  mrsa: string | null;
  bloodThinner: string | null;
  fitness: string | null;
  remark: string | null;
  estimate1: string | null;
  estimate2: string | null;
  estimate3: string | null;
  estimateRemark: string | null;
  clearance: string | null;
}

type StatusFilter = 'All' | 'Open' | 'Closed' | 'Cancelled';
type ClearanceFilter = 'All' | 'Done' | 'NotDone' | 'Blank';

const CHECKLIST_ITEMS: { key: keyof OtCallRegisterItem; label: string }[] = [
  { key: 'cbc', label: 'CBC' },
  { key: 'creat', label: 'Creat' },
  { key: 'ptInr', label: 'PT/INR' },
  { key: 'vdrlHiv', label: 'VDRL/HIV' },
  { key: 'xray', label: 'X-Ray' },
  { key: 'echo2d', label: '2D Echo' },
  { key: 'mrsa', label: 'MRSA' },
  { key: 'bloodThinner', label: 'Blood Thinner' },
  { key: 'fitness', label: 'Fitness' },
];

const parseApiDate = (value: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDMY = (value: string | null): string => {
  const d = parseApiDate(value);
  if (!d) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatShortDate = (value: string | null): string => {
  const d = parseApiDate(value);
  if (!d) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isToday = (value: string | null): boolean => {
  const d = parseApiDate(value);
  if (!d) return false;
  return isSameDay(d, new Date());
};

const formatYMD = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const mapStatusToApi = (filter: StatusFilter): string => {
  if (filter === 'All') return 'ALL';
  return filter.toUpperCase();
};

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();
const firstWeekdayOfMonth = (year: number, month: number): number => new Date(year, month, 1).getDay();
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const OTDashboardScreen = ({ sessionData, onBack, onEditBooking, refreshSignal }: OTDashboardScreenProps) => {
  const insets = useSafeAreaInsets();

  const [records, setRecords] = useState<OtCallRegisterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [clearanceFilter, setClearanceFilter] = useState<ClearanceFilter>('All');

  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonth = now.getMonth();
  const [fromDate, setFromDate] = useState(formatYMD(new Date(calendarYear, calendarMonth, 1)));
  const [toDate, setToDate] = useState(formatYMD(new Date(calendarYear, calendarMonth + 1, 0)));

  const [selectedOt, setSelectedOt] = useState<string | null>(null);
  const [showOtModal, setShowOtModal] = useState(false);

  // Single calendar range picker (From + To in one place), same pattern as the main Dashboard.
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempStartDay, setTempStartDay] = useState<number | null>(1);
  const [tempEndDay, setTempEndDay] = useState<number | null>(daysInMonth(calendarYear, calendarMonth));

  useEffect(() => {
    if (!showCalendar) return;
    const from = parseApiDate(fromDate);
    const to = parseApiDate(toDate);
    const inThisMonth = (d: Date | null) => !!d && d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
    setTempStartDay(inThisMonth(from) ? from!.getDate() : null);
    setTempEndDay(inThisMonth(to) ? to!.getDate() : null);
  }, [showCalendar]);

  const handleCalendarDayPress = (day: number) => {
    if (tempStartDay === null || (tempStartDay !== null && tempEndDay !== null)) {
      setTempStartDay(day);
      setTempEndDay(null);
    } else if (day < tempStartDay) {
      setTempStartDay(day);
    } else {
      setTempEndDay(day);
    }
  };

  // Debounce free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchList = useCallback(async (isBackground: boolean = false) => {
    // Only block the whole screen on the very first load; later fetches
    // (filter changes, pull-to-refresh) update quietly in the background.
    const showFullLoader = !hasLoadedOnceRef.current;
    if (showFullLoader) {
      setIsLoading(true);
    } else if (!isBackground) {
      setIsFetching(true);
    }
    setErrorMessage(null);
    try {
      const res = await trackerService.getOtCallRegisterList(sessionData.token, {
        cocd: sessionData.coCd || '1',
        div: sessionData.div || 1,
        loc: sessionData.loc || 1,
        userId: sessionData.userId,
        fromDate,
        toDate,
        status: mapStatusToApi(statusFilter),
        otName: selectedOt || null,
        search: debouncedSearch || null,
      });
      if (res && res.success && Array.isArray(res.data)) {
        setRecords(res.data);
      } else {
        setErrorMessage(res?.message || 'No OT bookings returned from the server.');
        setRecords([]);
      }
    } catch (err: any) {
      console.warn('Failed to load OT Call Register list:', err);
      setErrorMessage(err?.message || 'Failed to connect to the server.');
      setRecords([]);
    } finally {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
      setIsFetching(false);
      setIsRefreshing(false);
    }
  }, [sessionData, fromDate, toDate, statusFilter, selectedOt, debouncedSearch]);

  useEffect(() => {
    fetchList(false);
  }, [fetchList]);

  // Re-fetch silently after coming back from an edit save (App.tsx bumps refreshSignal).
  useEffect(() => {
    if (refreshSignal === undefined) return;
    if (!hasLoadedOnceRef.current) return;
    fetchList(true);
  }, [refreshSignal]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchList(true);
  };

  const otOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.otName && r.otName.trim()) set.add(r.otName.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  const counts = useMemo(() => {
    const total = records.length;
    const open = records.filter(r => (r.status || '').toUpperCase() === 'OPEN').length;
    const closed = records.filter(r => (r.status || '').toUpperCase() === 'CLOSED').length;
    const cancelled = records.filter(r => (r.status || '').toUpperCase() === 'CANCELLED').length;
    return { total, open, closed, cancelled };
  }, [records]);

  // Status/OT/search/date range are all sent to the server (see fetchList) and
  // come back already filtered. Clearance isn't part of that API's params, so
  // it's the only filter still applied on the client, on top of the server result.
  const filteredRecords = useMemo(() => {
    if (clearanceFilter === 'All') return records;

    return records.filter(r => {
      const clr = (r.clearance || '').trim().toUpperCase();
      if (clearanceFilter === 'Blank') return clr === '';
      if (clearanceFilter === 'Done') return clr === 'Y' || clr === 'YES' || clr === 'DONE';
      if (clearanceFilter === 'NotDone') return clr === 'N' || clr === 'NO' || clr === 'NOT DONE';
      return true;
    });
  }, [records, clearanceFilter]);

  const handleExport = async () => {
    if (filteredRecords.length === 0) {
      return;
    }
    const header = 'Patient Name,Patient No,Ward,OT,Surgery,Surgeon,Date,From,To,Status,Clearance';
    const rows = filteredRecords.map(r => [
      r.patientName || '',
      r.patientNo || '',
      r.ward || '',
      r.otName || '',
      (r.surgeryName || '').replace(/,/g, ';'),
      (r.surgeonDoctor || '').replace(/,/g, ';'),
      formatDMY(r.actualSurgeryDate),
      r.fromTime || '',
      r.toTime || '',
      r.status || '',
      r.clearance || '',
    ].join(','));
    const csv = [header, ...rows].join('\n');

    try {
      await Share.share({
        title: 'OT Call Register',
        message: csv,
      });
    } catch (err) {
      console.warn('Failed to share OT Call Register export:', err);
    }
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading OT Call Register." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />

      {/* Header — same UI as the main Dashboard header */}
      <View style={styles.dashboardHeader}>
        <View style={styles.dashboardHeaderLeft}>
          <View style={styles.dashboardLogoOuter}>
            <Image
              source={require('../../assets/careworksone_logo.png')}
              style={styles.dashboardLogo as any}
              resizeMode="cover"
            />
          </View>
          <View>
            <Text style={styles.dashboardHospitalText} numberOfLines={1}>
              IPD Ops · OT Call Register
            </Text>
            <Text style={styles.dashboardTitleText} numberOfLines={1}>
              {sessionData.companyName || '--'}
            </Text>
          </View>
        </View>

        <View style={styles.dashboardHeaderRight}>
          <TouchableOpacity activeOpacity={0.7} style={styles.profileBadge} onPress={onBack}>
            <View style={styles.backArrow} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Stat cards — same compact card style as the main Dashboard's metric row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { borderColor: THEME.colors.primary }]}>
            <View style={styles.metricCardHeader}>
              <UserIcon color={THEME.colors.textLight} />
              <View style={[styles.metricBadge, { backgroundColor: '#f1f5f9' }]}>
                <Text style={[styles.metricBadgeText, { color: THEME.colors.textLight }]}>ALL</Text>
              </View>
            </View>
            <View style={styles.metricValueBlock}>
              <Text style={styles.metricLabel} numberOfLines={1}>Total</Text>
              <Text style={styles.metricValue}>{counts.total}</Text>
            </View>
          </View>

          <View style={[styles.metricCard, { borderColor: THEME.colors.primary }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.openGlyph}>●</Text>
              <View style={[styles.metricBadge, { backgroundColor: '#e0f2fe' }]}>
                <Text style={[styles.metricBadgeText, { color: '#0284c7' }]} numberOfLines={1}>OPEN</Text>
              </View>
            </View>
            <View style={styles.metricValueBlock}>
              <Text style={styles.metricLabel} numberOfLines={1}>Open</Text>
              <Text style={styles.metricValue}>{counts.open}</Text>
            </View>
          </View>

          <View style={[styles.metricCard, { borderColor: THEME.colors.primary }]}>
            <View style={styles.metricCardHeader}>
              <MiniCheckIcon color={THEME.colors.success} />
              <View style={[styles.metricBadge, { backgroundColor: THEME.colors.successBg }]}>
                <Text style={[styles.metricBadgeText, { color: THEME.colors.success }]} numberOfLines={1}>CLOSED</Text>
              </View>
            </View>
            <View style={styles.metricValueBlock}>
              <Text style={styles.metricLabel} numberOfLines={1}>Closed</Text>
              <Text style={styles.metricValue}>{counts.closed}</Text>
            </View>
          </View>

          <View style={[styles.metricCard, { borderColor: THEME.colors.primary }]}>
            <View style={styles.metricCardHeader}>
              <MiniWarningIcon color={THEME.colors.danger} />
              <View style={[styles.metricBadge, { backgroundColor: THEME.colors.dangerBg }]}>
                <Text style={[styles.metricBadgeText, { color: THEME.colors.danger }]} numberOfLines={1}>CANCELLED</Text>
              </View>
            </View>
            <View style={styles.metricValueBlock}>
              <Text style={styles.metricLabel} numberOfLines={1}>Cancelled</Text>
              <Text style={styles.metricValue}>{counts.cancelled}</Text>
            </View>
          </View>
        </View>

        {/* Section title */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>OT Call Register</Text>
          {isFetching && <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginLeft: 8 }} />}
        </View>
        <Text style={styles.sectionSubtitle}>Track OT bookings and clinical clearance across patients</Text>

        {/* Status filter — separate blocks, same pill style as the main Dashboard's tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusTabsScroll}
          contentContainerStyle={styles.statusTabsScrollContent}
        >
          {([
            { key: 'All', label: 'All', count: counts.total },
            { key: 'Open', label: 'Open', count: counts.open },
            { key: 'Closed', label: 'Closed', count: counts.closed },
            { key: 'Cancelled', label: 'Cancelled', count: counts.cancelled },
          ] as { key: StatusFilter; label: string; count: number }[]).map(tab => {
            const active = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                style={[styles.statusTab, active && styles.statusTabActive]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <Text style={[styles.statusTabText, active && styles.statusTabTextActive]} numberOfLines={1}>
                  {tab.label} {tab.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search + single calendar range picker (like the main Dashboard) */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchWrapper}>
            <SearchIcon color={THEME.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patient no. or name"
              placeholderTextColor={THEME.colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.datePickerBtn}
            onPress={() => setShowCalendar(true)}
          >
            <CalendarIcon color={THEME.colors.textMedium} />
            <Text style={styles.datePickerText} numberOfLines={1}>
              {MONTH_NAMES[calendarMonth]} {String(parseApiDate(fromDate)?.getDate() || 1).padStart(2, '0')}
              –{String(parseApiDate(toDate)?.getDate() || daysInMonth(calendarYear, calendarMonth)).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* OT filter + Export/Print, on one line. Pull down the list to refresh. */}
        <View style={styles.otFilterRow}>
          <TouchableOpacity activeOpacity={0.7} style={styles.otDropdownBtn} onPress={() => setShowOtModal(true)}>
            <Text style={styles.otDropdownText}>OT: {selectedOt || 'All OT'}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.actionLinksRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleExport}>
              <Text style={styles.actionLinkText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleExport}>
              <Text style={styles.actionLinkText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Clearance filter — a colored bordered badge (Yes/No/—) plus a plain label outside it */}
        <View style={styles.clearanceRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.clearanceItem}
            onPress={() => setClearanceFilter(clearanceFilter === 'Done' ? 'All' : 'Done')}
          >
            <View style={[styles.clearanceBadge, styles.clearanceBadgeDone, clearanceFilter === 'Done' && styles.clearanceBadgeDoneActive]}>
              <Text style={[styles.clearanceBadgeTextDone, clearanceFilter === 'Done' && styles.clearanceBadgeTextActive]}>
                Yes
              </Text>
            </View>
            <Text style={styles.clearanceItemLabel} numberOfLines={1}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.clearanceItem}
            onPress={() => setClearanceFilter(clearanceFilter === 'NotDone' ? 'All' : 'NotDone')}
          >
            <View style={[styles.clearanceBadge, styles.clearanceBadgeNotDone, clearanceFilter === 'NotDone' && styles.clearanceBadgeNotDoneActive]}>
              <Text style={[styles.clearanceBadgeTextNotDone, clearanceFilter === 'NotDone' && styles.clearanceBadgeTextActive]}>
                No
              </Text>
            </View>
            <Text style={styles.clearanceItemLabel} numberOfLines={1}>Not done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.clearanceItem}
            onPress={() => setClearanceFilter(clearanceFilter === 'Blank' ? 'All' : 'Blank')}
          >
            <View style={[styles.clearanceBadge, styles.clearanceBadgeBlank, clearanceFilter === 'Blank' && styles.clearanceBadgeBlankActive]}>
              <Text style={[styles.clearanceBadgeTextBlank, clearanceFilter === 'Blank' && styles.clearanceBadgeTextActive]}>
                —
              </Text>
            </View>
            <Text style={styles.clearanceItemLabel} numberOfLines={1}>Blank</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {errorMessage && records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{errorMessage}</Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No OT bookings match the selected filters.</Text>
          </View>
        ) : (
          filteredRecords.map(item => {
            const statusUpper = (item.status || '').toUpperCase();
            const statusColors =
              statusUpper === 'CLOSED'
                ? { bg: 'rgba(34, 197, 94, 0.12)', text: '#16a34a' }
                : statusUpper === 'CANCELLED'
                ? { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626' }
                : statusUpper === 'OPEN'
                ? { bg: 'rgba(0, 123, 191, 0.12)', text: THEME.colors.secondary }
                : { bg: 'rgba(100, 116, 139, 0.12)', text: THEME.colors.textMuted };

            const isCleared = !!(item.clearance && item.clearance.trim());

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => onEditBooking(item)}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardPatientName} numberOfLines={1}>{item.patientName || '--'}</Text>
                  <View style={styles.cardBadgesRow}>
                    {isToday(item.actualSurgeryDate) && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>TODAY</Text>
                      </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>{item.status || '--'}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.cardMetaLine} numberOfLines={1}>
                  No: {item.patientNo || '--'} · Ward: {item.ward || '--'} · OT {item.otName || '--'}
                  {item.ageSex ? ` · ${item.ageSex}` : ''}
                </Text>

                <Text style={styles.cardSurgeryName}>{item.surgeryName || '--'}</Text>

                <View style={styles.cardDoctorRow}>
                  <Text style={styles.cardDoctorText} numberOfLines={1}>
                    DR. {item.surgeonDoctor || '--'} · {item.fromTime || '--:--'} – {item.toTime || '--:--'}
                  </Text>
                  <Text style={styles.cardDateText}>{formatShortDate(item.actualSurgeryDate)}</Text>
                </View>

                <View style={styles.chipsRow}>
                  {CHECKLIST_ITEMS.map(chip => {
                    const value = item[chip.key] as string | null;
                    const filled = !!(value && String(value).trim());
                    return (
                      <View
                        key={String(chip.key)}
                        style={[styles.chip, filled ? styles.chipDone : styles.chipPending]}
                      >
                        <Text style={[styles.chipText, filled ? styles.chipTextDone : styles.chipTextPending]}>
                          {chip.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.cardFooterRow}>
                  <Text style={styles.cardFooterText}>Surgery · {formatDMY(item.actualSurgeryDate)}</Text>
                  <View style={styles.clearanceIndicatorRow}>
                    <View style={[styles.clearanceDot, { backgroundColor: isCleared ? '#22c55e' : '#ef4444' }]} />
                    <Text style={[styles.clearanceIndicatorText, { color: isCleared ? '#16a34a' : '#dc2626' }]}>
                      {isCleared ? 'Cleared' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* OT Selector Bottom Sheet */}
      <Modal
        visible={showOtModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOtModal(false)}
      >
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowOtModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Select OT</Text>
              <TouchableOpacity onPress={() => setShowOtModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.bottomSheetCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.bottomSheetList}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.bottomSheetItem}
                onPress={() => {
                  setSelectedOt(null);
                  setShowOtModal(false);
                }}
              >
                <Text style={[styles.bottomSheetItemText, !selectedOt && styles.bottomSheetItemTextActive]}>
                  All OT
                </Text>
                {!selectedOt && <Text style={styles.checkmarkIcon}>✓</Text>}
              </TouchableOpacity>
              {otOptions.map(ot => {
                const active = selectedOt === ot;
                return (
                  <TouchableOpacity
                    key={ot}
                    activeOpacity={0.7}
                    style={styles.bottomSheetItem}
                    onPress={() => {
                      setSelectedOt(ot);
                      setShowOtModal(false);
                    }}
                  >
                    <Text style={[styles.bottomSheetItemText, active && styles.bottomSheetItemTextActive]}>
                      OT {ot}
                    </Text>
                    {active && <Text style={styles.checkmarkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Calendar Range Picker Modal — same pattern as the main Dashboard */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarHeaderTitle}>Select Date Range</Text>
              <Text style={styles.calendarHeaderSubtitle}>
                {tempStartDay ? `From ${MONTH_NAMES[calendarMonth]} ${String(tempStartDay).padStart(2, '0')}` : 'Select start date'}
                {tempEndDay ? ` to ${MONTH_NAMES[calendarMonth]} ${String(tempEndDay).padStart(2, '0')}` : ''}
              </Text>
            </View>

            <View style={styles.weekdaysRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <Text key={day} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {Array.from({ length: firstWeekdayOfMonth(calendarYear, calendarMonth) }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.emptyDayCell} />
              ))}

              {Array.from({ length: daysInMonth(calendarYear, calendarMonth) }).map((_, idx) => {
                const day = idx + 1;
                const isStart = tempStartDay === day;
                const isEnd = tempEndDay === day;
                const isSelected = isStart || isEnd;
                const isInRange = !!(tempStartDay && tempEndDay && day > tempStartDay && day < tempEndDay);

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    activeOpacity={0.8}
                    onPress={() => handleCalendarDayPress(day)}
                    style={[
                      styles.dayCell,
                      isStart && styles.dayCellStart,
                      isEnd && styles.dayCellEnd,
                      isInRange && styles.dayCellInRange,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isInRange && styles.dayTextInRange,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calendarActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.calendarClearBtn}
                onPress={() => {
                  setTempStartDay(null);
                  setTempEndDay(null);
                }}
              >
                <Text style={styles.calendarClearText}>Clear</Text>
              </TouchableOpacity>

              <View style={styles.calendarMainActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.calendarCancelBtn}
                  onPress={() => setShowCalendar(false)}
                >
                  <Text style={styles.calendarCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.calendarApplyBtn}
                  onPress={() => {
                    const startDay = tempStartDay ?? 1;
                    const endDay = tempEndDay ?? tempStartDay ?? daysInMonth(calendarYear, calendarMonth);
                    setFromDate(formatYMD(new Date(calendarYear, calendarMonth, startDay)));
                    setToDate(formatYMD(new Date(calendarYear, calendarMonth, endDay)));
                    setShowCalendar(false);
                  }}
                >
                  <Text style={styles.calendarApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.screenBg,
  },
  dashboardHeader: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  dashboardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  dashboardLogoOuter: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  dashboardLogo: {
    width: '100%',
    height: '100%',
  },
  dashboardHospitalText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
    letterSpacing: 0.5,
    paddingBottom: 5,
  },
  dashboardTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: -2,
  },
  dashboardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  backArrow: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 6,
    width: '23.3%',
    height: 84,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
      },
      android: { elevation: 0.5 },
    }),
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  metricBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  metricBadgeText: {
    fontSize: 6.5,
    fontWeight: '700',
  },
  openGlyph: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: 'bold',
    lineHeight: 15,
  },
  metricValueBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 9.5,
    color: THEME.colors.textLight,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textDark,
    textAlign: 'center',
    marginTop: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    marginBottom: 16,
  },
  statusTabsScroll: {
    height: 44,
    flexGrow: 0,
    marginBottom: 14,
  },
  statusTabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTab: {
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: THEME.colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTabActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  statusTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.textMedium,
  },
  statusTabTextActive: {
    color: '#ffffff',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchWrapper: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: THEME.colors.textDark,
    height: '100%',
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    width: '90%',
    maxWidth: 330,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  calendarHeader: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 8,
  },
  calendarHeaderTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  calendarHeaderSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMedium,
    marginTop: 2,
    fontWeight: '600',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 36,
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 1.5,
  },
  dayCellStart: {
    backgroundColor: THEME.colors.primary,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  dayCellEnd: {
    backgroundColor: THEME.colors.primary,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  dayCellInRange: {
    backgroundColor: 'rgba(11, 102, 92, 0.08)',
    borderRadius: 0,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dayTextInRange: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  calendarActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 12,
  },
  calendarClearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  calendarClearText: {
    color: THEME.colors.danger,
    fontWeight: '700',
    fontSize: 12.5,
  },
  calendarMainActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  calendarCancelText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12.5,
  },
  calendarApplyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  calendarApplyText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12.5,
  },
  otFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  otDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  otDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMedium,
  },
  dropdownArrow: {
    fontSize: 8,
    color: THEME.colors.textLight,
  },
  actionLinksRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  actionLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginLeft: 16,
  },
  clearanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  clearanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
    marginBottom: 8,
  },
  clearanceBadge: {
    borderWidth: 1.3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ffffff',
  },
  clearanceItemLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.textDark,
    marginLeft: 6,
  },
  clearanceBadgeDone: {
    borderColor: THEME.colors.success,
  },
  clearanceBadgeDoneActive: {
    backgroundColor: THEME.colors.success,
  },
  clearanceBadgeTextDone: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.success,
  },
  clearanceBadgeNotDone: {
    borderColor: THEME.colors.danger,
  },
  clearanceBadgeNotDoneActive: {
    backgroundColor: THEME.colors.danger,
  },
  clearanceBadgeTextNotDone: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.danger,
  },
  clearanceBadgeBlank: {
    borderColor: THEME.colors.textMuted,
  },
  clearanceBadgeBlankActive: {
    backgroundColor: THEME.colors.textMuted,
  },
  clearanceBadgeTextBlank: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.textMedium,
  },
  clearanceBadgeTextActive: {
    color: '#ffffff',
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
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardPatientName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 8,
  },
  cardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayBadge: {
    backgroundColor: THEME.colors.warningBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.warning,
    letterSpacing: 0.4,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardMetaLine: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  cardSurgeryName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.colors.textDark,
    marginBottom: 6,
  },
  cardDoctorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardDoctorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMedium,
    marginRight: 8,
  },
  cardDateText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  chip: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  chipPending: {
    backgroundColor: THEME.colors.dangerBg,
  },
  chipDone: {
    backgroundColor: THEME.colors.successBg,
  },
  chipText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  chipTextPending: {
    color: THEME.colors.danger,
  },
  chipTextDone: {
    color: THEME.colors.success,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  cardFooterText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  clearanceIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  clearanceIndicatorText: {
    fontSize: 11.5,
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
    maxHeight: '70%',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
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
