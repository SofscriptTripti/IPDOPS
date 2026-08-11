import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, BackHandler, Alert, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BedTurnoverScreen } from './src/screens/BedTurnoverScreen';
import { OTDashboardScreen, OtCallRegisterItem } from './src/screens/OTDashboardScreen';
import { OTEditBookingScreen } from './src/screens/OTEditBookingScreen';
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
  const [currentScreen, setCurrentScreen] = useState<'Login' | 'SubModuleSelection' | 'Dashboard' | 'BedTurnover' | 'OTDashboard' | 'OTEditBooking' | 'PatientTimeline' | 'Notifications'>('Login');
  const [selectedPatient, setSelectedPatient] = useState<PatientSessionDetails | null>(null);
  const [selectedOtBooking, setSelectedOtBooking] = useState<OtCallRegisterItem | null>(null);
  const [otDashboardRefreshKey, setOtDashboardRefreshKey] = useState(0);

  // Dashboard/BedTurnover/OTDashboard stay mounted (display:none) once visited so
  // switching between them preserves scroll/filter state. But mounting them eagerly
  // fires all of their startup API calls at once, so only mount each the first time
  // it's actually navigated to.
  const [visitedScreens, setVisitedScreens] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (currentScreen === 'Dashboard' || currentScreen === 'BedTurnover' || currentScreen === 'OTDashboard') {
      setVisitedScreens(prev => (prev[currentScreen] ? prev : { ...prev, [currentScreen]: true }));
    }
  }, [currentScreen]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isCheckingRights, setIsCheckingRights] = useState(false);
  const [hasLoadedTimelineOnce, setHasLoadedTimelineOnce] = useState(false);

  // Check storage for existing session when app starts
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const storedSession = await authService.getSession();
        if (storedSession) {
          const today = new Date().toDateString();
          // Fallback: if loginDate is missing, initialize it to today and save
          if (!storedSession.loginDate) {
            storedSession.loginDate = today;
            await authService.saveSession(storedSession);
          }
          if (storedSession.loginDate !== today) {
            console.log('Session date changed. Logging out. Stored:', storedSession.loginDate, 'Today:', today);
            await authService.clearSession();
            setIsSignedIn(false);
            setSessionData(null);
            setCurrentScreen('Login');
          } else {
            setSessionData(storedSession);
            setIsSignedIn(true);
            setCurrentScreen('SubModuleSelection');
          }
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
      if (currentScreen === 'Dashboard' || currentScreen === 'OTDashboard') {
        setSelectedSubModule(null);
        setCurrentScreen('SubModuleSelection');
        return true;
      }
      if (currentScreen === 'OTEditBooking') {
        setSelectedOtBooking(null);
        setCurrentScreen('OTDashboard');
        return true;
      }
      if (selectedSubModule?.SubModCd === 1384) {
        setSelectedSubModule(null);
        setCurrentScreen('SubModuleSelection');
      } else {
        setCurrentScreen('Dashboard');
      }
      return true; // Intercepted back press successfully
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBackPress);

    return () => {
      subscription.remove();
    };
  }, [currentScreen, selectedSubModule]);

  const handleLoginSuccess = async (data: UserSessionData) => {
    const sessionWithDate = {
      ...data,
      loginDate: new Date().toDateString(),
    };
    await authService.saveSession(sessionWithDate);
    setSessionData(sessionWithDate);
    setIsSignedIn(true);
    setCurrentScreen('SubModuleSelection');
  };

  // Check for date change on app state change (focus/foreground) and periodically
  useEffect(() => {
    if (!isSignedIn || !sessionData) return;

    const checkDateAndLogout = async () => {
      const today = new Date().toDateString();
      console.log('Date Check - Saved:', sessionData.loginDate, 'Today:', today);
      if (!sessionData.loginDate) {
        // Fallback: if loginDate is missing, initialize it to today and save
        const updatedSession = { ...sessionData, loginDate: today };
        await authService.saveSession(updatedSession);
        setSessionData(updatedSession);
        return;
      }
      if (sessionData.loginDate !== today) {
        console.log('Date changed! Automatically logging out...');
        await handleLogout();
      }
    };

    // Run check immediately on mount/focus
    checkDateAndLogout();

    // Check periodically every 5 seconds (faster check for testing!)
    const interval = setInterval(checkDateAndLogout, 5000);

    // Check on app state change
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkDateAndLogout();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isSignedIn, sessionData]);

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
        if (subModule.SubModCd === 1384) {
          setCurrentScreen('BedTurnover');
        } else if (subModule.SubModCd === 1385) {
          setCurrentScreen('OTDashboard');
        } else {
          setCurrentScreen('Dashboard');
        }
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
      if (subModule.SubModCd === 1384) {
        setCurrentScreen('BedTurnover');
      } else if (subModule.SubModCd === 1385) {
        setCurrentScreen('OTDashboard');
      } else {
        setCurrentScreen('Dashboard');
      }
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
    setSelectedOtBooking(null);
    setHasLoadedTimelineOnce(false);
    setVisitedScreens({});
    setCurrentScreen('Login');
  };

  const handleNavigateToBedTurnover = () => {
    setCurrentScreen('BedTurnover');
  };

  const handleNavigateToTimeline = (patient: PatientSessionDetails) => {
    setSelectedPatient(patient);
    setCurrentScreen('PatientTimeline');
  };

  const handleBackToSubModuleSelection = () => {
    setSelectedSubModule(null);
    setCurrentScreen('SubModuleSelection');
  };

  const handleBackToDashboard = () => {
    setSelectedPatient(null);
    if (selectedSubModule?.SubModCd === 1384) {
      handleBackToSubModuleSelection();
    } else {
      setCurrentScreen('Dashboard');
    }
  };

  const handleNavigateToNotifications = () => {
    setCurrentScreen('Notifications');
  };

  const handleEditOtBooking = (booking: OtCallRegisterItem) => {
    setSelectedOtBooking(booking);
    setCurrentScreen('OTEditBooking');
  };

  const handleBackToOtDashboard = () => {
    setSelectedOtBooking(null);
    setCurrentScreen('OTDashboard');
  };

  const handleOtBookingSaved = () => {
    setOtDashboardRefreshKey(prev => prev + 1);
  };

  // Check date on render to immediately intercept and block screen rendering if expired
  if (isSignedIn && sessionData) {
    const today = new Date().toDateString();
    if (sessionData.loginDate && sessionData.loginDate !== today) {
      console.log('Date change detected on render! Blocking render and logging out...');
      
      // Perform logout asynchronously (clear async storage, etc.)
      authService.clearSession().catch(err => console.warn(err));
      
      // Reset states synchronously so React immediately rerenders the Login screen
      setIsSignedIn(false);
      setSessionData(null);
      setSelectedSubModule(null);
      setSelectedPatient(null);
      setHasLoadedTimelineOnce(false);
      setCurrentScreen('Login');
      
      // Return loading indicator for the current frame
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.primary }}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      );
    }
  }

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
          {visitedScreens.Dashboard && (
            <View style={{ flex: 1, display: currentScreen === 'Dashboard' ? 'flex' : 'none' }}>
              <DashboardScreen
                sessionData={sessionData}
                selectedSubModule={selectedSubModule}
                onLogout={handleLogout}
                onNavigateToBedTurnover={handleNavigateToBedTurnover}
                onNavigateToTimeline={handleNavigateToTimeline}
                onNavigateToNotifications={handleNavigateToNotifications}
                onBackToSubModuleSelection={handleBackToSubModuleSelection}
              />
            </View>
          )}
          {visitedScreens.BedTurnover && (
            <View style={{ flex: 1, display: currentScreen === 'BedTurnover' ? 'flex' : 'none' }}>
              <BedTurnoverScreen
                sessionData={sessionData}
                onBack={handleBackToDashboard}
                visible={currentScreen === 'BedTurnover'}
                selectedSubModule={selectedSubModule}
              />
            </View>
          )}
          {visitedScreens.OTDashboard && (
            <View style={{ flex: 1, display: currentScreen === 'OTDashboard' ? 'flex' : 'none' }}>
              <OTDashboardScreen
                sessionData={sessionData}
                onBack={handleBackToSubModuleSelection}
                onEditBooking={handleEditOtBooking}
                refreshSignal={otDashboardRefreshKey}
              />
            </View>
          )}
          {currentScreen === 'OTEditBooking' && selectedOtBooking && (
            <OTEditBookingScreen
              sessionData={sessionData}
              booking={selectedOtBooking}
              onBack={handleBackToOtDashboard}
              onSaved={handleOtBookingSaved}
            />
          )}
          {currentScreen === 'PatientTimeline' && selectedPatient && (
            <PatientTimelineScreen 
              patient={selectedPatient} 
              onBack={handleBackToDashboard} 
              sessionData={sessionData} 
              hasLoadedOnce={false}
              onLoadedOnce={() => {}}
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
