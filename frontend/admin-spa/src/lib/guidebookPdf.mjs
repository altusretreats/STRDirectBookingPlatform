import { jsPDF } from 'jspdf';

const COLORS = {
  blue: [29, 53, 87],
  red: [189, 80, 62],
  ink: [23, 38, 56],
  muted: [99, 113, 128],
  mist: [243, 246, 247],
  line: [220, 227, 231],
};

function cleanText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function pdfText(value) {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function isPlaceholder(value) {
  return !value || /REPLACE_ME|coming soon|add your/i.test(String(value));
}

function readableAudience(value) {
  return ({
    hikers: 'Hikers',
    climbers: 'Climbers',
    offroaders: 'Off-roaders',
    golfers: 'Golfers',
    families: 'Families',
    nightlife: 'Nightlife',
  })[value] || pdfText(value);
}

function flattenMarkdown(value) {
  return pdfText(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/[*_`#]/g, '');
}

function sectionAvailableToAi(section = {}) {
  return section.aiPublished ?? section.published ?? false;
}

function itemToKnowledge(item = {}) {
  const place = item.place || {};
  const title = pdfText(place.name || item.label || 'Guidebook item');
  const paragraphs = [];

  if (item.type === 'place') {
    if (!isPlaceholder(item.description)) paragraphs.push(pdfText(item.description));

    const details = [];
    if (place.category) details.push(`Category: ${pdfText(place.category)}`);
    if (place.address) details.push(`Address: ${pdfText(place.address)}`);
    if (place.distanceMiles != null) details.push(`Distance: ${place.distanceMiles} miles`);
    if (place.travelMinutes != null) details.push(`Estimated drive: ${place.travelMinutes} minutes`);
    if (place.rating != null) details.push(`Google rating: ${place.rating}${place.totalRatings ? ` (${place.totalRatings} ratings)` : ''}`);
    if (place.priceLabelString) details.push(`Price: ${pdfText(place.priceLabelString)}`);
    if (place.phone) details.push(`Phone: ${pdfText(place.phone)}`);
    [place.website, place.mapsUrl, place.directionsUrl].filter(Boolean).forEach(url => details.push(`Link: ${pdfText(url)}`));
    if (details.length) paragraphs.push(details.map(detail => `- ${detail}`).join('\n'));
  } else if (!isPlaceholder(item.content)) {
    const content = item.s3Key ? `https://media.altusretreats.net/${item.s3Key}` : item.content;
    paragraphs.push(item.type === 'guide' ? flattenMarkdown(content) : pdfText(content));
  }

  if (item.audiences?.length) paragraphs.unshift(`Best for: ${item.audiences.map(readableAudience).join(', ')}`);
  if (item.aiContext) paragraphs.push(`AI guidance: ${pdfText(item.aiContext)}`);
  return { title, paragraphs: paragraphs.filter(Boolean) };
}

export function buildGuidebookKnowledgeModel({ propertyId, propertyName, sections, generatedAt = new Date() }) {
  const availableSections = [...(sections || [])]
    .filter(sectionAvailableToAi)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(section => ({
      title: pdfText(section.title || section.sectionId),
      audiences: Array.isArray(section.audiences) ? section.audiences.map(readableAudience) : [],
      aiContext: section.aiContext ? pdfText(section.aiContext) : '',
      items: (section.items || []).map(itemToKnowledge).filter(item => item.title || item.paragraphs.length),
    }));

  return {
    propertyId: pdfText(propertyId),
    propertyName: pdfText(propertyName || propertyId),
    generatedAt: generatedAt instanceof Date ? generatedAt : new Date(generatedAt),
    sections: availableSections,
  };
}

export function createGuidebookKnowledgePdf(input) {
  const model = buildGuidebookKnowledgeModel(input);
  if (!model.sections.length) throw new Error('No sections are currently marked Available to AI agents.');

  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  const contentWidth = pageWidth - (margin * 2);
  const bottomLimit = pageHeight - 52;
  let y = 0;

  doc.setProperties({
    title: `${model.propertyName} - Hospitable AI Knowledge`,
    subject: 'Property guidebook knowledge for Hospitable AI',
    author: 'Altus Retreats',
    creator: 'Altus Retreats Admin',
  });

  function addPage() {
    doc.addPage();
    doc.setFillColor(...COLORS.blue);
    doc.rect(0, 0, pageWidth, 18, 'F');
    y = 48;
  }

  function ensureSpace(height) {
    if (y + height > bottomLimit) addPage();
  }

  function wrappedHeight(text, options = {}) {
    const { fontSize = 10.5, indent = 0, gapAfter = 8, lineHeight = 1.45 } = options;
    const lines = doc.splitTextToSize(pdfText(text), contentWidth - indent);
    return Math.max(fontSize * lineHeight, lines.length * fontSize * lineHeight) + gapAfter;
  }

  function addWrappedText(text, options = {}) {
    const {
      fontSize = 10.5,
      color = COLORS.ink,
      style = 'normal',
      indent = 0,
      gapAfter = 8,
      lineHeight = 1.45,
    } = options;
    const lines = doc.splitTextToSize(pdfText(text), contentWidth - indent);
    const height = wrappedHeight(text, options) - gapAfter;
    ensureSpace(height + gapAfter);
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.text(lines, margin + indent, y, { lineHeightFactor: lineHeight });
    y += height + gapAfter;
  }

  doc.setFillColor(...COLORS.blue);
  doc.rect(0, 0, pageWidth, 24, 'F');
  y = 72;
  doc.setTextColor(...COLORS.red);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('HOSPITABLE AI KNOWLEDGE', margin, y);
  y += 28;
  doc.setTextColor(...COLORS.blue);
  doc.setFontSize(24);
  doc.text(doc.splitTextToSize(model.propertyName, contentWidth), margin, y);
  y += 34;
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Property ID: ${model.propertyId}`, margin, y);
  y += 16;
  doc.text(`Generated: ${model.generatedAt.toLocaleString('en-US')}`, margin, y);
  y += 28;

  doc.setFillColor(...COLORS.mist);
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(margin, y, contentWidth, 92, 8, 8, 'FD');
  y += 22;
  addWrappedText('Instructions for Hospitable AI', { fontSize: 11, style: 'bold', color: COLORS.blue, indent: 14, gapAfter: 5 });
  addWrappedText('Use this document as property-specific context for guest questions. Prefer the guest-facing answer and use AI guidance for useful nuance. Never invent missing access codes, policies, times, prices, or local details. If information is missing or ambiguous, direct the guest to the original booking messages. Host-only notes are excluded.', { fontSize: 9.5, color: COLORS.ink, indent: 14, gapAfter: 24, lineHeight: 1.35 });

  model.sections.forEach(section => {
    ensureSpace(58);
    doc.setTextColor(...COLORS.blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(section.title, margin, y);
    y += 9;
    doc.setDrawColor(...COLORS.red);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + 42, y);
    y += 18;

    if (section.aiContext) {
      addWrappedText(`Section AI guidance: ${section.aiContext}`, { fontSize: 9.5, color: COLORS.muted, style: 'italic', gapAfter: 14 });
    }
    if (section.audiences.length) {
      addWrappedText(`Best for: ${section.audiences.join(', ')}`, { fontSize: 9.5, color: COLORS.muted, style: 'bold', gapAfter: 12 });
    }

    section.items.forEach(item => {
      const itemHeight = (item.title ? wrappedHeight(item.title, { fontSize: 11, gapAfter: 5 }) : 0)
        + item.paragraphs.reduce((total, paragraph) => {
          const isAiGuidance = paragraph.startsWith('AI guidance:');
          return total + wrappedHeight(paragraph, {
            fontSize: isAiGuidance ? 9.5 : 10.5,
            indent: paragraph.startsWith('- ') ? 8 : 0,
            gapAfter: 8,
          });
        }, 0) + 5;
      if (itemHeight < bottomLimit - 48) ensureSpace(itemHeight);
      if (item.title) addWrappedText(item.title, { fontSize: 11, style: 'bold', color: COLORS.ink, gapAfter: 5 });
      item.paragraphs.forEach(paragraph => {
        const isAiGuidance = paragraph.startsWith('AI guidance:');
        addWrappedText(paragraph, {
          fontSize: isAiGuidance ? 9.5 : 10.5,
          color: isAiGuidance ? COLORS.muted : COLORS.ink,
          style: isAiGuidance ? 'italic' : 'normal',
          indent: paragraph.startsWith('- ') ? 8 : 0,
          gapAfter: 8,
        });
      });
      y += 5;
    });
    y += 10;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.6);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${model.propertyName} - AI knowledge`, margin, pageHeight - 22);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 22, { align: 'right' });
  }

  return { doc, model };
}

export function downloadGuidebookKnowledgePdf(input) {
  const { doc, model } = createGuidebookKnowledgePdf(input);
  const safeId = model.propertyId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'property';
  const filename = `${safeId}-hospitable-ai-knowledge.pdf`;
  doc.save(filename);
  return filename;
}
