import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { ExitIcon } from '../components/Icons';

export interface TimelineStage {
  code: string;
  name: string;
  time: string;
  diffText?: string;
  status: 'green' | 'orange' | 'red';
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
}

interface PatientTimelineScreenProps {
  patient: PatientSessionDetails;
  onBack: () => void;
}

export const PatientTimelineScreen = ({ patient, onBack }: PatientTimelineScreenProps) => {
  const insets = useSafeAreaInsets();

  const handleCallDoctor = () => {
    Alert.alert('Phone Service', `Initiating call to ${patient.doctor}...`);
  };

  const handleSendReminder = () => {
    Alert.alert('SMS Service', `Reminder notification successfully sent for patient ${patient.name}.`);
  };

  // Map status colors for TAT overall badge
  const isOutOfTAT = patient.statusDetail === 'Out of TAT' || patient.statusDetail === 'Delayed';
  const isAtRisk = patient.statusDetail === 'At risk';
  
  const tatBg = isOutOfTAT ? '#fef2f2' : isAtRisk ? '#fffbeb' : '#f0fdf4';
  const tatBorder = isOutOfTAT ? '#fee2e2' : isAtRisk ? '#fef3c7' : '#dcfce7';
  const tatText = isOutOfTAT ? '#ef4444' : isAtRisk ? '#f59e0b' : '#22c55e';
  const tatLabel = isOutOfTAT ? 'Out of TAT range' : isAtRisk ? 'At risk' : 'Within TAT';

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
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerSubtitle}>PATIENT</Text>
          <Text style={styles.headerTitle}>Discharge Timeline</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.menuBtn}>
          <Text style={styles.menuText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Layout (Flex Row / Grid on Desktop, simple scroll stack on Mobile) */}
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Info Section: Left (Details Card) */}
        <View style={styles.patientDetailsCard}>
          <Text style={styles.patientName} numberOfLines={2}>
            {patient.name}
          </Text>

          {/* Overall TAT Badge */}
          <View style={[styles.overallTatBadge, { backgroundColor: tatBg, borderColor: tatBorder }]}>
            <View>
              <Text style={styles.overallTatTitle}>OVERALL TAT</Text>
              <Text style={[styles.overallTatText, { color: tatText }]}>{tatLabel}</Text>
            </View>
            <View style={styles.overallTatProgressContainer}>
              <Text style={styles.overallTatStagesText}>Stages done</Text>
              <Text style={styles.overallTatProgressValue}>{patient.stageProgress}/{patient.totalStages}</Text>
            </View>
          </View>

          {/* Detailed Specifications List */}
          <View style={styles.specificationsList}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>BED</Text>
              <Text style={styles.specValue}>{patient.bed}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>WARD</Text>
              <Text style={styles.specValue}>{patient.ward}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>SPECIALITY</Text>
              <Text style={styles.specValue}>{patient.speciality}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>DOCTOR</Text>
              <Text style={styles.specValue}>{patient.doctor}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PAYMENT BY</Text>
              <Text style={styles.specValue}>{patient.paymentBy}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PATIENT TYPE</Text>
              <Text style={styles.specValue}>{patient.patientType}</Text>
            </View>
          </View>
        </View>

        {/* Section Split: Right (Discharge Stages Vertical Timeline) */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineSectionHeader}>
            <Text style={styles.timelineCountText}>All {patient.totalStages} discharge stages</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.bgGreen]} /><Text style={styles.legendLabel}>OK</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.bgOrange]} /><Text style={styles.legendLabel}>Risk</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.bgRed]} /><Text style={styles.legendLabel}>Out</Text></View>
            </View>
          </View>

          {/* Vertical Timeline Stack */}
          <View style={styles.timelineList}>
            {patient.stages.map((stage, idx) => {
              const isLast = idx === patient.stages.length - 1;
              const dotBg = stage.status === 'green' ? '#22c55e' : stage.status === 'orange' ? '#ea580c' : '#ef4444';
              
              return (
                <View key={stage.code} style={styles.timelineItemRow}>
                  {/* Left Column: Vertical connector line and dot */}
                  <View style={styles.timelineGraphicCol}>
                    <View style={[styles.timelineDotCircle, { backgroundColor: dotBg }]}>
                      <Text style={styles.timelineDotInnerCode}>{stage.code}</Text>
                    </View>
                    {!isLast && <View style={styles.timelineVerticalLine} />}
                  </View>

                  {/* Right Column: Stage Details */}
                  <View style={styles.timelineDetailsCol}>
                    <View style={styles.stageTitleRow}>
                      <Text style={styles.stageTitleText}>{stage.name}</Text>
                      {stage.tatLimit && (
                        <Text style={styles.tatLimitText}>{stage.tatLimit}</Text>
                      )}
                    </View>

                    <View style={styles.stageTimeRow}>
                      <Text style={styles.stageTimeText}>{stage.time}</Text>
                      {stage.diffText && (
                        <View style={[styles.diffBadge, { backgroundColor: stage.status === 'green' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 88, 12, 0.1)' }]}>
                          <Text style={[styles.diffBadgeText, { color: stage.status === 'green' ? '#16a34a' : '#ea580c' }]}>
                            {stage.diffText}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.callDoctorBtn}
          onPress={handleCallDoctor}
        >
          <Text style={styles.callDoctorBtnText}>📞 Call Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.7} 
          style={styles.reminderBtn}
          onPress={handleSendReminder}
        >
          <Text style={styles.reminderBtnText}>💬 Send Reminder</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
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
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textDark,
    marginBottom: 14,
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
  callDoctorBtn: {
    flex: 1.2,
    marginRight: 12,
    backgroundColor: THEME.colors.primary,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callDoctorBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  reminderBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
