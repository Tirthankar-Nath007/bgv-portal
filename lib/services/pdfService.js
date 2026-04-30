import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate PDF verification report with official letterhead
 * Returns base64 encoded PDF instead of uploading to storage
 * 
 * @param {Object} verificationData - Complete verification data
 * @param {Object} employeeData - Employee information
 * @returns {Object} PDF result with base64 data URL
 */
export async function generateVerificationReportPDF(verificationData, employeeData) {
  try {
    // Create new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add letterhead
    addLetterhead(pdf);

    const margin = 20;
    let yPosition = 60;

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 33, 33);
    pdf.text('EMPLOYMENT VERIFICATION REPORT', margin, yPosition);

    yPosition += 10;

    // Verification Summary Table
    autoTable(pdf, {
      startY: yPosition,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: 'bold', width: 40 },
        1: { width: 60 },
        2: { fontStyle: 'bold', width: 35 },
        3: { width: 35 }
      },
      body: [
        [
          'Verification ID:', verificationData.verificationId,
          'Date:', formatDateDDMMYY(verificationData.verifiedAt)
        ],
        [
          'Requested by:', verificationData.verifierName,
          'Match Score:', `${verificationData.matchScore}%`
        ],
        [
          'Overall Status:',
          {
            content: verificationData.overallStatus.toUpperCase(),
            styles: {
              textColor: verificationData.overallStatus.toLowerCase() === 'matched' ? [0, 122, 61] : [220, 38, 38],
              fontStyle: 'bold'
            }
          },
          '', ''
        ]
      ]
    });

    yPosition = pdf.lastAutoTable.finalY + 15;

    // Section Title: Verification Comparison
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 122, 61);
    pdf.text('VERIFICATION COMPARISON', margin, yPosition);

    yPosition += 5;

    // Comparison Table
    const comparisonRows = verificationData.comparisonResults.map(result => [
      result.label,
      { content: result.verifierValue || 'N/A', styles: { textColor: result.isMatch ? 0 : [220, 38, 38] } },
      {
        content: result.isMatch ? 'MATCH' : 'MISMATCH',
        styles: {
          textColor: result.isMatch ? [0, 122, 61] : [220, 38, 38],
          fontStyle: 'bold'
        }
      }
    ]);

    autoTable(pdf, {
      startY: yPosition,
      margin: { left: margin, right: margin },
      head: [['Field', 'Provided Data', 'Status']],
      body: comparisonRows,
      theme: 'striped',
      headStyles: { fillColor: [0, 122, 61], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', width: 50 },
        1: { width: 90 },
        2: { width: 30 }
      }
    });

    yPosition = pdf.lastAutoTable.finalY + 15;

    // Summary Section
    if (verificationData.summary) {
      if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        addLetterhead(pdf);
        yPosition = 60;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text('SUMMARY', margin, yPosition);

      yPosition += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const splitSummary = pdf.splitTextToSize(verificationData.summary, 170);
      pdf.text(splitSummary, margin, yPosition);
    }

    // Disclaimer / Footer
    const pageHeight = pdf.internal.pageSize.getHeight();
    const footerY = pageHeight - 25;

    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('This is an electronically generated report and does not require a physical signature.', margin, footerY);
    pdf.text('For any queries, please contact hr@company.com', margin, footerY + 5);

// Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer');
    
    const filename = `verification-report-${verificationData.verificationId}.pdf`;
    
    console.log('[PDF] Generated PDF report:', filename, `(${Math.round(pdfBuffer.byteLength / 1024)} KB)`);
    
    return {
      buffer: pdfBuffer,
      filename: filename
    };

  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF report: ${error.message}`);
  }
}

/**
 * Generate Appeal Response PDF
 */
export async function generateAppealResponsePDF(appealData) {
  try {
    const pdf = new jsPDF();
    addLetterhead(pdf);
    const margin = 20;
    let y = 60;

    pdf.setFontSize(16);
    pdf.setTextColor(0);
    pdf.text('QUERY RESPONSE', margin, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.text(`Query ID: ${appealData.appealId}`, margin, y); y += 7;
    pdf.text(`Status: ${appealData.status}`, margin, y); y += 7;
    y += 10;

    pdf.text('HR Response:', margin, y); y += 7;
    const splitResponse = pdf.splitTextToSize(appealData.hrResponse || '', 170);
    pdf.text(splitResponse, margin, y);

// Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer');
    
    return {
      buffer: pdfBuffer,
      filename: `appeal-response-${appealData.appealId}.pdf`
    };
  } catch (error) {
    console.error('Appeal PDF generation error:', error);
    throw error;
  }
}

/**
 * Add header/letterhead to PDF
 */
function addLetterhead(pdf) {
  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 61, 30);
  pdf.text('Ex-Employee Verification Portal', margin, 25);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  pdf.text('Official Employment Verification System', margin, 32);

  pdf.setDrawColor(0, 122, 61);
  pdf.setLineWidth(1);
  pdf.line(margin, 38, pageWidth - margin, 38);
}

/**
 * Format date as dd/mm/yy
 */
function formatDateDDMMYY(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}
