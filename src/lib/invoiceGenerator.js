import { jsPDF } from 'jspdf'

/**
 * Generates and downloads a styled A4 Tax Invoice PDF for a completed ride.
 * @param {Object} booking - The booking document data from Firestore.
 * @param {Object} vehicle - The vehicle details matching the booking.
 */
export const generateInvoice = (booking, vehicle) => {
  if (!booking) return

  // Create PDF instance (A4: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Colors
  const primaryColor = [103, 80, 164] // Fleet brand color (purple)
  const darkTextColor = [33, 37, 41]
  const lightTextColor = [108, 117, 125]
  const borderLight = [222, 226, 230]
  const bgLight = [248, 249, 250]

  // Setup Document
  doc.setFont('helvetica', 'normal')

  // Top Accent Bar
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 6, 'F')

  let y = 20

  // 1. Header (Brand Logo & Invoice Title)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...primaryColor)
  doc.text('FLEET', 20, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...lightTextColor)
  doc.text('DRIVE THE CHANGE', 20, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...darkTextColor)
  doc.text('TAX INVOICE', 190, y, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...lightTextColor)
  doc.text(`Invoice ID: ${booking.bookingId || booking.id || 'N/A'}`, 190, y + 5, { align: 'right' })

  y += 18

  // Divider
  doc.setDrawColor(...borderLight)
  doc.setLineWidth(0.3)
  doc.line(20, y, 190, y)

  y += 10

  // 2. Invoice Details Grid (Two columns)
  // Left Column - Renter Info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkTextColor)
  doc.text('BILLED TO:', 20, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(booking.renterName || 'Guest User', 20, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...lightTextColor)
  doc.text(`Email: ${booking.renterEmail || 'N/A'}`, 20, y + 10)
  
  // Right Column - Booking Info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkTextColor)
  doc.text('INVOICE DETAILS:', 120, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...lightTextColor)
  
  let invoiceDate = 'N/A'
  if (booking.createdAt) {
    const dateObj = booking.createdAt.seconds 
      ? new Date(booking.createdAt.seconds * 1000) 
      : new Date(booking.createdAt)
    if (!isNaN(dateObj)) {
      invoiceDate = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  }
  
  doc.text(`Date: ${invoiceDate}`, 120, y + 5)
  doc.text(`Payment Ref: ${booking.paymentId || 'N/A'}`, 120, y + 10)
  doc.text(`Payment Method: ${(booking.paymentMethod || 'UPI').toUpperCase()}`, 120, y + 15)

  y += 25

  // 3. Vehicle & Trip Information Section
  doc.setFillColor(...bgLight)
  doc.rect(20, y, 170, 32, 'F')
  doc.setDrawColor(...borderLight)
  doc.rect(20, y, 170, 32, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkTextColor)
  doc.text('VEHICLE & TRIP DETAILS', 25, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...darkTextColor)
  doc.text(`Vehicle: ${booking.vehicleName || 'N/A'} (${vehicle?.brand || ''} ${vehicle?.year || ''})`, 25, y + 12)
  doc.text(`Registration No: ${vehicle?.regNo || 'N/A'}`, 25, y + 17)
  doc.text(`Fuel Type: ${vehicle?.fuelType || 'N/A'}`, 25, y + 22)
  doc.text(`Location: ${booking.pickupLocation || vehicle?.city || 'N/A'}`, 25, y + 27)

  // Right column inside Trip Details box
  doc.text(`Duration: ${booking.totalDays || booking.pricing?.days || 1} day(s)`, 110, y + 12)
  doc.text(`Pickup: ${booking.pickupDate || 'N/A'} (${booking.pickupTime || '10:00 AM'})`, 110, y + 17)
  doc.text(`Return: ${booking.dropoffDate || 'N/A'} (${booking.dropoffTime || '10:00 AM'})`, 110, y + 22)
  doc.text(`Owner: ${vehicle?.hostName || vehicle?.ownerName || 'Fleet Partner'}`, 110, y + 27)

  y += 42

  // 4. Charge Breakdown Table
  // Table Header
  doc.setFillColor(...primaryColor)
  doc.rect(20, y, 170, 8, 'F')
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('S.No.', 24, y + 5.5)
  doc.text('Description', 40, y + 5.5)
  doc.text('Qty / Duration', 120, y + 5.5, { align: 'right' })
  doc.text('Amount (INR)', 185, y + 5.5, { align: 'right' })

  y += 8

  // Table Body Rows
  const pricing = booking.pricing || {}
  const rows = []

  // Row 1: Base Rental
  const daysText = `${booking.totalDays || pricing.days || 1} day(s)`
  const dailyRateText = pricing.dailyRate ? ` @ ₹${pricing.dailyRate}/day` : ''
  rows.push({
    desc: `Vehicle Rental Fee (${booking.vehicleName})${dailyRateText}`,
    qty: daysText,
    amount: pricing.rentalCharge || 0
  })

  // Row 2: Helmet Addon (If included)
  if (booking.addons?.helmet) {
    rows.push({
      desc: 'Helmet Add-on (Full Protection Rider Gear)',
      qty: '1 unit',
      amount: 200 // Helmet default pricing is ₹200 as per detail page config
    })
  }

  // Row 3: Insurance Addon (If selected)
  if (pricing.insurance && pricing.insurance > 0) {
    rows.push({
      desc: 'Comprehensive Damage & Theft Insurance Protection',
      qty: '1 unit',
      amount: pricing.insurance
    })
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...darkTextColor)

  rows.forEach((row, index) => {
    // Background alternating color
    if (index % 2 === 1) {
      doc.setFillColor(...bgLight)
      doc.rect(20, y, 170, 8, 'F')
    }
    
    // Draw cells
    doc.text(String(index + 1), 24, y + 5.5)
    doc.text(row.desc, 40, y + 5.5)
    doc.text(row.qty, 120, y + 5.5, { align: 'right' })
    doc.text(`₹${row.amount.toLocaleString('en-IN')}`, 185, y + 5.5, { align: 'right' })
    
    // Bottom border for cells
    doc.setDrawColor(...borderLight)
    doc.line(20, y + 8, 190, y + 8)
    
    y += 8
  })

  y += 4

  // 5. Total Calculations (Right-aligned blocks)
  const drawCalculationRow = (label, valueStr, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    doc.setFontSize(isBold ? 11 : 9)
    doc.setTextColor(...darkTextColor)
    doc.text(label, 140, y + 5, { align: 'right' })
    doc.text(valueStr, 185, y + 5, { align: 'right' })
    y += 6
  }

  const subtotal = pricing.subtotal || pricing.rentalCharge || 0
  drawCalculationRow('Subtotal (excluding GST):', `₹${subtotal.toLocaleString('en-IN')}`)

  if (pricing.couponSavings && pricing.couponSavings > 0) {
    const couponLabel = pricing.couponCode ? `Coupon Discount (${pricing.couponCode}):` : 'Coupon Discount:'
    drawCalculationRow(couponLabel, `-₹${pricing.couponSavings.toLocaleString('en-IN')}`)
  }

  if (pricing.gst && pricing.gst > 0) {
    drawCalculationRow('GST (18% included):', `₹${pricing.gst.toLocaleString('en-IN')}`)
  }

  // Draw a small line before grand total
  doc.setDrawColor(...borderLight)
  doc.line(110, y + 1, 190, y + 1)
  y += 3

  const grandTotal = pricing.total || 0
  drawCalculationRow('Grand Total (Paid):', `₹${grandTotal.toLocaleString('en-IN')}`, true)

  y += 5

  // Security Deposit Note
  const deposit = pricing.securityDeposit || vehicle?.securityDeposit || 5000
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...lightTextColor)
  doc.text(`* Refundable Security Deposit of ₹${deposit.toLocaleString('en-IN')} was verified/pre-authorized at pickup and is returned after ride drop-off validation.`, 20, y)

  y += 15

  // 6. Footer (Payment Note & Signature Line)
  // Left: Invoice disclaimer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...lightTextColor)
  doc.text('TERMS & CONDITIONS:', 20, y)
  
  const disclaimerText = [
    '1. This is a computer generated invoice and requires no physical signature.',
    '2. Standard rental policy: All riders must have a valid DL active.',
    '3. Helmet usage is mandatory under Indian road transport rules.',
    '4. Support contacts: support@fleetrental.in | +91 1800-FLEET-HELP'
  ]
  disclaimerText.forEach((line, i) => {
    doc.text(line, 20, y + 4 + (i * 3.5))
  })

  // Right: Signature/Company Seal placeholder
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkTextColor)
  doc.text('AUTHORIZED SIGNATORY', 190, y, { align: 'right' })
  
  doc.setDrawColor(...borderLight)
  doc.line(150, y + 15, 190, y + 15)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...lightTextColor)
  doc.text('Fleet Rental Operations India', 190, y + 18, { align: 'right' })

  // Save the PDF
  const filename = `Fleet_Invoice_${booking.bookingId || booking.id || 'N/A'}.pdf`
  doc.save(filename)
}
