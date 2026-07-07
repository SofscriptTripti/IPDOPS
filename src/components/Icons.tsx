import React from 'react';
import { StyleSheet, View } from 'react-native';

// Common icon container style
const styles = StyleSheet.create({
  iconContainer: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.6,
    backgroundColor: 'transparent',
  },
  userBody: {
    width: 15,
    height: 7,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    marginTop: 2.5,
  },
  lockShackle: {
    width: 10,
    height: 9,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    marginBottom: -1.5,
  },
  lockBody: {
    width: 14,
    height: 10,
    borderRadius: 3,
    borderWidth: 1.6,
    backgroundColor: 'transparent',
  },
  eyeOutline: {
    width: 16,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  eyePupil: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  eyeSlash: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  pinContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinOuter: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinInner: {
    width: 2.8,
    height: 2.8,
    borderRadius: 1.4,
  },
});

// Custom User Icon
export const UserIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.userHead, { borderColor: color }]} />
    <View style={[styles.userBody, { borderColor: color }]} />
  </View>
);

// Custom Lock Icon
export const LockIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.lockShackle, { borderColor: color }]} />
    <View style={[styles.lockBody, { borderColor: color }]} />
  </View>
);

// Custom Eye Icon
export const EyeIcon = ({ color, visible }: { color: string; visible: boolean }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.eyeOutline, { borderColor: color }]}>
      <View style={[styles.eyePupil, { backgroundColor: color }]} />
    </View>
    {!visible && <View style={[styles.eyeSlash, { backgroundColor: color }]} />}
  </View>
);

// Custom Location Pin Icon
export const PinIcon = ({ color }: { color: string }) => (
  <View style={styles.pinContainer}>
    <View style={[styles.pinOuter, { borderColor: color }]}>
      <View style={[styles.pinInner, { backgroundColor: color }]} />
    </View>
  </View>
);

// Search Magnifying Glass Icon
export const SearchIcon = ({ color }: { color: string }) => (
  <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: 11, height: 11, borderRadius: 5.5, borderWidth: 1.5, borderColor: color, position: 'absolute', top: 1, left: 1 }} />
    <View style={{ width: 1.5, height: 5, backgroundColor: color, transform: [{ rotate: '-45deg' }], position: 'absolute', bottom: 1, right: 1 }} />
  </View>
);

// Calendar Icon
export const CalendarIcon = ({ color }: { color: string }) => (
  <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center', marginRight: 5 }}>
    <View style={{ width: 12, height: 10, borderWidth: 1.2, borderColor: color, borderRadius: 2 }} />
    <View style={{ width: 1.2, height: 2.5, backgroundColor: color, position: 'absolute', top: -1, left: 3 }} />
    <View style={{ width: 1.2, height: 2.5, backgroundColor: color, position: 'absolute', top: -1, right: 3 }} />
    <View style={{ width: 12, height: 1, backgroundColor: color, position: 'absolute', top: 3.5 }} />
  </View>
);

// Bell/Notification Icon
export const BellIcon = ({ color }: { color: string }) => (
  <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: 10, height: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderWidth: 1.6, borderColor: color, borderBottomWidth: 0, marginTop: 1 }} />
    <View style={{ width: 14, height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ width: 3, height: 2, backgroundColor: color, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5, marginTop: 1 }} />
  </View>
);

// Bed/Turnover Icon
export const BedIcon = ({ color }: { color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: 16, height: 8, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0, position: 'absolute', bottom: 4 }} />
    <View style={{ width: 1.5, height: 3.5, backgroundColor: color, position: 'absolute', bottom: 0.5, left: 2 }} />
    <View style={{ width: 1.5, height: 3.5, backgroundColor: color, position: 'absolute', bottom: 0.5, right: 2 }} />
    <View style={{ width: 4.5, height: 3, backgroundColor: color, position: 'absolute', top: 9, left: 3.5, borderRadius: 0.5 }} />
  </View>
);

