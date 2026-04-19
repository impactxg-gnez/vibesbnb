/** Platform-wide rules copy shown on every booking; host PDF may add further terms. */
export function buildGuestAgreementNotice(opts: {
  propertyName: string;
  smokingInsideAllowed: boolean;
  hostAgreementUrl: string | null;
}) {
  const { propertyName, smokingInsideAllowed, hostAgreementUrl } = opts;
  const smokeLine = smokingInsideAllowed
    ? 'Smoking inside this unit is allowed only where permitted by the host and applicable law; follow any designated areas or restrictions in the listing and host documents.'
    : 'Smoking is not permitted inside the rental unit. You may use outdoor areas only if the listing allows outdoor smoking and local law permits.';

  return {
    title: 'House rules & guest agreement',
    bullets: [
      `You are booking "${propertyName}" and agree to follow all building and house rules stated by the host and VibesBNB.`,
      smokeLine,
      'You accept responsibility for your guests’ compliance with these rules; violations may lead to cancellation, fees, or liability.',
      'You understand the host depends on accurate guest counts, respectful behavior, and adherence to safety rules to maintain their license and insurance.',
      hostAgreementUrl
        ? 'The host has provided an additional written agreement (PDF). You must review and accept it together with these terms before submitting your request.'
        : 'Where the host later provides a written addendum, you agree to follow those terms as communicated before check-in.',
    ] as string[],
  };
}
