import { createClient } from '@supabase/supabase-js';

// Gunakan ANON key untuk read — data publik
function getSBPublic() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}
// Service role untuk write (like/view)
function getSBService() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  // Cache header untuk performa
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

  if (req.method === 'GET') {
    const sb = getSBPublic();
    const { data, error } = await sb
      .from('snippets')
      .select('id,created_at,author,title,description,language,tags,code,likes,views')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { action, id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID required' });

    const sb = getSBService();

    if (action === 'view') {
      // Increment views
      const { data } = await sb.from('snippets').select('views').eq('id', id).single();
      if (!data) return res.status(404).json({ error: 'Not found' });
      await sb.from('snippets').update({ views: (data.views||0) + 1 }).eq('id', id);
      return res.status(200).json({ views: (data.views||0) + 1 });
    }

    if (action === 'like' || action === 'unlike') {
      const { data } = await sb.from('snippets').select('likes').eq('id', id).single();
      if (!data) return res.status(404).json({ error: 'Not found' });
      const newLikes = Math.max(0, (data.likes||0) + (action === 'like' ? 1 : -1));
      await sb.from('snippets').update({ likes: newLikes }).eq('id', id);
      return res.status(200).json({ likes: newLikes });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
