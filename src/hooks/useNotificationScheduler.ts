import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const useNotificationScheduler = () => {
  const { calendarEvents, activeProfileId } = useStore();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request permission on mount if not already granted/denied
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const checkEvents = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = new Date();
      
      // Filter relevant events
      const currentProfileEvents = calendarEvents.filter(
        e => (!e.profileId || e.profileId === activeProfileId) && !e.completed
      );

      currentProfileEvents.forEach(event => {
        // Construct the full Date object for the event
        // event.date is a timestamp (usually midnight of the day)
        const eventDate = new Date(event.date);
        
        // Handle time
        if (event.time) {
          const [hours, minutes] = event.time.split(':').map(Number);
          // Check if valid numbers
          if (!isNaN(hours) && !isNaN(minutes)) {
            eventDate.setHours(hours, minutes, 0, 0);
          } else {
            // Fallback if time parsing fails
            eventDate.setHours(9, 0, 0, 0);
          }
        } else {
          // If no time specified, assume it's an all-day event or morning reminder
          // Setting to 9:00 AM
          eventDate.setHours(9, 0, 0, 0);
        }

        const diffMs = eventDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // Notification Logic
        
        // 1. Upcoming Event (within 1 hour)
        // Check if it's between 0 and 60 minutes in the future
        if (diffMinutes > 0 && diffMinutes <= 60) {
          const key = `${event.id}-upcoming`;
          if (!notifiedRef.current.has(key)) {
            const minutesLeft = Math.ceil(diffMinutes);
            new Notification('Upcoming Event', {
              body: `${event.title} is starting in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
              icon: '/icon.png',
              silent: false
            });
            notifiedRef.current.add(key);
          }
        }

        // 2. Event Starting Now (within last 5 minutes)
        // This covers the case where we hit the exact time or slightly passed it
        if (diffMinutes <= 0 && diffMinutes > -5) {
          const key = `${event.id}-due`;
          if (!notifiedRef.current.has(key)) {
            new Notification('Event Due', {
              body: `${event.title} is starting now!`,
              icon: '/icon.png',
              silent: false
            });
            notifiedRef.current.add(key);
          }
        }
      });
    };

    // Run immediately on mount/update
    checkEvents();

    // Check every minute
    const intervalId = setInterval(checkEvents, 60000);

    return () => clearInterval(intervalId);
  }, [calendarEvents, activeProfileId]);
};
