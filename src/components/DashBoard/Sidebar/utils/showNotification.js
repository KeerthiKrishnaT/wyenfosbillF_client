// utils/showNotification.js
export const showNotification = (title, message) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body: message });
      }
    });
  }

  // Also save in localStorage for Notifications panel
  const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
  const updated = [
    { title, message, timestamp: new Date().toISOString() },
    ...stored.slice(0, 19) // keep max 20 notifications
  ];
  localStorage.setItem('notifications', JSON.stringify(updated));
};
