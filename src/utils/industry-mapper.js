// Industry Mapper - Converts user-friendly categories to Google Places optimized queries
// This ensures all RinglyPro target industries return results

const INDUSTRY_MAPPINGS = {
  // Home & Property Services
  'lawn care': 'lawn care service',
  'landscaping': 'landscaping company',
  'tree trimming': 'tree service',
  'tree removal': 'tree removal service',
  'pool cleaning': 'pool cleaning service',
  'pool maintenance': 'pool maintenance service',
  'pest control': 'pest control service',
  'pressure washing': 'pressure washing service',
  'roofing': 'roofing contractor',
  'gutter': 'gutter cleaning service',
  'gutter services': 'gutter installation and repair',
  'painting': 'painting contractor',
  'painter': 'painting contractor',
  'plumbing': 'plumber',
  'plumber': 'plumber',
  'electrical': 'electrician',
  'electrician': 'electrician',
  'hvac': 'HVAC contractor',
  'air conditioning': 'air conditioning contractor',
  'heating': 'heating contractor',
  'garage door': 'garage door repair',
  'handyman': 'handyman service',
  'flooring': 'flooring contractor',
  'tile installation': 'tile contractor',
  'fence installation': 'fence contractor',
  'fence repair': 'fence repair service',
  'carpet cleaning': 'carpet cleaning service',
  'window cleaning': 'window cleaning service',
  'junk removal': 'junk removal service',
  'home remodeling': 'home remodeling contractor',
  'renovation': 'home renovation contractor',
  'cleaning': 'cleaning service',
  'appliance repair': 'appliance repair service',

  // Real Estate & Housing
  'real estate agent': 'real estate agent',
  'realtor': 'real estate agent',
  'property manager': 'property management company',
  'apartment': 'apartment complex',
  'home inspector': 'home inspection service',
  'mortgage': 'mortgage lender',
  'loan officer': 'mortgage broker',
  'title company': 'title company',
  'real estate photographer': 'real estate photography service',
  'drone operator': 'drone photography service',

  // Health, Wellness & Personal Care
  'chiropractor': 'chiropractor',
  'dentist': 'dentist',
  'orthodontist': 'orthodontist',
  'physical therapist': 'physical therapy clinic',
  'massage': 'massage therapist',
  'med spa': 'medical spa',
  'hair salon': 'hair salon',
  'barbershop': 'barber shop',
  'nail salon': 'nail salon',
  'personal trainer': 'personal trainer',
  'gym': 'gym',
  'fitness': 'fitness center',
  'nutritionist': 'nutritionist',
  'dietician': 'dietitian',
  'counseling': 'counseling service',
  'therapy': 'therapist',

  // Professional Services
  'insurance agent': 'insurance agency',
  'financial advisor': 'financial planner',
  'accountant': 'accounting firm',
  'tax preparer': 'tax preparation service',
  'lawyer': 'law firm',
  'attorney': 'attorney',
  'legal': 'legal services',
  'notary': 'notary public',
  'consultant': 'business consultant',
  'coach': 'business coach',

  // Auto & Transportation
  'auto repair': 'auto repair shop',
  'car repair': 'auto repair shop',
  'car detailing': 'auto detailing service',
  'mechanic': 'auto repair shop',
  'mobile mechanic': 'mobile mechanic',
  'towing': 'towing service',
  'car dealer': 'car dealership',
  'driving school': 'driving school',
  'auto glass': 'auto glass repair',

  // Events & Lifestyle Services
  'wedding planner': 'wedding planner',
  'photographer': 'photographer',
  'videographer': 'videography service',
  'dj': 'DJ service',
  'entertainment': 'entertainment service',
  'caterer': 'catering service',
  'food truck': 'food truck',
  'party rental': 'party equipment rental',
  'event venue': 'event venue',
  'florist': 'florist',

  // Pet & Animal Services
  'dog groomer': 'dog grooming service',
  'pet grooming': 'pet grooming service',
  'veterinarian': 'veterinarian',
  'vet': 'veterinarian',
  'pet boarding': 'pet boarding service',
  'dog training': 'dog trainer',

  // Medical & Healthcare Providers
  'clinic': 'medical clinic',
  'medical billing': 'medical billing service',
  'home health': 'home health care service',
  'optometrist': 'optometrist',
  'eye clinic': 'eye care center',
  'dental office': 'dental clinic',
  'speech therapy': 'speech therapist',
  'occupational therapy': 'occupational therapist',

  // Education & Tutoring
  'tutor': 'tutoring service',
  'test prep': 'test preparation center',
  'childcare': 'childcare center',
  'preschool': 'preschool',
  'daycare': 'day care center',
  'art school': 'art school',
  'music school': 'music school',

  // Hospitality & Service Trades
  'cleaning company': 'cleaning service',
  'security': 'security service',
  'delivery service': 'delivery service',
  'courier': 'courier service',
  'staffing': 'staffing agency',

  // Technology & Marketing
  'web design': 'web design agency',
  'marketing': 'marketing agency',
  'it support': 'IT services',
  'msp': 'managed IT services',
  'seo': 'SEO service',
  'social media': 'social media marketing',

  // Construction & B2B Trades
  'general contractor': 'general contractor',
  'contractor': 'general contractor',
  'excavation': 'excavation contractor',
  'concrete': 'concrete contractor',
  'welding': 'welding service',
  'equipment rental': 'equipment rental service',
  'plumbing supply': 'plumbing supply store',
  'hvac supply': 'HVAC supply store',
  'electrical supply': 'electrical supply store'
};

/**
 * Optimize search query for Google Places API
 * @param {string} category - User input category
 * @param {string} location - Search location
 * @returns {string} Optimized search query
 */
function optimizeSearchQuery(category, location) {
  const lowerCategory = category.toLowerCase().trim();

  // Check if we have a mapping
  const mapped = INDUSTRY_MAPPINGS[lowerCategory];
  if (mapped) {
    return `${mapped} in ${location}`;
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(INDUSTRY_MAPPINGS)) {
    if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
      return `${value} in ${location}`;
    }
  }

  // No mapping found - use original with "service" added if appropriate
  const needsService = !lowerCategory.includes('service') &&
                      !lowerCategory.includes('company') &&
                      !lowerCategory.includes('contractor') &&
                      !lowerCategory.includes('agent') &&
                      !lowerCategory.includes('firm');

  if (needsService) {
    return `${category} service in ${location}`;
  }

  return `${category} in ${location}`;
}

/**
 * Get all supported industries
 * @returns {Array<string>} List of all mapped industries
 */
function getSupportedIndustries() {
  return Object.keys(INDUSTRY_MAPPINGS).sort();
}

/**
 * Get industry suggestions based on partial input
 * @param {string} partial - Partial industry name
 * @returns {Array<string>} Matching industries
 */
function getIndustrySuggestions(partial) {
  const lower = partial.toLowerCase();
  return Object.keys(INDUSTRY_MAPPINGS)
    .filter(key => key.includes(lower))
    .slice(0, 10); // Return top 10 matches
}

module.exports = {
  optimizeSearchQuery,
  getSupportedIndustries,
  getIndustrySuggestions,
  INDUSTRY_MAPPINGS
};
