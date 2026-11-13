// Links shown in Menu → About.
// TODO: replace these placeholders with the real pages, email and store listings before release.

// Numeric App Store id from App Store Connect. Until it exists, "Rate" opens the website instead of a dead store page.
export const appStoreId = '';

export const links = {
  website: 'https://sugardepth.com',
  howItWorks: 'https://sugardepth.com/how-it-works',
  privacy: 'https://sugardepth.com/privacy',
  terms: 'https://sugardepth.com/terms',
  supportEmail: 'support@sugardepth.com',
  appStore: appStoreId ? `https://apps.apple.com/app/id${appStoreId}` : 'https://sugardepth.com',
  playStore: 'https://play.google.com/store/apps/details?id=app.quickgab', // TODO: Android package name
};

// TODO: placeholder wording for the privacy policy page (links.privacy). Have it reviewed before release.
export const privacyPolicyDraft = `Sugar Depth keeps your scan history on this phone: for each scan, the verdict (CLEAN, OKAY or BAD) and the ingredient lists found (natural sugars, added sugars and sweeteners). Your name and settings are saved to your account. When you scan, the label photo is sent to our server and on to two third-party AI services for analysis: Anthropic (Claude), which reads the ingredient list, and TypeSafe (Jev), which gives the sugar verdict. Photos of labels are not stored by Sugar Depth. The app also sends anonymous scan timing (how long each step took, photo size, platform and network type) to help us keep scans fast; it contains no label content. Your Google account is used only to sign you in. Deleting your account permanently deletes your profile and the history on this phone.`;
