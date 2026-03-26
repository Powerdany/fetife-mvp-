import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wymxvpwaygxkjnfqoncm.supabase.co'
const supabaseKey = 'sb_publishable_XBD0n2h6w4LnU0-mSYCKcw_kLbnv03z'

export const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase

