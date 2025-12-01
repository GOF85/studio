import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    internal: {
      getNumberOfPages: () => number;
    };
  }
}
