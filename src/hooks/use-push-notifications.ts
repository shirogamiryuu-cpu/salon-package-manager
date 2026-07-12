import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers the device for push notifications on native platforms (iOS/Android),
 * uploads the FCM/APNs token to `device_tokens`, and navigates to the
 * Notifications page when the user taps an incoming notification.
 *
 * No-op on the web — Capacitor push notifications require a native runtime.
 */
export function usePushNotifications() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // 1. Permissions
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted") return;

        // 2. Ensure Android has the channel referenced by server-sent FCM payloads
        if (Capacitor.getPlatform() === "android") {
          await PushNotifications.createChannel({
            id: "session_requests",
            name: "Session Requests",
            description: "Session approval requests from the salon",
            importance: 5,
            visibility: 1,
            lights: true,
            vibration: true,
          });
        }

        // 3. Register with APNs / FCM
        await PushNotifications.register();

        // 4. Persist token
        const regListener = await PushNotifications.addListener("registration", async (t) => {
          try {
            const { data: u } = await supabase.auth.getUser();
            if (!u.user) return;
            const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
            await supabase
              .from("device_tokens")
              .upsert(
                { user_id: u.user.id, token: t.value, platform },
                { onConflict: "token" },
              );
          } catch (e) {
            console.error("[push] failed to store token", e);
          }
        });

        const errListener = await PushNotifications.addListener("registrationError", (err) => {
          console.error("[push] registration error", err);
        });

        // 5. Foreground notifications
        const recvListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notif) => {
            toast.info(notif.title ?? "New notification", {
              description: notif.body ?? undefined,
              action: {
                label: "View",
                onClick: () => router.navigate({ to: "/app/notifications" }),
              },
            });
          },
        );

        // 6. Tap handler
        const actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          () => {
            router.navigate({ to: "/app/notifications" });
          },
        );

        if (cancelled) return;
        cleanup = () => {
          regListener.remove();
          errListener.remove();
          recvListener.remove();
          actionListener.remove();
        };
      } catch (e) {
        console.error("[push] setup failed", e);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [router]);
}
