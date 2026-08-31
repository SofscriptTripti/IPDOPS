import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { UserSessionData } from '../services/authService';
import { trackerService } from '../services/trackerService';
import { OtCallRegisterItem } from './OTDashboardScreen';
import Icon from 'react-native-vector-icons/Ionicons';

interface OTEditBookingScreenProps {
  sessionData: UserSessionData;
  booking: OtCallRegisterItem;
  onBack: () => void;
  onSaved: () => void;
}

type YesNo = 'Y' | 'N' | null;

const CLINICAL_FIELDS: { key: keyof OtCallRegisterItem; label: string }[] = [
  { key: 'cbc', label: 'CBC' },
  { key: 'creat', label: 'Creat' },
  { key: 'ptInr', label: 'PT / INR' },
  { key: 'vdrlHiv', label: 'VDRL / HIV' },
  { key: 'xray', label: 'X-Ray' },
  { key: 'echo2d', label: '2D Echo' },
  { key: 'mrsa', label: 'MRSA' },
  { key: 'bloodThinner', label: 'Blood Thinner' },
  { key: 'fitness', label: 'Fitness' },
];

const STATUS_OPTIONS = ['OPEN', 'CLOSED', 'CANCELLED'];

const parseDate = (value: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDMY = (value: string | null): string => {
  const d = parseDate(value);
  if (!d) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatDisplayDateTime = (value: string | null): string => {
  if (!value) return 'Select Date & Time';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timePart = `${pad(hours)}:${pad(d.getMinutes())} ${ampm}`;
  return `${datePart} , ${timePart}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

const toYesNo = (value: string | null | undefined): YesNo => {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper === 'Y' || upper === 'YES') return 'Y';
  if (upper === 'N' || upper === 'NO') return 'N';
  return null;
};

const YES_NO_OPTIONS: YesNo[] = ['Y', 'N', null];
const yesNoLabel = (value: YesNo): string => (value === 'Y' ? 'Yes' : value === 'N' ? 'No' : '--');

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: 'rgba(0, 123, 191, 0.12)', text: THEME.colors.secondary },
  CLOSED: { bg: 'rgba(34, 197, 94, 0.12)', text: '#16a34a' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626' },
};

// Any value straight from the backend renders as-is. A null/blank value shows
// a muted "--" so it's clearly "no data from the server" rather than a real value.
const FieldValue = ({ value }: { value: string | null | undefined }) => {
  if (value && value.trim()) {
    return <Text style={styles.fieldValue}>{value}</Text>;
  }
  return <Text style={styles.fieldValueEmpty}>--</Text>;
};

export const OTEditBookingScreen = ({ sessionData, booking, onBack, onSaved }: OTEditBookingScreenProps) => {
  const insets = useSafeAreaInsets();

  // The list card only tells us WHICH booking was tapped (its id). Every field
  // shown/edited here comes from otCallRegister/getById, never from the dashboard's list data.
  const [record, setRecord] = useState<OtCallRegisterItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [openClinicalField, setOpenClinicalField] = useState<string | null>(null);

  const [status, setStatus] = useState('OPEN');
  const [cathlabAdvice, setCathlabAdvice] = useState('');
  const [remark, setRemark] = useState('');
  const [clinicalValues, setClinicalValues] = useState<Record<string, YesNo>>({});
  const [clinicalDates, setClinicalDates] = useState<Record<string, string>>({});

  const [selectedPickerField, setSelectedPickerField] = useState<string | null>(null);
  const [pickerInitialValue, setPickerInitialValue] = useState<string>('');
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerStep, setPickerStep] = useState<'date' | 'time'>('date');

  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempDay, setTempDay] = useState(new Date().getDate());
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempAmPm, setTempAmPm] = useState<'AM' | 'PM'>('AM');

  const applyRecord = useCallback((r: OtCallRegisterItem) => {
    setRecord(r);
    setStatus(r.status || 'OPEN');
    setCathlabAdvice(r.cathlabAdvice || '');
    setRemark(r.remark || '');
    const values: Record<string, YesNo> = {};
    CLINICAL_FIELDS.forEach(f => {
      values[f.key as string] = toYesNo(r[f.key] as string | null);
    });
    setClinicalValues(values);

    const dates: Record<string, string> = {
      cbc: r.cbcDtTm || '',
      creat: r.creatDtTm || r.CreatDtTm || '',
      ptInr: r.ptInrDtTm || r['PT/INRCrTm'] || '',
      vdrlHiv: r.vdrlHivDtTm || r['VDRL/HIVDtTm'] || '',
      xray: r.xrayDtTm || r['X-RayDtTm'] || '',
      echo2d: r.echo2dDtTm || r['2DEchoDtTm'] || '',
    };
    setClinicalDates(dates);
  }, []);

  const fetchDetails = useCallback(async () => {
    setIsLoadingDetails(true);
    setLoadError(null);
    try {
      const res = await trackerService.getOtBookingById(sessionData.token, {
        cocd: sessionData.coCd || '1',
        div: sessionData.div || 1,
        loc: sessionData.loc || 1,
        userId: sessionData.userId,
        id: booking.id,
      });

      if (res && res.success && res.data) {
        applyRecord(res.data);
      } else {
        setLoadError(res?.message || 'No booking details returned from the server.');
      }
    } catch (err: any) {
      console.warn('Failed to load OT booking details:', err);
      setLoadError(err?.message || 'Failed to connect to the server.');
    } finally {
      setIsLoadingDetails(false);
    }
  }, [booking.id, sessionData, applyRecord]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (showPickerModal) {
      setPickerStep('date');
      const initialDate = pickerInitialValue ? new Date(pickerInitialValue) : new Date();
      if (!isNaN(initialDate.getTime())) {
        setTempYear(initialDate.getFullYear());
        setTempMonth(initialDate.getMonth() + 1);
        setTempDay(initialDate.getDate());
        
        let hr = initialDate.getHours();
        const ampm = hr >= 12 ? 'PM' : 'AM';
        hr = hr % 12;
        hr = hr ? hr : 12;
        setTempHour(hr);
        setTempMinute(initialDate.getMinutes());
        setTempAmPm(ampm);
      }
    }
  }, [showPickerModal, pickerInitialValue]);

  const adjustMonth = (delta: number) => {
    let nextMonth = tempMonth + delta;
    let nextYear = tempYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    const maxDays = getDaysInMonth(nextYear, nextMonth);
    const clampedDay = Math.min(tempDay, maxDays);
    
    setTempMonth(nextMonth);
    setTempYear(nextYear);
    setTempDay(clampedDay);
  };

  const adjustYear = (delta: number) => {
    const nextYear = tempYear + delta;
    const maxDays = getDaysInMonth(nextYear, tempMonth);
    const clampedDay = Math.min(tempDay, maxDays);
    
    setTempYear(nextYear);
    setTempDay(clampedDay);
  };

  const handleSaveDateTime = () => {
    if (!selectedPickerField) return;
    let militaryHour = tempHour % 12;
    if (tempAmPm === 'PM') militaryHour += 12;
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const isoStr = `${tempYear}-${pad(tempMonth)}-${pad(tempDay)}T${pad(militaryHour)}:${pad(tempMinute)}:00`;
    
    setClinicalDates(prev => ({ ...prev, [selectedPickerField]: isoStr }));
    setShowPickerModal(false);
  };

  const handleSave = async () => {
    if (!record) return;
    setIsSaving(true);
    try {
      const payload = {
        cocd: sessionData.coCd || '1',
        div: sessionData.div || 1,
        loc: sessionData.loc || 1,
        userId: sessionData.userId,
        id: record.id,
        cathlabAdvice: cathlabAdvice.trim() || null,
        status,
        cbc: clinicalValues.cbc,
        cbcDtTm: clinicalDates.cbc?.trim() || null,
        creat: clinicalValues.creat,
        creatDtTm: clinicalDates.creat?.trim() || null,
        ptInr: clinicalValues.ptInr,
        ptInrDtTm: clinicalDates.ptInr?.trim() || null,
        vdrlHiv: clinicalValues.vdrlHiv,
        vdrlHivDtTm: clinicalDates.vdrlHiv?.trim() || null,
        xray: clinicalValues.xray,
        xrayDtTm: clinicalDates.xray?.trim() || null,
        echo2d: clinicalValues.echo2d,
        echo2dDtTm: clinicalDates.echo2d?.trim() || null,
        mrsa: clinicalValues.mrsa,
        bloodThinner: clinicalValues.bloodThinner,
        fitness: clinicalValues.fitness,
        remark: remark.trim() || null,
      };

      const res = await trackerService.updateOtBooking(sessionData.token, payload);

      if (res && res.success) {
        onSaved();
        onBack();
      } else {
        Alert.alert('Failed to save', res?.message || 'The server rejected the update. Please retry.');
      }
    } catch (err: any) {
      console.warn('Failed to update OT booking:', err);
      Alert.alert('Failed to save', err?.message || 'Could not reach the server. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ backgroundColor: THEME.colors.primary, height: insets.top }}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />
      </View>

      {/* Header — same style as Patient Discharge Timeline */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} style={styles.headerSide} onPress={onBack}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Edit OT Booking</Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      {!record ? (
        <View style={styles.centerState}>
          {isLoadingDetails ? (
            <>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.centerStateText}>Loading booking details…</Text>
            </>
          ) : (
            <>
              <Text style={styles.centerStateError}>{loadError || 'Unable to load this booking.'}</Text>
              <TouchableOpacity activeOpacity={0.8} style={styles.retryBtn} onPress={fetchDetails}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Patient banner — replaces showing name/IP in the header bar */}
          <View style={styles.patientBanner}>
            <Text style={styles.patientBannerName} numberOfLines={1}>{record.patientName || '--'}</Text>
            <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <View style={[styles.patientBannerIpBadge, { marginBottom: 4 }]}>
                <Text style={styles.patientBannerIpText}>
                  <Text style={{ color: '#000000' }}>Patient No: </Text>
                  {record.patientNo || '--'}
                </Text>
              </View>
              <View style={styles.patientBannerIpBadge}>
                <Text style={styles.patientBannerIpText}>
                  <Text style={{ color: '#000000' }}>IP No: </Text>
                  {record.ipNo || '--'}
                </Text>
              </View>
            </View>
          </View>

          {/* Patient & Schedule */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionAccentDot, { backgroundColor: THEME.colors.primary }]} />
                <Text style={styles.sectionTitle}>Patient & Schedule</Text>
              </View>

              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowStatusPicker(!showStatusPicker)}>
                <View style={[styles.statusCornerBadge, { backgroundColor: (STATUS_COLORS[status] || STATUS_COLORS.OPEN).bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: (STATUS_COLORS[status] || STATUS_COLORS.OPEN).text }]} />
                  <Text style={[styles.statusCornerBadgeText, { color: (STATUS_COLORS[status] || STATUS_COLORS.OPEN).text }]}>
                    {status}
                  </Text>
                  <Text style={[styles.selectChevron, { color: (STATUS_COLORS[status] || STATUS_COLORS.OPEN).text }]}>
                    {showStatusPicker ? '▴' : '▾'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {showStatusPicker && (
              <View style={[styles.optionsBox, styles.statusOptionsBoxCorner]}>
                {STATUS_OPTIONS.map(opt => {
                  const active = status === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      activeOpacity={0.7}
                      style={styles.optionRow}
                      onPress={() => {
                        setStatus(opt);
                        setShowStatusPicker(false);
                      }}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt}</Text>
                      {active && <Text style={styles.optionCheckmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.fieldsGrid}>
              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCellFull}>
                  <Text style={styles.fieldLabel}>Surgery Name</Text>
                  <FieldValue value={record.surgeryName} />
                </View>
              </View>

              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>OT Booking Date</Text>
                  <FieldValue value={record.otBookingDate ? formatDMY(record.otBookingDate) : null} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Admission Date</Text>
                  <FieldValue value={record.admissionDate ? formatDMY(record.admissionDate) : null} />
                </View>
              </View>

              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>
                    {record.rescheduleDate ? 'Planned Surgery Date' : 'Actual Surgery Date'}
                  </Text>
                  <FieldValue value={record.actualSurgeryDate ? formatDMY(record.actualSurgeryDate) : null} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Reschedule Date</Text>
                  <FieldValue value={record.rescheduleDate ? formatDMY(record.rescheduleDate) : null} />
                </View>
              </View>

              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>OT Name</Text>
                  <FieldValue value={record.otName} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Age / Sex</Text>
                  <FieldValue value={record.ageSex} />
                </View>
              </View>

              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Ward</Text>
                  <FieldValue value={record.ward} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>TPA / Self</Text>
                  <FieldValue value={record.tpaSelf} />
                </View>
              </View>

              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>From Time</Text>
                  <FieldValue value={record.fromTime} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>To Time</Text>
                  <FieldValue value={record.toTime} />
                </View>
              </View>

              <View style={[styles.fieldRowPlain, styles.fieldRowLastPlain]}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Surgeon Doctor</Text>
                  <FieldValue value={record.surgeonDoctor} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Robotic</Text>
                  <View style={[styles.miniBadge, record.robotic ? styles.miniBadgeYes : styles.miniBadgeNo]}>
                    <Text style={[styles.miniBadgeText, record.robotic ? styles.miniBadgeTextYes : styles.miniBadgeTextNo]}>
                      {record.robotic || 'No'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Clinical Clearance */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionAccentDot, { backgroundColor: THEME.colors.success }]} />
                <Text style={styles.sectionTitle}>Clinical Clearance</Text>
              </View>
            </View>

            <View style={styles.fieldsGrid}>
              {Array.from({ length: Math.ceil(CLINICAL_FIELDS.length / 2) }).map((_, rowIdx) => {
                const rowFields = CLINICAL_FIELDS.slice(rowIdx * 2, rowIdx * 2 + 2);
                const isLastRow = rowIdx === Math.ceil(CLINICAL_FIELDS.length / 2) - 1;
                return (
                  <View key={rowIdx} style={[styles.fieldRowPlain, isLastRow && styles.fieldRowLastPlain]}>
                    {rowFields.map(field => {
                      const fieldKey = field.key as string;
                      const value = clinicalValues[fieldKey];
                      const isOpen = openClinicalField === fieldKey;
                      return (
                        <View key={fieldKey} style={styles.fieldCell}>
                          <Text style={styles.fieldLabel}>{field.label}</Text>
                          <View style={styles.controlsRow}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={[
                                styles.selectBox,
                                value === 'Y' && styles.selectBoxYes,
                                value === 'N' && styles.selectBoxNo,
                                ['cbc', 'creat', 'ptInr', 'vdrlHiv', 'xray', 'echo2d'].includes(fieldKey) ? { flex: 1, marginRight: 6 } : { flex: 1 },
                              ]}
                              onPress={() => setOpenClinicalField(isOpen ? null : fieldKey)}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.selectBoxText,
                                  value === null && styles.selectBoxTextPlaceholder,
                                  value === 'Y' && styles.selectBoxTextYes,
                                  value === 'N' && styles.selectBoxTextNo,
                                ]}
                              >
                                {yesNoLabel(value)}
                              </Text>
                              <Text
                                style={[
                                  styles.selectChevron,
                                  value === 'Y' && styles.selectBoxTextYes,
                                  value === 'N' && styles.selectBoxTextNo,
                                ]}
                              >
                                {isOpen ? '▴' : '▾'}
                              </Text>
                            </TouchableOpacity>

                            {['cbc', 'creat', 'ptInr', 'vdrlHiv', 'xray', 'echo2d'].includes(fieldKey) && (
                              <TouchableOpacity
                                activeOpacity={0.7}
                                style={[
                                  styles.dateTimeSelectBox,
                                  clinicalDates[fieldKey] ? styles.dateTimeSelectBoxActive : null,
                                  { flex: 1 },
                                ]}
                                onPress={() => {
                                  setSelectedPickerField(fieldKey);
                                  setPickerInitialValue(clinicalDates[fieldKey] || '');
                                  setShowPickerModal(true);
                                }}
                              >
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.dateTimeSelectBoxText,
                                    clinicalDates[fieldKey] ? styles.dateTimeSelectBoxTextActive : null
                                  ]}
                                >
                                  {clinicalDates[fieldKey] ? formatDisplayDateTime(clinicalDates[fieldKey]) : 'Select Date & Time'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          {isOpen && (
                            <View style={styles.optionsBox}>
                              {YES_NO_OPTIONS.map(opt => {
                                const active = value === opt;
                                return (
                                  <TouchableOpacity
                                    key={String(opt)}
                                    activeOpacity={0.7}
                                    style={styles.optionRow}
                                    onPress={() => {
                                      setClinicalValues(prev => ({ ...prev, [fieldKey]: opt }));
                                      setOpenClinicalField(null);
                                    }}
                                  >
                                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                                      {yesNoLabel(opt)}
                                    </Text>
                                    {active && <Text style={styles.optionCheckmark}>✓</Text>}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Cathlab Advice</Text>
            <TextInput
              style={styles.textInput}
              value={cathlabAdvice}
              onChangeText={setCathlabAdvice}
              placeholder="Enter cathlab advice"
              placeholderTextColor={THEME.colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Remark</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={remark}
              onChangeText={setRemark}
              placeholder="Enter remark"
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Billing & Notes */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionAccentDot, { backgroundColor: THEME.colors.warning }]} />
                <Text style={styles.sectionTitle}>Billing & Notes</Text>
              </View>
            </View>

            <View style={styles.fieldsGrid}>
              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Estimate 1</Text>
                  <FieldValue value={record.estimate1} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Estimate 2</Text>
                  <FieldValue value={record.estimate2} />
                </View>
              </View>

              <View style={styles.fieldRowPlain}>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Estimate 3</Text>
                  <FieldValue value={record.estimate3} />
                </View>
                <View style={styles.fieldCell}>
                  <Text style={styles.fieldLabel}>Clearance Amount</Text>
                  <FieldValue value={record.clearance} />
                </View>
              </View>

              {record.tpaSelf && String(record.tpaSelf).toUpperCase() === 'TPA' && (
                <View style={styles.fieldRowPlain}>
                  <View style={styles.fieldCell}>
                    <Text style={styles.fieldLabel}>TPA Approved Amount</Text>
                    <FieldValue value={record.tpaApprovedAmount !== null && record.tpaApprovedAmount !== undefined ? String(record.tpaApprovedAmount) : null} />
                  </View>
                  <View style={styles.fieldCell} />
                </View>
              )}

              <View style={[styles.fieldRowPlain, styles.fieldRowLastPlain]}>
                <View style={styles.fieldCellFull}>
                  <Text style={styles.fieldLabel}>Estimate Remark</Text>
                  <FieldValue value={record.estimateRemark} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky footer actions */}
        <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={styles.cancelBtn} onPress={onBack} disabled={isSaving}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      )}
      {/* DateTime Picker Modal */}
      <Modal
        visible={showPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            {/* Modal Header with close & back navigation */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.pickerHeader}>
                {pickerStep === 'date' ? 'Select Date' : 'Select Time'}
              </Text>
              <View style={styles.modalHeaderActions}>
                {pickerStep === 'time' && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.backToCalBtn}
                    onPress={() => setPickerStep('date')}
                  >
                    <Icon name="calendar-outline" size={22} color={THEME.colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.closeModalBtn}
                  onPress={() => setShowPickerModal(false)}
                >
                  <Text style={styles.closeModalBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {pickerStep === 'date' ? (
              <>
                {/* Year & Month select row */}
                <View style={styles.pickerNavRow}>
                  {/* Month navigation */}
                  <View style={styles.navBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.navBtnArrow}
                      onPress={() => adjustMonth(-1)}
                    >
                      <Text style={styles.navBtnArrowText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.navLabelText}>
                      {MONTH_NAMES[tempMonth - 1]}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.navBtnArrow}
                      onPress={() => adjustMonth(1)}
                    >
                      <Text style={styles.navBtnArrowText}>▶</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Year navigation */}
                  <View style={styles.navBlock}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.navBtnArrow}
                      onPress={() => adjustYear(-1)}
                    >
                      <Text style={styles.navBtnArrowText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.navLabelText}>{tempYear}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.navBtnArrow}
                      onPress={() => adjustYear(1)}
                    >
                      <Text style={styles.navBtnArrowText}>▶</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Calendar grid */}
                <View style={styles.calendarGrid}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
                    <View key={w} style={styles.calendarHeaderCell}>
                      <Text style={styles.calendarHeaderCellText}>{w}</Text>
                    </View>
                  ))}
                  {(() => {
                    const totalDays = getDaysInMonth(tempYear, tempMonth);
                    const firstDayIndex = getFirstDayOfMonth(tempYear, tempMonth);
                    const dayItems = [];
                    for (let i = 0; i < firstDayIndex; i++) {
                      dayItems.push({ isDummy: true, key: `dummy-${i}` });
                    }
                    for (let d = 1; d <= totalDays; d++) {
                      dayItems.push({ isDummy: false, day: d, key: `day-${d}` });
                    }
                    return dayItems.map(item => {
                      if (item.isDummy) {
                        return <View key={item.key} style={styles.calendarDayCellDummy} />;
                      }
                      const isSelected = tempDay === item.day;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          activeOpacity={0.7}
                          style={[styles.calendarDayCell, isSelected && styles.calendarDayCellSelected]}
                          onPress={() => {
                            setTempDay(item.day!);
                            setPickerStep('time');
                          }}
                        >
                          <Text style={[styles.calendarDayCellText, isSelected && styles.calendarDayCellTextSelected]}>
                            {item.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>

                {/* Date actions */}
                <View style={styles.pickerActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.pickerActionBtn, styles.pickerActionBtnClear]}
                    onPress={() => {
                      if (selectedPickerField) {
                        setClinicalDates(prev => ({ ...prev, [selectedPickerField]: '' }));
                      }
                      setShowPickerModal(false);
                    }}
                  >
                    <Text style={styles.pickerActionBtnTextClear}>Clear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.pickerActionBtn, styles.pickerActionBtnSave]}
                    onPress={() => setPickerStep('time')}
                  >
                    <Text style={styles.pickerActionBtnTextSave}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Time section */}
                <View style={styles.timeSectionContainer}>
                  <View style={styles.timeSelectorsRow}>
                    {/* Hours */}
                    <View style={styles.timeColumn}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.timeArrowBtn}
                        onPress={() => {
                          let nextHr = tempHour + 1;
                          if (nextHr > 12) nextHr = 1;
                          setTempHour(nextHr);
                        }}
                      >
                        <Text style={styles.timeArrowText}>▲</Text>
                      </TouchableOpacity>
                      <View style={styles.timeValueBox}>
                        <Text style={styles.timeValueText}>{String(tempHour).padStart(2, '0')}</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.timeArrowBtn}
                        onPress={() => {
                          let nextHr = tempHour - 1;
                          if (nextHr < 1) nextHr = 12;
                          setTempHour(nextHr);
                        }}
                      >
                        <Text style={styles.timeArrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.timeColon}>:</Text>

                    {/* Minutes */}
                    <View style={styles.timeColumn}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.timeArrowBtn}
                        onPress={() => {
                          let nextMin = tempMinute + 1;
                          if (nextMin > 59) nextMin = 0;
                          setTempMinute(nextMin);
                        }}
                      >
                        <Text style={styles.timeArrowText}>▲</Text>
                      </TouchableOpacity>
                      <View style={styles.timeValueBox}>
                        <Text style={styles.timeValueText}>{String(tempMinute).padStart(2, '0')}</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.timeArrowBtn}
                        onPress={() => {
                          let nextMin = tempMinute - 1;
                          if (nextMin < 0) nextMin = 59;
                          setTempMinute(nextMin);
                        }}
                      >
                        <Text style={styles.timeArrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    {/* AM/PM */}
                    <View style={styles.ampmContainer}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[styles.ampmBtn, tempAmPm === 'AM' && styles.ampmBtnActive]}
                        onPress={() => setTempAmPm('AM')}
                      >
                        <Text style={[styles.ampmBtnText, tempAmPm === 'AM' && styles.ampmBtnTextActive]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[styles.ampmBtn, tempAmPm === 'PM' && styles.ampmBtnActive]}
                        onPress={() => setTempAmPm('PM')}
                      >
                        <Text style={[styles.ampmBtnText, tempAmPm === 'PM' && styles.ampmBtnTextActive]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Time actions */}
                <View style={styles.pickerActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.pickerActionBtn, styles.pickerActionBtnClear]}
                    onPress={() => {
                      if (selectedPickerField) {
                        setClinicalDates(prev => ({ ...prev, [selectedPickerField]: '' }));
                      }
                      setShowPickerModal(false);
                    }}
                  >
                    <Text style={styles.pickerActionBtnTextClear}>Clear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.pickerActionBtn, styles.pickerActionBtnSave]}
                    onPress={handleSaveDateTime}
                  >
                    <Text style={styles.pickerActionBtnTextSave}>Set</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  header: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  // Fixed-width slot used on both sides of the title so it stays truly centered
  headerSide: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  centerStateText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  centerStateError: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.danger,
    textAlign: 'center',
    marginBottom: 18,
  },
  retryBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 1.5 },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  fieldsGrid: {
    flexDirection: 'column',
  },
  fieldRowPlain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  fieldRowLastPlain: {
    marginBottom: 0,
  },
  fieldCell: {
    width: '48%',
  },
  fieldCellFull: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: THEME.colors.textDark,
    lineHeight: 19,
  },
  // Muted "--" for fields the backend returned as null
  fieldValueEmpty: {
    fontSize: 14.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    lineHeight: 19,
  },
  miniBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniBadgeYes: {
    backgroundColor: THEME.colors.successBg,
  },
  miniBadgeNo: {
    backgroundColor: THEME.colors.dangerBg,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  miniBadgeTextYes: {
    color: THEME.colors.success,
  },
  miniBadgeTextNo: {
    color: THEME.colors.danger,
  },
  // Dropdown-style select box, shared by Status and the Yes/No/— clinical fields
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectBoxYes: {
    backgroundColor: THEME.colors.successBg,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  selectBoxNo: {
    backgroundColor: THEME.colors.dangerBg,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  selectBoxText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMedium,
  },
  selectBoxTextYes: {
    color: THEME.colors.success,
  },
  selectBoxTextNo: {
    color: THEME.colors.danger,
  },
  selectBoxTextPlaceholder: {
    color: THEME.colors.textMuted,
  },
  selectChevron: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusCornerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusCornerBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    marginRight: 4,
  },
  statusOptionsBoxCorner: {
    alignSelf: 'flex-end',
    minWidth: 140,
    marginTop: -8,
    marginBottom: 16,
  },
  patientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  patientBannerName: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginRight: 10,
  },
  patientBannerIpBadge: {
    paddingVertical: 2,
  },
  patientBannerIpText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  optionsBox: {
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textDark,
  },
  optionTextActive: {
    fontWeight: '800',
  },
  optionCheckmark: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
    color: THEME.colors.textDark,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  footerBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: { elevation: 8 },
    }),
  },
  saveBtn: {
    flex: 1,
    backgroundColor: THEME.colors.textDark,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: THEME.colors.textMedium,
    fontSize: 15,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dateTimeSelectBox: {
    flex: 1,
    height: 38,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dateTimeSelectBoxActive: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: THEME.colors.successBg,
  },
  dateTimeSelectBoxText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMedium,
  },
  dateTimeSelectBoxTextActive: {
    color: THEME.colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  pickerHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToCalBtn: {
    marginRight: 14,
    padding: 4,
  },
  backToCalBtnText: {
    fontSize: 18,
  },
  closeModalBtn: {
    padding: 4,
  },
  closeModalBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textLight,
  },
  pickerNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flex: 0.48,
    justifyContent: 'space-between',
  },
  navBtnArrow: {
    padding: 6,
  },
  navBtnArrowText: {
    fontSize: 11,
    color: THEME.colors.primary,
  },
  navLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  calendarHeaderCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  calendarHeaderCellText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  calendarDayCellDummy: {
    width: `${100 / 7}%`,
    height: 34,
  },
  calendarDayCellSelected: {
    backgroundColor: THEME.colors.primary,
  },
  calendarDayCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textDark,
  },
  calendarDayCellTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  timeSectionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginBottom: 16,
  },
  timeSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeSelectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeColumn: {
    alignItems: 'center',
    width: 44,
  },
  timeArrowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timeArrowText: {
    fontSize: 12,
    color: THEME.colors.primary,
  },
  timeValueBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    width: 36,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  timeValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  timeColon: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textDark,
    marginHorizontal: 8,
  },
  ampmContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginLeft: 16,
  },
  ampmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ampmBtnActive: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  ampmBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMedium,
  },
  ampmBtnTextActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  pickerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pickerActionBtnCancel: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  pickerActionBtnClear: {
    borderWidth: 1.5,
    borderColor: THEME.colors.danger,
  },
  pickerActionBtnSave: {
    backgroundColor: THEME.colors.primary,
  },
  pickerActionBtnTextCancel: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMedium,
  },
  pickerActionBtnTextClear: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.danger,
  },
  pickerActionBtnTextSave: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
