import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, AppState, Modal, Dimensions, Alert } from 'react-native';
import ExpoAndroidUsagestats, { getAggregatedUsageStats, UsageStatsIntervalType } from 'expo-android-usagestats';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { PieChart } from 'react-native-chart-kit';
import NetInfo from '@react-native-community/netinfo';

// Import Offline JSON Database
import offlineRoasts from './assets/offline_roasts.json';

const BACKGROUND_WATCHDOG_TASK = 'background-watchdog-task';
const screenWidth = Dimensions.get("window").width;

// Mintlify Slate Palette
const CHART_COLORS = ["#00d4a4", "#1c1c1e", "#3a3a3c", "#5a5a5c", "#888888", "#a8a8aa"];

const IGNORED_PACKAGES = [
  'com.google.android.apps.nexuslauncher',
  'com.android.systemui',
  'com.google.android.permissioncontroller',
  'com.google.android.googlequicksearchbox',
  'com.android.packageinstaller',
  'com.google.android.settings.intelligence',
  'com.zui.launcher',
  'com.android.contacts',
  'com.samsung.android.contacts',
  'com.samsung.android.dialer',
  'com.google.android.dialer'
];

const getFriendlyAppName = (packageName) => {
  const nameMap = {
    'com.google.android.gm': 'Gmail',
    'com.android.vending': 'Play Store',
    'com.android.chrome': 'Chrome',
    'com.google.android.youtube': 'YouTube',
    'com.whatsapp': 'WhatsApp',
    'com.instagram.android': 'Instagram',
    'com.google.android.apps.docs': 'Google Drive',
    'com.google.android.apps.photos': 'Google Photos',
    'com.yourname.touchgrassapp': 'Touch Grass',
    'com.android.settings': 'Settings'
  };
  if (nameMap[packageName]) return nameMap[packageName];
  const cleanName = packageName.split('.').pop();
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
};

// Hybrid Helper: Try Gemini API first, fall back to offline JSON
const fetchHybridRoast = async (appName, minutes) => {
  const netState = await NetInfo.fetch();

  if (netState.isConnected) {
    try {
      const response = await fetch('https://touch-grass-api-w329.onrender.com/generate-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: appName, minutes: minutes })
      });

      if (response.ok) {
        const data = await response.json();
        return data.roast || data.message;
      }
    } catch (e) {
      // API call failed, drop into offline fallback below
    }
  }

  // Offline Fallback Logic
  const appPool = offlineRoasts[appName] || offlineRoasts["general"];
  const randomIndex = Math.floor(Math.random() * appPool.length);
  return appPool[randomIndex];
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

