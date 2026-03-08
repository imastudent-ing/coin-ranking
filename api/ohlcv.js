export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  const { addr, mc } = req.query;
  if (!addr) return res.status(400).json({ error: 'addr required' });

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    if (mc) {
      const newMC = parseFloat(mc);
      const getRes = await fetch(
        `${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${addr}&select=max_mc`,
        { headers }
      );
      const rows = await getRes.json();
      const currentMax = parseFloat(rows?.[0]?.max_mc) || 0;

      if (newMC > currentMax) {
        await fetch(`${SUPABASE_URL}/rest/v1/max_mc`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ addr, max_mc: newMC, updated_at: new Date().toISOString() })
        });
        return res.json({ maxMC: newMC, updated: true });
      }
      return res.json({ maxMC: currentMax, updated: false });
    }

    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${addr}&select=max_mc`,
      { headers }
    );
    const rows = await getRes.json();
    return res.json({ maxMC: parseFloat(rows?.[0]?.max_mc) || 0 });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
