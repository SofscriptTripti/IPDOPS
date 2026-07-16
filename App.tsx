import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, BackHandler, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BedTurnoverScreen } from './src/screens/BedTurnoverScreen';
import { PatientTimelineScreen, PatientSessionDetails } from './src/screens/PatientTimelineScreen';
import { NotificationScreen } from './src/screens/NotificationScreen';
import { SubModuleSelectionScreen, SubModuleItem } from './src/screens/SubModuleSelectionScreen';
import { authService, UserSessionData } from './src/services/authService';
import { trackerService } from './src/services/trackerService';
import { THEME } from './src/constants/theme';

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [sessionData, setSessionData] = useState<UserSessionData | null>(null);
  const [selectedSubModule, setSelectedSubModule] = useState<SubModuleItem | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'Login' | 'SubModuleSelection' | 'Dashboard' | 'BedTurnover' | 'PatientTimeline' | 'Notifications'>('Login');
  const [selectedPatient, setSelectedPatient] = useState<PatientSessionDetails | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isCheckingRights, setIsCheckingRights] = useState(false);
  const [hasLoadedTimelineOnce, setHasLoadedTimelineOnce] = useState(false);

  // Check storage for existing session when app starts
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const storedSession = await authService.getSession();
        if (storedSession) {
          setSessionData(storedSession);
          setIsSignedIn(true);
          setCurrentScreen('SubModuleSelection');
        }
      } catch (error) {
        console.warn('Failed to restore stored login session:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadStoredSession();
  }, []);

  // Intercept Android hardware back button press to avoid crashing/exiting
  useEffect(() => {
    const handleHardwareBackPress = () => {
      if (currentScreen === 'SubModuleSelection' || currentScreen === 'Login') {
        return false; // Exit app normally
      }
      if (currentScreen === 'Dashboard') {
        setCurrentScreen('SubModuleSelection');
        return true;
      }
      setCurrentScreen('Dashboard');
      return true; // Intercepted back press successfully
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBackPress);

    return () => {
      subscription.remove();
    };
  }, [currentScreen]);

  const handleLoginSuccess = async (data: UserSessionData) => {
    await authService.saveSession(data);
    setSessionData(data);
    setIsSignedIn(true);
    setCurrentScreen('SubModuleSelection');
  };

  const handleSelectSubModule = async (subModule: SubModuleItem) => {
    if (!sessionData) return;
    setIsCheckingRights(true);
    try {
      console.log('Checking user rights for module:', subModule.ModCd, 'submodule:', subModule.SubModCd);
      const res = await trackerService.checkUserRights(
        sessionData.token,
        sessionData.userId,
        subModule.ModCd,
        subModule.SubModCd
      );

      if (res && res.success && res.data && res.data.access === true) {
        console.log('Access granted for submodule:', subModule.SubModName);
        setSelectedSubModule(subModule);
        setCurrentScreen('Dashboard');
      } else {
        console.log('Access denied for submodule:', subModule.SubModName);
        Alert.alert(
          'Access Denied',
          'You do not have permission to access this module.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.warn('Failed to verify user rights, allowing access by default:', err);
      // Fallback: allow access if API is failing/offline
      setSelectedSubModule(subModule);
      setCurrentScreen('Dashboard');
    } finally {
      setIsCheckingRights(false);
    }
  };

  const handleLogout = async () => {
    await authService.clearSession();
    setIsSignedIn(false);
    setSessionData(null);
    setSelectedSubModule(null);
    setSelectedPatient(null);
    setHasLoadedTimelineOnce(false);
    setCurrentScreen('Login');
  };

  const handleNavigateToBedTurnover = () => {
    setCurrentScreen('BedTurnover');
  };

  const handleNavigateToTimeline = (patient: PatientSessionDetails) => {
    setSelectedPatient(patient);
    setCurrentScreen('PatientTimeline');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('Dashboard');
  };

  const handleNavigateToNotifications = () => {
    setCurrentScreen('Notifications');
  };

  // Fullscreen loading spinner while restoring session or checking module access rights
  if (isInitialLoading || isCheckingRights) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.primary }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {!isSignedIn || !sessionData ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : currentScreen === 'SubModuleSelection' ? (
        <SubModuleSelectionScreen
          sessionData={sessionData}
          onSelectSubModule={handleSelectSubModule}
          onLogout={handleLogout}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, display: currentScreen === 'Dashboard' ? 'flex' : 'none' }}>
            <DashboardScreen
              sessionData={sessionData}
              selectedSubModule={selectedSubModule}
              onLogout={handleLogout}
              onNavigateToBedTurnover={handleNavigateToBedTurnover}
              onNavigateToTimeline={handleNavigateToTimeline}
              onNavigateToNotifications={handleNavigateToNotifications}
            />
          </View>
          <View style={{ flex: 1, display: currentScreen === 'BedTurnover' ? 'flex' : 'none' }}>
            <BedTurnoverScreen 
              sessionData={sessionData} 
              onBack={handleBackToDashboard} 
              visible={currentScreen === 'BedTurnover'} 
              selectedSubModule={selectedSubModule}
            />
          </View>
          {currentScreen === 'PatientTimeline' && selectedPatient && (
            <PatientTimelineScreen 
              patient={selectedPatient} 
              onBack={handleBackToDashboard} 
              sessionData={sessionData} 
              hasLoadedOnce={hasLoadedTimelineOnce}
              onLoadedOnce={() => setHasLoadedTimelineOnce(true)}
            />
          )}
          {currentScreen === 'Notifications' && (
            <NotificationScreen onBack={handleBackToDashboard} />
          )}
        </View>
      )}
    </SafeAreaProvider>
  );
}
