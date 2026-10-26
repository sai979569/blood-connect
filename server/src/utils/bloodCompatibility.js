import { RBC_COMPATIBILITY, PLASMA_COMPATIBILITY, BLOOD_GROUPS } from '../config/constants.js';

/**
 * Gets list of compatible donor blood groups for a given recipient blood group and component.
 * @param {string} recipientGroup - e.g. 'A+'
 * @param {string} component - e.g. 'Whole Blood', 'Red Blood Cells', 'Platelets', 'Plasma'
 * @returns {string[]} List of compatible donor blood groups
 */
export function getCompatibleDonorGroups(recipientGroup, component = 'Whole Blood') {
  if (component === 'Plasma' || component === 'Platelets') {
    return PLASMA_COMPATIBILITY[recipientGroup] || [recipientGroup];
  }
  return RBC_COMPATIBILITY[recipientGroup] || [recipientGroup];
}

/**
 * Checks if a specific donor is compatible with a recipient request.
 * @param {string} recipientGroup
 * @param {string} donorGroup
 * @param {string} component
 * @returns {boolean}
 */
export function isBloodCompatible(recipientGroup, donorGroup, component = 'Whole Blood') {
  const compatible = getCompatibleDonorGroups(recipientGroup, component);
  return compatible.includes(donorGroup);
}

export default { getCompatibleDonorGroups, isBloodCompatible };
