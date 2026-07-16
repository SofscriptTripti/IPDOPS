import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { trackerService } from '../services/trackerService';
import { UserSessionData } from '../services/authService';

export interface SubModuleItem {
  ModCd: number;
  ModName: string;
  Netid: number;
  AppNo: number;
  SubModCd: number;
  SubModName: string;
  GroupText: string;
  path: string;
  IsMaster: boolean;
  IconFileName: string;
  colorName: string;
  apptype: string;
  OpenInNewTab: boolean;
}

interface SubModuleSelectionScreenProps {
  sessionData: UserSessionData;
  onSelectSubModule: (subModule: SubModuleItem) => void;
  onLogout: () => void;
}

const fallbackSubModules: SubModuleItem[] = [
  {
    ModCd: 490,
    ModName: "Mobile App",
    Netid: 40730,
    AppNo: 2,
    SubModCd: 1383,
    SubModName: "Ipd Ops",
    GroupText: "",
    path: "PatientDataTransfer/patientTransfer/PatientSearch",
    IsMaster: false,
    IconFileName: "Mobile.png",
    colorName: "#528894",
    apptype: "WEBFORMS",
    OpenInNewTab: false
  },
  {
    ModCd: 490,
    ModName: "Mobile App",
    Netid: 40731,
    AppNo: 2,
    SubModCd: 1384,
    SubModName: "Bed Turn Over",
    GroupText: "",
    path: "PatientDataTransfer/patientTransfer/PatientSearch",
    IsMaster: false,
    IconFileName: "Mobile.png",
    colorName: "#528894",
    apptype: "WEBFORMS",
    OpenInNewTab: false
  }
];

// Helper to get an icon or emoji based on the sub-module name
const getModuleIcon = (name: string): string => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('new patient') || lowercaseName.includes('add patient')) return '👤';
  if (lowercaseName.includes('edit') || lowercaseName.includes('demographics')) return '📝';
  if (lowercaseName.includes('mlc')) return '🛡️';
  if (lowercaseName.includes('deposit') || lowercaseName.includes('transfer')) return '💸';
  if (lowercaseName.includes('discharge') || lowercaseName.includes('tracker')) return '⏱️';
  if (lowercaseName.includes('ipd') || lowercaseName.includes('ops')) return '📊';
  if (lowercaseName.includes('bed') || lowercaseName.includes('turn')) return '🛏️';
  return '📁';
};

export const SubModuleSelectionScreen = ({
  sessionData,
  onSelectSubModule,
  onLogout,
}: SubModuleSelectionScreenProps) => {
  const insets = useSafeAreaInsets();
  const [subModules, setSubModules] = useState<SubModuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubModules = async () => {
      try {
        console.log('Fetching CareWorks submodules for userId:', sessionData.userId);
        const res = await trackerService.getSubModules(sessionData.token, sessionData.userId);
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          console.log('Successfully fetched submodules:', res.data.length);
          setSubModules(res.data);
        } else {
          console.log('No submodules returned from API, using fallback data');
          setSubModules(fallbackSubModules);
        }
      } catch (err) {
        console.warn('Failed to load submodules, using fallback data:', err);
        setSubModules(fallbackSubModules);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubModules();
  }, [sessionData]);

  if (isLoading) {
    return <LoadingIndicator message="Loading Modules." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />
      
      {/* Header bar - Center aligned using App Teal Theme */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Select Module</Text>
          <Text style={styles.headerSubtitle}>{sessionData.companyName || 'CareWorks One'}</Text>
        </View>
      </View>

      {/* Vertical premium full-width card list in app theme colors */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {subModules.map((item) => {
            const iconStr = getModuleIcon(item.SubModName);
            // Dynamic card accent from API colorName or default theme primary color
            const cardAccentColor = item.colorName?.trim() || THEME.colors.primary;

            return (
              <TouchableOpacity
                key={item.SubModCd}
                activeOpacity={0.85}
                style={[styles.card, { borderLeftColor: cardAccentColor }]}
                onPress={() => onSelectSubModule(item)}
              >
                <View style={styles.cardLeftContent}>
                  <View style={[styles.iconCircle, { backgroundColor: cardAccentColor + '12' }]}>
                    <Text style={styles.iconEmoji}>{iconStr}</Text>
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.SubModName}
                    </Text>
                    <Text style={styles.cardModuleGroup} numberOfLines={1}>
                      {item.ModName}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevronContainer}>
                  <View style={styles.chevronRight} />
                </View>
              </TouchableOpacity>
            );
          })}
          
          {/* Back to Login Button at the end of the list */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backToLoginBtn}
            onPress={onLogout}
          >
            <View style={styles.underlineWrapper}>
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.screenBg, // Light App Theme Background
  },
  header: {
    height: 70,
    backgroundColor: THEME.colors.primary, // App Teal Theme Primary Color
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  listContainer: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff', // Clean white background
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#0b665c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconEmoji: {
    fontSize: 20,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textDark, // Dark text color matching theme
    marginBottom: 4,
  },
  cardModuleGroup: {
    fontSize: 12,
    color: THEME.colors.textMuted, // Muted gray text matching theme
    fontWeight: '500',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chevronRight: {
    width: 8,
    height: 8,
    borderColor: '#cbd5e1',
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  backToLoginBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 32,
  },
  underlineWrapper: {
    borderBottomWidth: 1.5,
    borderBottomColor: THEME.colors.primary,
    paddingBottom: 3, // gap between text and underline
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
});
