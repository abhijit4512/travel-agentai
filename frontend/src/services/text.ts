export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ORIGIN_CITIES = [
  "Ahmedabad", "Bengaluru", "Chennai", "Delhi", "Hyderabad", "Jaipur",
  "Kochi", "Kolkata", "Lucknow", "Mumbai", "Pune", "Visakhapatnam",
];

/** Remove markdown symbols so speech synthesis does not read "asterisk asterisk". */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatInr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}
