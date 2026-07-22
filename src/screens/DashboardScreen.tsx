import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import {
  UserIcon,
  SearchIcon,
  CalendarIcon,
  BellIcon,
  BedIcon,
  HomeIcon,
  PatientsIcon,
  ReportsIcon,
  ProfileIcon,
  MiniCheckIcon,
  MiniWarningIcon,
  ExitIcon,
} from '../components/Icons';
import { SegmentedProgressBar } from '../components/SegmentedBar';
import { authService, UserSessionData } from '../services/authService';
import { PatientSessionDetails } from './PatientTimelineScreen';

      import { SubModuleItem } from './SubModuleSelectionScreen';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { trackerService } from '../services/trackerService';

interface DashboardScreenProps {
  sessionData: UserSessionData;
  selectedSubModule: SubModuleItem | null;
  onLogout: () => void;
  onNavigateToBedTurnover: () => void;
  onNavigateToTimeline: (patient: PatientSessionDetails) => void;
  onNavigateToNotifications: () => void;
}

const mockPatients: PatientSessionDetails[] = [];
const dummyPatients = [
  {
    id: '1',
    name: 'MR. KRISHNA DAS PAL',
    ipNo: 'IP 3114828',
    bed: 'Bed 607B',
    ward: 'DOUBLE OCC. - 6TH FLR.',
    speciality: 'UROLOGY',
    doctor: 'DR. BHUSHAN P. PATIL',
    stageProgress: 4,
    totalStages: 13,
    dateRange: 'T1 - 05/05 13:58',
    status: 'Admitted',
    statusDetail: 'Delayed',
    paymentBy: 'STAR HEALTH INSURANCE',
    patientType: 'CREDIT COMPANY PATIENT',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 10:00', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 10:25', diffText: '0:25 vs T1', status: 'red', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 10:45', diffText: '0:45 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 11:15', diffText: '1:15 vs T1', status: 'red', tatLimit: 'TAT ≤ 2:00' },
    ]
  },
  {
    id: '2',
    name: 'MR. ASHISH N NABAR',
    ipNo: 'IP 3116083',
    bed: 'Bed 511B',
    ward: 'GENERAL WARD - 5TH FLR.',
    speciality: 'GENERAL MEDICINE',
    doctor: 'DR. SANGEETA CHINCHOLE',
    stageProgress: 5,
    totalStages: 13,
    dateRange: 'T1 - 05/05 13:34',
    status: 'Admitted',
    statusDetail: 'On track',
    paymentBy: 'CASH',
    patientType: 'SELF PAYING',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 11:00', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 11:30', diffText: '0:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 12:00', diffText: '1:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 12:20', diffText: '1:20 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 12:45', diffText: '1:45 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
    ]
  },
  {
    id: '3',
    name: 'MR. JAMES PAWAR',
    ipNo: 'IP 3115084',
    bed: 'Bed 610B',
    ward: 'GENERAL WARD - 6TH FLR.',
    speciality: 'GENERAL MEDICINE',
    doctor: 'DR. SANGEETA CHINCHOLE',
    stageProgress: 7,
    totalStages: 13,
    dateRange: 'T1 - 05/05 13:30',
    status: 'Admitted',
    statusDetail: 'On track',
    paymentBy: 'HDFC ERGO TPA',
    patientType: 'CREDIT COMPANY PATIENT',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 10:00', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 10:20', diffText: '0:20 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 10:40', diffText: '0:40 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 11:00', diffText: '1:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 11:20', diffText: '1:20 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T6', name: 'Visitsheet / Voucher to Billing', time: '04/05 11:40', diffText: '1:40 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T7', name: 'Discharge Summary (Provisional)', time: '04/05 11:55', diffText: '1:55 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
    ]
  },
  {
    id: '4',
    name: 'MR. MAYUR KISAN MADVI',
    ipNo: 'IP 3115079',
    bed: 'Bed 603',
    ward: 'GENERAL WARD - 6TH FLR.',
    speciality: 'GENERAL MEDICINE',
    doctor: 'DR. SANGEETA CHINCHOLE',
    stageProgress: 7,
    totalStages: 13,
    dateRange: 'T1 - 05/05 13:18',
    status: 'Admitted',
    statusDetail: 'Delayed',
    paymentBy: 'CASH',
    patientType: 'SELF PAYING',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 10:00', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 10:35', diffText: '0:35 vs T1', status: 'red', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 10:55', diffText: '0:55 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 11:25', diffText: '1:25 vs T1', status: 'red', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 11:45', diffText: '1:45 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T6', name: 'Visitsheet / Voucher to Billing', time: '04/05 12:15', diffText: '2:15 vs T1', status: 'red', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T7', name: 'Discharge Summary (Provisional)', time: '04/05 12:30', diffText: '2:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
    ]
  },
  {
    id: '5',
    name: 'MR. RAVINDRA S DESHMUKH',
    ipNo: 'IP 3114710',
    bed: 'Bed 305A',
    ward: 'DOUBLE OCC. - 3RD FLR.',
    speciality: 'CARDIOLOGY',
    doctor: 'DR. AMIT KULKARNI',
    stageProgress: 13,
    totalStages: 13,
    dateRange: 'T1 - 04/05 10:00',
    status: 'Discharged',
    statusDetail: 'Delayed',
    paymentBy: 'STAR HEALTH INSURANCE',
    patientType: 'CREDIT COMPANY PATIENT',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 10:00', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 10:25', diffText: '0:25 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 10:45', diffText: '0:45 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 11:15', diffText: '1:15 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 11:35', diffText: '1:35 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T6', name: 'Visitsheet / Voucher to Billing', time: '04/05 11:56', diffText: '1:56 vs T1', status: 'orange', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T7', name: 'Discharge Summary (Provisional)', time: '04/05 11:00', diffText: '1:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T8', name: 'Discharge Summary (Final)', time: '04/05 11:30', diffText: '1:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T9', name: 'Discharge Bill Preparation', time: '04/05 12:00', diffText: '2:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:30' },
      { code: 'T10', name: 'Discharge Bill Approval', time: '04/05 12:15', diffText: '2:15 vs T1', status: 'green', tatLimit: 'TAT ≤ 3:00' },
      { code: 'T11', name: 'Bill Handed to Patient/Sponsor', time: '04/05 12:30', diffText: '2:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 3:30' },
      { code: 'T12', name: 'Payment Receipt/Gatepass Issued', time: '04/05 12:45', diffText: '2:45 vs T1', status: 'green', tatLimit: 'TAT ≤ 4:00' },
      { code: 'T13', name: 'Bed Vacated/Ready', time: '04/05 13:00', diffText: '3:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 4:30' },
    ]
  },
  {
    id: '6',
    name: 'MRS. JALAJA NAIR',
    ipNo: 'IP 3114935',
    bed: 'Bed 405B',
    ward: 'GENERAL WARD - 4TH FLR.',
    speciality: 'GYNAECOLOGY & OBSTETRICS',
    doctor: 'DR. SUSHMA GUNJAL',
    stageProgress: 7,
    totalStages: 13,
    dateRange: 'T1 - 05/05 12:49',
    status: 'Admitted',
    statusDetail: 'Delayed',
    paymentBy: 'STAR HEALTH INSURANCE',
    patientType: 'CREDIT COMPANY PATIENT',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 09:30', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 10:10', diffText: '0:40 vs T1', status: 'red', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 10:50', diffText: '1:20 vs T1', status: 'red', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 11:10', diffText: '1:40 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 11:40', diffText: '2:10 vs T1', status: 'red', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T6', name: 'Visitsheet / Voucher to Billing', time: '04/05 12:10', diffText: '2:40 vs T1', status: 'red', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T7', name: 'Discharge Summary (Provisional)', time: '04/05 12:30', diffText: '3:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
    ]
  },
  {
    id: '7',
    name: 'MRS. JAISHRI KAMALAKAR',
    ipNo: 'IP 3115091',
    bed: 'Bed 401',
    ward: 'GENERAL WARD - 4TH FLR.',
    speciality: 'GYNAECOLOGY & OBSTETRICS',
    doctor: 'DR. SUSHMA GUNJAL',
    stageProgress: 8,
    totalStages: 13,
    dateRange: 'T1 - 05/05 12:35',
    status: 'Admitted',
    statusDetail: 'On track',
    paymentBy: 'CASH',
    patientType: 'SELF PAYING',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 10:00', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 10:20', diffText: '0:20 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 10:40', diffText: '0:40 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 11:00', diffText: '1:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 11:15', diffText: '1:15 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T6', name: 'Visitsheet / Voucher to Billing', time: '04/05 11:35', diffText: '1:35 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T7', name: 'Discharge Summary (Provisional)', time: '04/05 11:55', diffText: '1:55 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T8', name: 'Discharge Summary (Final)', time: '04/05 12:15', diffText: '2:15 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
    ]
  },
  {
    id: '8',
    name: 'MR. AMIT PATEL',
    ipNo: 'IP 3114999',
    bed: 'Bed 302C',
    ward: 'DOUBLE OCC. - 3RD FLR.',
    speciality: 'CARDIOLOGY',
    doctor: 'DR. AMIT KULKARNI',
    stageProgress: 3,
    totalStages: 13,
    dateRange: 'T1 - 05/05 15:40',
    status: 'Admitted',
    statusDetail: 'On track',
    paymentBy: 'ICICI LOMBARD',
    patientType: 'CREDIT COMPANY PATIENT',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 14:15', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 14:40', diffText: '0:25 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 15:00', diffText: '0:45 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
    ]
  },
  {
    id: '9',
    name: 'MR. SANJAY SHINDE',
    ipNo: 'IP 3115201',
    bed: 'Bed 508A',
    ward: 'GENERAL WARD - 5TH FLR.',
    speciality: 'ORTHOPAEDICS',
    doctor: 'DR. ROHIT K.',
    stageProgress: 11,
    totalStages: 13,
    dateRange: 'T1 - 05/05 08:30',
    status: 'Out of TAT',
    statusDetail: 'Delayed',
    paymentBy: 'CASH',
    patientType: 'SELF PAYING',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 08:30', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 09:00', diffText: '0:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 09:20', diffText: '0:50 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 09:50', diffText: '1:20 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 10:10', diffText: '1:40 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T6', name: 'Visitsheet / Voucher to Billing', time: '04/05 10:50', diffText: '2:20 vs T1', status: 'red', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T7', name: 'Discharge Summary (Provisional)', time: '04/05 10:30', diffText: '2:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T8', name: 'Discharge Summary (Final)', time: '04/05 11:00', diffText: '2:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T9', name: 'Discharge Bill Preparation', time: '04/05 11:30', diffText: '3:00 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:30' },
      { code: 'T10', name: 'Discharge Bill Approval', time: '04/05 11:45', diffText: '3:15 vs T1', status: 'green', tatLimit: 'TAT ≤ 3:00' },
      { code: 'T11', name: 'Bill Handed to Patient/Sponsor', time: '04/05 12:15', diffText: '3:45 vs T1', status: 'red', tatLimit: 'TAT ≤ 3:30' },
    ]
  },
  {
    id: '10',
    name: 'MRS. ANITA DESAI',
    ipNo: 'IP 3115042',
    bed: 'Bed 514B',
    ward: 'GENERAL WARD - 5TH FLR.',
    speciality: 'NEUROLOGY',
    doctor: 'DR. NIKHIL D. KADAM',
    stageProgress: 6,
    totalStages: 13,
    dateRange: 'T1 - 05/05 10:50',
    status: 'Admitted',
    statusDetail: 'At risk',
    paymentBy: 'BAJAJ ALLIANZ',
    patientType: 'CREDIT COMPANY PATIENT',
    stages: [
      { code: 'T1', name: 'Discharge Advice', time: '04/05 10:50', status: 'green' },
      { code: 'T2', name: 'Last Issue Request (Nurse Station)', time: '04/05 11:20', diffText: '0:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 1:00' },
      { code: 'T3', name: 'Last Issue by Pharmacy', time: '04/05 12:00', diffText: '1:10 vs T1', status: 'orange', tatLimit: 'TAT ≤ 1:30' },
      { code: 'T4', name: 'Last Issue Return Request (Nurse)', time: '04/05 12:20', diffText: '1:30 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T5', name: 'Last Issue Return by Pharmacy', time: '04/05 12:40', diffText: '1:50 vs T1', status: 'green', tatLimit: 'TAT ≤ 2:00' },
      { code: 'T6', name: 'Visitsheet / Voucher to Billing', time: '04/05 13:10', diffText: '2:20 vs T1', status: 'orange', tatLimit: 'TAT ≤ 2:00' },
    ]
  }
];

