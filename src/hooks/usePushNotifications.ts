import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// VAPID public key - the private key should be in edge function secrets
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered');
        setRegistration(reg);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  }, [isSupported]);

  // Get current subscription from database
  const { data: existingSubscription, isLoading } = useQuery({
    queryKey: ['push-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSupported,
  });

  // Subscribe to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!registration || !user?.id) {
        throw new Error('Not ready to subscribe');
      }

      // Request permission if needed
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          throw new Error('Notification permission denied');
        }
      } else if (Notification.permission === 'denied') {
        throw new Error('Notifications are blocked. Please enable them in your browser settings.');
      }

      // Check if VAPID key is configured
      if (!VAPID_PUBLIC_KEY) {
        throw new Error('Push notifications not configured. VAPID key missing.');
      }

      // Subscribe to push manager
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const subscriptionJson = subscription.toJSON();
      
      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: subscriptionJson.keys?.p256dh || '',
          auth_key: subscriptionJson.keys?.auth || '',
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;
      
      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Push notifications enabled!');
    },
    onError: (error: Error) => {
      console.error('Failed to subscribe:', error);
      toast.error(error.message || 'Failed to enable push notifications');
    },
  });

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!registration || !user?.id) return;

      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast.success('Push notifications disabled');
    },
    onError: (error) => {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to disable push notifications');
    },
  });

  // Send a test notification
  const sendTestNotification = useCallback(async () => {
    if (!user?.id) return;

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: user.id,
        title: 'Test Notification 🔔',
        body: 'Push notifications are working!',
        url: '/dashboard/notification-preferences',
      },
    });

    if (error) {
      toast.error('Failed to send test notification');
    }
  }, [user?.id]);

  return {
    isSupported,
    isLoading,
    permission,
    isSubscribed: !!existingSubscription,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    sendTestNotification,
  };
}
