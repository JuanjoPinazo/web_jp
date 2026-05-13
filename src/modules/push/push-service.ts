import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Initialize web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:soporte@quilprocardio.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: {
    url: string;
    [key: string]: any;
  };
}

export async function sendPushToProfile(profileId: string, payload: PushPayload) {
  const supabase = getSupabaseAdmin();
  
  // Get active subscriptions for this profile
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('profile_id', profileId)
    .is('revoked_at', null);

  if (error || !subscriptions) {
    console.error('Error fetching push subscriptions:', error);
    return;
  }

  const pushPromises = subscriptions.map(async (sub) => {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );
      
      // Update last used
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id);
        
    } catch (err: any) {
      console.warn(`Failed to send push to ${sub.endpoint}:`, err.statusCode);
      
      // If subscription expired or gone, mark as revoked
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', sub.id);
      }
    }
  });

  await Promise.all(pushPromises);
}

export async function sendPushToPlan(planId: string, payload: PushPayload) {
  const supabase = getSupabaseAdmin();
  
  // Find the profile_id for this plan
  const { data: plan } = await supabase
    .from('contact_travel_plans')
    .select('user_id')
    .eq('id', planId)
    .single();

  if (plan?.user_id) {
    await sendPushToProfile(plan.user_id, payload);
  }
}
