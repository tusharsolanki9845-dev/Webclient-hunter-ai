'use strict';

const DISCOVERY_CATEGORIES = Object.freeze({
  restaurant: { label: 'Restaurant', tags: [['amenity', 'restaurant']] },
  cafe: { label: 'Café', tags: [['amenity', 'cafe']] },
  dentist: { label: 'Dentist', tags: [['amenity', 'dentist']] },
  plumber: { label: 'Plumber', tags: [['craft', 'plumber']] },
  electrician: { label: 'Electrician', tags: [['craft', 'electrician']] },
  fitness: { label: 'Gym / fitness', tags: [['leisure', 'fitness_centre'], ['leisure', 'sports_centre']] },
  beauty_salon: { label: 'Beauty salon', tags: [['shop', 'beauty'], ['shop', 'hairdresser']] },
  hairdresser: { label: 'Hairdresser', tags: [['shop', 'hairdresser']] },
  law_firm: { label: 'Law firm', tags: [['office', 'lawyer']] },
  real_estate: { label: 'Real-estate agency', tags: [['office', 'estate_agent']] },
  car_repair: { label: 'Car repair', tags: [['shop', 'car_repair']] },
  hotel: { label: 'Hotel', tags: [['tourism', 'hotel']] },
});

module.exports = { DISCOVERY_CATEGORIES };
