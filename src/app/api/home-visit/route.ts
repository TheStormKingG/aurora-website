import { handleFormPost } from "@/lib/api";
import { getNotifier } from "@/lib/notify";
import { homeVisitSchema } from "@/lib/validation/schemas";
import { getService } from "@/content/services";

export async function POST(request: Request) {
  return handleFormPost(request, {
    scope: "home-visit",
    schema: homeVisitSchema,
    refPrefix: "AUR-H",
    action: async (data, reference) => {
      const service = getService(data.service);
      await getNotifier().send({
        channel: "sms",
        to: data.phone,
        template: "home-visit-confirmation",
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
