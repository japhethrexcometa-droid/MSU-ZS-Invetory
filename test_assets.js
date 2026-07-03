require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('assets')
    .select('*, category:category_id(id, name, slug), location:location_id(id, building, room), assigned_officer:assigned_officer_id(id, first_name, last_name)')
    .eq('is_deleted', false)
    .limit(1);
    
  console.log('Error:', error);
}
test();
