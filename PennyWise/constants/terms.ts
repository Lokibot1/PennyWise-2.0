// ── Terms & Conditions ────────────────────────────────────────────────────────
// Bump TERMS_VERSION whenever the T&C content changes.
// Existing users whose stored version differs will be shown an update modal.
export const TERMS_VERSION = "2026-04-08";

export type TermsSection = {
  title: string;
  subtitle?: string;
  body?: string | null;
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "Terms and Conditions",
    subtitle: "Effective Date: April 8, 2026  |  Governing Law: Republic of the Philippines",
    body: null,
  },
  {
    title: "1. Acceptance of Terms",
    body: "By downloading, installing, accessing, or using the PennyWise mobile application (\"App\"), you (\"User\") agree to be bound by these Terms and Conditions (\"Terms\"). If you do not agree to these Terms, do not use the App.\n\nThese Terms constitute a legally binding agreement between you and PennyWise governed by the laws of the Republic of the Philippines.",
  },
  {
    title: "2. Eligibility",
    body: "To use PennyWise, you must:\n\n• Be at least 18 years of age, or at least 15 years of age with verified parental or guardian consent;\n• Be a resident of or located within the Republic of the Philippines; and\n• Have the legal capacity to enter into a binding agreement under Philippine law.\n\nBy using the App, you represent and warrant that you meet all eligibility requirements.",
  },
  {
    title: "3. Description of Service",
    body: "PennyWise is a personal finance management application that provides:\n\n• Transaction tracking — record and categorize income and expenses\n• Budget management — set and monitor spending budgets\n• Savings goals — create and track financial goals\n• Analytics — view financial summaries and insights\n• Fund transfers — record transfers between accounts\n• Account management — manage your personal profile\n\nPennyWise is a personal finance tracking tool only. It is NOT a bank, financial institution, payment processor, or investment advisor. We do not hold, move, or manage actual funds on your behalf.",
  },
  {
    title: "4. Account Registration",
    body: "4.1 You must create an account to use the App. You agree to provide accurate, current, and complete information during registration.\n\n4.2 You are solely responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account.\n\n4.3 You may not share your account with others or create multiple accounts for the same person.\n\n4.4 We reserve the right to suspend or terminate your account if information you provided is inaccurate, incomplete, or fraudulent.",
  },
  {
    title: "5. User Responsibilities",
    body: "You agree to use PennyWise only for lawful purposes. You agree NOT to:\n\n• Provide false, misleading, or fraudulent financial data;\n• Attempt to gain unauthorized access to the App's systems or other users' accounts;\n• Use the App to facilitate money laundering, tax evasion, or any illegal financial activity;\n• Reverse engineer, decompile, or disassemble any part of the App;\n• Transmit any viruses, malware, or harmful code through the App; or\n• Violate any applicable Philippine law or regulation.",
  },
  {
    title: "6. Privacy and Data Protection",
    body: "6.1 We are committed to protecting your personal data in compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012, and its Implementing Rules and Regulations.\n\n6.2 By using the App, you consent to the collection, processing, and storage of your personal and financial data, including:\n\n• Account information (name, email address)\n• Financial data you input (income, expenses, budgets, savings goals)\n• Device and usage information\n\n6.3 We will not sell your personal data to third parties. We may share data only with trusted service providers who assist in operating the App, under strict data protection agreements.\n\n6.4 You have the right to access, correct, and request deletion of your personal data by contacting us.",
  },
  {
    title: "7. Financial Disclaimer",
    body: "7.1 PennyWise provides financial tracking and planning tools only. Nothing in the App constitutes financial advice, investment advice, tax advice, or legal advice.\n\n7.2 We are not licensed as a financial advisor, investment house, or money service business under Philippine law, including the Securities Regulation Code (RA 8799), General Banking Law (RA 8791), or BSP regulations.\n\n7.3 All financial decisions made based on information provided by the App are made at your sole discretion and risk. We strongly encourage you to consult a licensed financial professional.",
  },
  {
    title: "8. Intellectual Property",
    body: "8.1 All content, features, and functionality of the App — including text, graphics, logos, icons, and software — are the exclusive property of PennyWise and protected under Republic Act No. 8293 (Intellectual Property Code of the Philippines).\n\n8.2 You are granted a limited, non-exclusive, non-transferable, revocable license to use the App for personal, non-commercial purposes only.\n\n8.3 You may not copy, reproduce, distribute, modify, or create derivative works of the App without our prior written consent.",
  },
  {
    title: "9. Limitation of Liability",
    body: "To the maximum extent permitted by Philippine law, PennyWise and its developers shall not be liable for:\n\n• Inaccuracies in your recorded financial data due to user input errors;\n• Loss of data due to device failure, software errors, or circumstances beyond our control;\n• Financial loss resulting from your reliance on the App's features or information; or\n• Unauthorized access to your account due to your failure to maintain the security of your credentials.\n\nOur total liability for any claim shall not exceed the amount you paid for the App in the six (6) months preceding the claim.",
  },
  {
    title: "10. Governing Law and Dispute Resolution",
    body: "10.1 These Terms shall be governed by the laws of the Republic of the Philippines.\n\n10.2 Any dispute shall first be subject to good-faith negotiation for thirty (30) days from written notice.\n\n10.3 If unresolved, the dispute shall be submitted to mediation under the Philippine Mediation Center.\n\n10.4 If mediation fails, disputes shall be resolved through arbitration under Republic Act No. 9285 (Alternative Dispute Resolution Act of 2004).\n\n10.5 Venue for any legal proceedings shall be the proper courts of Makati City, Metro Manila, Philippines.",
  },
  {
    title: "11. Termination",
    body: "11.1 You may terminate your account at any time through account settings or by contacting us.\n\n11.2 We reserve the right to suspend or terminate your account at any time if we believe you have violated these Terms or applicable law.\n\n11.3 Upon termination, your right to use the App ceases immediately. We may retain your data for the period required by law, after which it will be deleted.",
  },
  {
    title: "12. Contact Us",
    body: "For questions, concerns, or data privacy requests:\n\nEmail: support@pennywiseph.com\nLocation: Philippines\n\nFor data privacy complaints, you may also contact the National Privacy Commission (NPC) of the Philippines at www.privacy.gov.ph.",
  },
];
