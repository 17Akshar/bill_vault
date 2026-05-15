import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bills', {
      name: 'Bill Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  
  return true;
};

export const scheduleBillNotification = async (
  billId: string,
  billName: string,
  amount: number,
  dueDate: Date,
  daysBefore: number = 3
) => {
  try {
    const notificationDate = new Date(dueDate);
    notificationDate.setDate(notificationDate.getDate() - daysBefore);
    notificationDate.setHours(9, 0, 0, 0); // 9 AM
    
    // Don't schedule if date is in the past
    if (notificationDate < new Date()) {
      return null;
    }
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bill Reminder',
        body: `${billName} - $${amount.toFixed(2)} due in ${daysBefore} days`,
        data: { billId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
      },
    });
    
    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const cancelBillNotification = async (identifier: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};