import { API_CONFIG } from '../config/api';

export interface WardItem {
  wrdCd: string;
  wrdDesc: string;
}

export const trackerService = {
  /**
   * Fetches the ward list for the authenticated user.
   */
  async getWardList(token: string, cocd: string, div: number, loc: number, userId: string): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.WARD_LIST}`;
    const payload = { cocd, div, loc, userId };

    console.log('====================================');
    console.log('API TRACKER WARD_LIST HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - WARD_LIST: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API WARD_LIST PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API WARD_LIST PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API TRACKER WARD_LIST RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - WARD_LIST STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API WARD_LIST EXCEPTION:', error);
      console.log('====================================');
      console.warn('API WARD_LIST EXCEPTION: ' + error.message);
      throw error;
    }
  },

  /**
   * Fetches the dashboard overview counts.
   */
  async getDashboard(
    token: string,
    frmDtTm: string,
    toDtTm: string,
    dschrgStatus: number,
    wrdCd: string,
    userId: string
  ): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.DASHBOARD}`;
    const payload = { frmDtTm, toDtTm, dschrgStatus, wrdCd, userId };

    console.log('====================================');
    console.log('API TRACKER DASHBOARD HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - DASHBOARD: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API DASHBOARD PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API DASHBOARD PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API TRACKER DASHBOARD RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - DASHBOARD STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API DASHBOARD EXCEPTION:', error);
      console.log('====================================');
      console.warn('API DASHBOARD EXCEPTION: ' + error.message);
      throw error;
    }
  },

  /**
   * Fetches detailed patient list and timeline statuses.
   */
  async getDetail(
    token: string,
    frmDtTm: string,
    toDtTm: string,
    dschrgStatus: number,
    ipno: number | null,
    wrdCd: string,
    userId: string
  ): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.DETAIL}`;
    const payload = { frmDtTm, toDtTm, dschrgStatus, ipno, wrdCd, userId };

    console.log('====================================');
    console.log('API TRACKER DETAIL HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - DETAIL: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API DETAIL PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API DETAIL PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API TRACKER DETAIL RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - DETAIL STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API DETAIL EXCEPTION:', error);
      console.log('====================================');
      console.warn('API DETAIL EXCEPTION: ' + error.message);
      throw error;
    }
  },

  /**
   * Fetches submodules list by userId.
   */
  async getSubModules(
    token: string,
    userId: string
  ): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.SUB_MODULES}`;
    const payload = {
      cocd: "1",
      div: 1,
      loc: 1,
      userId: userId,
      modCd: 490,
      appNo: 2,
      showParam: false
    };

    console.log('====================================');
    console.log('API CAREWORKS SUBMODULES HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - SUBMODULES: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API SUBMODULES PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API SUBMODULES PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API CAREWORKS SUBMODULES RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - SUBMODULES STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API SUBMODULES EXCEPTION:', error);
      console.log('====================================');
      console.warn('API SUBMODULES EXCEPTION: ' + error.message);
      throw error;
    }
  },

  /**
   * Checks if user has rights for a specific submodule.
   */
  async checkUserRights(
    token: string,
    userId: string,
    modCd: number,
    subModCd: number
  ): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_RIGHTS}`;
    const payload = {
      cocd: "1",
      div: 1,
      loc: 1,
      userId: userId,
      modCd: modCd,
      subModCd: subModCd
    };

    console.log('====================================');
    console.log('API CHECK USER RIGHTS HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - CHECK_RIGHTS: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API CHECK_RIGHTS PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API CHECK_RIGHTS PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API CHECK USER RIGHTS RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - CHECK_RIGHTS STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API CHECK_RIGHTS EXCEPTION:', error);
      console.log('====================================');
      console.warn('API CHECK_RIGHTS EXCEPTION: ' + error.message);
      throw error;
    }
  },

  /**
   * Fetches the Bed Type Master list.
   */
  async getBedTypes(
    token: string
  ): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.BED_TYPES}`;
    const payload = {
      cocd: "1",
      div: 1,
      loc: 1
    };

    console.log('====================================');
    console.log('API GET BED TYPE MASTER HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - BED_TYPES: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API BED_TYPES PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API BED_TYPES PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API GET BED TYPE MASTER RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - BED_TYPES STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API BED_TYPES EXCEPTION:', error);
      console.log('====================================');
      console.warn('API BED_TYPES EXCEPTION: ' + error.message);
      throw error;
    }
  },

  /**
   * Updates the bed status.
   */
  async changeBedStatus(
    token: string,
    payload: {
      cocd: string;
      div: number;
      loc: number;
      bedNo: string;
      reqNo: number;
      ipNo: number;
      updateType: number;
      refNo: string;
      docCd: number;
      bedStsCd: number;
      updtDtTm: string;
      updtUsrId: string;
    }
  ): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.CHANGE_BED_STATUS}`;

    console.log('====================================');
    console.log('API CHANGE_BED_STATUS HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - CHANGE_BED_STATUS: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API CHANGE_BED_STATUS PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API CHANGE_BED_STATUS PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API CHANGE_BED_STATUS RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - CHANGE_BED_STATUS STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API CHANGE_BED_STATUS EXCEPTION:', error);
      console.log('====================================');
      console.warn('API CHANGE_BED_STATUS EXCEPTION: ' + error.message);
      throw error;
    }
  },

  /**
   * Fetches beds list with status code parameter.
   */
  async getBedsWithParam(
    token: string,
    payload: {
      cocd: string;
      div: number;
      loc: number;
      bedStsCd: number;
    }
  ): Promise<any> {
    const url = `${API_CONFIG.CAREWORKS_BASE_URL}${API_CONFIG.ENDPOINTS.BED_MST_WITH_PARAM}`;

    console.log('====================================');
    console.log('API GET BEDS WITH PARAM HIT:');
    console.log('URL:', url);
    console.log('PARAMS:', JSON.stringify(payload, null, 2));
    console.log('TOKEN:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('====================================');
    console.warn('API REQ - BED_MST_WITH_PARAM: ' + url + '\nPARAMS: ' + JSON.stringify(payload));

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
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        console.log('====================================');
        console.log('API BED_MST_WITH_PARAM PARSE ERROR (raw):', text);
        console.log('====================================');
        console.warn('API BED_MST_WITH_PARAM PARSE ERROR: ' + text);
        throw new Error(`Invalid response format: ${response.status}`);
      }

      console.log('====================================');
      console.log('API GET BEDS WITH PARAM RESPONSE:');
      console.log('STATUS:', response.status);
      console.log('DATA:', JSON.stringify(parsedData, null, 2));
      console.log('====================================');
      console.warn('API RES - BED_MST_WITH_PARAM STATUS: ' + response.status + '\nDATA: ' + JSON.stringify(parsedData));

      return parsedData;
    } catch (error: any) {
      console.log('====================================');
      console.log('API BED_MST_WITH_PARAM EXCEPTION:', error);
      console.log('====================================');
      console.warn('API BED_MST_WITH_PARAM EXCEPTION: ' + error.message);
      throw error;
    }
  },
};