const PulsingDot = () => {
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.pulsingDot, { opacity: pulseAnim }]} />
  );
};

export const DashboardScreen = ({
  sessionData,
  selectedSubModule,
  onLogout,
  onNavigateToBedTurnover,
  onNavigateToTimeline,
  onNavigateToNotifications,
}: DashboardScreenProps) => {
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'All' | 'Admitted' | 'Discharged' | 'Out of TAT'>('All');
  const [activeBottomTab, setActiveBottomTab] = useState<'Dashboard' | 'Patients' | 'Reports' | 'Profile'>('Dashboard');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState<number | null>(new Date().getDate() || 15);
  const [endDate, setEndDate] = useState<number | null>(new Date().getDate() || 15);
  const [tempStart, setTempStart] = useState<number | null>(new Date().getDate() || 15);
  const [tempEnd, setTempEnd] = useState<number | null>(new Date().getDate() || 15);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [livePatients, setLivePatients] = useState<PatientSessionDetails[] | null>(null);
  const [liveCounts, setLiveCounts] = useState<{ totAdmitted: number; totDischarged: number; totOutOfTat: number; pendingBeds: number } | null>(null);
  const [isFetchingTracker, setIsFetchingTracker] = useState(false);

  // Ward Filter States
  const [wards, setWards] = useState<{ Cd: number; Dcd: string | null }[]>([]);
  const [selectedWard, setSelectedWard] = useState<{ Cd: number; Dcd: string | null } | null>(null);
  const [showWardModal, setShowWardModal] = useState(false);
  const [wardSearchQuery, setWardSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchWards = useCallback(async () => {
    try {
      console.log('Fetching live ward list for dashboard...');
      const res = await trackerService.getWardList(
        sessionData.token,
        "1",
        1,
        1,
        sessionData.userId
      );
      if (res && res.success && Array.isArray(res.data)) {
        // Filter out null or empty descriptions
        const validWards = res.data.filter((w: any) => w.Dcd && w.Dcd.trim().length > 0);
        console.log('Successfully loaded wards:', validWards.length);
        setWards(validWards);
      }
    } catch (err) {
      console.warn('Failed to load wards:', err);
    }
  }, [sessionData]);

  const fetchDashboardData = useCallback(async (isSwipeRefresh: boolean = false) => {
    if (!startDate) return;
    if (!isSwipeRefresh) {
      setLivePatients(null);
      setIsFetchingTracker(true);
    }
    try {
      const fromDateStr = `2026-07-${String(startDate).padStart(2, '0')}`;
      const toDateStr = `2026-07-${String(endDate || startDate).padStart(2, '0')}`;
      const wrdCdParam = selectedWard ? String(selectedWard.Cd) : '';
      
      console.log(`Fetching dashboard data for date range: ${fromDateStr} to ${toDateStr}, ward: ${wrdCdParam}`);
      const response = await trackerService.getDashboard(
        sessionData.token,
        fromDateStr,
        toDateStr,
        0,
        wrdCdParam,
        sessionData.userId
      );

      if (response && response.success && response.data) {
        const summary = response.data.summary || {};
        setLiveCounts({
          totAdmitted: summary.admitted ?? 0,
          totDischarged: summary.discharged ?? 0,
          totOutOfTat: summary.outOfTat ?? 0,
          pendingBeds: summary.pendingBeds ?? 0,
        });

        const patientsList = Array.isArray(response.data.patients) ? response.data.patients : [];
        const mappedList = patientsList.map((p: any, idx: number) => {
          const colorString = p.StageColors || "0,0,0,0,0,0,0,0,0,0,0,0,0";
          const colorCodes = colorString.split(',');

          const stageNames = [
            'Discharge Advice',
            'Last Issue Request (Nurse Station)',
            'Last Issue by Pharmacy',
            'Last Issue Return Request (Nurse)',
            'Last Issue Return by Pharmacy',
            'Visitsheet / Voucher to Billing',
            'Discharge Summary (Provisional)',
            'Discharge Summary (Final)',
            'Discharge Bill Preparation',
            'Discharge Bill Approval',
            'Bill Handed to Patient/Sponsor',
            'Discharge Voucher Verification',
            'Patient Discharge / Bed Vacated'
          ];

          const formattedStages = stageNames.map((name, sIdx) => {
            const colorCode = colorCodes[sIdx] || '0';
            let status: 'green' | 'orange' | 'red' | 'white' = 'white';
            if (colorCode === '1') status = 'green';
            else if (colorCode === '2') status = 'orange';
            else if (colorCode === '3') status = 'red';

            let stageTime = '';
            if (sIdx === 0) stageTime = p.DschgAdvGivenTm ? p.DschgAdvGivenTm.substring(11, 16) : '';
            else if (sIdx === 12) stageTime = p.ActDschgDtTm ? p.ActDschgDtTm.substring(11, 16) : '';

            return {
              code: `T${sIdx + 1}`,
              name,
              time: stageTime,
              diffText: '',
              status,
              tatLimit: '',
            };
          });

          const status = p.DschgStatus || 'Admitted';

          let statusDetail = '';
          if (p.OverallRisk === 2) {
            statusDetail = '';
          } else if (p.OverallRisk === 1) {
            statusDetail = '';
          }
          console.log("here is status>>>>>", statusDetail);

          let dateRangeText = 'T1 - Advice Pending';
          if (p.DschgAdvGivenTm) {
            const month = p.DschgAdvGivenTm.substring(5, 7);
            const day = p.DschgAdvGivenTm.substring(8, 10);
            const hourMin = p.DschgAdvGivenTm.substring(11, 16);
            dateRangeText = `T1 - ${day}/${month} ${hourMin}`;
          }

          return {
            id: p.IPNo ? String(p.IPNo) : String(idx),
            name: p.PatientName || 'PATIENT',
            ipNo: p.IPNo ? String(p.IPNo) : '',
            bed: p.BedNo ? `Bed ${p.BedNo}` : '',
            ward: p.Ward || 'WARD',
            speciality: p.Speciality || 'MEDICINE',
            doctor: p.DoctorName || p.Doctor || 'DR. CLINICIAN',
            stageProgress: p.StagesDone ?? 0,
            totalStages: p.StagesTotal ?? 13,
            dateRange: dateRangeText,
            status,
            statusDetail,
            paymentBy: p.PtnPayTyp || 'CASH',
            patientType: p.PatientType || 'SELF PAYING',
            stages: formattedStages,
          } as PatientSessionDetails;
        });

        setLivePatients(mappedList);
      } else {
        setLivePatients([]);
        setLiveCounts(null);
      }
    } catch (err) {
      console.warn('Failed to fetch dashboard tracker data:', err);
      setLivePatients([]);
      setLiveCounts(null);
    } finally {
      setIsFetchingTracker(false);
    }
  }, [startDate, endDate, sessionData, selectedWard]);

  // Fetch ward list on mount
  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  // Fetch dashboard data when dependencies change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, startDate, endDate, selectedWard, sessionData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchWards(),
        fetchDashboardData(true)
      ]);
    } catch (err) {
      console.warn('Failed to refresh dashboard data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchWards, fetchDashboardData]);

  // Sync temp dates to confirmed dates when calendar opens
  useEffect(() => {
    if (showCalendar) {
      setTempStart(startDate);
      setTempEnd(endDate);
    }
  }, [showCalendar, startDate, endDate]);

  const handleDatePress = (day: number) => {
    if (tempStart === null || (tempStart !== null && tempEnd !== null)) {
      setTempStart(day);
      setTempEnd(null);
    } else {
      if (day < tempStart) {
        setTempStart(day);
      } else {
        setTempEnd(day);
      }
    }
  };

  // Parse day and month from "T1 - DD/MM hh:mm" date strings
  const getPatientDate = (dateRangeStr: string): { day: number; month: number } | null => {
    const match = dateRangeStr.match(/(\d{2})\/(\d{2})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      return { day, month };
    }
    return null;
  };

  // Derive profile initials from nickname or ID
  const getInitials = () => {
    const name = sessionData.userNickName || sessionData.userId || '';
    if (!name.trim()) return 'SS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const patientsDataset = livePatients || [];

  // Filter patients based on tab choice, search input, and calendar date range
  const filteredPatients = patientsDataset.filter((patient) => {
    const matchesTab = selectedTab === 'All' || patient.status === selectedTab;
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.ipNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.bed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.speciality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.doctor.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesDate = true;
    const pDate = getPatientDate(patient.dateRange);
    if (pDate && pDate.month === 7) {
      if (startDate !== null && pDate.day < startDate) matchesDate = false;
      if (endDate !== null && pDate.day > endDate) matchesDate = false;
    }
    
    return matchesTab && matchesSearch && matchesDate;
  });

  // Calculate status counts (fallback to '--' when live API data has not loaded)
  const totalCount = liveCounts ? ((liveCounts.totAdmitted || 0) + (liveCounts.totDischarged || 0) + (liveCounts.totOutOfTat || 0)) : '--';
  const admittedCount = liveCounts?.totAdmitted !== undefined ? liveCounts.totAdmitted : '--';
  const dischargedCount = liveCounts?.totDischarged !== undefined ? liveCounts.totDischarged : '--';
  const outOfTatCount = liveCounts?.totOutOfTat !== undefined ? liveCounts.totOutOfTat : '--';

  return (
    <View style={[styles.dashboardContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />
      
      {/* Dashboard Header Bar */}
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
              IPD Ops{selectedSubModule ? `  •  ${selectedSubModule.SubModName}` : ''}
            </Text>
            <Text style={styles.dashboardTitleText} numberOfLines={1}>
              {sessionData.companyName || 'SOFSCRIPT HOSPITAL MUMBAI'}
            </Text>
          </View>
        </View>
        
        <View style={styles.dashboardHeaderRight}>
          {isLoggingOut ? (
            <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 10 }} />
          ) : (
            <>
              {/* Notification Bell
              <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.headerIconBtn}
                onPress={onNavigateToNotifications}
              >
                <BellIcon color="#ffffff" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              */}
              
              {/* Profile Logout Icon Badge */}
              <TouchableOpacity 
                activeOpacity={0.7} 
                style={styles.profileBadge}
                onPress={handleLogout}
              >
                <ExitIcon color="#ffffff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.dashboardScroll}
        contentContainerStyle={[styles.dashboardContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
            tintColor={THEME.colors.primary}
          />
        }
      >
        <View style={styles.metricsRow}>
          {/* Metric Card 1: Total */}
          <TouchableOpacity 
            style={[styles.metricCard, selectedTab === 'All' && styles.metricCardActive]}
            onPress={() => setSelectedTab('All')}
            activeOpacity={0.8}
          >
            <View style={styles.metricCardHeader}>
              <UserIcon color={THEME.colors.textLight} />
              <View style={[styles.metricBadge, { backgroundColor: '#f1f5f9' }]}>
                <Text style={[styles.metricBadgeText, { color: '#64748b' }]} numberOfLines={1}>+2 TODAY</Text>
              </View>
            </View>
            <View style={styles.metricBottomRow}>
              <Text style={styles.metricValue}>{totalCount}</Text>
              <Text style={styles.metricLabel} numberOfLines={1}>Total</Text>
            </View>
          </TouchableOpacity>

          {/* Metric Card 2: Admitted */}
          <TouchableOpacity 
            style={[styles.metricCard, selectedTab === 'Admitted' && styles.metricCardActive]}
            onPress={() => setSelectedTab('Admitted')}
            activeOpacity={0.8}
          >
            <View style={styles.metricCardHeader}>
              <Text style={{ fontSize: 13, color: '#0284c7', fontWeight: 'bold', lineHeight: 15 }}>♡</Text>
              <View style={[styles.metricBadge, { backgroundColor: '#e0f2fe' }]}>
                <Text style={[styles.metricBadgeText, { color: '#0284c7' }]} numberOfLines={1}>IN PROGRESS</Text>
              </View>
            </View>
            <View style={styles.metricBottomRow}>
              <Text style={styles.metricValue}>{admittedCount}</Text>
              <Text style={styles.metricLabel} numberOfLines={1}>Admitted</Text>
            </View>
          </TouchableOpacity>

          {/* Metric Card 3: Discharged */}
          <TouchableOpacity 
            style={[styles.metricCard, selectedTab === 'Discharged' && styles.metricCardActive]}
            onPress={() => setSelectedTab('Discharged')}
            activeOpacity={0.8}
          >
            <View style={styles.metricCardHeader}>
              <MiniCheckIcon color={THEME.colors.success} />
              <View style={[styles.metricBadge, { backgroundColor: THEME.colors.successBg }]}>
                <Text style={[styles.metricBadgeText, { color: THEME.colors.success }]} numberOfLines={1}>TODAY</Text>
              </View>
            </View>
            <View style={styles.metricBottomRow}>
              <Text style={styles.metricValue}>{dischargedCount}</Text>
              <Text style={styles.metricLabel} numberOfLines={1}>Discharged</Text>
            </View>
          </TouchableOpacity>

          {/* Metric Card 4: Out of TAT */}
          <TouchableOpacity 
            style={[styles.metricCard, selectedTab === 'Out of TAT' && styles.metricCardActive]}
            onPress={() => setSelectedTab('Out of TAT')}
            activeOpacity={0.8}
          >
            <View style={styles.metricCardHeader}>
              <MiniWarningIcon color={THEME.colors.danger} />
              <View style={[styles.metricBadge, { backgroundColor: THEME.colors.dangerBg }]}>
                <Text style={[styles.metricBadgeText, { color: THEME.colors.danger }]} numberOfLines={1}>NEEDS ACTION</Text>
              </View>
            </View>
            <View style={styles.metricBottomRow}>
              <Text style={styles.metricValue}>{outOfTatCount}</Text>
              <Text style={styles.metricLabel} numberOfLines={1}>Out of TAT</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Title Header Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.trackerTitle}>Discharge Tracker</Text>
            <Text style={styles.trackerSub}>Monitor discharge TAT across all admitted patients</Text>
          </View>
        </View>

        {/* Bed Turnover Card Banner */}
        <TouchableOpacity 
          activeOpacity={0.85} 
          style={styles.bedTurnoverBanner}
          onPress={onNavigateToBedTurnover}
        >
          <View style={styles.bedBannerLeft}>
            <View style={styles.bedIconWrapper}>
              <BedIcon color="#0284c7" />
            </View>
            <View style={styles.bedTextContainer}>
              <Text style={styles.bedTitle}>Bed Turnover</Text>
              <Text style={styles.bedSub}>Housekeeping queue: discharged beds awaiting cleaning</Text>
            </View>
          </View>
          <View style={styles.bedBannerRight}>
            <View style={styles.bedBadge}>
              <Text style={styles.bedBadgeText}>
                {liveCounts?.pendingBeds !== undefined ? liveCounts.pendingBeds : 0}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Filter Tabs Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsScrollContainer}
        >
          <TouchableOpacity 
            style={[styles.tabBtn, selectedTab === 'All' && styles.tabBtnActive]}
            onPress={() => setSelectedTab('All')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, selectedTab === 'All' && styles.tabBtnTextActive]}>All {totalCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabBtn, selectedTab === 'Admitted' && styles.tabBtnActive]}
            onPress={() => setSelectedTab('Admitted')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, selectedTab === 'Admitted' && styles.tabBtnTextActive]}>Admitted {admittedCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, selectedTab === 'Discharged' && styles.tabBtnActive]}
            onPress={() => setSelectedTab('Discharged')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, selectedTab === 'Discharged' && styles.tabBtnTextActive]}>Discharged {dischargedCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, selectedTab === 'Out of TAT' && styles.tabBtnActive]}
            onPress={() => setSelectedTab('Out of TAT')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, selectedTab === 'Out of TAT' && styles.tabBtnTextActive]}>Out of TAT {outOfTatCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabBtn}
            onPress={() => {
              setWardSearchQuery('');
              setShowWardModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.tabBtnText}>
              Wards ▾
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Search Bar & Date Picker Row */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchWrapper}>
            <SearchIcon color={THEME.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search IP no. or name"
              placeholderTextColor={THEME.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.datePickerBtn}
            onPress={() => setShowCalendar(true)}
          >
            <CalendarIcon color={THEME.colors.textMedium} />
            <Text style={styles.datePickerText}>
              {startDate && endDate 
                ? `July ${String(startDate).padStart(2, '0')}–${String(endDate).padStart(2, '0')}` 
                : startDate 
                ? `July ${String(startDate).padStart(2, '0')}` 
                : 'Select dates'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Label Line */}
        {/* <View style={styles.statusLabelRow}>
          <Text style={styles.patientsCount}>{filteredPatients.length} patients</Text>
          <View style={styles.liveIndicatorContainer}>
            <PulsingDot />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View> */}

        {/* Patients list */}
        {isFetchingTracker ? (
          <View style={{ paddingVertical: 40, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <LoadingIndicator message="Loading Dashboard." />
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No patients match your search/filter criteria</Text>
          </View>
        ) : (
          filteredPatients.map((patient) => {
            const statusColor = 
              patient.statusDetail === 'On track' ? THEME.colors.success : 
              patient.statusDetail === 'At risk' ? THEME.colors.warning : 
              patient.statusDetail === 'Delayed' ? THEME.colors.danger : 
              'transparent';
              
            const badgeBg = patient.status === 'Discharged' ? THEME.colors.successBg : '#e0f2fe';
            const badgeText = patient.status === 'Discharged' ? THEME.colors.success : '#0369a1';
            const segmentColors = patient.stages.map(s => 
              s.status === 'green' ? '#008000' : s.status === 'orange' ? '#FFA500' : s.status === 'red' ? '#FF0000' : '#e2e8f0'
            );

            return (
              <TouchableOpacity 
                key={patient.id} 
                activeOpacity={0.8}
                style={styles.patientCard}
                onPress={() => onNavigateToTimeline(patient)}
              >
                <View style={styles.patientCardHeader}>
                  <Text style={styles.patientName} numberOfLines={1}>
                    {patient.name}
                  </Text>
                  <View style={[styles.patientStatusBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.patientStatusText, { color: badgeText }]}>
                      {patient.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.patientInfoRow}>
                  <Text style={styles.infoLabel}>IP: </Text>
                  <Text style={styles.infoValue}>{patient.ipNo}</Text>
                  <Text style={styles.infoDivider}>  •  </Text>
                  <Text style={styles.infoLabel}>Bed: </Text>
                  <Text style={styles.infoValue}>{patient.bed}</Text>
                </View>

                <View style={styles.progressSection}>
                  <Text style={styles.progressLabel}>Stage progress</Text>
                  <View style={styles.progressRow}>
                    <SegmentedProgressBar
                      filled={patient.stageProgress}
                      total={patient.totalStages}
                      segmentColors={segmentColors}
                    />
                    <Text style={styles.progressValueText}>
                      {patient.stageProgress}/{patient.totalStages}
                    </Text>
                  </View>
                </View>

                <View style={styles.patientCardFooter}>
                  <Text style={styles.patientDateText}>{patient.dateRange}</Text>
                  {patient.statusDetail ? (
                    <View style={styles.detailStatusContainer}>
                      <View style={[styles.detailStatusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.detailStatusText, { color: statusColor }]}>
                        {patient.statusDetail}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Tab Bar navigation is hidden */}

      {/* Calendar Range Picker Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            {/* Modal Header */}
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarHeaderTitle}>Select Date Range</Text>
              <Text style={styles.calendarHeaderSubtitle}>
                {tempStart ? `From July ${String(tempStart).padStart(2, '0')}` : 'Select start date'}
                {tempEnd ? ` to July ${String(tempEnd).padStart(2, '0')}` : ''}
              </Text>
            </View>

            {/* Weekdays Row */}
            <View style={styles.weekdaysRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <Text key={day} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {/* Empty placeholder cells for offset (July 1st, 2026 is a Wednesday = 3 empty cells) */}
              {Array.from({ length: 3 }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.emptyDayCell} />
              ))}

              {/* Day cells 1 to 31 */}
              {Array.from({ length: 31 }).map((_, idx) => {
                const day = idx + 1;
                const isStart = tempStart === day;
                const isEnd = tempEnd === day;
                const isSelected = isStart || isEnd;
                const isInRange = !!(tempStart && tempEnd && day > tempStart && day < tempEnd);

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    activeOpacity={0.8}
                    onPress={() => handleDatePress(day)}
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

            {/* Modal Actions */}
            <View style={styles.calendarActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.calendarClearBtn}
                onPress={() => {
                  setTempStart(null);
                  setTempEnd(null);
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
                    if (tempStart === null) {
                      const todayDay = new Date().getDate() || 15;
                      setStartDate(todayDay);
                      setEndDate(todayDay);
                    } else {
                      setStartDate(tempStart);
                      setEndDate(tempEnd);
                    }
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
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContent}>
            <Text style={styles.logoutModalText}>Are you sure you want to sign out?</Text>
            
            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.logoutModalBtn, styles.logoutModalBtnCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.logoutModalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.logoutModalBtn, styles.logoutModalBtnConfirm]}
                onPress={async () => {
                  setShowLogoutModal(false);
                  setIsLoggingOut(true);
                  try {
                    await authService.logout(sessionData.token, sessionData.userId, sessionData.sessionId);
                  } catch (err) {
                    console.warn('API logout request failed:', err);
                  } finally {
                    setIsLoggingOut(false);
                    onLogout();
                  }
                }}
              >
                <Text style={styles.logoutModalBtnConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ward Selector Modal */}
      <Modal
        visible={showWardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWardModal(false)}
      >
        <View style={styles.wardModalOverlay}>
          <View style={styles.wardModalContent}>
            <View style={styles.wardModalHeader}>
              <Text style={styles.wardModalTitle}>Select Ward</Text>
              <TouchableOpacity
                onPress={() => setShowWardModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.wardModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Ward Search Input */}
            <View style={styles.wardModalSearchWrapper}>
              <SearchIcon color={THEME.colors.textMuted} />
              <TextInput
                style={styles.wardModalSearchInput}
                placeholder="Search ward name..."
                placeholderTextColor={THEME.colors.textMuted}
                value={wardSearchQuery}
                onChangeText={setWardSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView 
              style={styles.wardModalList} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Option for All Wards */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.wardModalItem,
                  selectedWard === null && styles.wardModalItemActive
                ]}
                onPress={() => {
                  setSelectedWard(null);
                  setShowWardModal(false);
                }}
              >
                <Text style={[
                  styles.wardModalItemText,
                  selectedWard === null && styles.wardModalItemTextActive
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
                        styles.wardModalItem,
                        isSelected && styles.wardModalItemActive
                      ]}
                      onPress={() => {
                        setSelectedWard(w);
                        setShowWardModal(false);
                      }}
                    >
                      <Text style={[
                        styles.wardModalItemText,
                        isSelected && styles.wardModalItemTextActive
                      ]}>
                        {w.Dcd}
                      </Text>
                      {isSelected && (
                        <Text style={styles.checkmarkIcon}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f6f8fb',
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
    paddingBottom:5,
  },
  dashboardTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: -2,
  },
  locationSubtitleText: {
    fontSize: 15,
    color: THEME.colors.primaryLight,
    fontWeight: '500',
  },
  dashboardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    marginRight: 14,
    padding: 2,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#f97316',
    borderWidth: 1,
    borderColor: '#0b665c',
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
  profileBadgeText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  refreshingTopBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  dashboardScroll: {
    flex: 1,
  },
  dashboardContent: {
    paddingBottom: 72, // Space for bottom tab bar
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    width: '100%',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 6,
    width: '23.3%', // 4 columns distributed evenly
    height: 84, // compact height
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  metricCardActive: {
    borderColor: THEME.colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#f0fdf4',
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
  metricBottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    width: '100%',
  },
  metricValue: {
    fontSize: 20, // larger font for number value
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  metricLabel: {
    fontSize: 9.5,
    color: THEME.colors.textLight,
    fontWeight: '700',
    marginLeft: 3,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  trackerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  trackerSub: {
    fontSize: 12,
    color: THEME.colors.textLight,
    marginTop: 2,
  },
  bedTurnoverBanner: {
    backgroundColor: '#ecf7fe',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  bedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  bedIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bedTextContainer: {
    flex: 1,
  },
  bedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },
  bedSub: {
    fontSize: 10.5,
    color: '#0284c7',
    marginTop: 1,
  },
  bedBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  bedBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 16,
    color: '#0284c7',
    fontWeight: '700',
  },
  tabsScroll: {
    height: 48,
    flexGrow: 0,
  },
  tabsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  tabBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: THEME.colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.textMedium,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 6,
    fontSize: 13.5,
    color: THEME.colors.textDark,
    height: '100%',
  },
  datePickerBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  statusLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  patientsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMedium,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    color: THEME.colors.textLight,
    fontWeight: '500',
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    shadowColor: THEME.colors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: THEME.colors.primary, // distinct Teal color for name
    flex: 1,
    marginRight: 8,
  },
  patientStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  patientStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b', // slate-gray for headers/labels
  },
  infoValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b', // dark charcoal for values
  },
  infoDivider: {
    fontSize: 12.5,
    color: '#cbd5e1', // Divider color
    marginHorizontal: 4,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: THEME.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  progressValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMedium,
    marginLeft: 8,
    lineHeight: 12, // match the layout line height of the segments
  },
  patientCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 4,
  },
  patientDateText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  detailStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailStatusDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.25,
    marginRight: 6,
  },
  detailStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    marginHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  emptyText: {
    fontSize: 13.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomTabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    flexDirection: 'row',
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  tabTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  
  // Custom Calendar Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Sleek dark translucent overlay
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
      android: {
        elevation: 8,
      },
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
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Sleek dark overlay matching calendar picker
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
    backgroundColor: THEME.colors.primary, // App theme color (Teal)
    marginLeft: 8,
  },
  logoutModalBtnConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  wardFilterRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  wardPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
  },
  wardPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wardPickerLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMedium,
    marginLeft: 8,
  },
  wardPickerValueText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.primary,
    flex: 1,
  },
  dropdownArrow: {
    width: 6,
    height: 6,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: THEME.colors.textMedium,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
    marginLeft: 6,
  },
  wardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  wardModalContent: {
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
  wardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  wardModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  wardModalCloseText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  wardModalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  wardModalSearchInput: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 14,
    color: THEME.colors.textDark,
    height: '100%',
  },
  wardModalList: {
    maxHeight: 350,
  },
  wardModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  wardModalItemActive: {
    borderBottomColor: THEME.colors.primary + '33',
  },
  wardModalItemText: {
    fontSize: 14.5,
    color: THEME.colors.textDark,
    fontWeight: '500',
    flex: 1,
  },
  wardModalItemTextActive: {
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