// Home (Dashboard) Tab Icon
export const HomeIcon = ({ color }: { color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: 14, height: 11, borderWidth: 1.6, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5, marginTop: 4.5 }} />
    <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderLeftColor: 'transparent', borderRightWidth: 8, borderRightColor: 'transparent', borderBottomWidth: 6.5, borderBottomColor: color, position: 'absolute', top: 1 }} />
  </View>
);

// Patients Tab Icon
export const PatientsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ position: 'absolute', left: 1, top: 4.5 }}>
      <View style={{ width: 5.5, height: 5.5, borderRadius: 2.75, borderWidth: 1.4, borderColor: color }} />
      <View style={{ width: 9.5, height: 4, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderWidth: 1.4, borderColor: color, borderBottomWidth: 0, marginTop: 1 }} />
    </View>
    <View style={{ position: 'absolute', right: 1, top: 4.5 }}>
      <View style={{ width: 5.5, height: 5.5, borderRadius: 2.75, borderWidth: 1.4, borderColor: color }} />
      <View style={{ width: 9.5, height: 4, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderWidth: 1.4, borderColor: color, borderBottomWidth: 0, marginTop: 1 }} />
    </View>
  </View>
);

// Reports Tab Icon
export const ReportsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: 3, height: 6, backgroundColor: color, position: 'absolute', bottom: 3, left: 3, borderRadius: 0.5 }} />
    <View style={{ width: 3, height: 11, backgroundColor: color, position: 'absolute', bottom: 3, left: 8.5, borderRadius: 0.5 }} />
    <View style={{ width: 3, height: 8, backgroundColor: color, position: 'absolute', bottom: 3, left: 14, borderRadius: 0.5 }} />
    <View style={{ width: 16, height: 1.4, backgroundColor: color, position: 'absolute', bottom: 1.6 }} />
  </View>
);

// Profile Tab Icon
export const ProfileIcon = ({ color }: { color: string }) => (
  <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5, borderColor: color }} />
    <View style={{ width: 13, height: 5, borderTopLeftRadius: 4.5, borderTopRightRadius: 4.5, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0, marginTop: 1 }} />
  </View>
);

// Mini Checkmark Icon for Metric Cards
export const MiniCheckIcon = ({ color }: { color: string }) => (
  <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: 8,
      height: 5,
      borderLeftWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: color,
      transform: [{ rotate: '-45deg' }],
      marginTop: -2,
    }} />
  </View>
);

// Mini Warning Icon for Metric Cards
export const MiniWarningIcon = ({ color }: { color: string }) => (
  <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderLeftColor: 'transparent',
      borderRightWidth: 6,
      borderRightColor: 'transparent',
      borderBottomWidth: 11,
      borderBottomColor: color,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <View style={{
        position: 'absolute',
        width: 1.3,
        height: 3.5,
        backgroundColor: '#ffffff',
        top: 2.5,
      }} />
      <View style={{
        position: 'absolute',
        width: 1.3,
        height: 1.3,
        borderRadius: 0.65,
        backgroundColor: '#ffffff',
        top: 7,
      }} />
    </View>
  </View>
);

// Exit / Logout Icon
export const ExitIcon = ({ color }: { color: string }) => (
  <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
    {/* Exit box outline */}
    <View style={{
      width: 12,
      height: 15,
      borderWidth: 1.8,
      borderColor: color,
      borderRightWidth: 0,
      borderTopLeftRadius: 2.5,
      borderBottomLeftRadius: 2.5,
      position: 'absolute',
      left: 2,
    }} />
    {/* Arrow */}
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      position: 'absolute',
      right: 2,
      width: 12,
    }}>
      {/* Arrow shaft */}
      <View style={{ width: 8, height: 1.8, backgroundColor: color }} />
      {/* Arrow head */}
      <View style={{
        width: 6,
        height: 6,
        borderTopWidth: 1.8,
        borderRightWidth: 1.8,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginLeft: -4.5,
      }} />
    </View>
  </View>
);
