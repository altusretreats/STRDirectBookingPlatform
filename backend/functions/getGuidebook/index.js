const db = require('/opt/nodejs/lib/db');
const { ok, notFound, serverError } = require('/opt/nodejs/lib/response');

const MEDIA_BASE = 'https://media.altusretreats.net/';

function sanitizeItem(item = {}) {
  const { aiContext, hostNotes, ...guestItem } = item;
  return guestItem;
}

function sanitizeSection(section = {}) {
  return {
    sectionId: section.sectionId,
    title: section.title,
    icon: section.icon ?? null,
    order: section.order,
    sectionType: section.sectionType ?? 'general',
    items: (section.items ?? []).map(sanitizeItem),
  };
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function isPlaceholder(value) {
  return !value || /REPLACE_ME|coming soon|add your/i.test(String(value));
}

function markdownLink(label, url) {
  const safeUrl = cleanText(url).replace(/[<>\s]/g, encodeURIComponent);
  return safeUrl ? `[${cleanText(label).replace(/[\[\]]/g, '')}](${safeUrl})` : '';
}

function itemMarkdown(item = {}) {
  const lines = [];
  const place = item.place || {};
  const label = cleanText(place.name || item.label || 'Guidebook item');

  lines.push(`### ${label}`);

  if (item.type === 'place') {
    if (item.description && !isPlaceholder(item.description)) lines.push('', cleanText(item.description));

    const details = [];
    if (place.category) details.push(`Category: ${cleanText(place.category)}`);
    if (place.address) details.push(`Address: ${cleanText(place.address)}`);
    if (place.distanceMiles != null) details.push(`Distance: ${place.distanceMiles} miles`);
    if (place.travelMinutes != null) details.push(`Estimated drive: ${place.travelMinutes} minutes`);
    if (place.rating != null) details.push(`Google rating: ${place.rating}${place.totalRatings ? ` (${place.totalRatings} ratings)` : ''}`);
    if (place.priceLabelString) details.push(`Price: ${cleanText(place.priceLabelString)}`);
    if (place.phone) details.push(`Phone: ${cleanText(place.phone)}`);
    details.forEach(detail => lines.push(`- ${detail}`));

    const website = markdownLink('Website', place.website);
    const maps = markdownLink('Google Maps', place.mapsUrl);
    const directions = markdownLink('Directions', place.directionsUrl);
    const links = [website, maps, directions].filter(Boolean);
    if (links.length) lines.push(`- Links: ${links.join(' · ')}`);
  } else if (!isPlaceholder(item.content)) {
    if (['link', 'map', 'image', 'video'].includes(item.type)) {
      const url = item.s3Key ? `${MEDIA_BASE}${item.s3Key}` : item.content;
      const link = markdownLink(item.type === 'map' ? 'Open map' : label, url);
      if (link) lines.push('', link);
    } else {
      lines.push('', cleanText(item.content));
    }
  }

  if (item.aiContext) lines.push('', `**AI guidance:** ${cleanText(item.aiContext)}`);
  return lines.join('\n');
}

function sectionAvailableToAgents(section = {}) {
  // Published sections remain available during migration until an admin makes
  // an explicit AI availability choice and saves the section.
  return section.aiPublished ?? section.published ?? false;
}

function buildAgentMarkdown(property, propertyId, sections) {
  const availableSections = sections.filter(sectionAvailableToAgents);
  const latestUpdate = availableSections
    .map(section => section.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const lines = [
    `# ${cleanText(property.name || propertyId)} — AI Guest Guide Context`,
    '',
    `Canonical property ID: \`${cleanText(propertyId)}\``,
    ...(latestUpdate ? [`Guidebook last updated: ${cleanText(latestUpdate)}`] : []),
    '',
    '## Instructions for AI agents',
    '',
    '- Use this guide as the property-specific source for guest questions.',
    '- Prefer the guest-facing answer first; use **AI guidance** to add useful nuance.',
    '- Never invent missing access codes, policies, times, prices, or local details.',
    '- If information is missing or ambiguous, direct the guest to their booking messages or host.',
    '- Host-only operational notes are intentionally excluded from this feed.',
  ];

  if (!availableSections.length) {
    lines.push('', '## No agent content is currently available');
  }

  availableSections.forEach(section => {
    lines.push('', `## ${cleanText(section.title || section.sectionId)}`);
    if (section.aiContext) lines.push('', `**Section AI guidance:** ${cleanText(section.aiContext)}`);

    const items = (section.items || []).map(itemMarkdown).filter(Boolean);
    if (items.length) lines.push('', items.join('\n\n'));
  });

  return `${lines.join('\n').trim()}\n`;
}

function markdownResponse(body) {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
    body,
  };
}

exports.handler = async (event) => {
  try {
    const { propertyId } = event.pathParameters;
    const route = event.resource || event.path || '';
    const isAgentFeed = route.endsWith('/agent-context');

    const { Item: property } = await db.get({
      PK: `PROPERTY#${propertyId}`,
      SK: 'METADATA',
    });
    if (!property || !property.active) return notFound(`Property not found: ${propertyId}`);

    const query = {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `PROPERTY#${propertyId}`,
        ':prefix': 'GUIDEBOOK#SECTION#',
      },
    };

    if (!isAgentFeed) {
      query.FilterExpression = 'published = :true';
      query.ExpressionAttributeValues[':true'] = true;
    }

    const { Items: sections } = await db.query(query);

    if (isAgentFeed) {
      return markdownResponse(buildAgentMarkdown(property, propertyId, sections ?? []));
    }

    return ok({
      propertyId,
      propertyName: property.name,
      branding: property.branding,
      sections: (sections ?? []).map(sanitizeSection),
    });
  } catch (err) {
    return serverError(err);
  }
};

exports._test = { buildAgentMarkdown, sectionAvailableToAgents };
