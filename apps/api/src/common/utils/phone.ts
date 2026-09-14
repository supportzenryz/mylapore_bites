/**
 * Phone normalisation. The customer's phone IS their identity, so this must
 * be deterministic: one human must never end up with two customer rows.
 */

export class PhoneNormalisationError extends Error {}

const DIGITS = /\D+/g;

/** Known national number lengths, used to reject obvious typos early. */
const NATIONAL_LENGTHS: Record<string, number[]> = {
  "+91": [10],
  "+44": [10, 9],
  "+1": [10],
  "+971": [9],
  "+61": [9],
};

/**
 * Accepts what people actually type — "98765 43210", "098765-43210",
 * "+91 98765 43210", "0091..." — and returns a single canonical E.164 form.
 */
export function normalisePhone(input: string, defaultCountryCode = "+91"): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) throw new PhoneNormalisationError("Phone number is required");

  const cc = defaultCountryCode.startsWith("+") ? defaultCountryCode : `+${defaultCountryCode}`;
  const ccDigits = cc.replace(DIGITS, "");

  let digits: string;
  if (trimmed.startsWith("+")) {
    digits = trimmed.replace(DIGITS, "");
  } else {
    let local = trimmed.replace(DIGITS, "");
    // 00-prefixed international form
    if (local.startsWith("00")) {
      digits = local.slice(2);
    } else {
      // National trunk prefix: a single leading zero is not part of the number.
      if (local.startsWith("0")) local = local.replace(/^0+/, "");
      // Already carries the country code without a plus.
      digits = local.startsWith(ccDigits) && local.length > ccDigits.length
        ? local
        : ccDigits + local;
    }
  }

  if (digits.length < 8 || digits.length > 15) {
    throw new PhoneNormalisationError("That doesn't look like a valid phone number");
  }

  const e164 = `+${digits}`;
  const matchedCc = Object.keys(NATIONAL_LENGTHS)
    .sort((a, b) => b.length - a.length)
    .find((code) => e164.startsWith(code));

  if (matchedCc) {
    const nationalLength = e164.length - matchedCc.length;
    const allowed = NATIONAL_LENGTHS[matchedCc]!;
    if (!allowed.includes(nationalLength)) {
      throw new PhoneNormalisationError("That doesn't look like a valid phone number");
    }
  }

  return e164;
}

/** "+919876543210" → "+91 98765 ***10" for logs and support screens. */
export function maskPhone(e164: string): string {
  if (e164.length < 6) return "***";
  return `${e164.slice(0, e164.length - 4).replace(/.(?=.{2})/g, (c, i) => (i < 3 ? c : "*"))}**${e164.slice(-2)}`;
}
