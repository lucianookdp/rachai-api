// ISO 4217 currency codes accepted when creating a group. Covers the
// currencies of every G20 economy plus the other most commonly used
// currencies worldwide, so most groups can bill in their own money.
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD', 'NZD',
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU',
  'INR', 'IDR', 'KRW', 'SGD', 'HKD', 'TWD', 'THB', 'MYR', 'PHP', 'VND',
  'ZAR', 'NGN', 'EGP', 'KES', 'MAD',
  'SEK', 'NOK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'RUB', 'UAH',
  'AED', 'SAR', 'QAR', 'ILS', 'JOD', 'KWD', 'BHD', 'OMR',
  'PKR', 'BDT', 'LKR',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
