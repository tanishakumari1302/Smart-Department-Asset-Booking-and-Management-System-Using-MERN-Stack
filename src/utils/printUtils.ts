import { Booking, Asset } from '../types';

/**
 * Generate a complete, beautifully styled official printable gatepass HTML document.
 */
export function generateGatepassHtml(booking: Booking, collegeName: string = 'Campus Central Asset Logistics'): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handoverPhotoHtml = booking.handoverPhoto
    ? `<div style="border: 1px solid #cbdbf5; border-radius: 6px; padding: 8px; background: #f8f9ff;">
        <div style="font-size: 10px; font-weight: 700; color: #426086; text-transform: uppercase; margin-bottom: 4px;">1. Handover Condition Proof</div>
        <img src="${booking.handoverPhoto}" alt="Handover Proof" style="width: 100%; max-height: 120px; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0;" />
        ${booking.handoverVenue ? `<div style="font-size: 9px; color: #64748b; margin-top: 4px;">Venue: ${booking.handoverVenue}</div>` : ''}
       </div>`
    : '';

  const returnPhotoHtml = booking.returnPhoto
    ? `<div style="border: 1px solid #cbdbf5; border-radius: 6px; padding: 8px; background: #f8f9ff;">
        <div style="font-size: 10px; font-weight: 700; color: #426086; text-transform: uppercase; margin-bottom: 4px;">2. Return Condition (${booking.returnCondition || 'Intact'})</div>
        <img src="${booking.returnPhoto}" alt="Return Proof" style="width: 100%; max-height: 120px; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0;" />
        ${booking.returnCondition ? `<div style="font-size: 9px; color: #166534; font-weight: 600; margin-top: 4px;">Audit: ${booking.returnCondition.toUpperCase()}</div>` : ''}
       </div>`
    : '';

  const photosSection = (handoverPhotoHtml || returnPhotoHtml)
    ? `<div style="margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #fff;">
        <div style="font-size: 11px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; color: #0b1c30; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          Photographic Custody &amp; Verification Evidence
        </div>
        <div style="display: grid; grid-template-columns: ${handoverPhotoHtml && returnPhotoHtml ? '1fr 1fr' : '1fr'}; gap: 12px;">
          ${handoverPhotoHtml}
          ${returnPhotoHtml}
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Campus Gatepass - ${booking.reqId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0b1c30;
      background-color: #ffffff;
      padding: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip-container {
      max-width: 720px;
      margin: 0 auto;
      border: 2px solid #0e1c2f;
      border-radius: 8px;
      padding: 24px;
      position: relative;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0e1c2f;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .inst-title {
      font-size: 18px;
      font-weight: 800;
      color: #0e1c2f;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }
    .inst-subtitle {
      font-size: 11px;
      color: #44474c;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .stamp {
      border: 2px solid #009299;
      color: #009299;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: inline-block;
      text-align: center;
      background: #f0fdfa;
    }
    .ref-bar {
      background: #eff4ff;
      border: 1px solid #cbdbf5;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .ref-label {
      font-size: 11px;
      font-weight: 700;
      color: #426086;
      text-transform: uppercase;
    }
    .ref-val {
      font-family: monospace;
      font-size: 16px;
      font-weight: bold;
      color: #0e1c2f;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .details-table tr {
      border-bottom: 1px solid #eff4ff;
    }
    .details-table td {
      padding: 8px 10px;
      font-size: 12px;
    }
    .details-table td.label {
      color: #64748b;
      font-weight: 600;
      width: 32%;
    }
    .details-table td.value {
      color: #0b1c30;
      font-weight: 500;
    }
    .details-table td.value strong {
      font-weight: 700;
      color: #0e1c2f;
    }
    .barcode-section {
      border: 1px dashed #cbdbf5;
      background: #f8f9ff;
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      margin: 16px 0;
    }
    .barcode-lines {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      height: 48px;
    }
    .barcode-line {
      height: 100%;
      background: #0e1c2f;
      display: inline-block;
    }
    .barcode-text {
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #0e1c2f;
      margin-top: 6px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
    }
    .sign-box {
      border-top: 1px dashed #64748b;
      padding-top: 6px;
      text-align: center;
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sign-box .name {
      font-size: 11px;
      font-weight: 700;
      color: #0e1c2f;
      margin-bottom: 24px;
    }
    .terms {
      font-size: 9px;
      color: #64748b;
      line-height: 1.4;
      margin-top: 16px;
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 4px;
    }
    @media print {
      body {
        padding: 0;
      }
      .slip-container {
        border: 2px solid #000;
        box-shadow: none;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      <div>
        <div class="inst-title">${collegeName}</div>
        <div class="inst-subtitle">OFFICIAL CAMPUS ASSET MOVEMENT &amp; DISPATCH GATEPASS</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Issued on: ${currentDate} at ${currentTime}</div>
      </div>
      <div class="stamp">
        STAMPED APPROVED
      </div>
    </div>

    <div class="ref-bar">
      <div>
        <div class="ref-label">Gatepass Reference No.</div>
        <div class="ref-val">${booking.reqId}</div>
      </div>
      <div style="text-align: right;">
        <div class="ref-label">Requisition Category</div>
        <div style="font-size: 12px; font-weight: 700; color: #009299; text-transform: uppercase;">
          ${(booking.bookingType || booking.type || 'Standard').toUpperCase()} ALLOCATION
        </div>
      </div>
    </div>

    <table class="details-table">
      <tr>
        <td class="label">Borrower / Faculty Name:</td>
        <td class="value"><strong>${booking.requesterName}</strong></td>
      </tr>
      <tr>
        <td class="label">Department / Unit:</td>
        <td class="value">${booking.requesterDept || booking.department || 'Academic Department'}</td>
      </tr>
      <tr>
        <td class="label">Official Email:</td>
        <td class="value">${booking.requesterEmail || 'Registered Faculty'}</td>
      </tr>
      <tr>
        <td class="label">Authorized Asset:</td>
        <td class="value"><strong>${booking.assetName}</strong> (${booking.quantity || 1} Unit)</td>
      </tr>
      <tr>
        <td class="label">Asset Barcode / Tag:</td>
        <td class="value"><span style="font-family: monospace; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.assetCode || 'AST-N/A'}</span></td>
      </tr>
      <tr>
        <td class="label">Approved Destination:</td>
        <td class="value"><strong>${booking.venue || 'Campus Lecture Hall / Lab'}</strong></td>
      </tr>
      <tr>
        <td class="label">Authorized Time Slot:</td>
        <td class="value">${booking.bookingDate || 'Scheduled Day'} ${booking.startTime ? `[${booking.startTime} - ${booking.endTime}]` : ''}</td>
      </tr>
      <tr>
        <td class="label">Custody Checkpoint:</td>
        <td class="value">Central Security Gate &amp; Bay 2 Tech Station</td>
      </tr>
      <tr>
        <td class="label">Requisition Purpose:</td>
        <td class="value">${booking.purpose || 'Official Academic Instruction / Lab Practical Session'}</td>
      </tr>
      ${booking.approvedBy ? `
      <tr>
        <td class="label">Approval Authority:</td>
        <td class="value">${booking.approvedBy}</td>
      </tr>` : ''}
    </table>

    ${photosSection}

    <div class="barcode-section">
      <div class="barcode-lines">
        <span class="barcode-line" style="width: 3px;"></span>
        <span class="barcode-line" style="width: 1px;"></span>
        <span class="barcode-line" style="width: 4px;"></span>
        <span class="barcode-line" style="width: 2px;"></span>
        <span class="barcode-line" style="width: 1px;"></span>
        <span class="barcode-line" style="width: 5px;"></span>
        <span class="barcode-line" style="width: 2px;"></span>
        <span class="barcode-line" style="width: 1px;"></span>
        <span class="barcode-line" style="width: 4px;"></span>
        <span class="barcode-line" style="width: 2px;"></span>
        <span class="barcode-line" style="width: 5px;"></span>
        <span class="barcode-line" style="width: 1px;"></span>
        <span class="barcode-line" style="width: 3px;"></span>
        <span class="barcode-line" style="width: 2px;"></span>
        <span class="barcode-line" style="width: 4px;"></span>
        <span class="barcode-line" style="width: 1px;"></span>
        <span class="barcode-line" style="width: 3px;"></span>
        <span class="barcode-line" style="width: 5px;"></span>
        <span class="barcode-line" style="width: 2px;"></span>
      </div>
      <div class="barcode-text">*${booking.reqId}-GATEPASS-SEC*</div>
    </div>

    <div class="signatures">
      <div class="sign-box">
        <div class="name">${booking.requesterName}</div>
        Borrower Signature
      </div>
      <div class="sign-box">
        <div class="name">${booking.approvedBy || 'Asset In-Charge'}</div>
        Authorized Officer
      </div>
      <div class="sign-box">
        <div class="name">Gate Officer / Guard</div>
        Security Checkpoint
      </div>
    </div>

    <div class="terms">
      <strong>Terms of Issuance:</strong> This gatepass certifies authorized transit and custody of designated institutional assets. Assets must remain within designated academic venues and be surrendered intact upon completion of the approved slot. Damaged or lost items are subject to administrative review.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Downloads the gatepass slip directly as a clean standalone HTML file
 * which can be opened and printed directly using Ctrl+P / Cmd+P or saved as PDF.
 */
export function downloadGatepassSlip(booking: Booking, collegeName?: string): boolean {
  try {
    const html = generateGatepassHtml(booking, collegeName);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Gatepass_${booking.reqId}_${booking.requesterName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('Failed to download gatepass slip:', err);
    return false;
  }
}

/**
 * Robust printing function:
 * 1. Creates a hidden iframe to isolate only the printable gatepass slip.
 * 2. Invokes print dialog on that iframe.
 * 3. In case the iframe sandbox blocks window.print() or modals, seamlessly downloads the official gatepass slip so the user gets the document immediately without getting stuck!
 */
export function printGatepassSlip(
  booking: Booking,
  collegeName?: string,
  onNotify?: (msg: string, type: 'info' | 'success' | 'warning') => void
): void {
  const html = generateGatepassHtml(booking, collegeName);

  // Hidden iframe print attempt
  let printAttemptSucceeded = false;
  try {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    printIframe.style.opacity = '0';
    printIframe.id = 'hidden-print-iframe';

    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          printAttemptSucceeded = true;
          onNotify?.(`Print dialog triggered for Gatepass ${booking.reqId}`, 'success');
        } catch (innerErr) {
          console.warn('Iframe print restricted by sandbox:', innerErr);
          // Fallback: direct download
          downloadGatepassSlip(booking, collegeName);
          onNotify?.(
            `Print restricted by preview iframe. Gatepass ${booking.reqId} downloaded as printable slip!`,
            'info'
          );
        } finally {
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 3000);
        }
      }, 500);
    } else {
      throw new Error('Unable to access iframe document');
    }
  } catch (err) {
    console.warn('Hidden iframe creation failed, falling back to download:', err);
    downloadGatepassSlip(booking, collegeName);
    onNotify?.(
      `Gatepass ${booking.reqId} slip downloaded successfully. You can print or save as PDF!`,
      'success'
    );
  }
}

/**
 * Print Catalog Sheet for Inventory
 */
export function printCatalogSheet(
  assets: Asset[],
  collegeName: string = 'Campus Central Asset Logistics',
  onNotify?: (msg: string, type: 'info' | 'success' | 'warning') => void
): void {
  const rows = assets
    .map(
      (a) => `
    <tr>
      <td style="font-family: monospace; font-weight: bold; padding: 6px 8px; border: 1px solid #cbd5e1;">${a.code}</td>
      <td style="font-weight: 600; padding: 6px 8px; border: 1px solid #cbd5e1;">${a.name}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px;">${a.categoryLabel || a.category}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${a.totalQuantity}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${a.availableQuantity > 0 ? '#166534' : '#991b1b'};">${a.availableQuantity}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${a.dispatchedQuantity || 0}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px;">${a.location || 'Central Stock'}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; font-weight: bold;">${a.status}</td>
    </tr>
  `
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Asset Catalog Sheet</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: sans-serif; color: #0b1c30; padding: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
    th { background: #0e1c2f; color: #fff; padding: 8px; border: 1px solid #0e1c2f; text-align: left; }
    h2 { margin: 0; color: #0e1c2f; font-size: 18px; }
    p { margin: 4px 0 12px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <h2>${collegeName} - Official Asset Catalog Sheet</h2>
  <p>Generated on ${new Date().toLocaleString()} | Total Catalog Items: ${assets.length}</p>
  <table>
    <thead>
      <tr>
        <th>Asset Code</th>
        <th>Asset Name</th>
        <th>Category</th>
        <th>Total</th>
        <th>Available</th>
        <th>Dispatched</th>
        <th>Location</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  try {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);
    const doc = printIframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          onNotify?.('Catalog sheet print dialog triggered', 'success');
        } catch {
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Asset_Catalog_${Date.now()}.html`;
          a.click();
          onNotify?.('Catalog sheet downloaded as printable file', 'info');
        } finally {
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 3000);
        }
      }, 500);
    }
  } catch {
    onNotify?.('Failed to print catalog sheet', 'warning');
  }
}
