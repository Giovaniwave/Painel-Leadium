/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Checks if browser supports Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Requests the user for notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'default';
  }
}

/**
 * Triggers a web browser notification if permission is granted
 */
export function sendBrowserNotification(title: string, body: string) {
  if (!isNotificationSupported()) return;

  if (Notification.permission === 'granted') {
    try {
      // Create and display the notification
      const notification = new Notification(title, {
        body,
        icon: 'https://i.ibb.co/k245JhFM/logotipooficialleadium.png',
        tag: 'leadium-finance-alert',
        badge: 'https://i.ibb.co/k245JhFM/logotipooficialleadium.png',
      });

      // Simple click handler
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error('Failed to create browser notification:', err);
    }
  } else {
    console.log('Notification permission not granted or default.');
  }
}
