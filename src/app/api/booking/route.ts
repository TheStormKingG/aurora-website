import { handleFormPost } from "@/lib/api";
import { getNotifier } from "@/lib/notify";
import { getStore } from "@/lib/store";
import { bookingSchema } from "@/lib/validation/schemas";
import { getService } from "@/content/services";

export async function POST(request: Request) {
  return handleFormPost(request, {
    scope: "booking",
    schema: bookingSchema,
    refPrefix: "AUR-B",
    action: async (data, reference) => {
      await getStore().saveBooking(data, reference);
      const service = getService(data.service);
      const notifier = getNotifier();
      const to = data.email && data.email.length > 0 ? data.email : data.phone;
      await notifier.send({
        channel: data.email && data.email.length > 0 ? "email" : "sms",
        to,
        template: "booking-confirmation",
        reference,
        data: {
          name: data.fullName,
          service: service?.name ?? data.service,
          date: data.date,
          timeWindow: data.timeWindow,
        },
      });
    },
  });
}
