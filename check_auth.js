const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://skmcljcolcpqkmjjppdk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbWNsamNvbGNwcWttampwcGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTQ0MzEsImV4cCI6MjA4OTQ5MDQzMX0.n0mP28rEXMlrJj8o1ivR_nvQ928I9-nSSspwWACUdgc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
    
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles Found:', data?.length || 0);
    const userProfile = data?.find(p => p.email === 'juanjopinazo@gmail.com');
    if (userProfile) {
      console.log('User Profile:', userProfile);
    } else {
      console.log('User "juanjopinazo@gmail.com" not found in profiles table.');
      console.log('Available emails:', data?.map(p => p.email));
    }
  }
}

checkProfiles();