TaskManager.defineTask(BACKGROUND_WATCHDOG_TASK, async () => {
  try {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const stats = await getAggregatedUsageStats(startOfDay, new Date().getTime(), UsageStatsIntervalType.INTERVAL_DAILY);
    
    const mergedStats = {};
    stats.forEach(app => {
      if (app.totalTimeInForeground > 0 && app.lastTimeUsed >= startOfDay && !IGNORED_PACKAGES.includes(app.packageName) && !app.packageName.includes('launcher')) {
        if (mergedStats[app.packageName]) {
           mergedStats[app.packageName].totalTimeInForeground = Math.max(mergedStats[app.packageName].totalTimeInForeground, app.totalTimeInForeground);
        } else {
           mergedStats[app.packageName] = { ...app };
        }
      }
    });

    const topApps = Object.values(mergedStats).sort((a, b) => b.totalTimeInForeground - a.totalTimeInForeground);

    if (topApps.length > 0) {
      const topApp = topApps[0];
      const minutesUsed = Math.floor(topApp.totalTimeInForeground / 60000);
      const appName = getFriendlyAppName(topApp.packageName);

      if (minutesUsed >= 45) {
        const roastText = await fetchHybridRoast(appName, minutesUsed);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${minutesUsed}m on ${appName}?`,
            body: roastText,
          },
          trigger: null,
        });
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NewData; 
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [usageData, setUsageData] = useState([]);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const checkPermissionAndLoad = async () => {
    try {
      const granted = await ExpoAndroidUsagestats.hasUsageStatsPermission();
      setHasPermission(granted);
      if (granted) {
        await loadStats();
        await registerBackgroundTask();
      }
    } catch (err) {}
  };

  const requestPermission = async () => {
    await ExpoAndroidUsagestats.requestUsageStatsPermission();
  };
  
  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') await Notifications.requestPermissionsAsync();
  };

  const registerBackgroundTask = async () => {
    await setupNotifications();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_WATCHDOG_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_WATCHDOG_TASK, { minimumInterval: 15 * 60, stopOnTerminate: false, startOnBoot: true });
    }
  };

  const loadStats = async () => {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const stats = await getAggregatedUsageStats(startOfDay, new Date().getTime(), UsageStatsIntervalType.INTERVAL_DAILY);
    
    const mergedStats = {};
    let dailyTotal = 0;

    stats.forEach(app => {
      if (app.totalTimeInForeground > 0 && app.lastTimeUsed >= startOfDay && !IGNORED_PACKAGES.includes(app.packageName) && !app.packageName.includes('launcher')) {
        if (mergedStats[app.packageName]) {
          mergedStats[app.packageName].totalTimeInForeground = Math.max(mergedStats[app.packageName].totalTimeInForeground, app.totalTimeInForeground);
        } else {
          mergedStats[app.packageName] = { ...app };
        }
      }
    });

    Object.values(mergedStats).forEach(app => {
      dailyTotal += app.totalTimeInForeground;
    });

    const filteredStats = Object.values(mergedStats).sort((a, b) => b.totalTimeInForeground - a.totalTimeInForeground).slice(0, 15);
    setTotalTimeMs(dailyTotal);
    setUsageData(filteredStats);
  };

  const testPushNotification = async () => {
    if (usageData.length === 0) {
      Alert.alert("No Data", "Open some apps first so screen stats can populate.");
      return;
    }

    const topApp = usageData[0];
    const appName = getFriendlyAppName(topApp.packageName);
    const minutesUsed = Math.floor(topApp.totalTimeInForeground / 60000);

    const roastText = await fetchHybridRoast(appName, minutesUsed);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 ${minutesUsed}m on ${appName}?`,
        body: roastText,
      },
      trigger: null,
    });
  };

  useEffect(() => {
    checkPermissionAndLoad();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') checkPermissionAndLoad();
    });
    return () => subscription.remove();
  }, []);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const generateChartData = () => {
    if (usageData.length === 0) return [];
    const top5 = usageData.slice(0, 5).map((app, index) => ({
      name: getFriendlyAppName(app.packageName),
      population: Math.floor(app.totalTimeInForeground / 60000),
      color: CHART_COLORS[index],
      legendFontColor: "#1c1c1e",
      legendFontSize: 13
    }));
    const othersTimeMs = usageData.slice(5).reduce((acc, app) => acc + app.totalTimeInForeground, 0);
    if (othersTimeMs > 60000) {
      top5.push({ name: "Others", population: Math.floor(othersTimeMs / 60000), color: CHART_COLORS[5], legendFontColor: "#888888", legendFontSize: 13 });
    }
    return top5;
  };

  return (
    <View style={styles.canvas}>
      <Text style={styles.header}>Touch Grass</Text>
      <Text style={styles.subtitle}>System Activity & Analytics</Text>

      {!hasPermission ? (
        <View style={styles.permissionBox}>
          <Text style={styles.warningText}>Core system permissions required to track usage.</Text>
          <TouchableOpacity style={styles.primaryPillButton} onPress={requestPermission}>
            <Text style={styles.pillButtonText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.cardBase}>
            <Text style={styles.cardTitle}>Total Screen Time Today</Text>
            <Text style={styles.monoDisplay}>{formatTime(totalTimeMs)}</Text>
          </View>

          {usageData.length > 0 && (
            <View style={styles.cardFeature}>
              <PieChart
                data={generateChartData()}
                width={screenWidth - 72}
                height={200}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"10"}
                absolute
              />
            </View>
          )}

          <TouchableOpacity style={styles.primaryPillButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.pillButtonText}>View Detailed Breakdown</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mintAccentButton} onPress={testPushNotification}>
            <Text style={styles.mintButtonText}>Test AI Roast 🔔</Text>
          </TouchableOpacity>

          <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalCanvas}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>App Usage Logs</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={usageData}
                keyExtractor={(item) => item.packageName}
                renderItem={({ item }) => (
                  <View style={styles.propertyRow}>
                    <Text style={styles.appName} numberOfLines={1}>{getFriendlyAppName(item.packageName)}</Text>
                    <Text style={styles.monoTime}>{formatTime(item.totalTimeInForeground)}</Text>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </Modal>
        </View>
      )}
    </View>
  );
}

// Strict Mintlify Aesthetic Design Tokens
const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: '#ffffff', paddingTop: 60, paddingHorizontal: 24 },
  header: { fontSize: 36, fontWeight: '600', color: '#0a0a0a', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#888888', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  warningText: { fontSize: 14, textAlign: 'center', color: '#5a5a5c', marginBottom: 20 },
  cardBase: { backgroundColor: '#ffffff', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', marginBottom: 16 },
  cardFeature: { backgroundColor: '#f7f7f7', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 13, color: '#888888', fontWeight: '500', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  monoDisplay: { fontSize: 40, fontWeight: '600', color: '#0a0a0a' },
  primaryPillButton: { backgroundColor: '#0a0a0a', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 9999, marginBottom: 12, alignItems: 'center' },
  pillButtonText: { color: '#ffffff', fontWeight: '500', fontSize: 14 },
  mintAccentButton: { backgroundColor: '#00d4a4', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 9999, alignItems: 'center' },
  mintButtonText: { color: '#0a0a0a', fontWeight: '600', fontSize: 14 },
  modalCanvas: { flex: 1, backgroundColor: '#ffffff', paddingTop: 24, paddingHorizontal: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  modalTitle: { fontSize: 22, fontWeight: '600', color: '#0a0a0a' },
  closeText: { fontSize: 14, color: '#d45656', fontWeight: '600' },
  propertyRow: { backgroundColor: '#f7f7f7', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { fontSize: 14, fontWeight: '500', color: '#1c1c1e', flex: 1 },
  monoTime: { fontSize: 14, fontWeight: '600', color: '#0a0a0a' }
});