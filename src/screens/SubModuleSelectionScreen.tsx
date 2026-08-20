import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { trackerService } from '../services/trackerService';
import { UserSessionData } from '../services/authService';
import { SearchIcon } from '../components/Icons';

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

// -------------------------------------------------------------
// VECTOR ILLUSTRATION COMPONENTS (CSS shapes to match image layout)
// -------------------------------------------------------------

const SettingsSlidersIcon = ({ color = '#1e293b' }) => (
  <View style={styles.settingsSliders}>
    {/* Line 1 */}
    <View style={styles.settingsSlidersLine}>
      <View style={[styles.sliderTrackShort, { backgroundColor: color }]} />
      <View style={[styles.sliderKnob, { borderColor: color }]} />
      <View style={[styles.sliderTrackFull, { backgroundColor: color }]} />
    </View>
    {/* Line 2 */}
    <View style={styles.settingsSlidersLine}>
      <View style={[styles.sliderTrackFull, { backgroundColor: color }]} />
      <View style={[styles.sliderKnob, { borderColor: color }]} />
      <View style={[styles.sliderTrackShort, { backgroundColor: color }]} />
    </View>
    {/* Line 3 */}
    <View style={styles.settingsSlidersLine}>
      <View style={[styles.sliderTrackMedium, { backgroundColor: color }]} />
      <View style={[styles.sliderKnob, { borderColor: color }]} />
      <View style={[styles.sliderTrackFull, { backgroundColor: color }]} />
    </View>
  </View>
);

const ChevronRightMini = ({ color }: { color: string }) => (
  <View style={[styles.chevronRightMini, { borderColor: color }]} />
);

// CSS-rendered Bed Illustration (SCALED UP)
const BedIllustration = ({ color }: { color: string }) => (
  <View style={styles.bedIllustration}>
    {/* Headboard */}
    <View style={[styles.bedHeadboard, { backgroundColor: color }]} />
    {/* Footboard */}
    <View style={[styles.bedFootboard, { backgroundColor: color }]} />
    {/* Mattress */}
    <View style={[styles.bedMattress, { backgroundColor: color }]} />
    {/* Pillow */}
    <View style={[styles.bedPillow, { backgroundColor: color }]} />
    {/* Person silhouette */}
    <View style={[styles.bedPersonHead, { backgroundColor: color }]} />
    <View style={[styles.bedPersonBody, { backgroundColor: color }]} />
  </View>
);

// CSS-rendered Headset Illustration (SCALED UP)
const HeadsetIllustration = ({ color }: { color: string }) => (
  <View style={styles.headsetIllustration}>
    {/* Arc */}
    <View style={[styles.headsetArc, { borderColor: color }]} />
    {/* Ear cups */}
    <View style={[styles.headsetLeftCup, { backgroundColor: color }]} />
    <View style={[styles.headsetRightCup, { backgroundColor: color }]} />
    {/* Mic */}
    <View style={[styles.headsetMicLine, { backgroundColor: color }]} />
    <View style={[styles.headsetMicDot, { backgroundColor: color }]} />
  </View>
);

// CSS-rendered Book/Folder Illustration (SCALED UP)
const BookIllustration = ({ color }: { color: string }) => (
  <View style={styles.bookIllustration}>
    <View style={[styles.bookLeftPage, { borderColor: color }]} />
    <View style={[styles.bookRightPage, { borderColor: color }]} />
    <View style={[styles.bookSpine, { backgroundColor: color }]} />
    <View style={[styles.bookLineL1, { backgroundColor: color }]} />
    <View style={[styles.bookLineL2, { backgroundColor: color }]} />
    <View style={[styles.bookLineR1, { backgroundColor: color }]} />
    <View style={[styles.bookLineR2, { backgroundColor: color }]} />
  </View>
);

// CSS-rendered Staff/Users Illustration (SCALED UP)
const StaffIllustration = ({ color }: { color: string }) => (
  <View style={styles.staffIllustration}>
    {/* Center Person */}
    <View style={[styles.staffCenterHead, { backgroundColor: color }]} />
    <View style={[styles.staffCenterBody, { backgroundColor: color }]} />
    {/* Left Person */}
    <View style={[styles.staffLeftHead, { backgroundColor: color }]} />
    <View style={[styles.staffLeftBody, { backgroundColor: color }]} />
    {/* Right Person */}
    <View style={[styles.staffRightHead, { backgroundColor: color }]} />
    <View style={[styles.staffRightBody, { backgroundColor: color }]} />
  </View>
);

