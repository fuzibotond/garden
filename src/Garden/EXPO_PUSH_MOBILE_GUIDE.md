# Expo Push Notifications - Mobile Integration Guide

## Quick Start

### 1. Get Push Token on App Startup
```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPushNotifications() {
  let token;
  
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id' // from app.json
    });
  } else {
    alert('Must use physical device for Push Notifications');
  }
  
  return token?.data;
}
```

### 2. Send Token to Backend After Login
```javascript
import axios from 'axios';

async function sendPushTokenToBackend(token, authToken) {
  try {
    await axios.post(
      'http://your-api-url/api/users/push-token',
      { expoPushToken: token },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Push token registered successfully');
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}
```

### 3. Complete Login Flow
```javascript
async function handleLogin(email, password) {
  // 1. Login
  const loginResponse = await login(email, password);
  const { token: authToken } = loginResponse;
  
  // 2. Get push token
  const pushToken = await registerForPushNotifications();
  
  // 3. Send push token to backend
  if (pushToken) {
    await sendPushTokenToBackend(pushToken, authToken);
  }
  
  // 4. Continue with app navigation
  navigation.navigate('Home');
}
```

### 4. Handle Incoming Notifications
```javascript
import { useEffect, useRef } from 'react';

function useNotifications() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Handle notification when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      const data = notification.request.content.data;
      
      if (data.type === 'schedule_request') {
        // Show in-app notification or update UI
        showScheduleRequestNotification(data);
      }
    });

    // Handle notification tap/response
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      if (data.type === 'schedule_request') {
        // Navigate to schedule request details
        navigation.navigate('ScheduleRequest', {
          scheduleRequestId: data.scheduleRequestId,
          taskId: data.taskId
        });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
}
```

### 5. Configure Notification Behavior
```javascript
// In App.js or root component
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

## Backend Endpoint

### Register Push Token
**Endpoint:** `POST /api/users/push-token`  
**Auth:** Required (Bearer token)  
**Request:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```
**Response:** `200 OK` (empty body)

## Notification Data Structure

### Schedule Request Notification
```json
{
  "title": "New Schedule Request",
  "body": "John's Gardening proposed Mar 15, 2024 at 2:00 PM for: Lawn Mowing",
  "data": {
    "type": "schedule_request",
    "scheduleRequestId": "uuid",
    "taskId": "uuid",
    "scheduledAtUtc": "2024-03-15T14:00:00Z"
  }
}
```

## Testing

### Test on Physical Device
1. **Install Expo Go** or build standalone app
2. **Run app** on physical device (push notifications don't work on simulator)
3. **Login** and check console for token registration
4. **Trigger notification** from backend (create schedule request)
5. **Verify notification** appears on device

### Test with Expo Push Tool
Visit: https://expo.dev/notifications

Paste your token and send test notification:
```json
{
  "to": "ExponentPushToken[your-token-here]",
  "title": "Test",
  "body": "Testing push notifications"
}
```

## Troubleshooting

### Token Not Received
- ✅ Using physical device (not simulator)
- ✅ Permissions granted
- ✅ `projectId` in `app.json` matches Expo project
- ✅ Device has internet connection

### Notification Not Appearing
- ✅ Token registered successfully on backend
- ✅ App has notification permissions
- ✅ Backend logs show notification sent
- ✅ Check Expo push receipt for delivery status

### Token Registration Failed
- ✅ User is authenticated (valid JWT)
- ✅ Backend is reachable
- ✅ Token format is valid (starts with `ExponentPushToken[`)

## Configuration Files

### app.json
```json
{
  "expo": {
    "name": "Garden App",
    "slug": "garden-app",
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    },
    "android": {
      "useNextNotificationsApi": true
    },
    "ios": {
      "supportsTabletOnly": false
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4CAF50",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### Install Dependencies
```bash
npx expo install expo-notifications expo-device
```

## Platform Differences

### iOS
- Requires Apple Developer account for production
- Notifications work in Expo Go for testing
- Must enable push notifications capability in Xcode

### Android
- Works out of the box in Expo Go
- FCM (Firebase Cloud Messaging) used internally by Expo
- No additional setup required for development

## Production Considerations

1. **EAS Build:** Use EAS Build for production apps
2. **Credentials:** Expo handles push certificates automatically
3. **Error Handling:** Implement retry logic for token registration
4. **Token Refresh:** Re-register token if it changes
5. **Logout:** Consider clearing token on logout (optional)

## Complete Example

```javascript
// NotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import axios from 'axios';

const API_URL = 'http://your-api-url';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id',
    })).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export async function registerPushToken(token, authToken) {
  try {
    await axios.post(
      `${API_URL}/api/users/push-token`,
      { expoPushToken: token },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Push token registered:', token);
    return true;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
}

export function setupNotificationListeners(navigation) {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'schedule_request') {
      navigation.navigate('ScheduleRequest', {
        scheduleRequestId: data.scheduleRequestId,
      });
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
```

## Usage in App
```javascript
// App.js or AuthContext.js
import { registerForPushNotificationsAsync, registerPushToken, setupNotificationListeners } from './services/NotificationService';

function App() {
  const navigation = useNavigation();

  useEffect(() => {
    const cleanup = setupNotificationListeners(navigation);
    return cleanup;
  }, []);

  const handleLogin = async (email, password) => {
    const { token } = await loginAPI(email, password);
    
    // Register push token after successful login
    const pushToken = await registerForPushNotificationsAsync();
    if (pushToken) {
      await registerPushToken(pushToken, token);
    }
    
    navigation.navigate('Home');
  };

  // ... rest of app
}
```

## Next Steps
1. Install dependencies: `npx expo install expo-notifications expo-device`
2. Update `app.json` with your project ID
3. Implement notification service
4. Test on physical device
5. Integrate with login flow
