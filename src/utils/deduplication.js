/**
 * Normalize phone number to E.164 format
 */
function normalizePhone(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle US numbers (10 digits)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Handle US numbers with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return as-is if already formatted or international
  if (phone.startsWith('+')) {
    return phone;
  }

  // Default: add + if not present
  return `+${digits}`;
}

/**
 * Normalize URL
 */
function normalizeUrl(url) {
  if (!url) return null;

  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const parsed = new URL(url);
    // Remove trailing slash and www
    return parsed.href.replace(/\/$/, '').replace(/^https?:\/\/www\./, 'https://');
  } catch (e) {
    return url;
  }
}

/**
 * Normalize a single business record
 */
function normalizeRecord(record) {
  return {
    business_name: record.business_name?.trim() || null,
    category: record.category?.trim() || null,
    street: record.street?.trim() || null,
    city: record.city?.trim() || null,
    state: record.state?.trim()?.toUpperCase() || null,
    postal_code: record.postal_code?.trim() || null,
    country: record.country?.trim()?.toUpperCase() || 'US',
    phone: normalizePhone(record.phone),
    email: record.email?.trim()?.toLowerCase() || null,
    website: normalizeUrl(record.website),
    source_url: record.source_url?.trim() || null,
    confidence: typeof record.confidence === 'number' ? record.confidence : 0.5,
    notes: record.notes?.trim() || null
  };
}

/**
 * Generate deduplication key for a record
 */
function getDeduplicationKey(record) {
  // Primary: use website (most reliable)
  if (record.website) {
    return `website:${record.website}`;
  }

  // Secondary: use business name + phone + postal code
  if (record.business_name && record.phone && record.postal_code) {
    return `composite:${record.business_name.toLowerCase()}:${record.phone}:${record.postal_code}`;
  }

  // Tertiary: use business name + postal code
  if (record.business_name && record.postal_code) {
    return `name-zip:${record.business_name.toLowerCase()}:${record.postal_code}`;
  }

  // Last resort: use source_url (might catch duplicates from same page)
  if (record.source_url) {
    return `source:${record.source_url}:${record.business_name?.toLowerCase() || 'unknown'}`;
  }

  // If we can't generate a reliable key, use a unique timestamp
  // (this means the record won't be deduplicated)
  return `unique:${Date.now()}:${Math.random()}`;
}

/**
 * Merge duplicate records (keep higher confidence)
 */
function mergeRecords(existing, incoming) {
  // Keep record with higher confidence
  if (incoming.confidence > existing.confidence) {
    return {
      ...existing,
      ...incoming,
      // Merge notes
      notes: [existing.notes, incoming.notes]
        .filter(Boolean)
        .join(' | ')
    };
  }

  // Fill in missing fields from incoming
  const merged = { ...existing };
  Object.keys(incoming).forEach(key => {
    if (!merged[key] && incoming[key]) {
      merged[key] = incoming[key];
    }
  });

  // Merge notes
  merged.notes = [existing.notes, incoming.notes]
    .filter(Boolean)
    .join(' | ');

  return merged;
}

/**
 * Deduplicate an array of business records
 */
function deduplicateRecords(records) {
  const seen = new Map();
  const deduplicated = [];

  for (const record of records) {
    const key = getDeduplicationKey(record);

    if (seen.has(key)) {
      // Merge with existing record
      const existing = seen.get(key);
      const merged = mergeRecords(existing, record);
      seen.set(key, merged);
    } else {
      // New record
      seen.set(key, record);
    }
  }

  // Convert map to array
  return Array.from(seen.values());
}

module.exports = {
  normalizePhone,
  normalizeUrl,
  normalizeRecord,
  deduplicateRecords,
  getDeduplicationKey
};
