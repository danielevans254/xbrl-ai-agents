/**
 * Utilities for normalizing API responses and detecting data formats
 */

/**
 * Extracts the actual data from different API response formats
 * 
 * @param response - The API response object which might have nested data structures
 * @returns The extracted data, or the original response if no expected structure is found
 */
export const extractDataFromResponse = (response: any): any => {
  // Handle case when response is null or undefined
  if (!response) return null;

  // Handle case where data is wrapped in a mapped_data property
  if (response.mapped_data) {
    return response.mapped_data;
  }

  // Handle case where data is in the data property
  if (response.data) {
    // Check if response.data.mapped_data exists
    if (response.data.mapped_data) {
      return response.data.mapped_data;
    }
    return response.data;
  }

  // Handle case where data is in the result property
  if (response.result) {
    return response.result;
  }

  // If data is not in any expected wrapper, return the whole response
  return response;
};

/**
 * Detects if data primarily uses snake_case naming convention
 * 
 * @param data - The data object to analyze
 * @returns Boolean indicating if the data primarily uses snake_case
 */
export const usesSnakeCase = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;

  let snakeCaseCount = 0;
  let camelCaseCount = 0;

  // Recursively count snake_case and camelCase keys in the object
  const countInObject = (obj: any, depth = 0, maxDepth = 3) => {
    if (!obj || typeof obj !== 'object' || depth > maxDepth) return;

    Object.keys(obj).forEach(key => {
      // Count snake_case keys (contains underscore)
      if (key.includes('_')) snakeCaseCount++;

      // Count camelCase keys (lowercase followed by uppercase)
      else if (/[a-z][A-Z]/.test(key)) camelCaseCount++;

      // Recurse for nested objects, limiting depth to avoid excessive processing
      if (obj[key] && typeof obj[key] === 'object' && depth < maxDepth) {
        countInObject(obj[key], depth + 1, maxDepth);
      }
    });
  };

  countInObject(data);

  // Return true if more snake_case keys than camelCase keys
  return snakeCaseCount > camelCaseCount;
};

/**
 * Normalized data structure by converting between snake_case and camelCase
 * 
 * @param data - The data object to normalize
 * @param targetFormat - The desired format ('snake' or 'camel')
 * @returns The normalized data object
 */
export const normalizeDataFormat = (data: any, targetFormat: 'snake' | 'camel'): any => {
  if (!data || typeof data !== 'object') return data;

  // Convert from camelCase to snake_case
  const camelToSnake = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  };

  // Convert from snake_case to camelCase
  const snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  // Recursively transform object keys
  const transform = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => transform(item));
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const newKey = targetFormat === 'snake' ? camelToSnake(key) : snakeToCamel(key);
        result[newKey] = transform(obj[key]);
        return result;
      }, {} as Record<string, any>);
    }

    return obj;
  };

  return transform(data);
};

/**
 * Safely access a nested property in an object using a path string
 * 
 * @param obj - The object to access
 * @param path - The path to the property, e.g. "user.address.city"
 * @param defaultValue - The default value to return if the path doesn't exist
 * @returns The value at the path or the default value
 */
export const getNestedValue = (obj: any, path: string, defaultValue: any = null): any => {
  if (!obj || !path) return defaultValue;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }

    current = current[part];
  }

  return current !== undefined ? current : defaultValue;
};

/**
 * Checks if a value exists (not null, undefined, or empty string)
 * 
 * @param value - The value to check
 * @returns Boolean indicating if the value exists
 */
export const valueExists = (value: any): boolean => {
  return value !== null && value !== undefined && value !== '';
};

/**
 * Gets a flattened list of all keys in an object (including nested objects)
 * 
 * @param obj - The object to analyze
 * @param prefix - The prefix for nested keys
 * @returns Array of all keys in the object
 */
export const getAllKeys = (obj: any, prefix = ''): string[] => {
  if (!obj || typeof obj !== 'object') return [];

  return Object.keys(obj).reduce((result, key) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    result.push(currentKey);

    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      result.push(...getAllKeys(obj[key], currentKey));
    }

    return result;
  }, [] as string[]);
};