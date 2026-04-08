// ── Privacy Policy ────────────────────────────────────────────────────────────
// Bump PRIVACY_VERSION whenever the Privacy Policy content changes.
export const PRIVACY_VERSION = "2026-04-08";

export type PrivacySection = {
  title: string;
  subtitle?: string;
  body?: string | null;
};

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: "Privacy Policy",
    subtitle: "Effective Date: April 8, 2026  |  Governing Law: Republic of the Philippines",
    body: null,
  },
  {
    title: "1. Introduction",
    body: "PennyWise (\"we,\" \"us,\" or \"our\") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use the PennyWise mobile application (\"App\").\n\nThis policy is in compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012 (\"DPA\") and its Implementing Rules and Regulations, as enforced by the National Privacy Commission (NPC) of the Philippines.",
  },
  {
    title: "2. Personal Information We Collect",
    body: "We collect the following categories of personal information:\n\n2.1 Information you provide directly:\n• Full name\n• Email address\n• Mobile number\n• Date of birth\n• Password (stored in encrypted form — we never see it in plain text)\n• Profile photo (optional)\n\n2.2 Financial data you input:\n• Income and expense transactions\n• Budget categories and limits\n• Savings goals and progress\n• Account transfer records\n\n2.3 Device and usage information:\n• Device type and operating system\n• App usage patterns and feature interactions\n• Crash reports and error logs (for improving the App)",
  },
  {
    title: "3. How We Use Your Information",
    body: "We use your personal information for the following purposes:\n\n• To create and manage your account\n• To provide, operate, and improve the App's features\n• To display your financial data (transactions, budgets, savings goals, analytics) within the App\n• To send you important notifications about your account or the App\n• To respond to your support requests\n• To comply with our legal obligations under Philippine law\n• To detect, investigate, and prevent fraudulent or unauthorized activity\n\nWe do NOT use your data for targeted advertising or sell it to third parties.",
  },
  {
    title: "4. Legal Basis for Processing",
    body: "Under the Data Privacy Act of 2012, we process your personal information on the following bases:\n\n• Consent — you have given us clear consent by accepting this Privacy Policy and the Terms & Conditions\n• Contract — processing is necessary to provide the services you have requested\n• Legitimate interest — to maintain the security and integrity of the App and improve our services\n• Legal obligation — to comply with applicable Philippine laws and regulations",
  },
  {
    title: "5. Data Sharing and Disclosure",
    body: "We do not sell, trade, or rent your personal information to third parties. We may share your data only in the following limited circumstances:\n\n5.1 Service providers: We work with trusted third-party providers (such as Supabase for database and authentication services) to operate the App. These providers are bound by data processing agreements and may only process your data as instructed by us.\n\n5.2 Legal compliance: We may disclose your information if required by law, court order, or government authority, including the National Privacy Commission.\n\n5.3 Business transfer: In the event of a merger or acquisition, your information may be transferred as part of that transaction, subject to the same privacy protections.\n\n5.4 With your consent: We may share your information for any other purpose with your explicit consent.",
  },
  {
    title: "6. Data Retention",
    body: "We retain your personal information for as long as your account is active or as needed to provide you with the App's services.\n\nIf you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required by law to retain it longer (e.g., for tax or regulatory compliance).\n\nFinancial data you have entered into the App is retained for the life of your account to provide continuity of service.",
  },
  {
    title: "7. Data Security",
    body: "We implement industry-standard technical and organizational measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction, including:\n\n• Encryption of data in transit (TLS/HTTPS)\n• Encrypted password storage (we never store plain-text passwords)\n• Role-based access controls on our backend systems\n• Regular security reviews\n\nHowever, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.",
  },
  {
    title: "8. Your Rights Under the Data Privacy Act",
    body: "As a data subject under Republic Act No. 10173, you have the following rights:\n\n• Right to be informed — you have the right to know how your data is being collected and processed\n• Right to access — you may request a copy of the personal data we hold about you\n• Right to rectification — you may correct inaccurate or incomplete data\n• Right to erasure (\"right to be forgotten\") — you may request deletion of your personal data, subject to legal retention requirements\n• Right to data portability — you may request your data in a commonly used, machine-readable format\n• Right to object — you may object to processing of your data for certain purposes\n• Right to lodge a complaint — you may file a complaint with the National Privacy Commission at www.privacy.gov.ph\n\nTo exercise any of these rights, contact us at support@pennywiseph.com.",
  },
  {
    title: "9. Children's Privacy",
    body: "PennyWise is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. Users between 13 and 17 years of age may use the App only with verified parental or guardian consent.\n\nIf we become aware that we have collected personal information from a child under 13 without appropriate consent, we will take steps to delete that information immediately.",
  },
  {
    title: "10. Cookies and Tracking",
    body: "The App does not use browser cookies. However, we may use device identifiers and similar technologies to:\n\n• Maintain your login session\n• Remember your in-app preferences (such as dark mode)\n• Analyze App usage to improve performance\n\nYou may reset your device's advertising identifier at any time through your device settings.",
  },
  {
    title: "11. Third-Party Links",
    body: "The App may contain links to third-party websites or services (such as the National Privacy Commission website). We are not responsible for the privacy practices of those third parties. We encourage you to read their privacy policies before providing any personal information.",
  },
  {
    title: "12. Changes to This Privacy Policy",
    body: "We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the App with a prompt requiring you to review and accept the updated policy before continuing to use the App.\n\nThe \"Effective Date\" at the top of this policy indicates when it was last revised. Continued use of the App after any changes constitutes your acceptance of the updated policy.",
  },
  {
    title: "13. Data Protection Officer",
    body: "In compliance with the Data Privacy Act of 2012, you may contact our designated Data Protection Officer (DPO) for any privacy-related concerns:\n\nEmail: dpo@pennywiseph.com\nLocation: Philippines\n\nYou may also file a complaint directly with the National Privacy Commission (NPC):\nWebsite: www.privacy.gov.ph\nHotline: 1337",
  },
  {
    title: "14. Governing Law",
    body: "This Privacy Policy shall be governed by and construed in accordance with the laws of the Republic of the Philippines, particularly Republic Act No. 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations.\n\nAny disputes arising from this Privacy Policy shall be subject to the exclusive jurisdiction of the proper courts of Makati City, Metro Manila, Philippines.",
  },
];
