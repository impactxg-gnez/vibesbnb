// Property validation utility
// Defines mandatory fields and validation logic for properties

export interface PropertyValidation {
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface PropertyToValidate {
  name?: string;
  location?: string;
  price?: number;
  images?: string[];
  guests?: number;
  bedrooms?: number;
  /** Total beds (can exceed bedroom count); guests filter on this when set */
  beds?: number | null;
  bathrooms?: number;
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  type?: string;
}

// Define mandatory fields with their display names and validation logic
const MANDATORY_FIELDS: Array<{
  field: keyof PropertyToValidate;
  displayName: string;
  validate: (value: any) => boolean;
}> = [
  {
    field: 'name',
    displayName: 'Property Name',
    validate: (value) => typeof value === 'string' && value.trim().length > 0,
  },
  {
    field: 'location',
    displayName: 'Location',
    validate: (value) => typeof value === 'string' && value.trim().length > 0 && value !== 'Location not found',
  },
  {
    field: 'price',
    displayName: 'Price per Night',
    validate: (value) => typeof value === 'number' && value > 0,
  },
  {
    field: 'images',
    displayName: 'Property Photos (at least 1)',
    validate: (value) => Array.isArray(value) && value.length > 0 && !value[0]?.includes('placeholder'),
  },
  {
    field: 'guests',
    displayName: 'Maximum Guests',
    validate: (value) => typeof value === 'number' && value > 0,
  },
  {
    field: 'bedrooms',
    displayName: 'Number of Bedrooms',
    validate: (value) => typeof value === 'number' && value >= 0,
  },
  {
    field: 'bathrooms',
    displayName: 'Number of Bathrooms',
    validate: (value) => typeof value === 'number' && value >= 1,
  },
  {
    field: 'coordinates',
    displayName: 'Map Location (coordinates)',
    validate: (value) => 
      value && 
      typeof value === 'object' && 
      typeof value.lat === 'number' && 
      typeof value.lng === 'number' &&
      !isNaN(value.lat) && 
      !isNaN(value.lng),
  },
];

// Optional but recommended fields
const RECOMMENDED_FIELDS: Array<{
  field: keyof PropertyToValidate;
  displayName: string;
  validate: (value: any) => boolean;
}> = [
  {
    field: 'description',
    displayName: 'Property Description',
    validate: (value) => typeof value === 'string' && value.trim().length >= 50,
  },
  {
    field: 'type',
    displayName: 'Property Type',
    validate: (value) => typeof value === 'string' && value.trim().length > 0,
  },
  {
    field: 'beds',
    displayName: 'Total number of beds',
    validate: (value) => typeof value === 'number' && value >= 1,
  },
];

/**
 * Validates a property and returns validation results
 */
export function validateProperty(property: PropertyToValidate): PropertyValidation {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check mandatory fields
  for (const { field, displayName, validate } of MANDATORY_FIELDS) {
    const value = property[field];
    if (!validate(value)) {
      missingFields.push(displayName);
    }
  }

  // Check recommended fields (as warnings)
  for (const { field, displayName, validate } of RECOMMENDED_FIELDS) {
    const value = property[field];
    if (!validate(value)) {
      warnings.push(displayName);
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Gets a human-readable summary of missing fields
 */
export function getMissingFieldsSummary(missingFields: string[]): string {
  if (missingFields.length === 0) return '';
  if (missingFields.length === 1) return `Missing: ${missingFields[0]}`;
  if (missingFields.length === 2) return `Missing: ${missingFields.join(' and ')}`;
  
  const last = missingFields[missingFields.length - 1];
  const rest = missingFields.slice(0, -1).join(', ');
  return `Missing: ${rest}, and ${last}`;
}

/**
 * Checks if a property can be published
 */
export function canPublish(property: PropertyToValidate): { canPublish: boolean; reason?: string } {
  const validation = validateProperty(property);
  
  if (!validation.isComplete) {
    return {
      canPublish: false,
      reason: getMissingFieldsSummary(validation.missingFields),
    };
  }
  
  return { canPublish: true };
}
