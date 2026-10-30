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

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const ORIGIN_CITIES = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Pune", "Delhi", "Kolkata", "Ahmedabad", "Kochi", "Visakhapatnam", "Jaipur"];
