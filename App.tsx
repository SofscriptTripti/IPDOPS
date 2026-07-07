import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BedTurnoverScreen } from './src/screens/BedTurnoverScreen';
import { PatientTimelineScreen, PatientSessionDetails } from './src/screens/PatientTimelineScreen';
import { authService, UserSessionData } from './src/services/authService';
import { THEME } from './src/constants/theme';

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [sessionData, setSessionData] = useState<UserSessionData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'Login' | 'Dashboard' | 'BedTurnover' | 'PatientTimeline'>('Login');
  const [selectedPatient, setSelectedPatient] = useState<PatientSessionDetails | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Check storage for existing session when app starts
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const storedSession = await authService.getSession();
        if (storedSession) {
          setSessionData(storedSession);
          setIsSignedIn(true);
          setCurrentScreen('Dashboard');
        }
      } catch (error) {
        console.warn('Failed to restore stored login session:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadStoredSession();
  }, []);

  const handleLoginSuccess = async (data: UserSessionData) => {
    await authService.saveSession(data);
    setSessionData(data);
    setIsSignedIn(true);
    setCurrentScreen('Dashboard');
  };

  const handleLogout = async () => {
    await authService.clearSession();
    setIsSignedIn(false);
    setSessionData(null);
    setSelectedPatient(null);
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

  // Fullscreen loading spinner while restoring session
  if (isInitialLoading) {
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
      ) : currentScreen === 'BedTurnover' ? (
        <BedTurnoverScreen sessionData={sessionData} onBack={handleBackToDashboard} />
      ) : currentScreen === 'PatientTimeline' && selectedPatient ? (
        <PatientTimelineScreen patient={selectedPatient} onBack={handleBackToDashboard} />
      ) : (
        <DashboardScreen
          sessionData={sessionData}
          onLogout={handleLogout}
          onNavigateToBedTurnover={handleNavigateToBedTurnover}
          onNavigateToTimeline={handleNavigateToTimeline}
        />
      )}
    </SafeAreaProvider>
  );
}
