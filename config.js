// Fill these in from your Supabase project: Settings → API
// The anon key is safe to expose in client-side code — RLS policies
// in schema.sql are what actually protect the data.
const SUPABASE_URL = "https://oxcefktkqqjxmekuyvwd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2Vma3RrcXFqeG1la3V5dndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NjIzNDEsImV4cCI6MjEwMzUzODM0MX0.lWow49DWsohal4v-MOZ6oqWXhUxsm5kMK2Ol5YNAaew";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
