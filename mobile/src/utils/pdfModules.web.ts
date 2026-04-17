import * as jsPDFModule from 'jspdf';
import * as autoTableModule from 'jspdf-autotable';

export function getPdfModules() {
  const jsPDF = (jsPDFModule as any).default || (jsPDFModule as any).jsPDF || (jsPDFModule as any);
  const autoTable = (autoTableModule as any).default || (autoTableModule as any).autoTable || (autoTableModule as any);
  return { jsPDF, autoTable };
}

