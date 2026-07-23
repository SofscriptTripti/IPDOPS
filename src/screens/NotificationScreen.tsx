import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';

// Enable layout animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'warning' | 'success' | 'info';
  read: boolean;
}

interface NotificationScreenProps {
  onBack: () => void;
}

export const NotificationScreen = ({ onBack }: NotificationScreenProps) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
  
  // Initial 4 high-quality notifications relevant to IPD Operations app
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Urgent: Discharge Advice TAT Exceeded',
      message: 'Discharge Advice (T1) TAT exceeded for MR. KRISHNA DAS PAL. Pharmacy return request (T4) has been pending for over 45 minutes.',
      time: '10 mins ago',
      type: 'alert',
      read: false,
    },
    {
      id: '2',
      title: 'Bed Ready Alert',
      message: 'Bed 511B (GENERAL WARD - 5TH FLR.) has been cleaned and is now marked READY for the next patient intimation.',
      time: '30 mins ago',
      type: 'success',
      read: false,
    },
    {
      id: '3',
      title: 'Pending Finance Clearance',
      message: 'Billing/Finance clearance is pending for MR. ASHISH N NABAR (SELF PAYING). Turnaround limit (TAT) is approaching target.',
      time: '1 hour ago',
      type: 'warning',
      read: true,
    },
    {
      id: '4',
      title: 'New Discharge Advice',
      message: 'Discharge Advice (T1) has been initiated for MR. JAMES PAWAR by DR. SANGEETA CHINCHOLE.',
      time: '2 hours ago',
      type: 'info',
      read: true,
    },
  ]);

  // Toggle single notification read status
  const handleMarkAsRead = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications(prev =>
      prev.map(item => (item.id === id ? { ...item, read: true } : item))
    );
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
  };

  // Clear all notifications
  const handleClearAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications([]);
  };

  // Filter list based on selected tab
  const filteredNotifications = notifications.filter(
    item => activeTab === 'All' || !item.read
  );

  const unreadCount = notifications.filter(item => !item.read).length;

  // Render type-specific icon badges
  const renderIconBadge = (type: 'alert' | 'warning' | 'success' | 'info') => {
    let bgColor = '#cbd5e1';
    let iconChar = 'i';

    switch (type) {
      case 'alert':
        bgColor = THEME.colors.danger;
        iconChar = '!';
        break;
      case 'warning':
        bgColor = THEME.colors.warning;
        iconChar = '⚠';
        break;
      case 'success':
        bgColor = THEME.colors.success;
        iconChar = '✓';
        break;
      case 'info':
        bgColor = '#007bbf';
        iconChar = 'i';
        break;
    }

    return (
      <View style={[styles.iconBadge, { backgroundColor: bgColor }]}>
        <Text style={styles.iconText}>{iconChar}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} translucent />
      
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
          {/* Back Arrow Chevron */}
          <View style={styles.backArrow} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={styles.clearAllBtnAbsolute}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      

      {/* Tabs Control */}
      {notifications.length > 0 && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'All' && styles.activeTabButton]}
            onPress={() => setActiveTab('All')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'All' && styles.activeTabButtonText]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Unread' && styles.activeTabButton]}
            onPress={() => setActiveTab('Unread')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'Unread' && styles.activeTabButtonText]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action panel (Mark all as read) */}
      {unreadCount > 0 && activeTab === 'All' && (
        <View style={styles.actionPanel}>
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7} style={styles.markAllReadBtn}>
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scrollable list */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={item.read ? 1 : 0.8}
              onPress={() => !item.read && handleMarkAsRead(item.id)}
              style={[styles.card, !item.read && styles.unreadCard]}
            >
              {renderIconBadge(item.type)}
              
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, !item.read && styles.unreadCardTitle]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                
                <Text style={styles.cardMessage}>{item.message}</Text>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>{item.time}</Text>
                  {!item.read && (
                    <Text style={styles.tapToReadText}>Tap to mark read</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>🔔</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'Unread' ? 'No unread notifications' : 'No notifications'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'Unread' 
                ? "You have read all of your notifications." 
                : "We'll let you know when there's an update on patient TATs or bed preparation."}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.screenBg,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    position: 'relative',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backArrow: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 8,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  clearAllBtnAbsolute: {
    position: 'absolute',
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  clearAllText: {
    fontSize: 14,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: THEME.colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.textLight,
  },
  activeTabButtonText: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  actionPanel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  markAllReadBtn: {
    paddingVertical: 4,
  },
  markAllReadText: {
    fontSize: 13,
    color: THEME.colors.secondary,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    elevation: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  unreadCard: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: THEME.colors.primaryBg,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textDark,
    flex: 1,
    paddingRight: 8,
  },
  unreadCardTitle: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
  },
  cardMessage: {
    fontSize: 13.5,
    color: THEME.colors.textMedium,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTime: {
    fontSize: 11.5,
    color: THEME.colors.textLight,
  },
  tapToReadText: {
    fontSize: 11.5,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: THEME.colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});
