// =============================================================================
// BusDataBuilder.ts
// Fluent Data Builder Pattern for dynamic test data injection
// =============================================================================

export interface BusOperatorData {
  id: string;
  travelsName: string;
  busType: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  rating: number;
  availableSeats: number;
  isAC: boolean;
  isSleeper: boolean;
}

export class BusDataBuilder {
  private data: BusOperatorData;

  constructor() {
    this.data = {
      id: `BUS_${Math.floor(1000 + Math.random() * 9000)}`,
      travelsName: 'VRL Travels',
      busType: 'A/C Sleeper (2+1)',
      departureTime: '22:00',
      arrivalTime: '06:00',
      fare: 850,
      rating: 4.5,
      availableSeats: 24,
      isAC: true,
      isSleeper: true,
    };
  }

  static create(): BusDataBuilder {
    return new BusDataBuilder();
  }

  withTravelsName(name: string): this {
    this.data.travelsName = name;
    return this;
  }

  withBusType(type: string): this {
    this.data.busType = type;
    this.data.isAC = /(a\.?c|a\/c)/i.test(type);
    this.data.isSleeper = /sleeper/i.test(type);
    return this;
  }

  withFare(fare: number): this {
    this.data.fare = fare;
    return this;
  }

  withRating(rating: number): this {
    this.data.rating = rating;
    return this;
  }

  withAvailableSeats(seats: number): this {
    this.data.availableSeats = seats;
    return this;
  }

  build(): BusOperatorData {
    return { ...this.data };
  }
}
