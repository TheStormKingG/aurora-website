import { handleFormPost } from "@/lib/api";
import { getNotifier } from "@/lib/notify";
import { rightsRequestSchema } from "@/lib/validation/schemas";

/**
 * Data-subject rights intake (PDR §9.2): every submission opens a
 * tracked, auditable record (the reference + structured log line) and
 * receipts the requester. One-month response clock starts here.
 */
export async function POST(request: Request) {
  return handleFormPost(request, {
    scope: "rights-request",
    schema: rightsRequestSchema,
    refPrefix: "AUR-R",
    action: async (data, reference) => {
      // Auditable record: right exercised + when + reference (no PII).
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
