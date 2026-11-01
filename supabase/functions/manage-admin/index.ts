import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createManageAdminHandler } from './handler.ts'

Deno.serve(createManageAdminHandler(createClient))
