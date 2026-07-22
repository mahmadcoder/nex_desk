export type CountryData = {
  code: string;
  name: string;
  flag: string;
  flagUrl: string;
  dialCode: string;
  digits: number;
  currency: string;
  cities: string[];
};

export const COUNTRIES: CountryData[] = [
  {
    code: "PK",
    name: "Pakistan",
    flag: "🇵🇰",
    flagUrl: "https://flagcdn.com/w40/pk.png",
    dialCode: "+92",
    digits: 11,
    currency: "PKR",
    cities: [
      "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
      "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
      "Hyderabad", "Bahawalpur", "Sargodha", "Sukkur", "Abbottabad"
    ],
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    flagUrl: "https://flagcdn.com/w40/us.png",
    dialCode: "+1",
    digits: 10,
    currency: "USD",
    cities: [
      "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
      "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
      "Austin", "Miami", "San Francisco", "Seattle", "Boston"
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    flagUrl: "https://flagcdn.com/w40/gb.png",
    dialCode: "+44",
    digits: 10,
    currency: "GBP",
    cities: [
      "London", "Manchester", "Birmingham", "Leeds", "Glasgow",
      "Liverpool", "Bristol", "Sheffield", "Edinburgh", "Cardiff", "Belfast"
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    flagUrl: "https://flagcdn.com/w40/ae.png",
    dialCode: "+971",
    digits: 9,
    currency: "AED",
    cities: [
      "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah",
      "Fujairah", "Umm Al Quwain", "Al Ain"
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    flagUrl: "https://flagcdn.com/w40/sa.png",
    dialCode: "+966",
    digits: 9,
    currency: "SAR",
    cities: [
      "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Tabuk", "Abha"
    ],
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    flagUrl: "https://flagcdn.com/w40/ca.png",
    dialCode: "+1",
    digits: 10,
    currency: "CAD",
    cities: [
      "Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton", "Winnipeg"
    ],
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    flagUrl: "https://flagcdn.com/w40/au.png",
    dialCode: "+61",
    digits: 9,
    currency: "AUD",
    cities: [
      "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra"
    ],
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    flagUrl: "https://flagcdn.com/w40/de.png",
    dialCode: "+49",
    digits: 10,
    currency: "EUR",
    cities: [
      "Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne", "Stuttgart", "Düsseldorf"
    ],
  },
  {
    code: "QA",
    name: "Qatar",
    flag: "🇶🇦",
    flagUrl: "https://flagcdn.com/w40/qa.png",
    dialCode: "+974",
    digits: 8,
    currency: "QAR",
    cities: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor"],
  },
  {
    code: "KW",
    name: "Kuwait",
    flag: "🇰🇼",
    flagUrl: "https://flagcdn.com/w40/kw.png",
    dialCode: "+965",
    digits: 8,
    currency: "KWD",
    cities: ["Kuwait City", "Hawalli", "Salmiya", "Al Ahmadi"],
  },
  {
    code: "OM",
    name: "Oman",
    flag: "🇴🇲",
    flagUrl: "https://flagcdn.com/w40/om.png",
    dialCode: "+968",
    digits: 8,
    currency: "OMR",
    cities: ["Muscat", "Salalah", "Sohar", "Nizwa"],
  },
  {
    code: "BH",
    name: "Bahrain",
    flag: "🇧🇭",
    flagUrl: "https://flagcdn.com/w40/bh.png",
    dialCode: "+973",
    digits: 8,
    currency: "BHD",
    cities: ["Manama", "Riffa", "Muharraq"],
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    flagUrl: "https://flagcdn.com/w40/in.png",
    dialCode: "+91",
    digits: 10,
    currency: "INR",
    cities: [
      "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"
    ],
  },
  {
    code: "MY",
    name: "Malaysia",
    flag: "🇲🇾",
    flagUrl: "https://flagcdn.com/w40/my.png",
    dialCode: "+60",
    digits: 9,
    currency: "MYR",
    cities: ["Kuala Lumpur", "Penang", "Johor Bahru", "Ipoh"],
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    flagUrl: "https://flagcdn.com/w40/sg.png",
    dialCode: "+65",
    digits: 8,
    currency: "SGD",
    cities: ["Singapore"],
  },
  {
    code: "TR",
    name: "Turkey",
    flag: "🇹🇷",
    flagUrl: "https://flagcdn.com/w40/tr.png",
    dialCode: "+90",
    digits: 10,
    currency: "TRY",
    cities: ["Istanbul", "Ankara", "Izmir", "Antalya"],
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    flagUrl: "https://flagcdn.com/w40/fr.png",
    dialCode: "+33",
    digits: 9,
    currency: "EUR",
    cities: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice"],
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    flagUrl: "https://flagcdn.com/w40/nl.png",
    dialCode: "+31",
    digits: 9,
    currency: "EUR",
    cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
  },
];

export const CURRENCIES = [
  { code: "PKR", label: "Pakistani Rupee", flag: "🇵🇰", flagUrl: "https://flagcdn.com/w40/pk.png" },
  { code: "USD", label: "US Dollar", flag: "🇺🇸", flagUrl: "https://flagcdn.com/w40/us.png" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧", flagUrl: "https://flagcdn.com/w40/gb.png" },
  { code: "EUR", label: "Euro", flag: "🇪🇺", flagUrl: "https://flagcdn.com/w40/eu.png" },
  { code: "AED", label: "UAE Dirham", flag: "🇦🇪", flagUrl: "https://flagcdn.com/w40/ae.png" },
  { code: "SAR", label: "Saudi Riyal", flag: "🇸🇦", flagUrl: "https://flagcdn.com/w40/sa.png" },
  { code: "CAD", label: "Canadian Dollar", flag: "🇨🇦", flagUrl: "https://flagcdn.com/w40/ca.png" },
  { code: "AUD", label: "Australian Dollar", flag: "🇦🇺", flagUrl: "https://flagcdn.com/w40/au.png" },
  { code: "QAR", label: "Qatari Riyal", flag: "🇶🇦", flagUrl: "https://flagcdn.com/w40/qa.png" },
  { code: "INR", label: "Indian Rupee", flag: "🇮🇳", flagUrl: "https://flagcdn.com/w40/in.png" },
];
