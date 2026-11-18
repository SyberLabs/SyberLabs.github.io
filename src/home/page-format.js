// "13.86° S, 76.30° W". Shared by the page (src/home/page.js) and its script, which rewrites the caption as the
// globe turns.
export const position = (lat, lon) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
