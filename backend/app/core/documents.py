from dataclasses import dataclass

from pydantic import BaseModel, create_model


@dataclass(frozen=True)
class FieldSpec:
    key: str
    label: str
    description: str


@dataclass(frozen=True)
class DocumentSpec:
    slug: str
    # Must match a `filename` in the repo root's catalog.json.
    filename: str
    name: str
    intro: str
    fields: tuple[FieldSpec, ...]


DOCUMENTS: tuple[DocumentSpec, ...] = (
    DocumentSpec(
        slug="mutual-nda",
        filename="Mutual-NDA.md",
        name="Mutual Non-Disclosure Agreement",
        intro="a Mutual Non-Disclosure Agreement (Mutual NDA)",
        fields=(
            FieldSpec("party1Name", "Party 1 name", "legal name of the first party (company or individual)."),
            FieldSpec("party1Address", "Party 1 address", "mailing address of the first party."),
            FieldSpec("party2Name", "Party 2 name", "legal name of the second party."),
            FieldSpec("party2Address", "Party 2 address", "mailing address of the second party."),
            FieldSpec("effectiveDate", "Effective date", "the date the agreement starts, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("purpose", "Purpose", 'why the parties are sharing confidential information (e.g. "evaluating a potential partnership").'),
            FieldSpec("mndaTerm", "MNDA term", 'how long the agreement itself lasts (e.g. "2 years").'),
            FieldSpec("confidentialityTerm", "Confidentiality term", 'how long confidentiality obligations survive after the agreement ends (e.g. "5 years").'),
            FieldSpec("governingLaw", "Governing law", 'the US state whose law governs the agreement (e.g. "Delaware").'),
            FieldSpec("jurisdiction", "Jurisdiction", 'the court venue for disputes (e.g. "Santa Clara County, California").'),
        ),
    ),
    DocumentSpec(
        slug="csa",
        filename="CSA.md",
        name="Cloud Service Agreement",
        intro="a Cloud Service Agreement (CSA), where a Provider gives a Customer access to a cloud-hosted product",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company providing the Cloud Service."),
            FieldSpec("customerName", "Customer name", "legal name of the company using the Cloud Service."),
            FieldSpec("effectiveDate", "Effective date", "the date the Framework Terms start, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("subscriptionPeriod", "Subscription period", 'how long the subscription runs (e.g. "12 months").'),
            FieldSpec("technicalSupport", "Technical support", "what technical support is provided during the subscription period."),
            FieldSpec("paymentProcess", "Payment process", "how and when invoices are sent and paid (e.g. invoicing in arrears vs. automatic payment)."),
            FieldSpec("orderDate", "Order date", "the date the Order Form is signed, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("nonRenewalNoticeDate", "Non-renewal notice date", "how much advance notice is required to opt out of automatic renewal."),
            FieldSpec("dpaReference", "DPA reference", "whether the parties have a separate Data Processing Agreement, and if so which one (or \"not applicable\")."),
            FieldSpec("governingLaw", "Governing law", 'the jurisdiction whose law governs the agreement (e.g. "Delaware").'),
            FieldSpec("chosenCourts", "Chosen courts", "the court venue for disputes."),
            FieldSpec("generalCapAmount", "General cap amount", "the overall liability cap for most claims."),
            FieldSpec("increasedCapAmount", "Increased cap amount", "the higher liability cap that applies to Increased Claims."),
            FieldSpec("increasedClaims", "Increased claims", "which categories of claims get the higher liability cap."),
            FieldSpec("unlimitedClaims", "Unlimited claims", "which categories of claims have no liability cap at all."),
            FieldSpec("providerCoveredClaims", "Provider covered claims", "which claims the Provider indemnifies the Customer against."),
            FieldSpec("customerCoveredClaims", "Customer covered claims", "which claims the Customer indemnifies the Provider against."),
            FieldSpec("additionalWarranties", "Additional warranties", "any extra warranties either party makes, beyond the standard ones (or \"none\")."),
            FieldSpec("useLimitations", "Use limitations", "any restrictions on how the Customer may use the Cloud Service."),
        ),
    ),
    DocumentSpec(
        slug="dpa",
        filename="DPA.md",
        name="Data Processing Agreement",
        intro="a Data Processing Agreement (DPA), governing a Provider's processing of a Customer's personal data",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company processing personal data (the Processor/Subprocessor)."),
            FieldSpec("customerName", "Customer name", "legal name of the company whose personal data is being processed."),
            FieldSpec("agreementReference", "Agreement reference", "the name of the underlying agreement this DPA supplements."),
            FieldSpec("categoriesOfPersonalData", "Categories of personal data", 'what kinds of personal data are processed (e.g. "names, email addresses, usage logs").'),
            FieldSpec("categoriesOfDataSubjects", "Categories of data subjects", 'whose personal data is processed (e.g. "Customer\'s employees and end users").'),
            FieldSpec("natureAndPurposeOfProcessing", "Nature and purpose of processing", "why and how the personal data is processed."),
            FieldSpec("durationOfProcessing", "Duration of processing", "how long the processing continues (e.g. \"the term of the Agreement\")."),
            FieldSpec("frequencyOfTransfer", "Frequency of transfer", 'how often personal data is transferred (e.g. "continuous").'),
            FieldSpec("specialCategoryData", "Special category data", "whether any special category data (health, biometric, etc.) is processed, and what kind (or \"none\")."),
            FieldSpec("specialCategoryDataSafeguards", "Special category data safeguards", "any extra safeguards for special category data (or \"not applicable\")."),
            FieldSpec("approvedSubprocessors", "Approved subprocessors", "which subprocessors are approved to handle the data (or \"none currently\")."),
            FieldSpec("governingMemberState", "Governing member state", "the EEA member state whose law governs international transfer terms."),
            FieldSpec("securityPolicy", "Security policy", "a reference to the Provider's security policy or standard."),
            FieldSpec("providerSecurityContact", "Provider security contact", "who at the Provider should be contacted about security questions."),
        ),
    ),
    DocumentSpec(
        slug="baa",
        filename="BAA.md",
        name="Business Associate Agreement",
        intro="a Business Associate Agreement (BAA) under HIPAA, between a Provider (Business Associate) and a Company (Covered Entity)",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the Business Associate handling PHI."),
            FieldSpec("companyName", "Company name", "legal name of the Covered Entity."),
            FieldSpec("baaEffectiveDate", "BAA effective date", "the date the BAA starts, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("agreementReference", "Agreement reference", "the name of the underlying agreement this BAA supplements."),
            FieldSpec("limitations", "Limitations", "any limitations on how the Provider may use or disclose PHI (or \"none\")."),
            FieldSpec("breachNotificationPeriod", "Breach notification period", 'how quickly the Provider must report a breach (e.g. "5 business days").'),
        ),
    ),
    DocumentSpec(
        slug="ai-addendum",
        filename="AI-Addendum.md",
        name="AI Addendum",
        intro="an AI Addendum, supplementing an underlying agreement with terms governing use of AI Services",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company providing the AI Services."),
            FieldSpec("customerName", "Customer name", "legal name of the company using the AI Services."),
            FieldSpec("trainingData", "Training data", "what data, if any, the Provider may use to train models (or \"none\" if training isn't permitted)."),
            FieldSpec("trainingPurposes", "Training purposes", "what the Provider may train models for, if training is permitted."),
            FieldSpec("trainingRestrictions", "Training restrictions", "any restrictions on how the Provider may use Training Data (or \"none\")."),
            FieldSpec("improvementRestrictions", "Improvement restrictions", "any restrictions on using inputs/outputs for non-training product improvement (or \"none\")."),
        ),
    ),
    DocumentSpec(
        slug="sla",
        filename="SLA.md",
        name="Service Level Agreement",
        intro="a Service Level Agreement (SLA), defining uptime and support response time commitments for a cloud service",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company providing the Cloud Service."),
            FieldSpec("customerName", "Customer name", "legal name of the company using the Cloud Service."),
            FieldSpec("subscriptionPeriod", "Subscription period", 'how long the subscription runs (e.g. "12 months").'),
            FieldSpec("targetUptime", "Target uptime", 'the uptime commitment (e.g. "99.9%").'),
            FieldSpec("targetResponseTime", "Target response time", 'how quickly support requests are acknowledged (e.g. "4 business hours").'),
            FieldSpec("supportChannel", "Support channel", 'where support requests should be sent (e.g. "support@example.com").'),
            FieldSpec("uptimeCredit", "Uptime credit", "the service credit owed if uptime falls below target."),
            FieldSpec("responseTimeCredit", "Response time credit", "the service credit owed if response time falls below target."),
            FieldSpec("scheduledDowntime", "Scheduled downtime", "any planned maintenance windows excluded from uptime calculations (or \"none\")."),
        ),
    ),
    DocumentSpec(
        slug="psa",
        filename="PSA.md",
        name="Professional Services Agreement",
        intro="a Professional Services Agreement (PSA), governing statements of work for services and deliverables",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company performing the services."),
            FieldSpec("customerName", "Customer name", "legal name of the company receiving the services."),
            FieldSpec("effectiveDate", "Effective date", "the date the Standard Terms start, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("customerPolicies", "Customer policies", "any Customer policies the Provider must comply with while performing services (or \"none\")."),
            FieldSpec("deliverables", "Deliverables", "what deliverables, if any, the Provider will create."),
            FieldSpec("rejectionPeriod", "Rejection period", 'how long the Customer has to reject a deliverable (e.g. "10 business days").'),
            FieldSpec("resubmissionPeriod", "Resubmission period", 'how long the Provider has to fix and resubmit a rejected deliverable (e.g. "10 business days").'),
            FieldSpec("timeOfAssignment", "Time of assignment", "when ownership of deliverables transfers to the Customer."),
            FieldSpec("customerObligations", "Customer obligations", "what the Customer must do to support the services (or \"none\")."),
            FieldSpec("fees", "Fees", "the fees for the services and how they're structured."),
            FieldSpec("paymentPeriod", "Payment period", 'how long the Customer has to pay an invoice (e.g. "30 days").'),
            FieldSpec("sowTerm", "SOW term", "how long the statement of work runs."),
            FieldSpec("dpaReference", "DPA reference", "whether the parties have a separate Data Processing Agreement (or \"not applicable\")."),
            FieldSpec("securityPolicy", "Security policy", "a reference to the Provider's security policy, if any."),
            FieldSpec("governingLaw", "Governing law", "the jurisdiction whose law governs the agreement."),
            FieldSpec("chosenCourts", "Chosen courts", "the court venue for disputes."),
            FieldSpec("generalCapAmount", "General cap amount", "the overall liability cap for most claims."),
            FieldSpec("increasedCapAmount", "Increased cap amount", "the higher liability cap that applies to Increased Claims."),
            FieldSpec("increasedClaims", "Increased claims", "which categories of claims get the higher liability cap."),
            FieldSpec("unlimitedClaims", "Unlimited claims", "which categories of claims have no liability cap at all."),
            FieldSpec("providerCoveredClaims", "Provider covered claims", "which claims the Provider indemnifies the Customer against."),
            FieldSpec("customerCoveredClaims", "Customer covered claims", "which claims the Customer indemnifies the Provider against."),
            FieldSpec("additionalWarranties", "Additional warranties", "any extra warranties either party makes (or \"none\")."),
            FieldSpec("insuranceMinimums", "Insurance minimums", "the minimum insurance coverage each party must carry."),
        ),
    ),
    DocumentSpec(
        slug="partnership-agreement",
        filename="Partnership-Agreement.md",
        name="Partnership Agreement",
        intro="a Partnership Agreement, governing a business partnership including cooperation obligations and trademark licensing",
        fields=(
            FieldSpec("companyName", "Company name", "legal name of the first party."),
            FieldSpec("partnerName", "Partner name", "legal name of the second party."),
            FieldSpec("effectiveDate", "Effective date", "the date the agreement starts, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("endDate", "End date", "the date the agreement ends, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("obligations", "Obligations", "what each party is responsible for doing under the partnership."),
            FieldSpec("paymentProcess", "Payment process", "how and when any Fees are billed or invoiced (or \"not applicable\" if no Fees)."),
            FieldSpec("paymentSchedule", "Payment schedule", "when payments are due, if any Fees apply."),
            FieldSpec("territory", "Territory", 'the geographic territory for the trademark license (e.g. "United States").'),
            FieldSpec("brandGuidelines", "Brand guidelines", "any brand guidelines governing use of the Licensor's trademarks (or \"none\")."),
            FieldSpec("dpaReference", "DPA reference", "whether the parties have a separate Data Processing Agreement (or \"not applicable\")."),
            FieldSpec("governingLaw", "Governing law", "the jurisdiction whose law governs the agreement."),
            FieldSpec("chosenCourts", "Chosen courts", "the court venue for disputes."),
            FieldSpec("generalCapAmount", "General cap amount", "the overall liability cap for most claims."),
            FieldSpec("increasedCapAmount", "Increased cap amount", "the higher liability cap that applies to Increased Claims."),
            FieldSpec("increasedClaims", "Increased claims", "which categories of claims get the higher liability cap."),
            FieldSpec("unlimitedClaims", "Unlimited claims", "which categories of claims have no liability cap at all."),
            FieldSpec("companyCoveredClaim", "Company covered claim", "which claims the Company indemnifies the Partner against."),
            FieldSpec("partnerCoveredClaims", "Partner covered claims", "which claims the Partner indemnifies the Company against."),
            FieldSpec("additionalWarranties", "Additional warranties", "any extra warranties either party makes (or \"none\")."),
        ),
    ),
    DocumentSpec(
        slug="pilot-agreement",
        filename="Pilot-Agreement.md",
        name="Pilot Agreement",
        intro="a Pilot Agreement, giving a prospective customer time-limited access to evaluate a product",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company providing the product."),
            FieldSpec("customerName", "Customer name", "legal name of the company evaluating the product."),
            FieldSpec("effectiveDate", "Effective date", "the date the pilot starts, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("pilotPeriod", "Pilot period", 'how long the pilot runs (e.g. "30 days").'),
            FieldSpec("generalCapAmount", "General cap amount", "the overall liability cap for claims."),
            FieldSpec("governingLaw", "Governing law", "the jurisdiction whose law governs the agreement."),
            FieldSpec("chosenCourts", "Chosen courts", "the court venue for disputes."),
            FieldSpec("noticeAddress", "Notice address", "the mailing address where formal notices should be sent."),
        ),
    ),
    DocumentSpec(
        slug="software-license-agreement",
        filename="Software-License-Agreement.md",
        name="Software License Agreement",
        intro="a Software License Agreement, governing an on-premises or installed license to use a Provider's software",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company licensing the software."),
            FieldSpec("customerName", "Customer name", "legal name of the company using the software."),
            FieldSpec("effectiveDate", "Effective date", "the date the Framework Terms start, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("subscriptionPeriod", "Subscription period", 'how long the license subscription runs (e.g. "12 months").'),
            FieldSpec("permittedUses", "Permitted uses", "what the Customer is allowed to use the software for."),
            FieldSpec("licenseLimits", "License limits", 'any limits on the license (e.g. "up to 50 named users").'),
            FieldSpec("orderDate", "Order date", "the date the Order Form is signed, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("nonRenewalNoticeDate", "Non-renewal notice date", "how much advance notice is required to opt out of automatic renewal."),
            FieldSpec("deletionProcedure", "Deletion procedure", "how the Customer must remove the software after termination."),
            FieldSpec("paymentProcess", "Payment process", "how and when invoices are sent and paid."),
            FieldSpec("warrantyPeriod", "Warranty period", 'how long the software warranty lasts (e.g. "90 days").'),
            FieldSpec("governingLaw", "Governing law", "the jurisdiction whose law governs the agreement."),
            FieldSpec("chosenCourts", "Chosen courts", "the court venue for disputes."),
            FieldSpec("generalCapAmount", "General cap amount", "the overall liability cap for most claims."),
            FieldSpec("increasedCapAmount", "Increased cap amount", "the higher liability cap that applies to Increased Claims."),
            FieldSpec("increasedClaims", "Increased claims", "which categories of claims get the higher liability cap."),
            FieldSpec("unlimitedClaims", "Unlimited claims", "which categories of claims have no liability cap at all."),
            FieldSpec("providerCoveredClaims", "Provider covered claims", "which claims the Provider indemnifies the Customer against."),
            FieldSpec("customerCoveredClaims", "Customer covered claims", "which claims the Customer indemnifies the Provider against."),
            FieldSpec("additionalWarranties", "Additional warranties", "any extra warranties either party makes (or \"none\")."),
        ),
    ),
    DocumentSpec(
        slug="design-partner-agreement",
        filename="Design-Partner-Agreement.md",
        name="Design Partner Agreement",
        intro="a Design Partner Agreement, giving an early customer access to a product in exchange for feedback during development",
        fields=(
            FieldSpec("providerName", "Provider name", "legal name of the company providing the product."),
            FieldSpec("partnerName", "Partner name", "legal name of the design partner."),
            FieldSpec("effectiveDate", "Effective date", "the date the agreement starts, as an ISO date (YYYY-MM-DD)."),
            FieldSpec("term", "Term", 'how long the agreement runs (e.g. "6 months").'),
            FieldSpec("program", "Program", "what the design partner program involves (e.g. feedback cadence, scope)."),
            FieldSpec("fees", "Fees", "any fees the partner pays, if applicable (or \"none\")."),
            FieldSpec("governingLaw", "Governing law", "the jurisdiction whose law governs the agreement."),
            FieldSpec("chosenCourts", "Chosen courts", "the court venue for disputes."),
            FieldSpec("noticeAddress", "Notice address", "the mailing address where formal notices should be sent."),
        ),
    ),
)

_BY_SLUG = {document.slug: document for document in DOCUMENTS}


def get_document(slug: str) -> DocumentSpec | None:
    return _BY_SLUG.get(slug)


def build_fields_model(document: DocumentSpec) -> type[BaseModel]:
    field_definitions = {field.key: (str | None, None) for field in document.fields}
    return create_model(f"{document.slug.title().replace('-', '')}Fields", **field_definitions)


def build_system_prompt(document: DocumentSpec) -> str:
    field_lines = "\n".join(f"- {field.key}: {field.description}" for field in document.fields)
    return f"""You are a friendly assistant helping someone fill in {document.intro}. Your job \
is to have a natural, conversational back-and-forth that gathers the following fields.

The user has already seen a greeting, so don't greet them again. Keep the conversation short: \
ask for 4 to 6 related fields at once, grouped logically, or for everything that's left if 6 \
or fewer fields are missing. Never ask for one \
field at a time, but never recite the whole list as a form either. Extract everything the user \
volunteers, including fields you didn't ask about.

Fields to gather:
{field_lines}

You will be told which fields are already known. Treat those as confirmed: repeat them back \
unchanged in your output unless the user explicitly gives a new value for that same field. \
Only fill in fields the user has actually provided information for - leave everything else \
null rather than guessing.

If any fields are still missing after this reply, your message must end with a specific \
question about the next group of missing fields - never end a turn without a next step \
unless the document is fully complete.

Once every field is known, tell the user their document is ready to review and stop asking \
questions (you may still answer follow-up questions or accept corrections).

Never mention the internal field names (e.g. "{document.fields[0].key}") in your message to \
the user - always describe them in plain English using their labels.

Keep your messages short and conversational, not legalistic."""


def build_field_labels(document: DocumentSpec) -> dict[str, str]:
    return {field.key: field.label for field in document.fields}