// CSS-rendered Folder Illustration (SCALED UP fallback)
const FolderIllustration = ({ color }: { color: string }) => (
  <View style={styles.folderIllustration}>
    <View style={[styles.folderBack, { borderColor: color }]} />
    <View style={[styles.folderTab, { backgroundColor: color }]} />
  </View>
);

// -------------------------------------------------------------
// THEME AND DESCRIPTION MAPPING DYNAMIC HELPERS
// -------------------------------------------------------------

interface ModuleTheme {
  iconBg: string;
  iconColor: string;
  renderIcon: (color: string) => React.ReactNode;
}

const getModuleTheme = (name: string, index: number): ModuleTheme => {
  const lowercaseName = name.toLowerCase();

  const tealTheme = {
    iconBg: '#e6f7f4',
    iconColor: '#0b665c',
    renderIcon: (color: string) => <BedIllustration color={color} />
  };

  const orangeTheme = {
    iconBg: '#fff9db',
    iconColor: '#f59e0b',
    renderIcon: (color: string) => <HeadsetIllustration color={color} />
  };

  const purpleTheme = {
    iconBg: '#f3e8ff',
    iconColor: '#7c3aed',
    renderIcon: (color: string) => <BookIllustration color={color} />
  };

  const blueTheme = {
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    renderIcon: (color: string) => <StaffIllustration color={color} />
  };

  const greenTheme = {
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    renderIcon: (color: string) => <BookIllustration color={color} />
  };

  if (lowercaseName.includes('bed') || lowercaseName.includes('turn')) {
    return tealTheme;
  }
  if (lowercaseName.includes('ot') || lowercaseName.includes('booking') || lowercaseName.includes('operation') || lowercaseName.includes('call') || lowercaseName.includes('register')) {
    return orangeTheme;
  }
  if (lowercaseName.includes('ipd') || lowercaseName.includes('ops') || lowercaseName.includes('discharge') || lowercaseName.includes('tracker')) {
    return purpleTheme;
  }
  if (lowercaseName.includes('staff') || lowercaseName.includes('directory') || lowercaseName.includes('user') || lowercaseName.includes('employee')) {
    return blueTheme;
  }

  // Fallback themes rotation
  const themes = [tealTheme, orangeTheme, purpleTheme, blueTheme, greenTheme];
  const selectedTheme = themes[index % themes.length];
  
  const illustrations = [
    (color: string) => <BedIllustration color={color} />,
    (color: string) => <HeadsetIllustration color={color} />,
    (color: string) => <BookIllustration color={color} />,
    (color: string) => <StaffIllustration color={color} />,
    (color: string) => <FolderIllustration color={color} />,
  ];

  return {
    ...selectedTheme,
    renderIcon: illustrations[index % illustrations.length],
  };
};

const getModuleDescription = (name: string): string => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('new patient') || lowercaseName.includes('add patient')) {
    return 'Register and add new inpatient profiles to the database';
  }
  if (lowercaseName.includes('edit') || lowercaseName.includes('demographics')) {
    return 'Modify existing inpatient demographics and details';
  }
  if (lowercaseName.includes('mlc')) {
    return 'Manage Medico-Legal Cases and legal documentation';
  }
  if (lowercaseName.includes('deposit') || lowercaseName.includes('transfer')) {
    return 'Record advance deposits, refunds, and room transfers';
  }
  if (lowercaseName.includes('discharge') || lowercaseName.includes('tracker')) {
    return 'Track discharge clearance workflow stages in real-time';
  }
  if (lowercaseName.includes('bed') || lowercaseName.includes('turn')) {
    return 'Manage and track bed turn over and patient handover';
  }
  if (lowercaseName.includes('ot') || lowercaseName.includes('booking') || lowercaseName.includes('operation') || lowercaseName.includes('call') || lowercaseName.includes('register')) {
    return 'Register and manage OT calls and schedules';
  }
  return `View and manage ${name} operations and options`;
};

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

