import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
  Modal,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Clipboard,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { ExitIcon, EditIcon, DeleteIcon, DeleteEveryoneIcon, CopyIcon, ForwardIcon } from '../components/Icons';
import { trackerService } from '../services/trackerService';
import { UserSessionData } from '../services/authService';
import { LoadingIndicator } from '../components/LoadingIndicator';

export interface TimelineStage {
  code: string;
  name: string;
  time: string;
  diffText?: string;
  status: 'green' | 'orange' | 'red' | 'white';
  tatLimit?: string;
}

export interface PatientSessionDetails {
  id: string;
  name: string;
  ipNo: string;
  bed: string;
  status: string;
  statusDetail: string;
  stageProgress: number;
  totalStages: number;
  dateRange: string;
  // Patient details from mockup
  ward: string;
  speciality: string;
  doctor: string;
  paymentBy: string;
  patientType: string;
  stages: TimelineStage[];
  tpaAprDtTm?: string | null;
  tpaAprAmt?: string | number | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
  timestamp: string;
  isDeleted?: boolean;
  isEdited?: boolean;
}

const initialDummyMessages: ChatMessage[] = [
  {
    id: '1',
    userId: 'nurse_sarah',
    userName: 'Nurse Sarah Smith',
    userRole: 'Nurse Station',
    text: 'Dr. Rahul visited. Discharge advice has been given. Preparing final issue request.',
    timestamp: '10:15 AM',
  },
  {
    id: '2',
    userId: 'pharmacy_johny',
    userName: 'Johny (Pharmacy)',
    userRole: 'Pharmacy',
    text: 'Received last issue return request. Processing pharmacy returns now.',
    timestamp: '10:22 AM',
  },
  {
    id: '3',
    userId: 'billing_preeti',
    userName: 'Preeti Sharma',
    userRole: 'Billing',
    text: 'Pending pharmacy clearance before we can generate the final bill. Please expedite pharmacy returns.',
    timestamp: '10:30 AM',
  },
];

interface PatientTimelineScreenProps {
  patient: PatientSessionDetails;
  onBack: () => void;
  sessionData: UserSessionData;
  hasLoadedOnce: boolean;
  onLoadedOnce: () => void;
}

