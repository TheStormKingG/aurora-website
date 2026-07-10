/**
 * FHIR client interface stub (M5 / PDR §11.1).
 *
 * THE WEBSITE NEVER STORES CLINICAL DATA. The portal reads and writes
 * exclusively through this client against the Aurora Digital Health
 * Platform (HL7 FHIR R4+). Phase Two wires the implementation; the
 * interface exists now so no code path is ever tempted to persist
 * clinical data locally.
 */

export type FhirResourceType =
  | "Patient"
  | "Appointment"
  | "Observation"
  | "MedicationRequest"
  | "DiagnosticReport"
  | "Consent"
  | "AuditEvent";

export interface FhirClient {
  /** Read a resource by type + id, on behalf of an authenticated patient session. */
  read<T>(resourceType: FhirResourceType, id: string, accessToken: string): Promise<T>;
  /** Search within the authenticated patient's compartment only. */
  search<T>(
    resourceType: FhirResourceType,
    params: Record<string, string>,
    accessToken: string
  ): Promise<T[]>;
  /** Create a resource (e.g. Appointment) in the platform — never locally. */
  create<T>(resourceType: FhirResourceType, resource: T, accessToken: string): Promise<T>;
}

export class NotConfiguredFhirClient implements FhirClient {
  private fail(): never {
    throw new Error(
      "FHIR client not configured. Portal data flows require the Aurora Digital Health Platform connection (Phase Two, docs/PLAN.md M5)."
    );
  }
  async read<T>(): Promise<T> {
    this.fail();
  }
  async search<T>(): Promise<T[]> {
    this.fail();
  }
  async create<T>(): Promise<T> {
    this.fail();
  }
}

export function getFhirClient(): FhirClient {
  return new NotConfiguredFhirClient();
}
