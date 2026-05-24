import { jsPDF } from 'jspdf'

export const generateInvoice = (booking, vehicle, user) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 0  // current Y position cursor

  // ── Helper functions ──
  const text = (str, x, yPos, opts = {}) => doc.text(str, x, yPos, opts)
  const line = (x1, y1, x2, y2) => doc.line(x1, y1, x2, y2)
  const rect = (x, yPos, w, h, style = 'F') => doc.rect(x, yPos, w, h, style)

  const formatDate = (val) => {
    if (!val) return '—'
    const d = val?.toDate ? val.toDate() : new Date(val)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatINR = (amount) =>
    `Rs. ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  // ── HEADER BAND ──
  doc.setFillColor(10, 10, 10)  // near-black
  rect(0, 0, pageW, 40)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  text('FLEET', margin, 22)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  text('India\'s trusted vehicle rental marketplace', margin, 30)

  // Invoice label (right side)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  text('TAX INVOICE', pageW - margin, 18, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  text(`# ${booking.invoiceNumber || booking.bookingId || booking.id?.slice(0, 8).toUpperCase() || 'INV-0001'}`,
    pageW - margin, 26, { align: 'right' })
  text(`Date: ${formatDate(booking.completedAt || booking.createdAt)}`,
    pageW - margin, 33, { align: 'right' })

  y = 52

  // ── BILLED TO / VEHICLE INFO ──
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  text('BILLED TO', margin, y)
  text('VEHICLE', pageW / 2 + 5, y)

  y += 5
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  text(user?.displayName || booking.renterName || '—', margin, y)
  text(vehicle?.name || booking.vehicleName || '—', pageW / 2 + 5, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  text(user?.email || booking.renterEmail || '—', margin, y)
  text(`${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim() || '—', pageW / 2 + 5, y)

  y += 4
  text(user?.phone || booking.renterPhone || '—', margin, y)
  text(`Reg: ${vehicle?.registrationNumber || vehicle?.regNo || '—'}`, pageW / 2 + 5, y)

  y += 12

  // ── BOOKING DETAILS ──
  doc.setFillColor(248, 248, 248)
  rect(margin, y, contentW, 28)

  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  y += 6
  text('BOOKING ID', margin + 4, y)
  text('PICKUP', margin + 55, y)
  text('DROP-OFF', margin + 110, y)
  text('DURATION', margin + 155, y)

  y += 6
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  text(booking.bookingId || booking.id?.slice(0, 12).toUpperCase() || '—', margin + 4, y)
  text(formatDate(booking.pickupDatetime || booking.pickupDate), margin + 55, y)
  text(formatDate(booking.dropoffDatetime || booking.dropoffDate), margin + 110, y)
  text(booking.duration || `${booking.days || booking.totalDays || booking.pricing?.days || 1} day(s)`, margin + 155, y)

  y += 8
  text(`Pickup location: ${booking.pickupLocation || vehicle?.location || '—'}`,
    margin + 4, y)

  y += 14

  // ── ITEMS TABLE ──
  // Header
  doc.setFillColor(20, 20, 20)
  rect(margin, y, contentW, 9)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  y += 6.5
  text('DESCRIPTION', margin + 4, y)
  text('UNIT PRICE', margin + 105, y, { align: 'right' })
  text('QTY', margin + 130, y, { align: 'right' })
  text('AMOUNT', pageW - margin - 4, y, { align: 'right' })

  y += 5

  // Table rows
  const tableRows = [
    {
      desc: `${vehicle?.name || booking.vehicleName || 'Vehicle'} Rental (${booking.rentalType || 'Daily'})`,
      unit: formatINR(booking.pricing?.dailyRate || booking.basePrice || booking.pricePerDay || 0),
      qty: booking.totalDays || booking.days || booking.hours || booking.pricing?.days || 1,
      amount: formatINR(booking.pricing?.rentalCharge || booking.subtotal || booking.baseAmount || 0)
    }
  ]

  if (booking.addons?.helmet || booking.helmetCharge) tableRows.push({
    desc: 'Helmet Add-on',
    unit: formatINR(booking.helmetCharge || 200),
    qty: 1,
    amount: formatINR(booking.helmetCharge || 200)
  })

  if (booking.addons?.insurance || booking.pricing?.insurance || booking.insuranceCharge) tableRows.push({
    desc: 'Insurance Add-on',
    unit: formatINR(booking.pricing?.insurance || booking.insuranceCharge || 1500),
    qty: 1,
    amount: formatINR(booking.pricing?.insurance || booking.insuranceCharge || 1500)
  })

  tableRows.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 252)
    } else {
      doc.setFillColor(245, 245, 245)
    }
    rect(margin, y, contentW, 9)

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    y += 6.5
    text(row.desc, margin + 4, y)
    text(String(row.unit), margin + 105, y, { align: 'right' })
    text(String(row.qty), margin + 130, y, { align: 'right' })
    text(String(row.amount), pageW - margin - 4, y, { align: 'right' })
    y += 2.5
  })

  y += 8

  // ── TOTALS ──
  const totalsX = pageW - margin - 75
  const totalsW = 75

  const addTotalRow = (label, value, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(10, 10, 10)
      rect(totalsX, y - 2, totalsW, 10)
      doc.setTextColor(255, 255, 255)
    } else {
      doc.setTextColor(bold ? 20 : 80, bold ? 20 : 80, bold ? 20 : 80)
    }
    doc.setFontSize(highlight ? 10 : 9)
    doc.setFont('helvetica', bold || highlight ? 'bold' : 'normal')
    text(label, totalsX + 4, y + 5)
    text(value, totalsX + totalsW - 4, y + 5, { align: 'right' })
    y += (highlight ? 12 : 8)
  }

  const subtotal = booking.pricing?.subtotal || booking.subtotal || booking.baseAmount || booking.totalAmount || 0
  const couponDiscount = booking.pricing?.couponSavings || booking.couponDiscount || 0
  const gst = booking.pricing?.gst || booking.gstAmount || Math.round(subtotal * 0.18)
  const total = booking.pricing?.total || booking.totalAmount || (subtotal - couponDiscount + gst)

  addTotalRow('Subtotal', formatINR(subtotal))
  if (couponDiscount > 0) {
    addTotalRow(`Coupon (${booking.pricing?.couponCode || 'DISCOUNT'})`, `- ${formatINR(couponDiscount)}`)
  }
  addTotalRow('GST (18%)', formatINR(gst))
  doc.setDrawColor(200, 200, 200)
  line(totalsX, y, totalsX + totalsW, y)
  y += 3
  addTotalRow('TOTAL PAID', formatINR(total), true, true)

  // Payment method note
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  text(`Payment via: ${(booking.paymentMethod || 'Razorpay').toUpperCase()} · Ref: ${booking.paymentId || '—'}`,
    margin, y + 4)

  y += 16

  // ── FOOTER ──
  doc.setFillColor(248, 248, 248)
  rect(0, 280, pageW, 17)
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  text('This is a computer-generated invoice. No signature required.',
    pageW / 2, 287, { align: 'center' })
  text('Fleet India · support@fleet.in · www.fleet.in',
    pageW / 2, 292, { align: 'center' })

  // ── SAVE ──
  const fileName = `Fleet_Invoice_${booking.bookingId || booking.id?.slice(0, 8).toUpperCase() || 'BOOKING'}.pdf`
  doc.save(fileName)
}