export const SubModuleSelectionScreen = ({
  sessionData,
  onSelectSubModule,
}: SubModuleSelectionScreenProps) => {
  const insets = useSafeAreaInsets();
  const [subModules, setSubModules] = useState<SubModuleItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubModules = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      console.log('Fetching CareWorks submodules for userId:', sessionData.userId);
      const res = await trackerService.getSubModules(sessionData.token, sessionData.userId);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        console.log('Successfully fetched submodules:', res.data.length);
        setSubModules(res.data);
      } else {
        const errMsg = res?.message || 'No submodules returned from API.';
        console.log('No submodules returned from API:', errMsg);
        setErrorMessage(errMsg);
        setSubModules([]);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to connect to the server.';
      console.warn('Failed to load submodules:', err);
      setErrorMessage(errMsg);
      setSubModules([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionData]);

  useEffect(() => {
    fetchSubModules();
  }, [fetchSubModules]);

  if (isLoading) {
    return <LoadingIndicator message="Loading Modules." />;
  }

  const filteredModules = subModules.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.SubModName.toLowerCase().includes(query) ||
      item.ModName.toLowerCase().includes(query)
    );
  });

  // Hospital Name title (dynamic from sessionData or fallback)
  const hospitalName = sessionData.companyName || 'BETHANY HOSPITAL';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />
      
      {/* 1. SOLID HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Image
              source={require('../../assets/careworksone_logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerHospitalTitle} numberOfLines={1}>
              {hospitalName}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. OVERLAPPING WHITE BODY SECTION */}
      <View style={styles.bodyWrapper}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Greeting card row with clipboard image */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingTitle}>
                Hello, {sessionData.userNickName || 'SUPPORT'} 👋
              </Text>
              <Text style={styles.greetingSubtitle}>
                Please select a module to continue your workflow
              </Text>
            </View>
            <Image
              source={require('../../assets/clipboard_illustration.png')}
              style={styles.clipboardIllustrationImage}
              resizeMode="contain"
            />
          </View>

          {/* Search bar + filter sliders row */}
          {subModules.length > 0 && (
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <View style={styles.searchIconWrapper}>
                  <SearchIcon color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search module..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
              </View>
              <TouchableOpacity activeOpacity={0.75} style={styles.filterBtn}>
                <SettingsSlidersIcon color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Dynamic Module Cards List */}
          <View style={styles.listContainer}>
            {filteredModules.length === 0 ? (
              <View style={styles.errorContainer}>
                <View style={styles.errorIconContainer}>
                  <Text style={styles.errorIconEmoji}>🔍</Text>
                </View>
                <Text style={styles.errorTitle}>
                  {subModules.length === 0 ? 'Connection Issue' : 'No Modules Found'}
                </Text>
                <Text style={styles.errorMessage}>
                  {subModules.length === 0 
                    ? (errorMessage || 'The server returned an error or no modules are assigned to your account.')
                    : `No modules match "${searchQuery}". Please try a different search term.`}
                </Text>
                {subModules.length === 0 && (
                  <TouchableOpacity style={styles.retryBtn} onPress={fetchSubModules}>
                    <Text style={styles.retryBtnText}>Retry Connection</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredModules.map((item, index) => {
                const theme = getModuleTheme(item.SubModName, index);
                const description = getModuleDescription(item.SubModName);

                return (
                  <TouchableOpacity
                    key={item.SubModCd}
                    activeOpacity={0.85}
                    style={styles.card}
                    onPress={() => onSelectSubModule(item)}
                  >
                    {/* Left Icon Container with pastel bg */}
                    <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
                      {theme.renderIcon(theme.iconColor)}
                    </View>

                    {/* Middle title and subtitle */}
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.SubModName}
                      </Text>
                      <Text style={styles.cardSubtitle} numberOfLines={2}>
                        {description}
                      </Text>
                    </View>

                    {/* Right Chevron Circle Button */}
                    <View style={[styles.chevronCircle, { backgroundColor: theme.iconBg }]}>
                      <ChevronRightMini color={theme.iconColor} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.primary, // Teal base so top/bottom spacing is seamless
  },
  header: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60, // Large padding bottom to allow body overlapping
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerHospitalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  bodyWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc', // Premium off-white body background
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28, // Pull up body container to overlap header
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  greetingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a', // Slate 900
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 13.5,
    color: '#64748b', // Slate 500
    lineHeight: 18,
  },
  clipboardIllustrationImage: {
    width: 140,
    height: 110,
  },
  // VECTOR SHAPES STYLING
  settingsSliders: {
    width: 18,
    height: 18,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  settingsSlidersLine: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 4,
  },
  sliderTrackShort: {
    width: 3,
    height: 1.5,
  },
  sliderTrackMedium: {
    width: 6,
    height: 1.5,
  },
  sliderTrackFull: {
    flex: 1,
    height: 1.5,
  },
  sliderKnob: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  chevronRightMini: {
    width: 8,
    height: 8,
    borderTopWidth: 2.2,
    borderRightWidth: 2.2,
    transform: [{ rotate: '45deg' }],
  },
  bedIllustration: {
    width: 34,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bedHeadboard: {
    position: 'absolute',
    left: 0,
    bottom: 2,
    width: 3.5,
    height: 15,
    borderRadius: 1,
  },
  bedFootboard: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 3.5,
    height: 10,
    borderRadius: 1,
  },
  bedMattress: {
    position: 'absolute',
    left: 2,
    bottom: 5,
    width: 27,
    height: 5,
    borderRadius: 1,
  },
  bedPillow: {
    position: 'absolute',
    left: 4,
    bottom: 9,
    width: 6.5,
    height: 4,
    borderRadius: 1,
  },
  bedPersonHead: {
    position: 'absolute',
    left: 12,
    bottom: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bedPersonBody: {
    position: 'absolute',
    left: 10,
    bottom: 6,
    width: 12,
    height: 5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  headsetIllustration: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headsetArc: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderBottomWidth: 0,
    position: 'absolute',
    top: 2,
  },
  headsetLeftCup: {
    width: 6,
    height: 10,
    borderRadius: 3,
    position: 'absolute',
    left: 1,
    bottom: 6,
  },
  headsetRightCup: {
    width: 6,
    height: 10,
    borderRadius: 3,
    position: 'absolute',
    right: 1,
    bottom: 6,
  },
  headsetMicLine: {
    width: 10,
    height: 2.5,
    position: 'absolute',
    bottom: 4,
    right: 3,
    transform: [{ rotate: '-30deg' }],
  },
  headsetMicDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 1,
    right: 9,
  },
  bookIllustration: {
    width: 32,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bookLeftPage: {
    width: 13.5,
    height: 20,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    position: 'absolute',
    left: 2,
  },
  bookRightPage: {
    width: 13.5,
    height: 20,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    position: 'absolute',
    right: 2,
  },
  bookSpine: {
    width: 2.5,
    height: 20,
  },
  bookLineL1: {
    width: 8,
    height: 1.8,
    position: 'absolute',
    left: 5,
    top: 6,
  },
  bookLineL2: {
    width: 8,
    height: 1.8,
    position: 'absolute',
    left: 5,
    top: 11,
  },
  bookLineR1: {
    width: 8,
    height: 1.8,
    position: 'absolute',
    right: 5,
    top: 6,
  },
  bookLineR2: {
    width: 8,
    height: 1.8,
    position: 'absolute',
    right: 5,
    top: 11,
  },
  staffIllustration: {
    width: 34,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  staffCenterHead: {
    width: 9.5,
    height: 9.5,
    borderRadius: 4.75,
    position: 'absolute',
    top: 1,
  },
  staffCenterBody: {
    width: 17,
    height: 8.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    position: 'absolute',
    bottom: 1,
  },
  staffLeftHead: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    opacity: 0.6,
    position: 'absolute',
    left: 1,
    top: 4,
  },
  staffLeftBody: {
    width: 12,
    height: 6,
    borderTopLeftRadius: 4.5,
    borderTopRightRadius: 4.5,
    opacity: 0.6,
    position: 'absolute',
    left: -1,
    bottom: 1,
  },
  staffRightHead: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    opacity: 0.6,
    position: 'absolute',
    right: 1,
    top: 4,
  },
  staffRightBody: {
    width: 12,
    height: 6,
    borderTopLeftRadius: 4.5,
    borderTopRightRadius: 4.5,
    opacity: 0.6,
    position: 'absolute',
    right: -1,
    bottom: 1,
  },
  folderIllustration: {
    width: 32,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  folderBack: {
    width: 29,
    height: 18,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
    borderBottomLeftRadius: 2.5,
    borderBottomRightRadius: 2.5,
    borderWidth: 2.5,
    position: 'absolute',
    bottom: 0,
  },
  folderTab: {
    width: 12,
    height: 5,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
    position: 'absolute',
    left: 2,
    top: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
    flex: 1,
    marginRight: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchIconWrapper: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 0,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  listContainer: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b', // Dark Slate
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: '#64748b', // Slate 500
    lineHeight: 18,
  },
  chevronCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 12,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  errorIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconEmoji: {
    fontSize: 26,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  retryBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
