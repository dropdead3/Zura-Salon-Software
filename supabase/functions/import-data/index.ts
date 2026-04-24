import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  template_id?: string;
  source_type: string;
  entity_type: 'clients' | 'appointments' | 'services' | 'staff' | 'locations' | 'products';
  location_id?: string;
  organization_id?: string;
  data: Record<string, any>[];
  column_mappings?: Record<string, string>;
  dry_run?: boolean; // Validate only, don't insert data
}

interface ColumnMapping {
  source: string;
  target: string;
  required?: boolean;
  transform?: string;
}

function transformValue(value: any, transform?: string): any {
  if (value === null || value === undefined || value === '') return null;
  
  switch (transform) {
    case 'integer':
      return parseInt(value, 10) || 0;
    case 'decimal':
      return parseFloat(value) || 0;
    case 'boolean':
      return value === 'true' || value === '1' || value === true;
    case 'date':
      // Try to parse various date formats
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    case 'time':
      // Ensure time is in HH:MM:SS format
      if (typeof value === 'string' && value.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        const parts = value.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2] || '00'}`;
      }
      return value;
    default:
      return value;
  }
}

function mapRow(row: Record<string, any>, mappings: ColumnMapping[]): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  for (const mapping of mappings) {
    const sourceValue = row[mapping.source];
    mapped[mapping.target] = transformValue(sourceValue, mapping.transform);
  }
  
  return mapped;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Get auth user — REQUIRED
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId: string = authUser.id;

    const importData: ImportRequest = await req.json();
    const { template_id, source_type, entity_type, location_id, organization_id, data, column_mappings, dry_run } = importData;
    
    // Verify caller is admin of the target org
    if (organization_id) {
      const { data: isAdmin } = await supabase.rpc('is_org_admin', { _user_id: authUser.id, _org_id: organization_id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: must be org admin to import data' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Determine target table for entity type (staff goes to imported_staff staging table)
    const targetTable = entity_type === 'staff' ? 'imported_staff' : entity_type;

    if (!entity_type || !data || !Array.isArray(data) || data.length === 0) {
      throw new Error("Missing required fields: entity_type, data (non-empty array)");
    }

    console.log(`Starting import: ${entity_type} from ${source_type}, ${data.length} rows`);

    // Get column mappings from template or request
    let mappings: ColumnMapping[] = [];
    
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('import_templates')
        .select('column_mappings')
        .eq('id', template_id)
        .single();
      
      if (templateError) throw new Error('Template not found');
      mappings = template.column_mappings as ColumnMapping[];
    } else if (column_mappings) {
      // Convert simple key-value mappings to ColumnMapping format
      mappings = Object.entries(column_mappings).map(([source, target]) => ({
        source,
        target: target as string,
      }));
    } else {
      throw new Error("Either template_id or column_mappings is required");
    }

    // Create import job record
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        template_id,
        source_type: source_type || 'generic',
        entity_type,
        location_id,
        total_rows: data.length,
        status: dry_run ? 'dry_run' : 'processing',
        started_at: new Date().toISOString(),
        created_by: userId,
        is_dry_run: dry_run || false,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create job record:", jobError);
      throw new Error("Failed to create import job");
    }

    const jobId = job.id;
    const errors: any[] = [];
    const warnings: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      try {
        const mapped = mapRow(row, mappings);

        // Add import tracking fields
        mapped.external_id = mapped.external_id || null;
        mapped.import_source = source_type || 'csv';
        mapped.imported_at = new Date().toISOString();
        mapped.import_job_id = jobId; // Link record to job for rollback

        // Add organization if provided
        if (organization_id) {
          mapped.organization_id = organization_id;
        }

        // Add location if provided
        if (location_id && entity_type !== 'services') {
          mapped.location_id = location_id;
        }

        // Validate required fields based on entity type
        let isValid = true;
        let validationError = '';

        switch (entity_type) {
          case 'clients':
            if (!mapped.first_name && !mapped.last_name) {
              isValid = false;
              validationError = 'Missing first_name and last_name';
            }
            break;
          case 'services':
            if (!mapped.name) {
              isValid = false;
              validationError = 'Missing service name';
            }
            if (!mapped.duration_minutes) {
              mapped.duration_minutes = 60; // Default duration
              warnings.push({ row: rowNum, message: 'Duration not specified, defaulting to 60 minutes' });
            }
            break;
          case 'appointments':
            if (!mapped.appointment_date || !mapped.start_time || !mapped.end_time) {
              isValid = false;
              validationError = 'Missing date or time fields';
            }
            break;
          case 'staff':
            if (!mapped.full_name) {
              isValid = false;
              validationError = 'Missing staff full_name';
            }
            // Staff imports go to imported_staff staging table
            break;
          case 'locations':
            if (!mapped.name || !mapped.address || !mapped.city || !mapped.phone) {
              isValid = false;
              validationError = 'Missing required location fields (name, address, city, phone)';
            }
            // Generate ID if not provided
            if (!mapped.id) {
              mapped.id = crypto.randomUUID();
            }
            break;
          case 'products':
            if (!mapped.name) {
              isValid = false;
              validationError = 'Missing product name';
            }
            break;
        }

        if (!isValid) {
          errors.push({ row: rowNum, error: validationError, data: row });
          errorCount++;
          continue;
        }

        // For dry run, just validate without inserting
        if (dry_run) {
          successCount++;
          continue;
        }

        // For products: upsert — update pricing if duplicate, insert if new
        if (entity_type === 'products' && mapped.organization_id && mapped.brand && mapped.name) {
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('organization_id', mapped.organization_id)
            .eq('is_active', true)
            .ilike('brand', mapped.brand)
            .ilike('name', mapped.name)
            .limit(1)
            .maybeSingle();

          if (existingProduct) {
            // Update pricing fields only
            const pricingUpdate: Record<string, any> = { updated_at: new Date().toISOString() };
            if (mapped.retail_price != null) pricingUpdate.retail_price = mapped.retail_price;
            if (mapped.cost_price != null) pricingUpdate.cost_price = mapped.cost_price;
            if (mapped.sku) pricingUpdate.sku = mapped.sku;
            if (mapped.barcode) pricingUpdate.barcode = mapped.barcode;

            const { error: updateError } = await supabase
              .from('products')
              .update(pricingUpdate)
              .eq('id', existingProduct.id);

            if (updateError) throw updateError;
            skipCount++;
            warnings.push({ row: rowNum, message: 'Existing product — pricing updated' });
            continue;
          }
        }

        // Insert into appropriate table
        const { error: insertError } = await supabase
          .from(targetTable)
          .insert(mapped);

        if (insertError) {
          // Check for duplicate
          if (insertError.code === '23505') {
            skipCount++;
            warnings.push({ row: rowNum, message: 'Duplicate record skipped' });
          } else {
            throw insertError;
          }
        } else {
          successCount++;
        }
      } catch (rowError: any) {
        errors.push({ row: rowNum, error: rowError.message, data: row });
        errorCount++;
      }

      // Update progress every 50 rows
      if (i % 50 === 0) {
        await supabase
          .from('import_jobs')
          .update({
            processed_rows: i + 1,
            success_count: successCount,
            error_count: errorCount,
            skip_count: skipCount,
          })
          .eq('id', jobId);
      }
    }

    // Determine final status
    let finalStatus = 'completed';
    if (dry_run) {
      finalStatus = 'dry_run';
    } else if (errorCount > 0 && successCount === 0) {
      finalStatus = 'failed';
    }

    // Update job with final results
    await supabase
      .from('import_jobs')
      .update({
        status: finalStatus,
        processed_rows: data.length,
        success_count: successCount,
        error_count: errorCount,
        skip_count: skipCount,
        errors,
        warnings,
        completed_at: new Date().toISOString(),
        summary: {
          total: data.length,
          imported: dry_run ? 0 : successCount,
          would_import: dry_run ? successCount : undefined,
          skipped: skipCount,
          failed: errorCount,
          is_dry_run: dry_run || false,
        },
      })
      .eq('id', jobId);

    console.log(`Import ${dry_run ? '(dry run) ' : ''}completed: ${successCount} ${dry_run ? 'validated' : 'success'}, ${errorCount} errors, ${skipCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        dry_run: dry_run || false,
        summary: {
          total: data.length,
          imported: dry_run ? 0 : successCount,
          would_import: dry_run ? successCount : undefined,
          skipped: skipCount,
          failed: errorCount,
        },
        errors: errors.slice(0, 10), // Return first 10 errors
        warnings: warnings.slice(0, 10),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
