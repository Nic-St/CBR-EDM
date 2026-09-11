// Single place for site identity, copy and contact addresses.
// Change this file rather than hunting for hardcoded strings elsewhere.

export const config = {
  // TBC by owner, see SPEC.md section 18. Everything reads from here
  // until a real name and domain are picked.
  siteName: 'Project C-EDM',

  slogan: 'No algorithm, just the info you need, for the ones not on the feed',

  privacyLine: 'No tracking cookies. We count visits, not people.',

  // Board column labels, section 7.1. Defaults from the spec.
  boardColumns: {
    upcoming: 'Coming up',
    past: 'Been and gone',
  },

  // Acknowledgement of Country, section 15.3. Empty string hides it entirely.
  // TBC by owner, see SPEC.md section 18.
  ackText: '',

  harmReductionTitle: 'Look after each other',

  // Public inbound address, shown on the contact page and footer.
  // Never the owner's personal address.
  contactAddress: 'events@REPLACE_WITH_DOMAIN',

  // Sender identity for admin alert emails, section 10.3. Must be on the
  // same domain as contactAddress, per the Email Routing setup in README.md.
  noreplyAddress: 'noreply@REPLACE_WITH_DOMAIN',

  reminderBanner: {
    fromDate: '2027-04-01',
    text: 'CanTEST funding was due to end June 2027. Check the service is still running.',
  },
};
