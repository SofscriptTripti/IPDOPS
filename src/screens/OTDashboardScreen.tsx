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
  NativeModules,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { SearchIcon, CalendarIcon, UserIcon, MiniCheckIcon, MiniWarningIcon, ExitIcon } from '../components/Icons';
import { UserSessionData } from '../services/authService';
import { trackerService } from '../services/trackerService';
import { LoadingIndicator } from '../components/LoadingIndicator';

interface OTDashboardScreenProps {
  sessionData: UserSessionData;
  onBack: () => void;
  onEditBooking: (item: OtCallRegisterItem) => void;
  onLogout: () => void;
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
  cbcDtTm?: string | null;
  CreatDtTm?: string | null;
  creatDtTm?: string | null;
  'PT/INRCrTm'?: string | null;
  ptInrDtTm?: string | null;
  'VDRL/HIVDtTm'?: string | null;
  vdrlHivDtTm?: string | null;
  'X-RayDtTm'?: string | null;
  xrayDtTm?: string | null;
  '2DEchoDtTm'?: string | null;
  echo2dDtTm?: string | null;
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

const format12Hour = (time24: string | null | undefined): string => {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(mins)) return time24;
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = mins === 0 ? '' : `:${String(mins).padStart(2, '0')}`;
  return `${hours}${minStr} ${ampm}`;
};

