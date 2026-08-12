'use strict';
const { mockDdb, makeEvent, makeContext, SAMPLE_PROPERTY } = require('./mocks');

describe('getGuidebook', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'altus-retreats-test';
    process.env.ENVIRONMENT = 'test';
    handler = require('../functions/getGuidebook/index').handler;
  });

  const SAMPLE_SECTIONS = [
    {
      PK: 'PROPERTY#kentucky',
      SK: 'GUIDEBOOK#SECTION#010#welcome',
      sectionId: 'welcome',
      title: 'Welcome',
      published: true,
      aiContext: 'Use this when greeting a guest.',
      items: [{ itemId: 'welcome-message', type: 'text', content: 'Welcome!', aiContext: 'Be warm.', hostNotes: 'Private note.' }],
    },
    { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#020#checkin', sectionId: 'checkin', title: 'Check-In', published: true, items: [] },
    { PK: 'PROPERTY#kentucky', SK: 'GUIDEBOOK#SECTION#030#rules', sectionId: 'rules', title: 'House Rules', published: false, items: [] },
  ];

  test('returns 200 with published sections only', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: SAMPLE_PROPERTY });
    mockDdb.query.mockResolvedValueOnce({ Items: SAMPLE_SECTIONS.filter(s => s.published) });

    const event = makeEvent({ pathParameters: { propertyId: 'kentucky' } });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.sections).toHaveLength(2);
    expect(body.propertyId).toBe('kentucky');
    expect(body.sections[0]).not.toHaveProperty('PK');
    expect(body.sections[0]).not.toHaveProperty('SK');
    expect(body.sections[0]).not.toHaveProperty('published');
    expect(body.sections[0]).not.toHaveProperty('aiContext');
    expect(body.sections[0].items[0]).not.toHaveProperty('aiContext');
    expect(body.sections[0].items[0]).not.toHaveProperty('hostNotes');
    expect(body.sections[0].items[0]).toMatchObject({ content: 'Welcome!', type: 'text' });
  });

  test('returns empty sections array when no content exists', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: SAMPLE_PROPERTY });
    mockDdb.query.mockResolvedValueOnce({ Items: [] });

    const event = makeEvent({ pathParameters: { propertyId: 'kentucky' } });
    const result = await handler(event, makeContext());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).sections).toEqual([]);
  });

  test('returns 404 for unknown property', async () => {
    mockDdb.get.mockResolvedValueOnce({ Item: null });
    const event = makeEvent({ pathParameters: { propertyId: 'nowhere' } });
    const result = await handler(event, makeContext());
    expect(result.statusCode).toBe(404);
  });
});
