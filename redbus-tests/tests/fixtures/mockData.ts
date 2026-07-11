// =============================================================================
// tests/fixtures/mockData.ts
// Typed API mock payloads for stubbing RedBus API responses
// =============================================================================

// ─── Suggestion Mock ──────────────────────────────────────────────────────────

export interface CitySuggestion {
  id:          string;
  name:        string;
  state:       string;
  stateCode:   string;
  popularity:  number;
}

export const MOCK_SUGGESTIONS: { data: CitySuggestion[] } = {
  data: [
    { id: 'MUM', name: 'Mumbai',    state: 'Maharashtra', stateCode: 'MH', popularity: 100 },
    { id: 'PUN', name: 'Pune',      state: 'Maharashtra', stateCode: 'MH', popularity: 90  },
    { id: 'BLR', name: 'Bangalore', state: 'Karnataka',   stateCode: 'KA', popularity: 95  },
    { id: 'CHN', name: 'Chennai',   state: 'Tamil Nadu',  stateCode: 'TN', popularity: 85  },
    { id: 'DEL', name: 'Delhi',     state: 'Delhi',       stateCode: 'DL', popularity: 98  },
  ],
};

// ─── Bus Search Mock ──────────────────────────────────────────────────────────

export interface BusInventoryItem {
  busId:          string;
  operatorName:   string;
  busType:        string;
  departureTime:  string;
  arrivalTime:    string;
  durationMins:   number;
  fare:           number;
  currency:       string;
  seatsAvailable: number;
  rating:         number | null;
  amenities:      string[];
  isAC:           boolean;
  isSleeper:      boolean;
}

export const MOCK_BUS_RESULTS: { inventory: BusInventoryItem[]; totalCount: number } = {
  totalCount: 5,
  inventory: [
    {
      busId:          'BUS001',
      operatorName:   'SRS Travels',
      busType:        'AC Sleeper (2+1)',
      departureTime:  '21:00',
      arrivalTime:    '03:30',
      durationMins:   390,
      fare:           650,
      currency:       'INR',
      seatsAvailable: 12,
      rating:         4.2,
      amenities:      ['WiFi', 'USB Charging', 'Blanket'],
      isAC:           true,
      isSleeper:      true,
    },
    {
      busId:          'BUS002',
      operatorName:   'Shivneri',
      busType:        'AC Seater (2+2)',
      departureTime:  '06:00',
      arrivalTime:    '09:30',
      durationMins:   210,
      fare:           350,
      currency:       'INR',
      seatsAvailable: 24,
      rating:         4.5,
      amenities:      ['WiFi', 'USB Charging'],
      isAC:           true,
      isSleeper:      false,
    },
    {
      busId:          'BUS003',
      operatorName:   'Neeta Tours',
      busType:        'Non-AC Sleeper',
      departureTime:  '22:30',
      arrivalTime:    '05:00',
      durationMins:   390,
      fare:           450,
      currency:       'INR',
      seatsAvailable: 8,
      rating:         3.8,
      amenities:      ['USB Charging'],
      isAC:           false,
      isSleeper:      true,
    },
    {
      busId:          'BUS004',
      operatorName:   'Orange Travels',
      busType:        'Volvo AC Seater',
      departureTime:  '07:30',
      arrivalTime:    '11:00',
      durationMins:   210,
      fare:           550,
      currency:       'INR',
      seatsAvailable: 18,
      rating:         4.0,
      amenities:      ['WiFi', 'Water Bottle'],
      isAC:           true,
      isSleeper:      false,
    },
    {
      busId:          'BUS005',
      operatorName:   'Paulo Travels',
      busType:        'AC Semi-Sleeper',
      departureTime:  '23:00',
      arrivalTime:    '06:30',
      durationMins:   450,
      fare:           780,
      currency:       'INR',
      seatsAvailable: 5,
      rating:         4.7,
      amenities:      ['WiFi', 'USB Charging', 'Blanket', 'Water Bottle'],
      isAC:           true,
      isSleeper:      false,
    },
  ],
};

// ─── Seat Layout Mock ─────────────────────────────────────────────────────────

export interface Seat {
  seatNo:    string;
  row:       number;
  col:       number;
  type:      'upper' | 'lower' | 'seater';
  available: boolean;
  fare:      number;
  gender?:   'M' | 'F' | null;
}

export const MOCK_SEAT_LAYOUT: { seats: Seat[]; totalSeats: number } = {
  totalSeats: 40,
  seats: [
    { seatNo: 'L1', row: 1, col: 1, type: 'lower', available: true,  fare: 650, gender: null },
    { seatNo: 'L2', row: 1, col: 2, type: 'lower', available: false, fare: 650, gender: 'F'  },
    { seatNo: 'U1', row: 1, col: 1, type: 'upper', available: true,  fare: 600, gender: null },
    { seatNo: 'U2', row: 1, col: 2, type: 'upper', available: true,  fare: 600, gender: null },
    { seatNo: 'L3', row: 2, col: 1, type: 'lower', available: false, fare: 650, gender: 'M'  },
    { seatNo: 'L4', row: 2, col: 2, type: 'lower', available: true,  fare: 650, gender: null },
    { seatNo: 'U3', row: 2, col: 1, type: 'upper', available: true,  fare: 600, gender: null },
    { seatNo: 'U4', row: 2, col: 2, type: 'upper', available: false, fare: 600, gender: 'F'  },
  ],
};

// ─── Hotel Mock ───────────────────────────────────────────────────────────────

export interface HotelResult {
  hotelId:   string;
  name:      string;
  location:  string;
  stars:     number;
  price:     number;
  currency:  string;
  rating:    number;
  amenities: string[];
  images:    string[];
}

export const MOCK_HOTEL_RESULTS: { hotels: HotelResult[]; total: number } = {
  total: 3,
  hotels: [
    {
      hotelId:   'H001',
      name:      'The Taj Mahal Palace',
      location:  'Colaba, Mumbai',
      stars:     5,
      price:     8500,
      currency:  'INR',
      rating:    4.8,
      amenities: ['Pool', 'Spa', 'WiFi', 'Gym', 'Restaurant'],
      images:    ['https://example.com/taj1.jpg'],
    },
    {
      hotelId:   'H002',
      name:      'Trident Nariman Point',
      location:  'Nariman Point, Mumbai',
      stars:     5,
      price:     6200,
      currency:  'INR',
      rating:    4.6,
      amenities: ['Pool', 'WiFi', 'Gym', 'Restaurant'],
      images:    ['https://example.com/trident1.jpg'],
    },
    {
      hotelId:   'H003',
      name:      'Ibis Mumbai Airport',
      location:  'Andheri, Mumbai',
      stars:     3,
      price:     2800,
      currency:  'INR',
      rating:    4.1,
      amenities: ['WiFi', 'Restaurant'],
      images:    ['https://example.com/ibis1.jpg'],
    },
  ],
};

// ─── Error Response Mock ──────────────────────────────────────────────────────

export const MOCK_NO_RESULTS = {
  inventory:   [],
  totalCount:  0,
  message:     'No buses found for this route',
  errorCode:   'NO_RESULTS',
};

export const MOCK_API_ERROR = {
  error:   true,
  code:    500,
  message: 'Internal server error. Please try again.',
};

// ─── Performance Thresholds ───────────────────────────────────────────────────

export const PERF_THRESHOLDS = {
  homepageLoadMs:   8_000,
  searchLoadMs:    12_000,
  apiResponseMs:    5_000,
  firstPaintMs:     3_000,
  domContentMs:     5_000,
};