const formatBookingDateTimeWithSlots = (bookingDate: string | null, fromTime: string | null, toTime: string | null): string => {
  const d = parseApiDate(bookingDate);
  if (!d) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  
  const fromStr = format12Hour(fromTime);
  const toStr = format12Hour(toTime);
  const timePart = (fromStr || toStr) ? ` , ${fromStr} - ${toStr}` : '';
  return `${datePart}${timePart}`;
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

export const OTDashboardScreen = ({ sessionData, onBack, onEditBooking, onLogout, refreshSignal }: OTDashboardScreenProps) => {
  const insets = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const [records, setRecords] = useState<OtCallRegisterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [clearanceFilter] = useState<ClearanceFilter>('All');

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
  }, [showCalendar, fromDate, toDate, calendarYear, calendarMonth]);

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
  }, [refreshSignal, fetchList]);

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

    // Request notification permission on Android 13+ before downloading
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!hasPermission) {
          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Notification permission denied by user');
          }
        }
      } catch (err) {
        console.warn('Failed to check/request notification permission:', err);
      }
    }

    const rowsHtml = filteredRecords.map((r, idx) => {
      const actualDate = formatDMY(r.actualSurgeryDate);
      const timeStr = `${r.fromTime || '--:--'} - ${r.toTime || '--:--'}`;
      
      const valCbc = (r.cbc || '').trim().toUpperCase();
      const valCreat = (r.creat || '').trim().toUpperCase();
      const valPtInr = (r.ptInr || '').trim().toUpperCase();
      const valVdrlHiv = (r.vdrlHiv || '').trim().toUpperCase();
      const valXray = (r.xray || '').trim().toUpperCase();
      const valEcho2d = (r.echo2d || '').trim().toUpperCase();
      const valMrsa = (r.mrsa || '').trim().toUpperCase();
      const valBloodThinner = (r.bloodThinner || '').trim().toUpperCase();
      const valFitness = (r.fitness || '').trim().toUpperCase();

      const formatChecklistDateTime = (val: string | null | undefined): string => {
        if (!val || val === '-') return '-';
        const d = parseApiDate(val);
        if (!d) return val;
        const pad = (n: number) => String(n).padStart(2, '0');
        const datePart = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        let hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minPart = pad(d.getMinutes());
        return `${datePart} , ${pad(hours)}:${minPart} ${ampm}`;
      };

      const dtCbc = formatChecklistDateTime(r.cbcDtTm);
      const dtCreat = formatChecklistDateTime(r.creatDtTm || r.CreatDtTm);
      const dtPtInr = formatChecklistDateTime(r.ptInrDtTm || r['PT/INRCrTm']);
      const dtVdrlHiv = formatChecklistDateTime(r.vdrlHivDtTm || r['VDRL/HIVDtTm']);
      const dtXray = formatChecklistDateTime(r.xrayDtTm || r['X-RayDtTm']);
      const dtEcho2d = formatChecklistDateTime(r.echo2dDtTm || r['2DEchoDtTm']);

      const getBookingDateTimeText = (): string => {
        const text = formatBookingDateTimeWithSlots(r.otBookingDate, r.fromTime, r.toTime);
        if (text === '--') return '--';
        return `Booking date and time: ${text}`;
      };

      const getValClass = (val: string) => {
        if (val === 'Y') return 'val-y';
        if (val === 'N') return 'val-n';
        return 'val-null';
      };

      const getValText = (val: string, label: string, dtTm?: string) => {
        const base = val === 'Y' ? `${label}: Y` : val === 'N' ? `${label}: N` : `${label}: —`;
        if (dtTm && dtTm !== '-') {
          return `${base} (${dtTm})`;
        }
        return base;
      };

      return `
        <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
          <td style="font-weight: bold; color: #0f172a;">
            ${r.patientName || '--'}
            ${r.ageSex ? `<br/><span style="font-size: 8.5px; font-weight: normal; color: #64748b;">(${r.ageSex})</span>` : ''}
          </td>
          <td>${r.patientNo || '--'}</td>
          <td style="text-align: center;">${r.ward || '--'}</td>
          <td style="text-align: center;">${r.otName || '--'}</td>
          <td style="font-size: 11px; max-width: 150px; word-break: break-word;">${r.surgeryName || '--'}</td>
          <td style="font-size: 11px;">DR. ${r.surgeonDoctor || '--'}</td>
          <td style="text-align: center; font-size: 10px; max-width: 150px; word-break: break-word;">
            ${getBookingDateTimeText()}
          </td>
          <td style="text-align: center;"><span class="badge status-${(r.status || 'OPEN').toLowerCase()}">${r.status || 'OPEN'}</span></td>
          <td style="font-size: 10px; padding: 4px 6px;">
            <ul class="chk-list">
              <li class="chk-item"><span class="chk ${getValClass(valCbc)}">${getValText(valCbc, 'CBC', dtCbc)}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valCreat)}">${getValText(valCreat, 'Creat', dtCreat)}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valPtInr)}">${getValText(valPtInr, 'PT/INR', dtPtInr)}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valVdrlHiv)}">${getValText(valVdrlHiv, 'VDRL/HIV', dtVdrlHiv)}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valXray)}">${getValText(valXray, 'X-Ray', dtXray)}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valEcho2d)}">${getValText(valEcho2d, '2D Echo', dtEcho2d)}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valMrsa)}">${getValText(valMrsa, 'MRSA')}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valBloodThinner)}">${getValText(valBloodThinner, 'Thinner')}</span></li>
              <li class="chk-item"><span class="chk ${getValClass(valFitness)}">${getValText(valFitness, 'Fitness')}</span></li>
            </ul>
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #1e293b;
            background-color: #ffffff;
            font-size: 11px;
          }
          h1 {
            color: #0b665c;
            font-size: 20px;
            margin: 0 0 5px 0;
            text-align: center;
          }
          .subtitle {
            text-align: center;
            font-size: 11px;
            color: #64748b;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            border: 1px solid #0b665c;
          }
          th {
            background-color: #0b665c;
            color: #ffffff;
            font-weight: bold;
            text-align: left;
            padding: 8px 6px;
            font-size: 11px;
            border: 1px solid #0b665c;
          }
          td {
            padding: 8px 6px;
            border: 1px solid #0b665c;
            vertical-align: middle;
            font-size: 10.5px;
          }
          tr.even {
            background-color: #f8fafc;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
          }
          .status-open {
            background-color: #e0f2fe;
            color: #0369a1;
          }
          .status-closed {
            background-color: #dcfce7;
            color: #15803d;
          }
          .status-cancelled {
            background-color: #fee2e2;
            color: #b91c1c;
          }
          .chk-list {
            margin: 0;
            padding: 0;
            list-style: none;
          }
          .chk-item {
            margin-bottom: 3px;
          }
          .chk-item:last-child {
            margin-bottom: 0;
          }
          .chk {
            display: block;
            font-size: 8.5px;
            padding: 2px 4px;
            border-radius: 3px;
            text-align: center;
            font-weight: 600;
            white-space: nowrap;
          }
          .val-y {
            background-color: #dcfce7;
            color: #15803d;
          }
          .val-n {
            background-color: #fee2e2;
            color: #b91c1c;
          }
          .val-null {
            background-color: #f1f5f9;
            color: #64748b;
          }
          @media print {
            body {
              padding: 15px;
            }
            thead {
              display: table-header-group;
            }
          }
        </style>
      </head>
      <body>
        <h1>OT Call Register</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        <table>
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Reg No.</th>
              <th style="text-align: center;">Ward</th>
              <th style="text-align: center;">OT</th>
              <th>Surgery Name</th>
              <th>Surgeon</th>
              <th style="text-align: center;">Date & Time</th>
              <th style="text-align: center;">Status</th>
              <th>Checklist Items</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    try {
      if (Platform.OS === 'android' && NativeModules.PdfModule) {
        NativeModules.PdfModule.printHTML(htmlContent, 'OT_Call_Register');
      } else {
        await Share.share({
          title: 'OT Call Register',
          message: htmlContent,
        });
      }
    } catch (err) {
      console.warn('Failed to share/print OT Call Register:', err);
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
          <TouchableOpacity activeOpacity={0.7} style={[styles.profileBadge, { marginRight: 10 }]} onPress={onBack}>
            <View style={styles.backArrow} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.profileBadge} onPress={handleLogout}>
            <ExitIcon color="#ffffff" />
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
              <Text style={styles.actionLinkText}>Download List</Text>
            </TouchableOpacity>
           
          </View>
        </View>

        {/* Color Legend — a colored bordered badge (Yes/No/—) plus a plain label outside it */}
        <View style={styles.clearanceRow}>
          <View style={styles.clearanceItem}>
            <View style={[styles.clearanceBadge, styles.clearanceBadgeDone]}>
              <Text style={styles.clearanceBadgeTextDone}>Yes</Text>
            </View>
            <Text style={styles.clearanceItemLabel} numberOfLines={1}>Done</Text>
          </View>

          <View style={styles.clearanceItem}>
            <View style={[styles.clearanceBadge, styles.clearanceBadgeNotDone]}>
              <Text style={styles.clearanceBadgeTextNotDone}>No</Text>
            </View>
            <Text style={styles.clearanceItemLabel} numberOfLines={1}>Not done</Text>
          </View>

          <View style={styles.clearanceItem}>
            <View style={[styles.clearanceBadge, styles.clearanceBadgeBlank]}>
              <Text style={styles.clearanceBadgeTextBlank}>—</Text>
            </View>
            <Text style={styles.clearanceItemLabel} numberOfLines={1}>Blank</Text>
          </View>
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

            // const isCleared = !!(item.clearance && item.clearance.trim());

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

                {item.otBookingDate && (
                  <Text style={styles.cardBookingLine}>
                    Booking date & time: <Text style={styles.cardBookingLineActive}>{formatBookingDateTimeWithSlots(item.otBookingDate, item.fromTime, item.toTime)}</Text>
                  </Text>
                )}

                <View style={styles.cardDoctorRow}>
                  <Text style={styles.cardDoctorText} numberOfLines={1}>
                    DR. {item.surgeonDoctor || '--'}
                  </Text>
                </View>

                <View style={styles.chipsRow}>
                  {CHECKLIST_ITEMS.map(chip => {
                    const value = item[chip.key] as string | null;
                    const valTrimmed = value ? String(value).trim().toUpperCase() : '';

                    let bgStyle = styles.chipNull;
                    let textStyle = styles.chipTextNull;

                    if (valTrimmed === 'Y') {
                      bgStyle = styles.chipYes;
                      textStyle = styles.chipTextYes;
                    } else if (valTrimmed === 'N') {
                      bgStyle = styles.chipNo;
                      textStyle = styles.chipTextNo;
                    }

                    return (
                      <View
                        key={String(chip.key)}
                        style={[styles.chip, bgStyle]}
                      >
                        <Text style={[styles.chipText, textStyle]}>
                          {chip.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
{/* 
                <View style={styles.cardFooterRow}>
                  <Text style={styles.cardFooterText}>Surgery · {formatDMY(item.actualSurgeryDate)}</Text>
                  <View style={styles.clearanceIndicatorRow}>
                    <View style={[styles.clearanceDot, { backgroundColor: isCleared ? '#22c55e' : '#ef4444' }]} />
                    <Text style={[styles.clearanceIndicatorText, { color: isCleared ? '#16a34a' : '#dc2626' }]}>
                      {isCleared ? 'Cleared' : 'Pending'}
                    </Text>
                  </View>
                </View> */}
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

      {/* Custom Themed Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <Text style={styles.logoutModalText}>Are you sure you want to sign out?</Text>
            
            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.logoutModalBtn, styles.logoutModalBtnCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.logoutModalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.logoutModalBtn, styles.logoutModalBtnConfirm]}
                onPress={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
              >
                <Text style={styles.logoutModalBtnConfirmText}>Sign Out</Text>
              </TouchableOpacity>
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
  bookingBadge: {
    backgroundColor: THEME.colors.warningBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6,
  },
  bookingBadgeText: {
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
  cardBookingLine: {
    fontSize: 11.5,
    color: THEME.colors.textMedium,
    marginBottom: 8,
  },
  cardBookingLineActive: {
    color: THEME.colors.warning,
    fontWeight: '800',
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
  chipYes: {
    backgroundColor: THEME.colors.successBg,
  },
  chipNo: {
    backgroundColor: THEME.colors.dangerBg,
  },
  chipNull: {
    backgroundColor: THEME.colors.borderLight,
  },
  chipText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  chipTextYes: {
    color: THEME.colors.success,
  },
  chipTextNo: {
    color: THEME.colors.danger,
  },
  chipTextNull: {
    color: THEME.colors.textLight,
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
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoutModalContent: {
    width: '100%',
    maxWidth: 310,
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
  logoutModalText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: THEME.colors.textDark,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 24,
    marginTop: 8,
  },
  logoutModalButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  logoutModalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalBtnCancel: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  logoutModalBtnCancelText: {
    color: THEME.colors.textMedium,
    fontSize: 14,
    fontWeight: '700',
  },
  logoutModalBtnConfirm: {
    backgroundColor: THEME.colors.primary,
    marginLeft: 8,
  },
  logoutModalBtnConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
