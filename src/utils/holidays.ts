export interface HolidayRule {
  month: number; // 1-12
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  week: number; // 1, 2, 3, 4, or -1 (Last)
}

export interface Holiday {
  name: string;
  date?: string; // MM-DD format
  rule?: HolidayRule;
  emoji: string;
}

export interface CountryData {
  code: string;
  name: string;
  flag: string;
  holidays: Holiday[];
}

export const COUNTRIES: CountryData[] = [
  {
    code: 'AF',
    name: 'Afghanistan',
    flag: '🇦🇫',
    holidays: [
      { name: 'Independence Day', date: '08-19', emoji: '🎉' }
    ]
  },
  {
    code: 'AL',
    name: 'Albania',
    flag: '🇦🇱',
    holidays: [
      { name: 'Independence Day', date: '11-28', emoji: '🦅' }
    ]
  },
  {
    code: 'DZ',
    name: 'Algeria',
    flag: '🇩🇿',
    holidays: [
      { name: 'Independence Day', date: '07-05', emoji: '🎉' }
    ]
  },
  {
    code: 'AO',
    name: 'Angola',
    flag: '🇦🇴',
    holidays: [
      { name: 'Independence Day', date: '11-11', emoji: '🎉' }
    ]
  },
  {
    code: 'AI',
    name: 'Anguilla',
    flag: '🇦🇮',
    holidays: [
      { name: 'Anguilla Day', date: '05-30', emoji: '🇦🇮' }
    ]
  },
  {
    code: 'AG',
    name: 'Antigua and Barbuda',
    flag: '🇦🇬',
    holidays: [
      { name: 'Independence Day', date: '11-01', emoji: '🎉' }
    ]
  },
  {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    holidays: [
      { name: 'Independence Day', date: '07-09', emoji: '🌞' }
    ]
  },
  {
    code: 'AM',
    name: 'Armenia',
    flag: '🇦🇲',
    holidays: [
      { name: 'Independence Day', date: '09-21', emoji: '🎉' }
    ]
  },
  {
    code: 'AW',
    name: 'Aruba',
    flag: '🇦🇼',
    holidays: [
      { name: 'Status Aparte Day', date: '01-01', emoji: '🇦🇼' },
      { name: 'National Anthem & Flag Day', date: '03-18', emoji: '🇦🇼' }
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    holidays: [
      { name: 'Australia Day', date: '01-26', emoji: '🦘' }
    ]
  },
  {
    code: 'AT',
    name: 'Austria',
    flag: '🇦🇹',
    holidays: [
      { name: 'National Day', date: '10-26', emoji: '🇦🇹' }
    ]
  },
  {
    code: 'BS',
    name: 'Bahamas',
    flag: '🇧🇸',
    holidays: [
      { name: 'Independence Day', date: '07-10', emoji: '🎉' }
    ]
  },
  {
    code: 'BH',
    name: 'Bahrain',
    flag: '🇧🇭',
    holidays: [
      { name: 'National Day', date: '12-16', emoji: '🇧🇭' }
    ]
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    flag: '🇧🇩',
    holidays: [
      { name: 'Independence Day', date: '03-26', emoji: '🎉' },
      { name: 'Victory Day', date: '12-16', emoji: '✌️' }
    ]
  },
  {
    code: 'BB',
    name: 'Barbados',
    flag: '🇧🇧',
    holidays: [
      { name: 'Independence Day', date: '11-30', emoji: '🔱' }
    ]
  },
  {
    code: 'BE',
    name: 'Belgium',
    flag: '🇧🇪',
    holidays: [
      { name: 'National Day', date: '07-21', emoji: '🇧🇪' }
    ]
  },
  {
    code: 'BZ',
    name: 'Belize',
    flag: '🇧🇿',
    holidays: [
      { name: 'Independence Day', date: '09-21', emoji: '🎉' }
    ]
  },
  {
    code: 'BM',
    name: 'Bermuda',
    flag: '🇧🇲',
    holidays: [
      { name: 'Bermuda Day', rule: { month: 5, dayOfWeek: 5, week: -1 }, emoji: '🇧🇲' }
    ]
  },
  {
    code: 'BO',
    name: 'Bolivia',
    flag: '🇧🇴',
    holidays: [
      { name: 'Independence Day', date: '08-06', emoji: '🎉' }
    ]
  },
  {
    code: 'BA',
    name: 'Bosnia and Herzegovina',
    flag: '🇧🇦',
    holidays: [
      { name: 'Independence Day', date: '03-01', emoji: '🎉' }
    ]
  },
  {
    code: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    holidays: [
      { name: 'Independence Day', date: '09-07', emoji: '💚' }
    ]
  },
  {
    code: 'VG',
    name: 'British Virgin Islands',
    flag: '🇻🇬',
    holidays: [
      { name: 'Emancipation Festival', rule: { month: 8, dayOfWeek: 1, week: 1 }, emoji: '🇻🇬' }
    ]
  },
  {
    code: 'CV',
    name: 'Cabo Verde',
    flag: '🇨🇻',
    holidays: [
      { name: 'Independence Day', date: '07-05', emoji: '🎉' }
    ]
  },
  {
    code: 'KH',
    name: 'Cambodia',
    flag: '🇰🇭',
    holidays: [
      { name: 'Independence Day', date: '11-09', emoji: '🎉' }
    ]
  },
  {
    code: 'CM',
    name: 'Cameroon',
    flag: '🇨🇲',
    holidays: [
      { name: 'National Day', date: '05-20', emoji: '🎉' }
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    holidays: [
      { name: 'Canada Day', date: '07-01', emoji: '🍁' }
    ]
  },
  {
    code: 'KY',
    name: 'Cayman Islands',
    flag: '🇰🇾',
    holidays: [
      { name: 'Constitution Day', rule: { month: 7, dayOfWeek: 1, week: 1 }, emoji: '🇰🇾' }
    ]
  },
  {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    holidays: [
      { name: 'Independence Day', date: '09-18', emoji: '🎉' }
    ]
  },
  {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    holidays: [
      { name: 'National Day', date: '10-01', emoji: '🏮' }
    ]
  },
  {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    holidays: [
      { name: 'Independence Day', date: '07-20', emoji: '🎉' }
    ]
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    flag: '🇨🇷',
    holidays: [
      { name: 'Independence Day', date: '09-15', emoji: '🎉' }
    ]
  },
  {
    code: 'HR',
    name: 'Croatia',
    flag: '🇭🇷',
    holidays: [
      { name: 'Statehood Day', date: '05-30', emoji: '🎉' }
    ]
  },
  {
    code: 'CU',
    name: 'Cuba',
    flag: '🇨🇺',
    holidays: [
      { name: 'Independence Day', date: '10-10', emoji: '🎉' }
    ]
  },
  {
    code: 'CW',
    name: 'Curaçao',
    flag: '🇨🇼',
    holidays: [
      { name: 'Flag Day', date: '07-02', emoji: '🇨🇼' },
      { name: 'Country Status Day', date: '10-10', emoji: '🏛' }
    ]
  },
  {
    code: 'CY',
    name: 'Cyprus',
    flag: '🇨🇾',
    holidays: [
      { name: 'Independence Day', date: '10-01', emoji: '🇨🇾' }
    ]
  },
  {
    code: 'CZ',
    name: 'Czech Republic',
    flag: '🇨🇿',
    holidays: [
      { name: 'Independence Day', date: '10-28', emoji: '🎉' }
    ]
  },
  {
    code: 'DK',
    name: 'Denmark',
    flag: '🇩🇰',
    holidays: [
      { name: 'Constitution Day', date: '06-05', emoji: '🇩🇰' }
    ]
  },
  {
    code: 'DM',
    name: 'Dominica',
    flag: '🇩🇲',
    holidays: [
      { name: 'Independence Day', date: '11-03', emoji: '🎉' }
    ]
  },
  {
    code: 'DO',
    name: 'Dominican Republic',
    flag: '🇩🇴',
    holidays: [
      { name: 'Independence Day', date: '02-27', emoji: '🎉' },
      { name: 'Restoration Day', date: '08-16', emoji: '⚔️' }
    ]
  },
  {
    code: 'EC',
    name: 'Ecuador',
    flag: '🇪🇨',
    holidays: [
      { name: 'Independence Day', date: '08-10', emoji: '🎉' }
    ]
  },
  {
    code: 'EG',
    name: 'Egypt',
    flag: '🇪🇬',
    holidays: [
      { name: 'Revolution Day', date: '07-23', emoji: '🐫' }
    ]
  },
  {
    code: 'SV',
    name: 'El Salvador',
    flag: '🇸🇻',
    holidays: [
      { name: 'Independence Day', date: '09-15', emoji: '🎉' }
    ]
  },
  {
    code: 'EE',
    name: 'Estonia',
    flag: '🇪🇪',
    holidays: [
      { name: 'Independence Day', date: '02-24', emoji: '🇪🇪' }
    ]
  },
  {
    code: 'ET',
    name: 'Ethiopia',
    flag: '🇪🇹',
    holidays: [
      { name: 'National Day', date: '05-28', emoji: '🎉' }
    ]
  },
  {
    code: 'FJ',
    name: 'Fiji',
    flag: '🇫🇯',
    holidays: [
      { name: 'Fiji Day', date: '10-10', emoji: '🇫🇯' }
    ]
  },
  {
    code: 'FI',
    name: 'Finland',
    flag: '🇫🇮',
    holidays: [
      { name: 'Independence Day', date: '12-06', emoji: '🇫🇮' }
    ]
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    holidays: [
      { name: 'Bastille Day', date: '07-14', emoji: '🎆' }
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    holidays: [
      { name: 'German Unity Day', date: '10-03', emoji: '🇩🇪' }
    ]
  },
  {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    holidays: [
      { name: 'Independence Day', date: '03-06', emoji: '🎉' },
      { name: 'Republic Day', date: '07-01', emoji: '🏛' }
    ]
  },
  {
    code: 'GR',
    name: 'Greece',
    flag: '🇬🇷',
    holidays: [
      { name: 'Independence Day', date: '03-25', emoji: '🎉' }
    ]
  },
  {
    code: 'GD',
    name: 'Grenada',
    flag: '🇬🇩',
    holidays: [
      { name: 'Independence Day', date: '02-07', emoji: '🎉' }
    ]
  },
  {
    code: 'GT',
    name: 'Guatemala',
    flag: '🇬🇹',
    holidays: [
      { name: 'Independence Day', date: '09-15', emoji: '🎉' }
    ]
  },
  {
    code: 'GY',
    name: 'Guyana',
    flag: '🇬🇾',
    holidays: [
      { name: 'Independence Day', date: '05-26', emoji: '🎉' },
      { name: 'Republic Day', date: '02-23', emoji: '🏛' }
    ]
  },
  {
    code: 'HT',
    name: 'Haiti',
    flag: '🇭🇹',
    holidays: [
      { name: 'Independence Day', date: '01-01', emoji: '🎉' },
      { name: 'Happy Haitian Flag Day to all my Zoes!', date: '05-18', emoji: '🇭🇹' },
      { name: 'Emancipation Day', date: '08-23', emoji: '✊' },
      { name: 'Dessalines Day', date: '10-17', emoji: '🕊' },
      { name: 'Battle of Vertières', date: '11-18', emoji: '⚔️' }
    ]
  },
  {
    code: 'HN',
    name: 'Honduras',
    flag: '🇭🇳',
    holidays: [
      { name: 'Independence Day', date: '09-15', emoji: '🎉' }
    ]
  },
  {
    code: 'HU',
    name: 'Hungary',
    flag: '🇭🇺',
    holidays: [
      { name: 'National Day', date: '08-20', emoji: '🇭🇺' }
    ]
  },
  {
    code: 'IS',
    name: 'Iceland',
    flag: '🇮🇸',
    holidays: [
      { name: 'National Day', date: '06-17', emoji: '🇮🇸' }
    ]
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    holidays: [
      { name: 'Independence Day', date: '08-15', emoji: '🇮🇳' },
      { name: 'Republic Day', date: '01-26', emoji: '📜' }
    ]
  },
  {
    code: 'ID',
    name: 'Indonesia',
    flag: '🇮🇩',
    holidays: [
      { name: 'Independence Day', date: '08-17', emoji: '🎉' }
    ]
  },
  {
    code: 'IR',
    name: 'Iran',
    flag: '🇮🇷',
    holidays: [
      { name: 'Republic Day', date: '04-01', emoji: '🎉' }
    ]
  },
  {
    code: 'IQ',
    name: 'Iraq',
    flag: '🇮🇶',
    holidays: [
      { name: 'Independence Day', date: '10-03', emoji: '🇮🇶' }
    ]
  },
  {
    code: 'IE',
    name: 'Ireland',
    flag: '🇮🇪',
    holidays: [
      { name: 'St. Patrick\'s Day', date: '03-17', emoji: '☘️' }
    ]
  },
  {
    code: 'IL',
    name: 'Israel',
    flag: '🇮🇱',
    holidays: [
      { name: 'Independence Day', date: '05-14', emoji: '✡️' } // Varies by Hebrew calendar, but this is the Gregorian date of declaration
    ]
  },
  {
    code: 'IT',
    name: 'Italy',
    flag: '🇮🇹',
    holidays: [
      { name: 'Republic Day', date: '06-02', emoji: '🇮🇹' }
    ]
  },
  {
    code: 'JM',
    name: 'Jamaica',
    flag: '🇯🇲',
    holidays: [
      { name: 'Independence Day', date: '08-06', emoji: '🎉' },
      { name: 'Emancipation Day', date: '08-01', emoji: '✊' },
      { name: 'Heroes Day', date: '10-16', emoji: '🏅' }
    ]
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    holidays: [
      { name: 'National Foundation Day', date: '02-11', emoji: '🗾' }
    ]
  },
  {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    holidays: [
      { name: 'Jamhuri Day', date: '12-12', emoji: '🇰🇪' }
    ]
  },
  {
    code: 'LB',
    name: 'Lebanon',
    flag: '🇱🇧',
    holidays: [
      { name: 'Independence Day', date: '11-22', emoji: '🌲' }
    ]
  },
  {
    code: 'LV',
    name: 'Latvia',
    flag: '🇱🇻',
    holidays: [
      { name: 'Independence Day', date: '11-18', emoji: '🎉' }
    ]
  },
  {
    code: 'LT',
    name: 'Lithuania',
    flag: '🇱🇹',
    holidays: [
      { name: 'Restoration of State Day', date: '02-16', emoji: '🇱🇹' }
    ]
  },
  {
    code: 'LU',
    name: 'Luxembourg',
    flag: '🇱🇺',
    holidays: [
      { name: 'National Day', date: '06-23', emoji: '🎉' }
    ]
  },
  {
    code: 'MY',
    name: 'Malaysia',
    flag: '🇲🇾',
    holidays: [
      { name: 'Independence Day', date: '08-31', emoji: '🎉' }
    ]
  },
  {
    code: 'MT',
    name: 'Malta',
    flag: '🇲🇹',
    holidays: [
      { name: 'Independence Day', date: '09-21', emoji: '🇲🇹' }
    ]
  },
  {
    code: 'MX',
    name: 'Mexico',
    flag: '🇲🇽',
    holidays: [
      { name: 'Independence Day', date: '09-16', emoji: '🎉' }
    ]
  },
  {
    code: 'MS',
    name: 'Montserrat',
    flag: '🇲🇸',
    holidays: [
      { name: 'St. Patrick’s Day Festival', date: '03-17', emoji: '☘️' }
    ]
  },
  {
    code: 'MA',
    name: 'Morocco',
    flag: '🇲🇦',
    holidays: [
      { name: 'Independence Day', date: '11-18', emoji: '🎉' }
    ]
  },
  {
    code: 'MM',
    name: 'Myanmar',
    flag: '🇲🇲',
    holidays: [
      { name: 'Independence Day', date: '01-04', emoji: '🇲🇲' }
    ]
  },
  {
    code: 'NP',
    name: 'Nepal',
    flag: '🇳🇵',
    holidays: [
      { name: 'Constitution Day', date: '09-20', emoji: '🇳🇵' }
    ]
  },
  {
    code: 'NL',
    name: 'Netherlands',
    flag: '🇳🇱',
    holidays: [
      { name: 'King\'s Day', date: '04-27', emoji: '👑' }
    ]
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    flag: '🇳🇿',
    holidays: [
      { name: 'Waitangi Day', date: '02-06', emoji: '🥝' }
    ]
  },
  {
    code: 'NI',
    name: 'Nicaragua',
    flag: '🇳🇮',
    holidays: [
      { name: 'Independence Day', date: '09-15', emoji: '🎉' }
    ]
  },
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    holidays: [
      { name: 'Independence Day', date: '10-01', emoji: '🎉' },
      { name: 'Democracy Day', date: '06-12', emoji: '✊' }
    ]
  },
  {
    code: 'NO',
    name: 'Norway',
    flag: '🇳🇴',
    holidays: [
      { name: 'Constitution Day', date: '05-17', emoji: '🇳🇴' }
    ]
  },
  {
    code: 'OM',
    name: 'Oman',
    flag: '🇴🇲',
    holidays: [
      { name: 'National Day', date: '11-18', emoji: '🇴🇲' }
    ]
  },
  {
    code: 'PK',
    name: 'Pakistan',
    flag: '🇵🇰',
    holidays: [
      { name: 'Independence Day', date: '08-14', emoji: '🌙' }
    ]
  },
  {
    code: 'PA',
    name: 'Panama',
    flag: '🇵🇦',
    holidays: [
      { name: 'Independence Day', date: '11-03', emoji: '🎉' }
    ]
  },
  {
    code: 'PY',
    name: 'Paraguay',
    flag: '🇵🇾',
    holidays: [
      { name: 'Independence Day', date: '05-14', emoji: '🇵🇾' }
    ]
  },
  {
    code: 'PE',
    name: 'Peru',
    flag: '🇵🇪',
    holidays: [
      { name: 'Independence Day', date: '07-28', emoji: '🦙' }
    ]
  },
  {
    code: 'PH',
    name: 'Philippines',
    flag: '🇵🇭',
    holidays: [
      { name: 'Independence Day', date: '06-12', emoji: '☀️' }
    ]
  },
  {
    code: 'PL',
    name: 'Poland',
    flag: '🇵🇱',
    holidays: [
      { name: 'Independence Day', date: '11-11', emoji: '🇵🇱' }
    ]
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    holidays: [
      { name: 'Portugal Day', date: '06-10', emoji: '🇵🇹' }
    ]
  },
  {
    code: 'PR',
    name: 'Puerto Rico',
    flag: '🇵🇷',
    holidays: [
      { name: 'Constitution Day', date: '07-25', emoji: '📜' }
    ]
  },
  {
    code: 'QA',
    name: 'Qatar',
    flag: '🇶🇦',
    holidays: [
      { name: 'National Day', date: '12-18', emoji: '🇶🇦' }
    ]
  },
  {
    code: 'RO',
    name: 'Romania',
    flag: '🇷🇴',
    holidays: [
      { name: 'Great Union Day', date: '12-01', emoji: '🎉' }
    ]
  },
  {
    code: 'RU',
    name: 'Russia',
    flag: '🇷🇺',
    holidays: [
      { name: 'Russia Day', date: '06-12', emoji: '🇷🇺' }
    ]
  },
  {
    code: 'KN',
    name: 'Saint Kitts and Nevis',
    flag: '🇰🇳',
    holidays: [
      { name: 'Independence Day', date: '09-19', emoji: '🎉' }
    ]
  },
  {
    code: 'LC',
    name: 'Saint Lucia',
    flag: '🇱🇨',
    holidays: [
      { name: 'Independence Day', date: '02-22', emoji: '🎉' }
    ]
  },
  {
    code: 'VC',
    name: 'Saint Vincent and the Grenadines',
    flag: '🇻🇨',
    holidays: [
      { name: 'Independence Day', date: '10-27', emoji: '🎉' }
    ]
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    holidays: [
      { name: 'National Day', date: '09-23', emoji: '🇸🇦' }
    ]
  },
  {
    code: 'SN',
    name: 'Senegal',
    flag: '🇸🇳',
    holidays: [
      { name: 'Independence Day', date: '04-04', emoji: '🎉' }
    ]
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    holidays: [
      { name: 'National Day', date: '08-09', emoji: '🦁' }
    ]
  },
  {
    code: 'SX',
    name: 'Sint Maarten',
    flag: '🇸🇽',
    holidays: [
      { name: 'Flag Day', date: '06-13', emoji: '🇸🇽' },
      { name: 'Constitution Day', date: '10-10', emoji: '🏛' }
    ]
  },
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    holidays: [
      { name: 'Freedom Day', date: '04-27', emoji: '🇿🇦' }
    ]
  },
  {
    code: 'KR',
    name: 'South Korea',
    flag: '🇰🇷',
    holidays: [
      { name: 'Liberation Day', date: '08-15', emoji: '🇰🇷' }
    ]
  },
  {
    code: 'ES',
    name: 'Spain',
    flag: '🇪🇸',
    holidays: [
      { name: 'National Day', date: '10-12', emoji: '🇪🇸' }
    ]
  },
  {
    code: 'LK',
    name: 'Sri Lanka',
    flag: '🇱🇰',
    holidays: [
      { name: 'Independence Day', date: '02-04', emoji: '🇱🇰' }
    ]
  },
  {
    code: 'SE',
    name: 'Sweden',
    flag: '🇸🇪',
    holidays: [
      { name: 'National Day', date: '06-06', emoji: '🇸🇪' }
    ]
  },
  {
    code: 'CH',
    name: 'Switzerland',
    flag: '🇨🇭',
    holidays: [
      { name: 'National Day', date: '08-01', emoji: '🇨🇭' }
    ]
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    flag: '🇹🇿',
    holidays: [
      { name: 'Independence Day', date: '12-09', emoji: '🎉' }
    ]
  },
  {
    code: 'TH',
    name: 'Thailand',
    flag: '🇹🇭',
    holidays: [
      { name: 'National Day', date: '12-05', emoji: '🐘' }
    ]
  },
  {
    code: 'TT',
    name: 'Trinidad and Tobago',
    flag: '🇹🇹',
    holidays: [
      { name: 'Independence Day', date: '08-31', emoji: '🎉' },
      { name: 'Republic Day', date: '09-24', emoji: '🏛' },
      { name: 'Emancipation Day', date: '08-01', emoji: '✊' }
    ]
  },
  {
    code: 'TN',
    name: 'Tunisia',
    flag: '🇹🇳',
    holidays: [
      { name: 'Independence Day', date: '03-20', emoji: '🇹🇳' }
    ]
  },
  {
    code: 'TR',
    name: 'Turkey',
    flag: '🇹🇷',
    holidays: [
      { name: 'Republic Day', date: '10-29', emoji: '🇹🇷' }
    ]
  },
  {
    code: 'TC',
    name: 'Turks and Caicos Islands',
    flag: '🇹🇨',
    holidays: [
      { name: 'National Day', rule: { month: 3, dayOfWeek: 1, week: 2 }, emoji: '🇹🇨' }
    ]
  },
  {
    code: 'UG',
    name: 'Uganda',
    flag: '🇺🇬',
    holidays: [
      { name: 'Independence Day', date: '10-09', emoji: '🇺🇬' }
    ]
  },
  {
    code: 'UA',
    name: 'Ukraine',
    flag: '🇺🇦',
    holidays: [
      { name: 'Independence Day', date: '08-24', emoji: '🇺🇦' }
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    holidays: [
        { name: 'New Year\'s Day', date: '01-01', emoji: '🎉' }
    ]
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    holidays: [
      { name: 'Independence Day', date: '07-04', emoji: '🎆' },
      { name: 'Martin Luther King Jr. Day', rule: { month: 1, dayOfWeek: 1, week: 3 }, emoji: '👑' },
      { name: 'Presidents\' Day', rule: { month: 2, dayOfWeek: 1, week: 3 }, emoji: '🏛' },
      { name: 'Memorial Day', rule: { month: 5, dayOfWeek: 1, week: -1 }, emoji: '🎖' },
      { name: 'Juneteenth', date: '06-19', emoji: '🗽' },
      { name: 'Labor Day', rule: { month: 9, dayOfWeek: 1, week: 1 }, emoji: '🇺🇸' },
      { name: 'Veterans Day', date: '11-11', emoji: '🎖' },
      { name: 'Thanksgiving', rule: { month: 11, dayOfWeek: 4, week: 4 }, emoji: '🦃' }
    ]
  },
  {
    code: 'UY',
    name: 'Uruguay',
    flag: '🇺🇾',
    holidays: [
      { name: 'Independence Day', date: '08-25', emoji: '🎉' }
    ]
  },
  {
    code: 'UZ',
    name: 'Uzbekistan',
    flag: '🇺🇿',
    holidays: [
      { name: 'Independence Day', date: '09-01', emoji: '🇺🇿' }
    ]
  },
  {
    code: 'VE',
    name: 'Venezuela',
    flag: '🇻🇪',
    holidays: [
      { name: 'Independence Day', date: '07-05', emoji: '🇻🇪' }
    ]
  },
  {
    code: 'VN',
    name: 'Vietnam',
    flag: '🇻🇳',
    holidays: [
      { name: 'National Day', date: '09-02', emoji: '🇻🇳' }
    ]
  },
  {
      code: 'Global',
      name: 'Global / Other',
      flag: '🌍',
      holidays: [
          { name: 'New Year\'s Day', date: '01-01', emoji: '🎉' },
          { name: 'International Women\'s Day', date: '03-08', emoji: '👩' },
          { name: 'Earth Day', date: '04-22', emoji: '🌍' },
          { name: 'Labor Day', date: '05-01', emoji: '🛠' }
      ]
  }
];

const isHolidayToday = (holiday: Holiday, today: Date): boolean => {
  // 1. Check fixed date
  if (holiday.date) {
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${month}-${day}`;
    if (holiday.date === dateStr) return true;
  }

  // 2. Check dynamic rule
  if (holiday.rule) {
    const { month, dayOfWeek, week } = holiday.rule;
    const currentMonth = today.getMonth() + 1;
    
    // Month check
    if (currentMonth !== month) return false;

    // Day of week check
    if (today.getDay() !== dayOfWeek) return false;

    // Week check
    const currentDay = today.getDate();
    
    if (week > 0) {
      // Nth occurrence check (e.g. 3rd Monday)
      // Logic: The nth Xday is between (n-1)*7 + 1 and n*7
      const minDay = (week - 1) * 7 + 1;
      const maxDay = week * 7;
      if (currentDay >= minDay && currentDay <= maxDay) return true;
    } else if (week === -1) {
      // Last occurrence check
      // Logic: If adding 7 days puts us in the next month, then it's the last one
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      if (nextWeek.getMonth() + 1 !== month) return true;
    }
  }

  return false;
};

export const getHolidayForToday = (countryCode?: string): { holiday: Holiday, countryName: string } | null => {
  const today = new Date();

  // 1. Check User's Specific Country
  if (countryCode) {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      const holiday = country.holidays.find(h => isHolidayToday(h, today));
      if (holiday) {
        return { holiday, countryName: country.name };
      }
    }
  }

  // 2. Check Global Holidays (fallback or additional)
  // Only return global if no specific country match, OR we can just return global if found
  const global = COUNTRIES.find(c => c.code === 'Global');
  if (global) {
      const holiday = global.holidays.find(h => isHolidayToday(h, today));
      if (holiday) {
          return { holiday, countryName: 'World' };
      }
  }

  return null;
};
