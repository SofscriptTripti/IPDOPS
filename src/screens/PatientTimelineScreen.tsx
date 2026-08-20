import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ExitIcon, EditIcon, DeleteIcon, DeleteEveryoneIcon, CopyIcon, ForwardIcon, NoEntryIcon, MessageTickIcon, InfoIcon, CloseIcon } from '../components/Icons';
import { trackerService } from '../services/trackerService';
import { signalRService } from '../services/signalrService';
import { UserSessionData } from '../services/authService';
import { LoadingIndicator } from '../components/LoadingIndicator';

export interface TimelineStage {
  code: string;
  name: string;
  time: string;
  diffText?: string;
  oldDiffText?: string;
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
  lastBillPreparedBy?: string | null;
  totalTat?: string;
  bedTurnoverTat?: string;
  remarks?: string | null;
  advGivenTm?: string | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
  timestamp: string;
  isDeleted?: boolean;
  deleteType?: number | null;
  isEdited?: boolean;
  isSeen?: boolean;
}


interface PatientTimelineScreenProps {
  patient: PatientSessionDetails;
  onBack: () => void;
  sessionData: UserSessionData;
  hasLoadedOnce: boolean;
  onLoadedOnce: () => void;
}

const calculateTat = (timeStart: any, timeEnd: any): string => {
  if (!timeStart || !timeEnd || typeof timeStart !== 'string' || typeof timeEnd !== 'string') return '-';
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

const formatTimeOnly = (timeStr: any): string => {
  if (!timeStr || typeof timeStr !== 'string') return '-';
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
  timeStart: any,
  timeEnd: any
): string => {
  const diffVal = calculateTat(timeStart, timeEnd);
  const startStr = formatTimeOnly(timeStart);
  const endStr = formatTimeOnly(timeEnd);
  return `${labelEnd} (${endStr}) - ${labelStart} (${startStr}) = ${diffVal}`;
};

const getStageColorCode = (p: any, sIdx: number): number => {
  if (!p) return 0;

  // 1. First, check if NewStageColors or StageColors is present in p
  if (p.NewStageColors && typeof p.NewStageColors === 'string') {
    const arr = p.NewStageColors.split(',');
    if (arr[sIdx] !== undefined) {
      const code = parseInt(arr[sIdx], 10);
      if (!isNaN(code) && code > 0) return code;
    }
  }
  if (p.StageColors && typeof p.StageColors === 'string') {
    const arr = p.StageColors.split(',');
    if (arr[sIdx] !== undefined) {
      const code = parseInt(arr[sIdx], 10);
      if (!isNaN(code) && code > 0) return code;
    }
  }

  // 2. Map individual fields from the details API response
  let val: any = undefined;
  switch (sIdx) {
    case 0: // T1: Discharge Advice
      val = p.TATDschgAdvGivenTm ?? p.NewTATDschgAdvGivenTm;
      break;
    case 1: // T2: Discharge Summary (Provisional)
      val = p.NewTATDschgSumProvTAT ?? p.DschgSumProvTAT;
      break;
    case 2: // T3: Last Indent by Nursing
      val = p.NewTATLastIssueReqDtTmTAT ?? p.LastIssueReqDtTmTAT;
      break;
    case 3: // T4: Last Issue by Pharmacy
      val = p.NewTATLastIssDtTmTAT ?? p.LastIssDtTmTAT;
      break;
    case 4: // T5: Last Issue Return Request (Nurse)
      val = p.NewTATLastIssReturnReqDtTmTAT ?? p.LastIssReturnReqDtTmTAT;
      break;
    case 5: // T6: Last Return Acknowledged by Pharmacy
      val = p.NewTATLastIssReturnDtTmTAT ?? p.LastIssReturnDtTmTAT;
      break;
    case 6: // T7: Last Nursing Acknowledgement
      val = p.NewTATLastNurseAcknIssDtTmTAT ?? p.LastNurseAcknIssDtTmTAT;
      break;
    case 7: // T8: Discharge Summary (Final)
      val = p.NewTATDschgSumFinalTAT ?? p.DschgSumFinalTAT;
      break;
    case 8: // T9: Last Bill Prepared
      val = p.NewTATLastBillDtTmTat ?? p.LastBillDtTmTAT;
      break;
    case 9: // T10: Bill Handed Over to Relative
      val = p.NewTATLastBillHandOverTAT ?? p.LastBillHandOverTAT;
      break;
    case 10: // T11: Bill Sent to TPA
      val = p.NewTATLastTPAInternalTAT ?? p.LastTPAInternalTAT;
      break;
    case 11: // T12: Sent for Claim Approval
      val = p.NewTATClaimApprSentTAT ?? p.ClaimApprSentTAT;
      break;
    case 12: // T13: TPA Approved
      val = p.NewTATLastTPATAT ?? p.NewTATLastTPAApprTAT1 ?? p.LastTPATAT;
      break;
    case 13: // T14: Final Billing Settlement
      val = p.NewTATLastStlmtDtTmTAT ?? p.LastStlmtDtTmTAT;
      break;
    case 14: // T15: Bed Vacant Time / Pt. Physically Left
      val = p.NewTATDischargeTAT ?? p.TATDischargeTAT ?? p.TATLastPatienTAT ?? p.NewTATLastPatienTAT;
      break;
    case 15: // T16: Bed Ready
      val = p.NewTATLastBedReadyTAT ?? p.LastBedReadyTAT;
      break;
  }

  if (val !== undefined && val !== null) {
    const code = parseInt(String(val), 10);
    if (!isNaN(code) && code > 0) return code;
  }

  // 3. Try fallback to NewT${sIdx+1}Status or T${sIdx+1}Status
  const key = `NewT${sIdx + 1}Status`;
  if (p[key] !== undefined && p[key] !== null) {
    const code = parseInt(p[key], 10);
    if (!isNaN(code) && code > 0) return code;
  }
  const oldKey = `T${sIdx + 1}Status`;
  if (p[oldKey] !== undefined && p[oldKey] !== null) {
    const code = parseInt(p[oldKey], 10);
    if (!isNaN(code) && code > 0) return code;
  }

  return 0;
};

const formatMsgTime = (dtStr: string) => {
  try {
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return dtStr;
  }
};

const formatDateTimeWithAmPm = (timeStr: any): string => {
  try {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const parts = timeStr.split('T');
    if (parts.length === 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      if (!datePart || !timePart) return timeStr;
      const dateSubparts = datePart.split('-');
      if (dateSubparts.length === 3) {
        const year = dateSubparts[0];
        const month = dateSubparts[1];
        const day = dateSubparts[2];
        if (!month || !day || timePart.length < 5) return timeStr;
        const hrs = parseInt(timePart.substring(0, 2), 10);
        const mins = timePart.substring(3, 5);
        if (isNaN(hrs)) return timeStr;
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
        const formattedHrs = String(displayHrs).padStart(2, '0');
        return `${day}/${month}/${year} , ${formattedHrs}:${mins} ${ampm}`;
      } else {
        if (timePart.length < 5) return timeStr;
        const hrs = parseInt(timePart.substring(0, 2), 10);
        const mins = timePart.substring(3, 5);
        if (isNaN(hrs)) return timeStr;
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
        const formattedHrs = String(displayHrs).padStart(2, '0');
        return `${formattedHrs}:${mins} ${ampm}`;
      }
    }
    return timeStr;
  } catch (e) {
    console.warn("formatDateTimeWithAmPm error:", e);
    return typeof timeStr === 'string' ? timeStr : '';
  }
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

  const [threadId, setThreadId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isFetchingChat, setIsFetchingChat] = useState(false);

  const [seenInfoVisible, setSeenInfoVisible] = useState(false);
  const [seenInfoLoading, setSeenInfoLoading] = useState(false);
  const [seenInfoData, setSeenInfoData] = useState<{
    seenBy: { userId: string; userName: string; lastReadMsgId: number }[];
    notSeenBy: { userId: string; userName: string; lastReadMsgId: number }[];
  } | null>(null);

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
          handleOpenChat();
        }
      }
    })
  ).current;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const loadChatStatus = useCallback(async () => {
    try {
      const ipNoNum = parseInt(String(activePatient?.ipNo || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (!ipNoNum) return;

      const res = await trackerService.chatUnreadCount(sessionData.token, {
        cocd: sessionData.coCd || "1",
        div: sessionData.div || 1,
        loc: sessionData.loc || 1,
        ipNo: ipNoNum,
        userId: sessionData.userId
      });

      if (res && res.success && res.data) {
        setUnreadCount(res.data.unreadCount || 0);
        if (res.data.threadId) {
          setThreadId(res.data.threadId);
        }
      }
    } catch (err) {
      console.warn('Failed to load chat status:', err);
    }
  }, [activePatient?.ipNo, sessionData]);

  const joinSignalRGroup = useCallback(async (targetThreadId: number) => {
    if (!signalRService.isConnected) {
      console.log('[SignalR] Connection is not active. Attempting to start connection before group join...');
      try {
        await signalRService.startConnection(sessionData.token, sessionData.userId);
      } catch (err) {
        console.warn('[SignalR] Failed to establish connection during group join:', err);
        return;
      }
    }
    try {
      await signalRService.invokeHubMethod('JoinThread', targetThreadId);
    } catch (err) {
      console.warn('[SignalR] Failed to join thread group:', targetThreadId, err);
    }
  }, [sessionData.userId]);

  const lastMarkReadRef = useRef<{ threadId: number | null; msgId: number }>({ threadId: null, msgId: 0 });

  const fetchMessages = useCallback(async (targetThreadId: number, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setIsFetchingChat(true);
      // Notify the backend hub that we are joining this chat group
      joinSignalRGroup(targetThreadId);
    }
    try {
      const res = await trackerService.chatGetMessages(sessionData.token, {
        threadId: targetThreadId,
        userId: sessionData.userId,
        afterMsgId: 0,
        beforeMsgId: 0,
        pageSize: 100
      });

      if (res && res.success && Array.isArray(res.data)) {
        const mapped = res.data.map((m: any) => ({
          id: String(m.msgId),
          userId: m.senderUsrId || m.senderUserId || '',
          userName: m.senderName || 'Staff',
          userRole: (m.senderUsrId || m.senderUserId) === sessionData.userId ? 'Me' : 'Team Member',
          text: m.msgText,
          timestamp: formatMsgTime(m.crtDtTm),
          isDeleted: m.isDeleted,
          deleteType: m.deleteType,
          isEdited: m.isEdited,
          isSeen: m.isSeen,
        }));
        setMessages(mapped);

        // Mark as read only if there's actually something new for this thread,
        // otherwise every poll/refresh would re-trigger a mark-read call.
        if (mapped.length > 0) {
          const maxMsgId = Math.max(...res.data.map((m: any) => m.msgId));
          const alreadyMarked = lastMarkReadRef.current.threadId === targetThreadId
            && lastMarkReadRef.current.msgId >= maxMsgId;

          if (!alreadyMarked) {
            lastMarkReadRef.current = { threadId: targetThreadId, msgId: maxMsgId };
            trackerService.chatMarkRead(sessionData.token, {
              threadId: targetThreadId,
              userId: sessionData.userId,
              lastReadMsgId: maxMsgId
            }).then(() => {
              setUnreadCount(0);
            }).catch(e => console.warn('Failed to mark read:', e));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch chat messages:', err);
    } finally {
      if (!silent) setIsFetchingChat(false);
    }
  }, [sessionData]);

  // Fallback polling: some backends don't yet push a SignalR event for edits/deletes,
  // so re-fetch periodically while the chat is open to keep both sides in sync.
  useEffect(() => {
    if (!isChatModalVisible || !threadId) return;
    const poll = setInterval(() => {
      fetchMessages(threadId, { silent: true });
    }, 5000);
    return () => clearInterval(poll);
  }, [isChatModalVisible, threadId, fetchMessages]);

  const handleOpenChat = async () => {
    setIsChatModalVisible(true);
    let activeThreadId = threadId;

    if (!activeThreadId) {
      setIsFetchingChat(true);
      try {
        const ipNoNum = parseInt(String(activePatient?.ipNo || '').replace(/[^0-9]/g, ''), 10) || 0;
        const res = await trackerService.chatGetOrCreateThread(sessionData.token, {
          cocd: sessionData.coCd || "1",
          div: sessionData.div || 1,
          loc: sessionData.loc || 1,
          ipNo: ipNoNum,
          ptnNo: 0,
          title: activePatient?.name || 'Patient Chat',
          userId: sessionData.userId,
          userName: sessionData.userNickName || 'Staff'
        });

        if (res && res.success && res.data && res.data.threadId) {
          activeThreadId = res.data.threadId;
          setThreadId(activeThreadId);
        }
      } catch (err) {
        console.warn('Failed to get/create chat thread:', err);
      } finally {
        setIsFetchingChat(false);
      }
    }

    if (activeThreadId) {
      fetchMessages(activeThreadId);
    }
  };

  useEffect(() => {
    loadChatStatus();
    const interval = setInterval(loadChatStatus, 15000);
    return () => clearInterval(interval);
  }, [loadChatStatus]);

  const threadIdRef = useRef<number | null>(null);
  const isChatModalVisibleRef = useRef(false);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  useEffect(() => {
    isChatModalVisibleRef.current = isChatModalVisible;
  }, [isChatModalVisible]);

  useEffect(() => {
    if (!sessionData) return;

    console.log('[SignalR] Connecting to CareWorksOne chat hub...');
    signalRService.startConnection(sessionData.token, sessionData.userId)
      .then(() => {
        // If threadId is already active, make sure we join the group
        if (threadIdRef.current) {
          joinSignalRGroup(threadIdRef.current);
        }
      })
      .catch(err => console.warn('[SignalR] Failed to start connection on mount:', err));

    const handleReceiveMessage = (msg: any) => {
      console.log('[SignalR] Received message callback:', msg);
      if (!msg) return;
      
      const msgThreadId = msg.threadId ?? msg.ThreadId;
      const msgId = msg.msgId ?? msg.MsgId;
      const senderUsrId = msg.senderUsrId ?? msg.SenderUsrId ?? msg.senderUserId ?? msg.SenderUserId;
      const senderName = msg.senderName ?? msg.SenderName;
      const msgText = msg.msgText ?? msg.MsgText;
      const crtDtTm = msg.crtDtTm ?? msg.CrtDtTm;

      const currentThreadId = threadIdRef.current;
      if (currentThreadId && msgThreadId && String(msgThreadId) === String(currentThreadId)) {
        const isDeleted = msg.isDeleted ?? msg.IsDeleted ?? false;
        const deleteType = msg.deleteType ?? msg.DeleteType ?? null;
        const isEdited = msg.isEdited ?? msg.IsEdited ?? false;
        const isSeen = msg.isSeen ?? msg.IsSeen ?? false;

        const newMsg = {
          id: String(msgId || Date.now()),
          userId: senderUsrId || '',
          userName: senderName || 'Staff',
          userRole: senderUsrId === sessionData.userId ? 'Me' : 'Team Member',
          text: msgText || '',
          timestamp: formatMsgTime(crtDtTm || new Date().toISOString()),
          isDeleted,
          deleteType,
          isEdited,
          isSeen,
        };
        
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) {
            return prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg } : m);
          }
          return [...prev, newMsg];
        });

        if (isChatModalVisibleRef.current) {
          trackerService.chatMarkRead(sessionData.token, {
            threadId: currentThreadId,
            userId: sessionData.userId,
            lastReadMsgId: Number(msgId) || 0
          }).catch(e => console.warn('[SignalR] failed to mark read:', e));
        }
      } else {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleUnreadCountUpdate = (data: any) => {
      console.log('[SignalR] Received unread count callback:', data);
      if (!data) return;
      const ipNoVal = data.ipNo ?? data.IpNo ?? data.IPNo;
      const unreadCountVal = data.unreadCount ?? data.UnreadCount;
      const activeIpClean = String(activePatient?.ipNo || '').replace(/[^0-9]/g, '');
      if (ipNoVal && (String(ipNoVal) === String(activePatient?.ipNo || '') || String(ipNoVal) === activeIpClean)) {
        setUnreadCount(unreadCountVal ?? 0);
      }
    };

    const handleRefresh = () => {
      console.log('[SignalR] Generic chat refresh signal received.');
      const currentThreadId = threadIdRef.current;
      if (currentThreadId) {
        fetchMessages(currentThreadId);
      }
    };

    signalRService.subscribeToReceiveMessage(handleReceiveMessage);
    signalRService.subscribeToUnreadCount(handleUnreadCountUpdate);
    signalRService.subscribeToRefresh(handleRefresh);

    return () => {
      signalRService.unsubscribeFromReceiveMessage(handleReceiveMessage);
      signalRService.unsubscribeFromUnreadCount(handleUnreadCountUpdate);
      signalRService.unsubscribeFromRefresh(handleRefresh);
      signalRService.stopConnection().catch(err => console.warn('[SignalR] Failed to stop connection on unmount:', err));
    };
  }, [sessionData]);

  useEffect(() => {
    if (isChatModalVisible && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isChatModalVisible, messages.length]);

  const handleSendMessage = async () => {
    if (!newMessageText.trim()) return;
    
    if (editingMessageId) {
      try {
        const res = await trackerService.chatEditMessage(sessionData.token, {
          threadId: threadId || 0,
          msgId: Number(editingMessageId),
          userId: sessionData.userId,
          msgText: newMessageText.trim()
        });

        if (res && res.success && res.data) {
          setMessages(prev =>
            prev.map(m =>
              m.id === editingMessageId
                ? {
                    ...m,
                    text: res.data.msgText,
                    isEdited: res.data.isEdited,
                    isDeleted: res.data.isDeleted,
                    deleteType: res.data.deleteType
                  }
                : m
            )
          );
        }
      } catch (err) {
        console.warn('Failed to edit chat message:', err);
        showCustomAlert('Error', 'Failed to edit message. Please retry.', 'warning');
      } finally {
        setEditingMessageId(null);
        setNewMessageText('');
      }
      return;
    }

    let activeThreadId = threadId;
    if (!activeThreadId) {
      try {
        const ipNoNum = parseInt(String(activePatient?.ipNo || '').replace(/[^0-9]/g, ''), 10) || 0;
        const res = await trackerService.chatGetOrCreateThread(sessionData.token, {
          cocd: sessionData.coCd || "1",
          div: sessionData.div || 1,
          loc: sessionData.loc || 1,
          ipNo: ipNoNum,
          ptnNo: 0,
          title: activePatient?.name || 'Patient Chat',
          userId: sessionData.userId,
          userName: sessionData.userNickName || 'Staff'
        });

        if (res && res.success && res.data && res.data.threadId) {
          activeThreadId = res.data.threadId;
          setThreadId(activeThreadId);
        }
      } catch (err) {
        console.warn('Failed to create thread on send:', err);
        showCustomAlert('Error', 'Unable to start chat connection.', 'warning');
        return;
      }
    }

    if (!activeThreadId) return;

    const messageContent = newMessageText.trim();
    setNewMessageText('');

    try {
      const res = await trackerService.chatSendMessage(sessionData.token, {
        threadId: activeThreadId,
        userId: sessionData.userId,
        userName: sessionData.userNickName || 'Staff',
        msgText: messageContent,
        parentMsgId: null
      });

      if (res && res.success) {
        fetchMessages(activeThreadId);
      }
    } catch (err) {
      console.warn('Failed to send chat message:', err);
      showCustomAlert('Error', 'Failed to send message. Please retry.', 'warning');
    }
  };

  const handleDeletePress = async (message: ChatMessage) => {
    try {
      const res = await trackerService.chatDeleteMessage(sessionData.token, {
        threadId: threadId || 0,
        msgId: Number(message.id),
        userId: sessionData.userId
      });

      if (res && res.success && res.data) {
        setMessages(prev =>
          prev.map(m =>
            m.id === message.id
              ? {
                  ...m,
                  isDeleted: res.data.isDeleted,
                  deleteType: res.data.deleteType,
                  text: res.data.msgText
                }
              : m
          )
        );
      }
    } catch (err) {
      console.warn('Failed to delete chat message:', err);
      showCustomAlert('Error', 'Failed to delete message. Please retry.', 'warning');
    }
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

  const handleShowSeenInfo = async (message: ChatMessage) => {
    setSeenInfoVisible(true);
    setSeenInfoLoading(true);
    setSeenInfoData(null);
    try {
      const res = await trackerService.chatGetMessageSeenBy(sessionData.token, {
        threadId: threadId || 0,
        msgId: Number(message.id),
        userId: sessionData.userId
      });

      if (res && res.success && res.data) {
        setSeenInfoData({
          seenBy: res.data.seenBy || [],
          notSeenBy: res.data.notSeenBy || []
        });
      }
    } catch (err) {
      console.warn('Failed to fetch message seen info:', err);
    } finally {
      setSeenInfoLoading(false);
    }
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
      setIsLoading(true);
      try {
        const ipNumberStr = (patient?.ipNo || '').replace(/[^0-9]/g, '');
        const ipnoVal = ipNumberStr ? parseInt(ipNumberStr, 10) : null;
        
        if (ipnoVal) {
          let yearVal = '2026';
          if (patient?.advGivenTm && patient.advGivenTm.length >= 4) {
            yearVal = patient.advGivenTm.substring(0, 4);
          } else {
            yearVal = String(new Date().getFullYear());
          }

          let startStr = `${yearVal}-07-01`;
          let endStr = `${yearVal}-07-15`;

          if (patient?.dateRange && patient.dateRange.includes('/')) {
            const match = patient.dateRange.match(/(\d{2})\/(\d{2})/);
            if (match) {
              const day = match[1];
              const month = match[2];
              const dayNum = parseInt(day, 10);
              const startDay = Math.max(1, dayNum - 2);
              const endDay = dayNum + 2;
              const startDayStr = startDay < 10 ? `0${startDay}` : `${startDay}`;
              const endDayStr = endDay < 10 ? `0${endDay}` : `${endDay}`;
              
              startStr = `${yearVal}-${month}-${startDayStr}`;
              endStr = `${yearVal}-${month}-${endDayStr}`;
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
              startStr = `${yearVal}-07-01`;
              endStr = `${yearVal}-07-15`;
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
              'Discharge Summary (Provisional)',
              'Last Indent by Nursing',
              'Last Issue by Pharmacy',
              'Last Issue Return Request (Nurse)',
              'Last Return Acknowledged by Pharmacy',
              'Last Nursing Acknowledgement',
              'Discharge Summary (Final)',
              'Last Bill Prepared',
              'Bill Handed Over to Relative',
              'Bill Sent to TPA',
              'Sent for Claim Approval',
              'TPA Approved',
              'Final Billing Settlement',
              'Bed Vacant Time / Pt. Physically Left',
              'Bed Ready'
            ];

            const formattedStages = stageNames.map((name, sIdx) => {
              let colorCode = getStageColorCode(p, sIdx);
              if (colorCode === 0 && patient?.stages?.[sIdx]) {
                const prevStatus = patient.stages[sIdx].status;
                if (prevStatus === 'green') colorCode = 1;
                else if (prevStatus === 'orange') colorCode = 2;
                else if (prevStatus === 'red') colorCode = 3;
              }
              let timeStr = '';
              let diffText = '';
              let oldDiffText = '';

              switch (sIdx) {
                case 0: // T1: Discharge Advice
                  timeStr = p.DschgAdvGivenTm || '';
                  diffText = '-';
                  oldDiffText = '-';
                  break;
                case 1: // T2: Discharge Summary (Provisional)
                  timeStr = p.DschgSumProvDtTm || '';
                  diffText = formatTatEquation('T1', 'T2', p.DschgAdvGivenTm, p.DschgSumProvDtTm);
                  oldDiffText = formatTatEquation('T1', 'T2', p.DschgAdvGivenTm, p.DschgSumProvDtTm);
                  break;
                case 2: // T3: Last Indent by Nursing
                  timeStr = p.LastIssueReqDtTm || '';
                  diffText = formatTatEquation('T2', 'T3', p.DschgSumProvDtTm, p.LastIssueReqDtTm);
                  oldDiffText = formatTatEquation('T1', 'T3', p.DschgAdvGivenTm, p.LastIssueReqDtTm);
                  break;
                case 3: // T4: Last Issue by Pharmacy
                  timeStr = p.LastIssDtTm || '';
                  diffText = formatTatEquation('T3', 'T4', p.LastIssueReqDtTm, p.LastIssDtTm);
                  oldDiffText = formatTatEquation('T1', 'T4', p.DschgAdvGivenTm, p.LastIssDtTm);
                  break;
                case 4: // T5: Last Issue Return Request (Nurse)
                  timeStr = p.LastIssReturnReqDtTm || '';
                  diffText = formatTatEquation('T4', 'T5', p.LastIssDtTm, p.LastIssReturnReqDtTm);
                  oldDiffText = formatTatEquation('T1', 'T5', p.DschgAdvGivenTm, p.LastIssReturnReqDtTm);
                  break;
                case 5: // T6: Last Return Acknowledged by Pharmacy
                  timeStr = p.LastIssReturnDtTm || '';
                  diffText = formatTatEquation('T5', 'T6', p.LastIssReturnReqDtTm, p.LastIssReturnDtTm);
                  oldDiffText = formatTatEquation('T1', 'T6', p.DschgAdvGivenTm, p.LastIssReturnDtTm);
                  break;
                case 6: // T7: Last Nursing Acknowledgement
                  timeStr = p.LastAcknIssDtTm || '';
                  diffText = formatTatEquation('T6', 'T7', p.LastIssReturnDtTm, p.LastAcknIssDtTm);
                  oldDiffText = formatTatEquation('T1', 'T7', p.DschgAdvGivenTm, p.LastAcknIssDtTm);
                  break;
                case 7: // T8: Discharge Summary (Final)
                  timeStr = p.DschgSumFinalDtTm || '';
                  diffText = '-';
                  oldDiffText = formatTatEquation('T1', 'T8', p.DschgAdvGivenTm, p.DschgSumFinalDtTm);
                  break;
                case 8: // T9: Last Bill Prepared
                  timeStr = p.LastBillDtTm || '';
                  diffText = formatTatEquation('T7', 'T9', p.LastAcknIssDtTm, p.LastBillDtTm);
                  oldDiffText = formatTatEquation('T2', 'T9', p.DschgSumProvDtTm, p.LastBillDtTm);
                  break;
                case 9: // T10: Bill Handed Over to Relative
                  timeStr = p.LastBillHandOverDtTm || p.BillHandoverDtTm || '';
                  diffText = formatTatEquation('T9', 'T10', p.LastBillDtTm, p.LastBillHandOverDtTm || p.BillHandoverDtTm);
                  oldDiffText = formatTatEquation('T1', 'T10', p.DschgAdvGivenTm, p.LastBillHandOverDtTm || p.BillHandoverDtTm);
                  break;
                case 10: // T11: Bill Sent to TPA
                  timeStr = p.LastTPAAplDtTm || '';
                  diffText = formatTatEquation('T10', 'T11', p.LastBillHandOverDtTm || p.BillHandoverDtTm, p.LastTPAAplDtTm);
                  oldDiffText = formatTatEquation('T1', 'T11', p.DschgAdvGivenTm, p.LastTPAAplDtTm);
                  break;
                case 11: // T12: Sent for Claim Approval
                  timeStr = p.ClaimApprSentDtTm || p.ClaimSentDtTm || '';
                  diffText = formatTatEquation('T11', 'T12', p.LastTPAAplDtTm, p.ClaimApprSentDtTm || p.ClaimSentDtTm);
                  oldDiffText = formatTatEquation('T1', 'T12', p.DschgAdvGivenTm, p.ClaimApprSentDtTm || p.ClaimSentDtTm);
                  break;
                case 12: // T13: TPA Approved
                  timeStr = p.LastTPAAprDtTm || '';
                  diffText = formatTatEquation('T12', 'T13', p.ClaimApprSentDtTm || p.ClaimSentDtTm, p.LastTPAAprDtTm);
                  oldDiffText = formatTatEquation('T11', 'T13', p.LastTPAAplDtTm, p.LastTPAAprDtTm);
                  break;
                case 13: // T14: Final Billing Settlement
                  timeStr = p.LastStlmtDtTm || '';
                  diffText = formatTatEquation('T13', 'T14', p.LastTPAAprDtTm, p.LastStlmtDtTm);
                  oldDiffText = formatTatEquation('T13', 'T14', p.LastTPAAprDtTm, p.LastStlmtDtTm);
                  break;
                case 14: // T15: Bed Vacant Time / Pt. Physically Left
                  timeStr = p.ActDschgDtTm || '';
                  diffText = formatTatEquation('T14', 'T15', p.LastStlmtDtTm, p.ActDschgDtTm);
                  oldDiffText = formatTatEquation('T13', 'T15', p.LastTPAAprDtTm, p.ActDschgDtTm);
                  break;
                case 15: // T16: Bed Ready
                  timeStr = p.BedReady || p.BedReadyDtTm || '';
                  diffText = formatTatEquation('T15', 'T16', p.ActDschgDtTm, p.BedReady || p.BedReadyDtTm);
                  oldDiffText = formatTatEquation('T15', 'T16', p.ActDschgDtTm, p.BedReady || p.BedReadyDtTm);
                  break;
              }

              let status: 'green' | 'orange' | 'red' | 'white' = 'white';
              if (colorCode === 1) status = 'green';
              else if (colorCode === 2) status = 'orange';
              else if (colorCode === 3) status = 'red';

               const displayTime = formatDateTimeWithAmPm(timeStr);

               return {
                 code: `T${sIdx + 1}`,
                 name,
                 time: displayTime,
                 diffText: diffText,
                 oldDiffText: oldDiffText,
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
               dateRangeText = `T1 - ${formatDateTimeWithAmPm(p.DschgAdvGivenTm)}`;
             }

            const totalTatVal = calculateTat(p.DschgAdvGivenTm, p.ActDschgDtTm);
            const bedTurnoverTatVal = calculateTat(p.DschgAdvGivenTm, p.BedReady || p.BedReadyDtTm);

            const mappedDetails: PatientSessionDetails = {
              id: p?.IPNo ? String(p.IPNo) : (patient?.id || ''),
              name: p?.PatientName || (patient?.name || 'PATIENT'),
              ipNo: p?.IPNo ? String(p?.IPNo) : (patient?.ipNo || ''),
              bed: p?.BedNo ? `Bed ${p.BedNo}` : (patient?.bed || ''),
              ward: p?.Ward || (patient?.ward || ''),
              speciality: p?.Splty_Cd || p?.Speciality || (patient?.speciality || ''),
              doctor: p?.DocNm || p?.DoctorName || p?.Doctor || (patient?.doctor || ''),
              stageProgress: formattedStages.filter(s => s.status !== 'white').length,
              totalStages: 16,
              dateRange: dateRangeText,
              status,
              statusDetail: patient?.statusDetail || 'Pending',
              paymentBy: p?.PtnPayTyp || (patient?.paymentBy || ''),
              patientType: p?.PatientType || (patient?.patientType || ''),
              stages: formattedStages,
              tpaAprDtTm: p?.LastTPAAprDtTm,
              tpaAprAmt: p?.LastTPAAprAmt,
              lastBillPreparedBy: p?.LastBillpreparedby || null,
              totalTat: totalTatVal,
              bedTurnoverTat: bedTurnoverTatVal,
              remarks: p?.Remarks || p?.remarks || p?.DschgRemarks || null,
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
  const isPending = activePatient?.statusDetail === 'Pending';
  const isOnTrack = activePatient?.statusDetail === 'On Track';
  const isRisk = activePatient?.statusDetail === 'Risk';
  const isDelay = activePatient?.statusDetail === 'Delay';

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
    : activePatient?.statusDetail || 'Pending';

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
              {activePatient?.name}
            </Text>
            {activePatient?.ipNo ? (
              <Text style={styles.patientIpBadge}>
                {String(activePatient.ipNo).startsWith('IP') ? activePatient.ipNo : `IP ${activePatient.ipNo}`}
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
              <Text style={styles.overallTatProgressValue}>{activePatient?.stageProgress}/{activePatient?.totalStages}</Text>
            </View>
          </View>

          {/* Detailed Specifications List */}
          <View style={styles.specificationsList}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>BED</Text>
              <Text style={styles.specValue}>{activePatient?.bed}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>WARD</Text>
              <Text style={styles.specValue}>{activePatient?.ward}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>SPECIALITY</Text>
              <Text style={styles.specValue}>{activePatient?.speciality}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>DOCTOR</Text>
              <Text style={styles.specValue}>{activePatient?.doctor}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PAYMENT BY</Text>
              <Text style={styles.specValue}>{activePatient?.paymentBy}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PATIENT TYPE</Text>
              <Text style={styles.specValue}>{activePatient?.patientType}</Text>
            </View>
            {/* <View style={styles.specItem}> */}
              {/* <Text style={styles.specLabel}>STATUS</Text>
              <Text style={styles.specValue}>{activePatient.status || '-'}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>REMARKS</Text>
              <Text style={styles.specValue}>{activePatient.remarks || '-'}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>TOTAL TAT</Text>
              <Text style={styles.specValue}>{activePatient.totalTat || '-'}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>BED TURNOVER TAT</Text>
              <Text style={styles.specValue}>{activePatient.bedTurnoverTat || '-'}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>LAST BILL PREPARED BY</Text>
              <Text style={styles.specValue}>{activePatient.lastBillPreparedBy || '-'}</Text>
            </View> */}
          </View>
        </View>

        {/* Section Split: Right (Discharge Stages Vertical Timeline) */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineSectionHeader}>
            <Text style={styles.timelineCountText}>All {activePatient?.totalStages || 16} discharge stages</Text>
          </View>

          {/* Vertical Timeline Stack */}
          <View style={styles.timelineList}>
            {(activePatient?.stages || []).map((stage, idx) => {
              const isLast = idx === (activePatient?.stages || []).length - 1;
              const isWhite = stage.status === 'white';
              const dotBg = isWhite ? '#ffffff' : stage.status === 'green' ? '#008000' : stage.status === 'orange' ? '#FFA500' : '#FF0000';
              const dotBorderColor = isWhite ? '#cbd5e1' : dotBg;
              const dotBorderWidth = isWhite ? 1.5 : 0;
              const dotTextColor = isWhite ? '#64748b' : '#ffffff';
              const showTimeRow = true;
              
              return (
                <View key={stage.code} style={[styles.timelineItemRow, { minHeight: showTimeRow ? 66 : 44 }]}>
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
                        {stage.code === 'T13' && (activePatient?.tpaAprDtTm || activePatient?.tpaAprAmt) && (
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
                                {activePatient?.tpaAprDtTm ? formatTimeOnly(activePatient.tpaAprDtTm) : '—'}
                              </Text>
                              {` | Amt: `}
                              <Text style={{ fontWeight: '800' }}>
                                {activePatient?.tpaAprAmt !== null && activePatient?.tpaAprAmt !== undefined ? `₹${activePatient.tpaAprAmt}` : '—'}
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

                    {showTimeRow && (
                      <View style={styles.stageTimeRow}>
                        <Text style={styles.stageTimeText}>{stage.time || '-'}</Text>
                        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                          {stage.diffText && stage.diffText !== '-' && !stage.diffText.endsWith('= -') ? (
                            <View style={[styles.diffBadge, { backgroundColor: (stage.status === 'green' || stage.status === 'white') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 88, 12, 0.1)', marginRight: 6, marginBottom: 3 }]}>
                              <Text style={[styles.diffBadgeText, { color: (stage.status === 'green' || stage.status === 'white') ? '#16a34a' : '#ea580c' }]}>
                                {stage.diffText}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.noTatText, { marginRight: 6, marginBottom: 3 }]}>{stage.diffText || '-'}</Text>
                          )}

                          {stage.code === 'T9' && activePatient?.lastBillPreparedBy ? (
                            <View style={[styles.diffBadge, { backgroundColor: 'rgba(34, 197, 94, 0.08)', marginBottom: 3 }]}>
                              <Text style={[styles.diffBadgeText, { color: '#16a34a' }]}>
                                {`Prepared By: ${activePatient?.lastBillPreparedBy}`}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    )}
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
          onPress={handleOpenChat}
          style={styles.floatingChatBtnInner}
        >
          <Text style={styles.floatingChatText}>Chat Log</Text>
          <Text style={styles.floatingChatIcon}>💬</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
     

      {/* Communication Chat Modal */}
      {isChatModalVisible && (
        <Modal
          visible={isChatModalVisible}
          transparent={true}
          statusBarTranslucent={true}
          animationType="slide"
          onRequestClose={() => setIsChatModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                      <Text style={styles.chatHeaderTitle} numberOfLines={1}>{activePatient?.name}</Text>
                      <Text style={styles.chatHeaderSubtitle}>
                        {activePatient?.ipNo} • {activePatient?.bed} • {activePatient?.ward}
                      </Text>
                    </View>
                    
                    <View style={styles.chatHeaderRightPlaceholder} />
                  </View>
                </View>
                
                {/* Messages Area */}
                <View style={{ flex: 1 }}>
                {/* Click-catcher backdrop to dismiss active tooltip */}
                {activeActionMessageId !== null && (
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => setActiveActionMessageId(null)}
                  />
                )}
                
                {isFetchingChat && messages.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={THEME.colors.primary} />
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.chatListContent}
                  renderItem={({ item }) => {
                    // Deleted before anyone saw it: drop it from the thread entirely.
                    if (item.isDeleted && item.deleteType === 1) {
                      return null;
                    }
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
                            <View style={styles.deletedMessageRow}>
                              <NoEntryIcon color="red" />
                              <Text style={styles.deletedMessageText}>
                                {item.text || (isSelf ? 'You deleted this message' : 'This message was deleted')}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.messageText}>
                              {item.text}
                              {item.isEdited && <Text style={styles.editedIndicatorText}> (edited)</Text>}
                            </Text>
                          )}
                          
                          <View style={styles.messageFooterRow}>
                            <Text style={styles.messageTimeInline}>{item.timestamp}</Text>
                            {isSelf && !item.isDeleted && (
                              <View style={styles.messageTickWrapper}>
                                <MessageTickIcon seen={!!item.isSeen} />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                  onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
              )}
                
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
              </View>
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
        </KeyboardAvoidingView>
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

      {/* Message Options Bottom Sheet Modal */}
      <Modal
        visible={activeActionMessageId !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveActionMessageId(null)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setActiveActionMessageId(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.optionsModalContent}
          >
            <View style={styles.optionsModalHandle} />
            <Text style={styles.optionsModalTitle}>Message Actions</Text>
            
            <View style={styles.optionsModalButtons}>
              {(() => {
                const msg = messages.find(m => m.id === activeActionMessageId);
                const isSelf = msg?.userId === sessionData.userId;
                
                return (
                  <>
                    {isSelf && msg && (
                      <TouchableOpacity
                        style={styles.optionsModalBtn}
                        onPress={() => {
                          setEditingMessageId(msg.id);
                          setNewMessageText(msg.text);
                          setActiveActionMessageId(null);
                          setTimeout(() => {
                            chatInputRef.current?.focus();
                          }, 80);
                        }}
                      >
                        <Text style={styles.optionsModalBtnText}>Edit Message</Text>
                      </TouchableOpacity>
                    )}

                    {msg && (
                      <TouchableOpacity
                        style={styles.optionsModalBtn}
                        onPress={() => {
                          handleCopyPress(msg);
                          setActiveActionMessageId(null);
                        }}
                      >
                        <Text style={styles.optionsModalBtnText}>Copy Text</Text>
                      </TouchableOpacity>
                    )}

                    {isSelf && msg && !msg.isDeleted && (
                      <TouchableOpacity
                        style={styles.optionsModalBtn}
                        onPress={() => {
                          setActiveActionMessageId(null);
                          handleShowSeenInfo(msg);
                        }}
                      >
                        <Text style={styles.optionsModalBtnText}>Info</Text>
                      </TouchableOpacity>
                    )}

                    {isSelf && msg && (
                      <TouchableOpacity
                        style={[styles.optionsModalBtn, styles.optionsModalDeleteBtn]}
                        onPress={() => {
                          handleDeletePress(msg);
                          setActiveActionMessageId(null);
                        }}
                      >
                        <Text style={styles.optionsModalDeleteBtnText}>Delete Message</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
              
              <TouchableOpacity
                style={[styles.optionsModalBtn, styles.optionsModalCancelBtn]}
                onPress={() => setActiveActionMessageId(null)}
              >
                <Text style={styles.optionsModalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Message Seen Info Modal */}
      <Modal
        visible={seenInfoVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSeenInfoVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setSeenInfoVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.optionsModalContent}>
            <View style={styles.optionsModalHandle} />
            <TouchableOpacity
              style={styles.seenInfoCloseBtn}
              onPress={() => setSeenInfoVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CloseIcon color="#64748b" />
            </TouchableOpacity>
            <View style={styles.seenInfoTitleRow}>
              <InfoIcon color={THEME.colors.primary} />
              <Text style={styles.seenInfoTitleText}>Message Info</Text>
            </View>

            {seenInfoLoading ? (
              <ActivityIndicator size="small" color={THEME.colors.primary} style={{ marginVertical: 24 }} />
            ) : (() => {
              const hasSeen = !!seenInfoData?.seenBy?.length;
              const hasNotSeen = !!seenInfoData?.notSeenBy?.length;

              if (!hasSeen && !hasNotSeen) {
                return <Text style={styles.seenInfoEmptyText}>Seen By NONE</Text>;
              }

              return (
                <ScrollView style={styles.seenInfoList} contentContainerStyle={{ paddingBottom: 8 }}>
                  {hasSeen && (
                    <>
                      <Text style={styles.seenInfoSectionLabel}>
                        Seen by ({seenInfoData!.seenBy.length})
                      </Text>
                      {seenInfoData!.seenBy.map((u) => (
                        <View key={`seen-${u.userId}`} style={styles.seenInfoRow}>
                          <MessageTickIcon seen={true} />
                          <Text style={styles.seenInfoUserName}>{u.userName}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {hasNotSeen && (
                    <>
                      <Text style={[styles.seenInfoSectionLabel, hasSeen && { marginTop: 16 }]}>
                        Not seen by ({seenInfoData!.notSeenBy.length})
                      </Text>
                      {seenInfoData!.notSeenBy.map((u) => (
                        <View key={`unseen-${u.userId}`} style={styles.seenInfoRow}>
                          <MessageTickIcon seen={false} />
                          <Text style={styles.seenInfoUserName}>{u.userName}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
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
  messageFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageTimeInline: {
    fontSize: 9,
    color: '#64748b',
  },
  messageTickWrapper: {
    marginLeft: 4,
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
  deletedMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedMessageText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: '#64748b',
    marginLeft: 5,
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
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  optionsModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  optionsModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
  },
  optionsModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  optionsModalButtons: {
    width: '100%',
  },
  optionsModalBtn: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionsModalBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  optionsModalDeleteBtn: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionsModalDeleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  optionsModalCancelBtn: {
    marginTop: 8,
    borderBottomWidth: 0,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  optionsModalCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  seenInfoCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  seenInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  seenInfoTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  seenInfoList: {
    width: '100%',
    maxHeight: 320,
  },
  seenInfoSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  seenInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  seenInfoUserName: {
    fontSize: 14,
    color: '#1e293b',
    marginLeft: 10,
    fontWeight: '600',
  },
  seenInfoEmptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
