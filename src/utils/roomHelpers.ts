/**
 * Format room number to display format (RCxx, RBxx, RAxx)
 * Rooms 1-10: RC01 - RC10
 * Rooms 11-20: RB01 - RB10
 * Rooms 21-30: RA01 - RA10
 * Others: Pad with 0
 */
export const formatRoomName = (roomNumber: number | string): string => {
  const num = typeof roomNumber === 'string' ? parseInt(roomNumber, 10) : roomNumber;
  
  if (isNaN(num)) return String(roomNumber);

  if (num >= 1 && num <= 10) {
    // RC: 1 -> RC01, 10 -> RC10 (Reverse order in UI but logical mapping here)
    // Based on RoomGrid logic: 
    // const rc = sorted.slice(0, 10).map((r, i) => ({ ...r, label: `RC${String(i + 1).padStart(2, '0')}`, ... }));
    // Wait, RoomGrid sorts by room number. Assuming database room numbers are 1-30.
    // If room.number is 1, it maps to RC01.
    return `RC${String(num).padStart(2, '0')}`;
  } else if (num >= 11 && num <= 20) {
    // RB: 11 -> RB01
    return `RB${String(num - 10).padStart(2, '0')}`;
  } else if (num >= 21 && num <= 30) {
    // RA: 21 -> RA01
    return `RA${String(num - 20).padStart(2, '0')}`;
  }

  // Fallback
  return String(num).padStart(2, '0');
};
