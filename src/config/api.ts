export const API_CONFIG = {
  // Old Auth Base URL (for reference):
  // BASE_URL: 'http://123.108.45.16:8650/hmisloginapi/api',

  // Active Base URLs:
  AUTH_BASE_URL: 'http://122.179.143.31:86/CareWorksOne_Test/hmisLoginApi/api',
  TRACKER_BASE_URL: 'http://122.179.143.31:86/DischargeTracker/DischargeTrackerApi/api',
  // CAREWORKS_BASE_URL: 'http://122.179.143.31:86/CareWorksOne/CareWorksOneApi/api',
  CAREWORKS_BASE_URL: 'http://122.179.143.31:86/CareWorksOne_Test/CareWorksOneApi/api',
  CAREWORKS_TEST_BASE_URL: 'http://122.179.143.31:86/CareWorksOne_Test/CareWorksOneApi/api',
  ENDPOINTS: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    WARD_LIST: '/wardListByUser',
    DASHBOARD: '/dischargeTatDashboard',
    DETAIL: '/dischargeTatDetail',
    SUB_MODULES: '/getSubModuleByUserId',
    CHECK_RIGHTS: '/checkUserRights',
    BED_TYPES: '/getBedTypMst',
    CHANGE_BED_STATUS: '/changeBedStatus',
    BED_MST_WITH_PARAM: '/bedMstWithParam',
    CHAT_UNREAD_COUNT: '/chatUnreadCount',
    CHAT_GET_OR_CREATE_THREAD: '/chatGetOrCreateThread',
    CHAT_GET_MESSAGES: '/chatGetMessages',
    CHAT_SEND_MESSAGE: '/chatSendMessage',
    CHAT_MARK_READ: '/chatMarkRead',
    CHAT_EDIT_MESSAGE: '/chatEditMessage',
    CHAT_DELETE_MESSAGE: '/chatDeleteMessage',
    CHAT_MESSAGE_SEEN_BY: '/chatGetMessageSeenBy',
    OT_CALL_REGISTER_LIST: '/otCallRegister/list',
    OT_CALL_REGISTER_GET_BY_ID: '/otCallRegister/getById',
    OT_CALL_REGISTER_UPDATE: '/otCallRegister/update',
  },
};
