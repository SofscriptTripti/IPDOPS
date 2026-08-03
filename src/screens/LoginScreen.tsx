import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { UserIcon, LockIcon, EyeIcon, PinIcon } from '../components/Icons';
import { Checkbox } from '../components/Checkbox';
import { authService, UserSessionData } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (sessionData: UserSessionData) => void;
}

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const insets = useSafeAreaInsets();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keepMeSignedIn, setKeepMeSignedIn] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateSessionModalVisible, setDuplicateSessionModalVisible] = useState(false);
  const [duplicateSessionMessage, setDuplicateSessionMessage] = useState('');
  
  // Interactive border highlights
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleSignIn = async () => {
    console.log('====================================');
    console.log('SIGN IN BUTTON TAPPED');
    console.log('Username Field:', username);
    console.log('Password Field:', password ? '********' : '[EMPTY]');
    console.log('====================================');

    if (!username.trim()) {
      Alert.alert('Sign In', 'Please enter your Employee ID or Username.');
      return;
    }
    if (!password) {
      Alert.alert('Sign In', 'Please enter your Password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login(username.trim(), password, false);
      setIsLoading(false);
      
      if (response.success && response.data) {
        onLoginSuccess(response.data);
      } else if (response.errorCode === 'DUPLICATE_SESSION') {
        setDuplicateSessionMessage(response.message || "User is already logged in. Do you want to force logout the existing session?");
        setDuplicateSessionModalVisible(true);
      } else {
        Alert.alert('Sign In Failed', response.message || 'Invalid credentials.');
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Sign In Error', error.message || 'An error occurred during authentication.');
    }

    // Commented out default credentials check: SSSL and Creative@123
    /*
    setTimeout(() => {
      setIsLoading(false);
      if (username.trim() === 'SSSL' && password === 'Creative@123') {
        const mockSession = {
          token: 'mock-token-sssl-creative123',
          userId: 'SSSL',
          userNickName: 'Creative User',
          sessionId: 999999,
          coCd: 'SS',
          div: 1,
          loc: 1,
          companyName: 'CAREWORKS One',
          divisionName: 'BETHANY HOSPITAL',
          locationName: 'Mumbai',
          financialYear: 2026,
          shift: 1,
          showPasswordToggle: true,
        };
        onLoginSuccess(mockSession);
      } else {
        Alert.alert('Sign In Failed', 'Invalid Employee ID/Username or Password.');
      }
    }, 800);
    */
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 }
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section (Full Width, Curved Bottom) */}
          <View style={[styles.tealHeader, { paddingTop: insets.top + 32 }]}>
            <View style={styles.logoOuterContainer}>
              <Image
                source={require('../../assets/careworksone_logo.png')}
                style={styles.logo as any}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.hospitalText}>BETHANY HOSPITAL</Text>
            <Text style={styles.titleText}>CAREWORKS One</Text>
            <Text style={styles.subTitleText}>For the Hospital Team</Text>
            
            <View style={styles.badge}>
              <PinIcon color="#ffffff" />
              <Text style={styles.badgeText}>Powered by Sofscript Systems & Services Limited</Text>
             
            </View>
          </View>

          {/* Form Section (Full Width, White Background) */}
          <View style={styles.formContainer}>
            <Text style={styles.signInTitle}>Sign in</Text>
            <Text style={styles.signInSub}>Use your existing CAREWORKS HMIS credentials.</Text>

            {/* Username field */}
            <Text style={styles.inputLabel}>EMPLOYEE ID / USERNAME</Text>
            <View
              style={[
                styles.inputWrapper,
                isUsernameFocused && styles.inputWrapperFocused,
              ]}
            >
              <UserIcon color={isUsernameFocused ? THEME.colors.primary : THEME.colors.textMuted} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                onFocus={() => setIsUsernameFocused(true)}
                onBlur={() => setIsUsernameFocused(false)}
                placeholder="e.g. sofscript"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password field */}
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View
              style={[
                styles.inputWrapper,
                isPasswordFocused && styles.inputWrapperFocused,
              ]}
            >
              <LockIcon color={isPasswordFocused ? THEME.colors.primary : THEME.colors.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="••••••••"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={styles.eyeBtn}
                disabled={isLoading}
              >
                <EyeIcon
                  color={passwordVisible ? THEME.colors.primary : THEME.colors.textMuted}
                  visible={passwordVisible}
                />
              </TouchableOpacity>
            </View>

            {/* Actions row */}
            <View style={styles.actionsRow}>
              {/* Custom Checkbox */}
              <Checkbox
                checked={keepMeSignedIn}
                onChange={setKeepMeSignedIn}
                label="Keep me signed in"
              />
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.signInBtn, isLoading && styles.signInBtnDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.signInBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

          
          </View>

          {/* Footer outside the card */}
          <Image
            source={require('../../assets/sofscript_logo.png')}
            style={styles.footerLogo as any}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>
            SOFSCRIPT - Bethany Hospital - Mumbai
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Themed Duplicate Session Modal */}
      <Modal
        visible={duplicateSessionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDuplicateSessionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
        
            <Text style={styles.modalTitle}>Duplicate Session</Text>
            
            <Text style={styles.modalMessage}>
              {duplicateSessionMessage}
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setDuplicateSessionModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={async () => {
                  setDuplicateSessionModalVisible(false);
                  setIsLoading(true);
                  try {
                    const forceResponse = await authService.login(username.trim(), password, true);
                    setIsLoading(false);
                    if (forceResponse.success && forceResponse.data) {
                      onLoginSuccess(forceResponse.data);
                    } else {
                      Alert.alert('Sign In Failed', forceResponse.message || 'Invalid credentials.');
                    }
                  } catch (err: any) {
                    setIsLoading(false);
                    Alert.alert('Sign In Error', err.message || 'An error occurred during force login.');
                  }
                }}
              >
                <Text style={styles.modalBtnConfirmText}>Force Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  tealHeader: {
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    paddingBottom: 40,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    width: '100%',
  },
  logoOuterContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  hospitalText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
    letterSpacing: 1.5,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  subTitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.primaryLight,
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 20,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
  },
  sofscriptLogo: {
    width: 50,
    height: 14,
    marginLeft: 6,
  },
  formContainer: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 20,
    width: '100%',
    backgroundColor: '#ffffff',
  },
  signInTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textDark,
  },
  signInSub: {
    fontSize: 14,
    color: THEME.colors.textLight,
    marginTop: 4,
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.inputBg,
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 22,
  },
  inputWrapperFocused: {
    borderColor: THEME.colors.primary,
    ...Platform.select({
      ios: {
        backgroundColor: '#ffffff',
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
    }),
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    paddingLeft: 10,
    paddingRight: 10,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  forgotPassword: {
    color: THEME.colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: THEME.colors.primary,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  signInBtnDisabled: {
    opacity: 0.8,
  },
  signInBtnText: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '700',
  },
  noteText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLogo: {
    width: 180,
    height: 50,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 4,
  },
  footerText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalWarningIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalWarningIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: THEME.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  modalBtnCancelText: {
    color: THEME.colors.textMedium,
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnConfirm: {
    backgroundColor: THEME.colors.primary,
  },
  modalBtnConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
