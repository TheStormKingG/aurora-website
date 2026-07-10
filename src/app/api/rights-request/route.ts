import { handleFormPost } from "@/lib/api";
import { getNotifier } from "@/lib/notify";
import { getStore } from "@/lib/store";
import { rightsRequestSchema } from "@/lib/validation/schemas";

/**
 * Data-subject rights intake (PDR §9.2): every submission opens a
 * tracked, auditable register row (aurora_rights_requests, with a
 * one-month due_by clock) and receipts the requester.
 */
export async function POST(request: Request) {
  return handleFormPost(request, {
    scope: "rights-request",
    schema: rightsRequestSchema,
    refPrefix: "AUR-R",
    action: async (data, reference) => {
      await getStore().saveRightsRequest(data, reference);
      console.info(
        JSON.stringify({
          event: "rights-request.opened",
          right: data.right,
          reference,
          openedAt: new Date().toISOString(),
        })
      );
      await getNotifier().send({
        channel: "email",
        to: data.email,
        template: "rights-request-receipt",
        reference,
        data: { name: data.fullName, right: data.right },
      });
    },
  });
}
