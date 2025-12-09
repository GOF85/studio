/**
 * Lazy-loaded PDF generation utilities
 * This module exports jsPDF and autoTable with lazy loading
 */

export const loadJsPDF = async () => {
  const jsPDF = (await import('jspdf')).default;
  return jsPDF;
};

export const loadAutoTable = async () => {
  const autoTable = (await import('jspdf-autotable')).default;
  return autoTable;
};

export const loadPDFLibs = async () => {
  const [jsPDF, autoTable] = await Promise.all([
    import('jspdf').then((mod) => mod.default),
    import('jspdf-autotable').then((mod) => mod.default),
  ]);
  return { jsPDF, autoTable };
};

