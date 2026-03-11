import { useEffect } from 'react';
import { formatDisplayName } from '@/lib/utils';
import { useUpcomingBirthdays } from './useBirthdays';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';

/**
 * Hook that shows birthday notification toasts for leadership
 * - 3 days before: reminder notification
 * - 1 day before: urgent notification
 */
export function useBirthdayNotifications() {
  const roles = useEffectiveRoles();
  const isLeadership = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');
  const { data: upcomingBirthdays } = useUpcomingBirthdays(4);

  useEffect(() => {
    if (!isLeadership || !upcomingBirthdays || upcomingBirthdays.length === 0) return;

    // Check for 3-day advance birthdays
    const threeDaysBirthdays = upcomingBirthdays.filter(p => p.daysUntil === 3);
    const oneDayBirthdays = upcomingBirthdays.filter(p => p.daysUntil === 1);

    // Show notifications with slight delay to avoid overwhelming on mount
    const timeout = setTimeout(() => {
      // 3-day advance notifications
      threeDaysBirthdays.forEach(person => {
        const key = `birthday-3day-${person.id}-${new Date().toDateString()}`;
        if (sessionStorage.getItem(key)) return;
        
        toast.info(
          `🎂 ${formatDisplayName(person.full_name || '', person.display_name)}'s birthday is in 3 days!`,
          {
            description: 'Consider planning something special for the team.',
            duration: 8000,
            id: key,
          }
        );
        sessionStorage.setItem(key, 'shown');
      });

      // 1-day advance notifications (more urgent)
      oneDayBirthdays.forEach(person => {
        const key = `birthday-1day-${person.id}-${new Date().toDateString()}`;
        if (sessionStorage.getItem(key)) return;
        
        toast.warning(
          `🎉 ${person.display_name || person.full_name}'s birthday is TOMORROW!`,
          {
            description: 'Don\'t forget to wish them a happy birthday!',
            duration: 10000,
            id: key,
          }
        );
        sessionStorage.setItem(key, 'shown');
      });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [upcomingBirthdays, isLeadership]);
}
