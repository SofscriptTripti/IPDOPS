import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSessionData {
  token: string;
  userId: string;
  userNickName: string;
  sessionId: number;
  coCd: string;
  div: number;
  loc: number;
  companyName: string;
  divisionName: string;
  locationName: string;
  financialYear: number;
  shift: number;
  showPasswordToggle: boolean;
}

export interface LoginResponse {
  success: boolean;
  data: UserSessionData | null;
  message: string | null;
  errorCode: string | null;
  errors: string[];
}

export const authService = {
  /**
   * Performs authentication POST request to hmisloginapi login endpoint.
   */
  async login(userId: string, password: string, forceRelogin: boolean = false): Promise<LoginResponse> {
    const url = `${API_CONFIG.AUTH_BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`;
    const payload = {
      userId,
      password,
      machineId: '',
      domainName: '',
      remark: '',
      forceRelogin: forceRelogin,
      existingSessionId: null,
    };

    // Print to standard console.log
    console.log('====================================');
    console.log('API LOGIN REQUEST HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('====================================');

    // Print to console.warn to show inside Metro yellowbox overlay in dev mode
    console.warn('API REQUEST - URL: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let parsedData: LoginResponse;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API LOGIN PARSE ERROR (raw text):', text);
        console.log('====================================');
        console.warn('API RESPONSE PARSE ERROR: ' + text);
        throw new Error(`Invalid response format from server: ${response.status}`);
      }

      console.log('====================================');
      console.log('API LOGIN RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');

      console.warn('API RESPONSE - STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API LOGIN EXCEPTION:', error);
      console.log('====================================');
      console.warn('API LOGIN EXCEPTION: ' + error.message);
      throw new Error(error.message || 'Network request failed. Please check your network connection.');
    }
  },

  /**
   * Performs authentication POST request to hmisloginapi logout endpoint.
   */
  async logout(token: string, userId: string, sessionId: number): Promise<{ success: boolean; message: string | null }> {
    const url = `${API_CONFIG.AUTH_BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`;
    const payload = {
      userId,
      sessionId,
      logOutStatus: 1, // 1 = Normal
    };

    console.log('====================================');
    console.log('API LOGOUT REQUEST HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('====================================');

    console.warn('API LOGOUT REQUEST - URL: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(text);
      } catch (_) {}

      console.log('====================================');
      console.log('API LOGOUT RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');

      console.warn('API LOGOUT RESPONSE - STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return {
        success: response.ok && (parsedData.success ?? true),
        message: parsedData.message ?? null,
      };
    } catch (error: any) {
      console.log('====================================');
      console.log('API LOGOUT EXCEPTION:', error);
      console.log('====================================');
      console.warn('API LOGOUT EXCEPTION: ' + error.message);
      return {
        success: false,
        message: error.message || 'Network error occurred.',
      };
    }
  },

  /**
   * Saves user session data to AsyncStorage.
   */
  async saveSession(sessionData: UserSessionData): Promise<void> {
    try {
      console.log('====================================');
      console.log('AsyncStorage: SAVING SESSION DATA:', JSON.stringify(sessionData));
      console.log('====================================');
      console.warn('AsyncStorage: SAVING SESSION: ' + JSON.stringify(sessionData));
      await AsyncStorage.setItem('@user_session', JSON.stringify(sessionData));
      console.log('AsyncStorage: Save successful.');
    } catch (error: any) {
      console.log('====================================');
      console.log('AsyncStorage SAVE ERROR:', error);
      console.log('====================================');
      console.warn('AsyncStorage SAVE ERROR: ' + error.message);
    }
  },

  /**
   * Retrieves user session data from AsyncStorage.
   */
  async getSession(): Promise<UserSessionData | null> {
    try {
      console.log('====================================');
      console.log('AsyncStorage: RETRIEVING SESSION DATA...');
      console.log('====================================');
      const dataStr = await AsyncStorage.getItem('@user_session');
      console.log('AsyncStorage: Retrieved string:', dataStr);
      console.warn('AsyncStorage: RETRIEVED STRING: ' + dataStr);
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        console.log('AsyncStorage: Parsed session data:', parsed);
        return parsed as UserSessionData;
      }
    } catch (error: any) {
      console.log('====================================');
      console.log('AsyncStorage RETRIEVE ERROR:', error);
      console.log('====================================');
      console.warn('AsyncStorage RETRIEVE ERROR: ' + error.message);
    }
    return null;
  },

  /**
   * Clears user session data from AsyncStorage.
   */
  async clearSession(): Promise<void> {
    try {
      console.log('====================================');
      console.log('AsyncStorage: CLEARING SESSION DATA...');
      console.log('====================================');
      console.warn('AsyncStorage: CLEARING SESSION');
      await AsyncStorage.removeItem('@user_session');
      console.log('AsyncStorage: Clear successful.');
    } catch (error: any) {
      console.log('====================================');
      console.log('AsyncStorage CLEAR ERROR:', error);
      console.log('====================================');
      console.warn('AsyncStorage CLEAR ERROR: ' + error.message);
    }
  },
};
