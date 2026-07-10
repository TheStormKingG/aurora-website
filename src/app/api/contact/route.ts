import { handleFormPost } from "@/lib/api";
import { getNotifier } from "@/lib/notify";
import { getStore } from "@/lib/store";
import { contactSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  return handleFormPost(request, {
    scope: "contact",
    schema: contactSchema,
    refPrefix: "AUR-C",
    action: async (data, reference) => {
      await getStore().saveContact(data, reference);
      await getNotifier().send({
        channel: "email",
        to: data.email,
        template: "contact-receipt",
        reference,
        data: { name: data.fullName, kind: data.kind },
      });
    },
  });
}