const calculateTat = (timeStart: string | null, timeEnd: string | null): string => {
  if (!timeStart || !timeEnd) return '-';
  const start = new Date(timeStart);
  const end = new Date(timeEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
  
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '-';
  
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  
  return `${hours}:${mins < 10 ? '0' + mins : mins}`;
};

const formatTimeOnly = (timeStr: string | null): string => {
  if (!timeStr) return '-';
  const idx = timeStr.indexOf('T');
  if (idx !== -1) {
    let t = timeStr.substring(idx + 1, idx + 16);
    if (t.length >= 5) {
      return t.substring(0, 5);
    }
    return t;
  }
  return timeStr;
};

const formatTatEquation = (
  labelStart: string,
  labelEnd: string,
  timeStart: string | null,
  timeEnd: string | null
): string => {
  const diffVal = calculateTat(timeStart, timeEnd);
  const startStr = formatTimeOnly(timeStart);
  const endStr = formatTimeOnly(timeEnd);
  return `${labelEnd} (${endStr}) - ${labelStart} (${startStr}) = ${diffVal}`;
};

export const PatientTimelineScreen = ({ 
  patient, 
  onBack, 
  sessionData,
  hasLoadedOnce,
  onLoadedOnce
}: PatientTimelineScreenProps) => {
  const insets = useSafeAreaInsets();
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [activePatient, setActivePatient] = useState<PatientSessionDetails>(patient);
  const [isLoading, setIsLoading] = useState(!hasLoadedOnce);
  const [isFetchingLive, setIsFetchingLive] = useState(true);

  // Draggable Floating Chat Button Setup
  const pan = useRef(new Animated.ValueXY()).current;
  const valRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    pan.addListener((value) => {
      valRef.current = value;
    });
    return () => pan.removeAllListeners();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: valRef.current.x,
          y: valRef.current.y
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        // If movement was small, register it as a click/tap to toggle modal
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          showCustomAlert('Under Implementation', 'This feature is under implementation.', 'info');
        }
      }
    })
  ).current;
  
  const [messages, setMessages] = useState<ChatMessage[]>(initialDummyMessages);
  const [newMessageText, setNewMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);
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
  const flatListRef = useRef<FlatList>(null);
  const chatInputRef = useRef<TextInput>(null);

  const handleSendMessage = () => {
    if (!newMessageText.trim()) return;
    
    if (editingMessageId) {
      setMessages(prev =>
        prev.map(m =>
          m.id === editingMessageId
            ? { ...m, text: newMessageText.trim(), isEdited: true }
            : m
        )
      );
      setEditingMessageId(null);
      setNewMessageText('');
      return;
    }

    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timestampStr = `${hours}:${minutes} ${ampm}`;

    const newMsg: ChatMessage = {
      id: String(messages.length + 1) + '_' + Date.now(),
      userId: sessionData.userId || 'self',
      userName: sessionData.userNickName || 'Me',
      userRole: 'Team Member',
      text: newMessageText.trim(),
      timestamp: timestampStr,
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessageText('');
  };

  const handleDeletePress = (message: ChatMessage) => {
    const isSelf = message.userId === sessionData.userId;
    
    const options = [];
    if (isSelf) {
      options.push({
        text: 'Delete for Everyone',
        style: 'destructive' as const,
        onPress: () => {
          setMessages(prev =>
            prev.map(m => m.id === message.id ? { ...m, isDeleted: true, text: '' } : m)
          );
        }
      });
    }

    options.push({
      text: 'Delete for Me',
      style: 'destructive' as const,
      onPress: () => {
        setMessages(prev => prev.filter(m => m.id !== message.id));
      }
    });

    options.push({
      text: 'Cancel',
      style: 'cancel' as const
    });

    Alert.alert(
      'Delete message?',
      undefined,
      options,
      { cancelable: true }
    );
  };

  const handleCopyPress = (message: ChatMessage) => {
    try {
      Clipboard.setString(message.text);
    } catch (err) {
      console.warn('Clipboard setString failed:', err);
    }

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage('Message copied');
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchLiveDetail = async () => {
      setIsFetchingLive(true);
      if (!hasLoadedOnce) {
        setIsLoading(true);
      }
      try {
        const ipNumberStr = patient.ipNo.replace(/[^0-9]/g, '');
        const ipnoVal = ipNumberStr ? parseInt(ipNumberStr, 10) : null;
        
        if (ipnoVal) {
          let startStr = '2026-07-01';
          let endStr = '2026-07-15';

          if (patient.dateRange && patient.dateRange.includes('/')) {
            const match = patient.dateRange.match(/(\d{2})\/(\d{2})/);
            if (match) {
              const day = match[1];
              const month = match[2];
              const dayNum = parseInt(day, 10);
              const startDay = Math.max(1, dayNum - 2);
              const endDay = dayNum + 2;
              const startDayStr = startDay < 10 ? `0${startDay}` : `${startDay}`;
              const endDayStr = endDay < 10 ? `0${endDay}` : `${endDay}`;
              
              startStr = `2026-${month}-${startDayStr}`;
              endStr = `2026-${month}-${endDayStr}`;
            }
          } else {
            try {
              const now = new Date();
              const startDt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
              const endDt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
              
              const fYear = startDt.getFullYear();
              const fMonth = String(startDt.getMonth() + 1).padStart(2, '0');
              const fDay = String(startDt.getDate()).padStart(2, '0');
              
              const tYear = endDt.getFullYear();
              const tMonth = String(endDt.getMonth() + 1).padStart(2, '0');
              const tDay = String(endDt.getDate()).padStart(2, '0');
              
              startStr = `${fYear}-${fMonth}-${fDay}`;
              endStr = `${tYear}-${tMonth}-${tDay}`;
            } catch (e) {
              startStr = '2026-07-01';
              endStr = '2026-07-15';
            }
          }

          console.log(`Fetching live timeline details for IPNo: ${ipnoVal} inside optimized range ${startStr} to ${endStr}`);
          const detailRes = await trackerService.getDetail(
            sessionData.token,
            startStr,
            endStr,
            0,
            ipnoVal,
            '',
            sessionData.userId
          );

          if (detailRes && detailRes.success && Array.isArray(detailRes.data) && detailRes.data.length > 0) {
            const p = detailRes.data[0];
            console.log('Live details fetched successfully for IPNo:', ipnoVal);
            
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
              let colorCode = 0;
              let timeStr = '';
              let diffText = '';

              switch (sIdx) {
                case 0: // T1: Discharge Advice
                  timeStr = p.DschgAdvGivenTm || '';
                  const t1Status = patient.stages[0]?.status || 'white';
                  colorCode = t1Status === 'green' ? 1 : t1Status === 'orange' ? 2 : t1Status === 'red' ? 3 : 0;
                  diffText = '-';
                  break;
                case 1: // T2: Last Issue Request
                  timeStr = p.LastIssueReqDtTm || '';
                  colorCode = p.TATLastIssueReqDtTmTAT ?? 0;
                  diffText = formatTatEquation('T1', 'T2', p.DschgAdvGivenTm, p.LastIssueReqDtTm);
                  break;
                case 2: // T3: Last Issue Pharmacy
                  timeStr = p.LastIssDtTm || '';
                  colorCode = p.TATLastIssDtTmTAT ?? 0;
                  diffText = formatTatEquation('T1', 'T3', p.DschgAdvGivenTm, p.LastIssDtTm);
                  break;
                case 3: // T4: Last Issue Return Request
                  timeStr = p.LastIssReturnReqDtTm || '';
                  colorCode = p.TATLastIssReturnReqDtTmTAT ?? 0;
                  diffText = formatTatEquation('T1', 'T4', p.DschgAdvGivenTm, p.LastIssReturnReqDtTm);
                  break;
                case 4: // T5: Last Issue Return Pharmacy
                  timeStr = p.LastIssReturnDtTm || '';
                  colorCode = p.TATLastIssReturnDtTmTAT ?? 0;
                  diffText = formatTatEquation('T1', 'T5', p.DschgAdvGivenTm, p.LastIssReturnDtTm);
                  break;
                case 5: // T6: Visitsheet / Voucher to Billing
                  timeStr = p.LastBillDtTm || '';
                  const t6Status = patient.stages[5]?.status || 'white';
                  colorCode = t6Status === 'green' ? 1 : t6Status === 'orange' ? 2 : t6Status === 'red' ? 3 : 0;
                  diffText = formatTatEquation('T5', 'T6', p.LastIssReturnDtTm, p.LastBillDtTm);
                  break;
                case 6: // T7: Discharge Summary Provisional
                  timeStr = p.DschgSumProvDtTm || '';
                  colorCode = p.TATDschgSumProvDtTm ?? 0;
                  diffText = formatTatEquation('T1', 'T7', p.DschgAdvGivenTm, p.DschgSumProvDtTm);
                  break;
                case 7: // T8: Discharge Summary Final
                  timeStr = p.DschgSumFinalDtTm || '';
                  colorCode = p.TATDschgSumFinalTAT ?? 0;
                  diffText = formatTatEquation('T1', 'T8', p.DschgAdvGivenTm, p.DschgSumFinalDtTm);
                  break;
                case 8: // T9: Discharge Bill Preparation
                  timeStr = p.LastBillDtTm || '';
                  const t9Status = patient.stages[8]?.status || 'white';
                  colorCode = t9Status === 'green' ? 1 : t9Status === 'orange' ? 2 : t9Status === 'red' ? 3 : 0;
                  diffText = formatTatEquation('T7', 'T9', p.DschgSumProvDtTm, p.LastBillDtTm);
                  break;
                case 9: // T10: Discharge Bill Approval
                  timeStr = p.LastTPAAplDtTm || '';
                  colorCode = p.TATLastTPAInternalTAT ?? 0;
                  diffText = formatTatEquation('T1', 'T10', p.DschgAdvGivenTm, p.LastTPAAplDtTm);
                  break;
                case 10: // T11: Bill Handed to Patient/Sponsor
                  timeStr = p.LastTPAAprDtTm || '';
                  colorCode = p.TATLastTPATAT ?? 0;
                  diffText = formatTatEquation('T10', 'T11', p.LastTPAAplDtTm, p.LastTPAAprDtTm);
                  break;
                case 11: // T12: Discharge Voucher Verification
                  timeStr = p.LastStlmtDtTm || '';
                  colorCode = p.TATLastStlmtDtTmTAT ?? 0;
                  diffText = formatTatEquation('T11', 'T12', p.LastTPAAprDtTm, p.LastStlmtDtTm);
                  break;
                case 12: // T13: Patient Discharge / Bed Vacated
                  timeStr = p.ActDschgDtTm || '';
                  colorCode = p.TATLastPatienTAT ?? 0;
                  diffText = formatTatEquation('T11', 'T13', p.LastTPAAprDtTm, p.ActDschgDtTm);
                  break;
              }

              let status: 'green' | 'orange' | 'red' | 'white' = 'white';
              if (colorCode === 1) status = 'green';
              else if (colorCode === 2) status = 'orange';
              else if (colorCode === 3) status = 'red';

              let displayTime = '';
              if (timeStr) {
                const idx = timeStr.indexOf('T');
                if (idx !== -1) {
                  displayTime = timeStr.substring(idx + 1, idx + 16); // Capture HH:MM:SS or HH:MM
                  // Make it HH:MM for timeline nodes
                  if (displayTime.length >= 5) {
                    displayTime = displayTime.substring(0, 5);
                  }
                }
              }

              return {
                code: `T${sIdx + 1}`,
                name,
                time: displayTime,
                diffText: diffText,
                status,
                tatLimit: '',
              };
            });

            const status = p?.DschgStatus || 'Admitted';

            let statusDetail = '';
            const riskVal = p?.OverallRisk !== undefined && p?.OverallRisk !== null ? Number(p.OverallRisk) : 0;
            if (riskVal === 0) {
              statusDetail = 'Pending';
            } else if (riskVal === 1) {
              statusDetail = 'On Track';
            } else if (riskVal === 2) {
              statusDetail = 'Risk';
            } else if (riskVal === 3) {
              statusDetail = 'Delay';
            }
            console.log("here is status>>>>>", statusDetail);

            let dateRangeText = 'T1 - Advice Pending';
            if (p?.DschgAdvGivenTm) {
              const month = p.DschgAdvGivenTm.substring(5, 7);
              const day = p.DschgAdvGivenTm.substring(8, 10);
              const hourMin = p.DschgAdvGivenTm.substring(11, 16);
              dateRangeText = `T1 - ${day}/${month} ${hourMin}`;
            }

            const mappedDetails: PatientSessionDetails = {
              id: p?.IPNo ? String(p.IPNo) : patient.id,
              name: p?.PatientName || patient.name,
              ipNo: p?.IPNo ? String(p?.IPNo) : patient.ipNo,
              bed: p?.BedNo ? `Bed ${p.BedNo}` : patient.bed,
              ward: p?.Ward || patient.ward,
              speciality: p?.Splty_Cd || p?.Speciality || patient.speciality,
              doctor: p?.DocNm || p?.DoctorName || p?.Doctor || patient.doctor,
              stageProgress: formattedStages.filter(s => s.status !== 'white').length,
              totalStages: 13,
              dateRange: dateRangeText,
              status,
              statusDetail: patient.statusDetail,
              paymentBy: p?.PtnPayTyp || patient.paymentBy,
              patientType: p?.PatientType || patient.patientType,
              stages: formattedStages,
              tpaAprDtTm: p?.LastTPAAprDtTm,
              tpaAprAmt: p?.LastTPAAprAmt,
            };

            setActivePatient(mappedDetails);
          }
        }
      } catch (err) {
        console.warn('Failed to load live timeline details, using fallback details:', err);
      } finally {
        setIsLoading(false);
        setIsFetchingLive(false);
        onLoadedOnce();
      }
    };

    fetchLiveDetail();
  }, [patient, sessionData]);

  // Map status colors for TAT overall badge
  const isPending = activePatient.statusDetail === 'Pending';
  const isOnTrack = activePatient.statusDetail === 'On Track';
  const isRisk = activePatient.statusDetail === 'Risk';
  const isDelay = activePatient.statusDetail === 'Delay';

  const tatBg = isFetchingLive 
    ? '#f8fafc' 
    : isPending 
    ? '#f1f5f9' 
    : isOnTrack 
    ? '#f0fdf4' 
    : isRisk 
    ? '#fffbeb' 
    : isDelay 
    ? '#fef2f2' 
    : '#f8fafc';

  const tatBorder = isFetchingLive 
    ? '#e2e8f0' 
    : isPending 
    ? '#cbd5e1' 
    : isOnTrack 
    ? '#dcfce7' 
    : isRisk 
    ? '#fef3c7' 
    : isDelay 
    ? '#fee2e2' 
    : '#e2e8f0';

  const tatText = isFetchingLive 
    ? '#64748b' 
    : isPending 
    ? '#64748b' 
    : isOnTrack 
    ? '#22c55e' 
    : isRisk 
    ? '#f59e0b' 
    : isDelay 
    ? '#ef4444' 
    : '#64748b';

  const tatLabel = isFetchingLive 
    ? '-' 
    : activePatient.statusDetail || 'Pending';

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.backBtn}
            onPress={onBack}
          >
            <View style={styles.backArrow} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Patient Discharge Timeline</Text>
          </View>
        </View>
        <LoadingIndicator message="Loading Patient Details." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          activeOpacity={0.7} 
          style={styles.backBtn}
          onPress={onBack}
        >
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Patient Discharge Timeline</Text>
        </View>
      </View>

      {/* Main Content Layout (Flex Row / Grid on Desktop, simple scroll stack on Mobile) */}
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Info Section: Left (Details Card) */}
        <View style={styles.patientDetailsCard}>
          <View style={styles.patientNameRow}>
            <Text style={styles.patientName} numberOfLines={1}>
              {activePatient.name}
            </Text>
            {activePatient.ipNo ? (
              <Text style={styles.patientIpBadge}>
                {activePatient.ipNo.startsWith('IP') ? activePatient.ipNo : `IP ${activePatient.ipNo}`}
              </Text>
            ) : null}
          </View>

          {/* Overall TAT Badge */}
          <View style={[styles.overallTatBadge, { backgroundColor: tatBg, borderColor: tatBorder }]}>
            <View>
              <Text style={styles.overallTatTitle}>OVERALL TAT</Text>
              <Text style={[styles.overallTatText, { color: tatText }]}>{tatLabel}</Text>
            </View>
            <View style={styles.overallTatProgressContainer}>
              <Text style={styles.overallTatStagesText}>Stages done</Text>
              <Text style={styles.overallTatProgressValue}>{activePatient.stageProgress}/{activePatient.totalStages}</Text>
            </View>
          </View>

          {/* Detailed Specifications List */}
          <View style={styles.specificationsList}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>BED</Text>
              <Text style={styles.specValue}>{activePatient.bed}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>WARD</Text>
              <Text style={styles.specValue}>{activePatient.ward}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>SPECIALITY</Text>
              <Text style={styles.specValue}>{activePatient.speciality}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>DOCTOR</Text>
              <Text style={styles.specValue}>{activePatient.doctor}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PAYMENT BY</Text>
              <Text style={styles.specValue}>{activePatient.paymentBy}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PATIENT TYPE</Text>
              <Text style={styles.specValue}>{activePatient.patientType}</Text>
            </View>
          </View>
        </View>

        {/* Section Split: Right (Discharge Stages Vertical Timeline) */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineSectionHeader}>
            <Text style={styles.timelineCountText}>All {activePatient.totalStages} discharge stages</Text>
          </View>

          {/* Vertical Timeline Stack */}
          <View style={styles.timelineList}>
            {activePatient.stages.map((stage, idx) => {
              const isLast = idx === activePatient.stages.length - 1;
              const isWhite = stage.status === 'white';
              const dotBg = isWhite ? '#ffffff' : stage.status === 'green' ? '#008000' : stage.status === 'orange' ? '#FFA500' : '#FF0000';
              const dotBorderColor = isWhite ? '#cbd5e1' : dotBg;
              const dotBorderWidth = isWhite ? 1.5 : 0;
              const dotTextColor = isWhite ? '#64748b' : '#ffffff';
              
              return (
                <View key={stage.code} style={styles.timelineItemRow}>
                  {/* Left Column: Vertical connector line and dot */}
                  <View style={styles.timelineGraphicCol}>
                    <View style={[
                      styles.timelineDotCircle, 
                      { 
                        backgroundColor: dotBg, 
                        borderColor: dotBorderColor, 
                        borderWidth: dotBorderWidth,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }
                    ]}>
                      <Text style={[styles.timelineDotInnerCode, { color: dotTextColor }]}>{stage.code}</Text>
                    </View>
                    {!isLast && <View style={styles.timelineVerticalLine} />}
                  </View>

                  {/* Right Column: Stage Details */}
                  <View style={styles.timelineDetailsCol}>
                    <View style={styles.stageTitleRow}>
                      <Text style={styles.stageTitleText}>
                        {stage.name}
                        {stage.code === 'T10' && (activePatient.tpaAprDtTm || activePatient.tpaAprAmt) && (
                          <Text style={[
                            styles.tpaTitleInfoText, 
                            { 
                              color: (stage.status === 'green' || stage.status === 'white') ? '#16a34a' : '#ea580c', 
                              backgroundColor: (stage.status === 'green' || stage.status === 'white') ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 88, 12, 0.12)'
                            }
                          ]}>
                            {`  (`}
                            <Text style={{ color: (stage.status === 'green' || stage.status === 'white') ? '#14532d' : '#7c2d12' }}>
                              {`Time: `}
                              <Text style={{ fontWeight: '800' }}>
                                {activePatient.tpaAprDtTm ? formatTimeOnly(activePatient.tpaAprDtTm) : '—'}
                              </Text>
                              {` | Amt: `}
                              <Text style={{ fontWeight: '800' }}>
                                {activePatient.tpaAprAmt !== null && activePatient.tpaAprAmt !== undefined ? `₹${activePatient.tpaAprAmt}` : '—'}
                              </Text>
                            </Text>
                            {`)  `}
                          </Text>
                        )}
                      </Text>
                      {stage.tatLimit && (
                        <Text style={styles.tatLimitText}>{stage.tatLimit}</Text>
                      )}
                    </View>

                    <View style={styles.stageTimeRow}>
                      <Text style={styles.stageTimeText}>{stage.time || '-'}</Text>
                      {stage.diffText && stage.diffText !== '-' && !stage.diffText.endsWith('= -') ? (
                        <View style={[styles.diffBadge, { backgroundColor: (stage.status === 'green' || stage.status === 'white') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 88, 12, 0.1)' }]}>
                          <Text style={[styles.diffBadgeText, { color: (stage.status === 'green' || stage.status === 'white') ? '#16a34a' : '#ea580c' }]}>
                            {stage.diffText}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noTatText}>{stage.diffText || '-'}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Draggable Floating Chat Log Button */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.floatingChatBtn,
          {
            transform: pan.getTranslateTransform(),
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => showCustomAlert('Under Implementation', 'This feature is under implementation.', 'info')}
          style={styles.floatingChatBtnInner}
        >
          <Text style={styles.floatingChatText}>Chat Log</Text>
          <Text style={styles.floatingChatIcon}>💬</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Communication Chat Modal */}
      {false && isChatModalVisible && (
        <Modal
          visible={isChatModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsChatModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={styles.chatModalOverlay}
            onPress={() => setIsChatModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={[styles.chatContainer, { marginTop: insets.top + 50 }]}
            >
              <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />
              
              {/* Chat Header */}
              <View style={styles.chatHeader}>
                <View style={styles.sheetHandleContainer}>
                  <View style={styles.sheetHandle} />
                </View>
                <View style={styles.chatHeaderContent}>
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={styles.chatHeaderBackBtn}
                    onPress={() => setIsChatModalVisible(false)}
                  >
                    <View style={styles.chatBackArrow} />
                  </TouchableOpacity>
                  
                  <View style={styles.chatHeaderTitleContainer}>
                    <Text style={styles.chatHeaderTitle} numberOfLines={1}>{activePatient.name}</Text>
                    <Text style={styles.chatHeaderSubtitle}>
                      {activePatient.ipNo} • {activePatient.bed} • {activePatient.ward}
                    </Text>
                  </View>
                  
                  <View style={styles.chatHeaderRightPlaceholder} />
                </View>
              </View>
              
              {/* Messages Area */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 50 : 0}
              >
                {/* Click-catcher backdrop to dismiss active tooltip */}
                {activeActionMessageId !== null && (
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => setActiveActionMessageId(null)}
                  />
                )}
                
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.chatListContent}
                  renderItem={({ item }) => {
                    const isSelf = item.userId === sessionData.userId;
                    return (
                      <View style={[
                        styles.messageRow,
                        isSelf ? styles.messageRowSelf : styles.messageRowOther
                      ]}>
                        <TouchableOpacity
                          activeOpacity={item.isDeleted ? 1 : 0.85}
                          onLongPress={() => !item.isDeleted && setActiveActionMessageId(item.id)}
                          style={[
                            styles.messageBubble,
                            isSelf ? styles.messageBubbleSelf : styles.messageBubbleOther
                          ]}
                        >
                          {/* Floating Action Menu (Edit / Copy / Delete) */}
                          {activeActionMessageId === item.id && (
                            <View style={[
                              styles.floatingActionMenu,
                              isSelf ? styles.floatingMenuSelf : styles.floatingMenuOther
                            ]}>
                              {isSelf && (
                                <TouchableOpacity 
                                  activeOpacity={0.7}
                                  style={styles.floatingActionBtn}
                                  onPress={() => {
                                    setEditingMessageId(item.id);
                                    setNewMessageText(item.text);
                                    setActiveActionMessageId(null);
                                    setTimeout(() => {
                                      chatInputRef.current?.focus();
                                    }, 80);
                                  }}
                                >
                                  <EditIcon color={THEME.colors.primary} />
                                  <Text style={styles.floatingActionText}>Edit</Text>
                                </TouchableOpacity>
                              )}

                              <TouchableOpacity 
                                activeOpacity={0.7}
                                style={styles.floatingActionBtn}
                                onPress={() => {
                                  setActiveActionMessageId(null);
                                  handleCopyPress(item);
                                }}
                              >
                                <CopyIcon color={THEME.colors.primary} />
                                <Text style={styles.floatingActionText}>Copy</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity 
                                activeOpacity={0.7}
                                style={styles.floatingActionBtn}
                                onPress={() => {
                                  setActiveActionMessageId(null);
                                  handleDeletePress(item);
                                }}
                              >
                                <DeleteIcon color={THEME.colors.primary} />
                                <Text style={styles.floatingActionText}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {!isSelf && (
                            <Text style={styles.messageSender}>
                              {item.userName} ({item.userRole})
                            </Text>
                          )}
                          {isSelf && (
                            <Text style={styles.messageSenderSelf}>
                              You ({item.userRole || 'Logged In'})
                            </Text>
                          )}
                          
                          {item.isDeleted ? (
                            <Text style={styles.deletedMessageText}>
                              {isSelf ? '🚫 You deleted this message' : '🚫 This message was deleted'}
                            </Text>
                          ) : (
                            <Text style={styles.messageText}>
                              {item.text}
                              {item.isEdited && <Text style={styles.editedIndicatorText}> (edited)</Text>}
                            </Text>
                          )}
                          
                          <Text style={styles.messageTime}>{item.timestamp}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                  onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
                
                {/* Editing Banner */}
                {editingMessageId !== null && (
                  <View style={styles.editingBanner}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editingBannerLabel}>Editing message</Text>
                      <Text style={styles.editingBannerText} numberOfLines={1}>
                        {messages.find(m => m.id === editingMessageId)?.text}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      setEditingMessageId(null);
                      setNewMessageText('');
                    }}>
                      <Text style={styles.editingCancelText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Input Bar */}
                <View style={[styles.chatInputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                  <TextInput
                    ref={chatInputRef}
                    style={styles.chatInput}
                    placeholder="Type a message..."
                    placeholderTextColor={THEME.colors.textMuted}
                    value={newMessageText}
                    onChangeText={setNewMessageText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.chatSendBtn, !newMessageText.trim() && styles.chatSendBtnDisabled]}
                    onPress={handleSendMessage}
                    disabled={!newMessageText.trim()}
                  >
                    <Text style={styles.chatSendBtnText}>{editingMessageId ? 'Save' : 'Send'}</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableOpacity>

            {/* Toast Notification (centered globally) */}
            {toastMessage !== null && (
              <View style={styles.toastContainer} pointerEvents="none">
                <View style={styles.toastContent}>
                  <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </Modal>
      )}

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
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
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
  menuBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  patientDetailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
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
  patientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textDark,
    flex: 1,
    marginRight: 12,
  },
  patientIpBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  overallTatBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  overallTatTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  overallTatText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  overallTatProgressContainer: {
    alignItems: 'flex-end',
  },
  overallTatStagesText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  overallTatProgressValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  specificationsList: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 12,
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    width: '35%',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
    textAlign: 'right',
  },
  timelineSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
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
  timelineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 12,
  },
  timelineCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  bgGreen: { backgroundColor: '#22c55e' },
  bgOrange: { backgroundColor: '#ea580c' },
  bgRed: { backgroundColor: '#ef4444' },
  legendLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItemRow: {
    flexDirection: 'row',
    minHeight: 66,
  },
  timelineGraphicCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  timelineDotCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timelineDotInnerCode: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  timelineVerticalLine: {
    position: 'absolute',
    top: 22,
    bottom: -10,
    width: 2,
    backgroundColor: '#e2e8f0',
    zIndex: 1,
  },
  timelineDetailsCol: {
    flex: 1,
    paddingTop: 1,
  },
  stageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stageTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
    paddingRight: 8,
  },
  tatLimitText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
  stageTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stageTimeText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 8,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
  chatBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#efeae2', // WhatsApp styled light beige background
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  chatHeader: {
    backgroundColor: THEME.colors.primary,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sheetHandleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  chatHeaderBackBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  chatBackArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  chatHeaderTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 8,
  },
  chatHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  chatHeaderSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  chatHeaderRightPlaceholder: {
    width: 32,
  },
  chatListContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  messageRowSelf: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageBubbleSelf: {
    backgroundColor: '#dcf8c6', // WhatsApp green bubble
    borderTopRightRadius: 2,
  },
  messageBubbleOther: {
    backgroundColor: '#ffffff', // WhatsApp white bubble
    borderTopLeftRadius: 2,
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#128c7e', // WhatsApp green theme color
    marginBottom: 4,
  },
  messageSenderSelf: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 9,
    color: '#64748b',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 14,
    color: '#1e293b',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatSendBtn: {
    marginLeft: 8,
    backgroundColor: THEME.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  chatSendBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  editingBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  editingBannerText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  editingCancelText: {
    fontSize: 18,
    color: '#64748b',
    paddingHorizontal: 8,
    fontWeight: '700',
  },
  deletedMessageText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: '#64748b',
  },
  editedIndicatorText: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },
  floatingActionMenu: {
    position: 'absolute',
    top: -55, // float above the message bubble
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  floatingMenuSelf: {
    right: 0,
  },
  floatingMenuOther: {
    left: 0,
  },
  floatingActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  floatingActionIcon: {
    fontSize: 16,
  },
  floatingActionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  toastContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  toastContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)', // sleek dark slate
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: THEME.colors.screenBg,
  },
  loadingBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
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
  tpaTitleInfoText: {
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 3,
  },
  noTatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  floatingChatBtn: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 999,
  },
  floatingChatBtnInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 38,
    width: 76,
    height: 76,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  floatingChatIcon: {
    fontSize: 20,
    marginTop: 4,
  },
  floatingChatText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 13,
  },
});
