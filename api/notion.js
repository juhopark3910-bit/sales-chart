export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const DATABASE_ID = '34b2551e4b4b8016b8c1e89fa0e9ceb9';
  const NOTION_API_KEY = process.env.NOTION_API_KEY;

  try {
    let allResults = [], hasMore = true, startCursor;

    while (hasMore) {
      const body = { page_size: 100 };
      if (startCursor) body.start_cursor = startCursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Notion API 오류: ${response.status}`);
      }

      const data = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    const MONTH_KEYS = ['26년 1월','26년 2월','26년 3월','26년 4월','26년 5월','26년 6월','26년 7월','26년 8월','26년 9월','26년 10월','26년 11월','26년 12월'];
    const parsed = {};

    for (const page of allResults) {
      const props = page.properties;
      const nameArr = props['거래처명']?.title || props['Name']?.title || [];
      const name = nameArr.map(t => t.plain_text).join('').trim();
      if (!name) continue;

      parsed[name] = MONTH_KEYS.map(key => {
        const prop = props[key];
        if (!prop) return 0;
        if (prop.type === 'number') return prop.number || 0;
        if (prop.type === 'rich_text') {
          const txt = prop.rich_text?.map(t => t.plain_text).join('').replace(/,/g, '').trim();
          return (txt === '-' || txt === '') ? 0 : parseInt(txt) || 0;
        }
        return 0;
      });
    }

    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
