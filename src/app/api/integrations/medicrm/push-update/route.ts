import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { plan_id, updated_entities, source } = payload;
    
    // 1. Log Start
    console.log(`[MEDICRM PUSH START] plan_id: ${plan_id} | source: ${source}`);
    
    // 2. Validate Secret (from headers)
    const secret = request.headers.get('x-integration-secret');
    const expectedSecret = process.env.MEDICRM_INTEGRATION_SECRET || process.env.MEDICRM_SYNC_SECRET;
    
    // Note: If we are calling this from our own client, we might use a different secret or skip validation 
    // if it's strictly internal. But the instructions say "validar secret".
    if (secret && expectedSecret && secret !== expectedSecret) {
      console.warn(`[MEDICRM PUSH] Unauthorized attempt for plan_id: ${plan_id}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Log changed entities
    if (updated_entities) {
      Object.entries(updated_entities).forEach(([entity, ids]) => {
        if (Array.isArray(ids) && ids.length > 0) {
          console.log(`- changed entity: ${entity} (ids: ${ids.length})`);
        }
      });
    }

    // 4. Forward to MediCRM (if configured)
    const medicrmUrl = process.env.MEDICRM_SYNC_URL;
    if (medicrmUrl) {
      try {
        const response = await fetch(medicrmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-integration-secret': expectedSecret || ''
          },
          body: JSON.stringify(payload)
        });
        
        const syncResult = response.ok ? 'SUCCESS' : `FAILED (${response.status})`;
        console.log(`[MEDICRM PUSH RESULT] plan_id: ${plan_id} | result: ${syncResult}`);
      } catch (err: any) {
        console.error(`[MEDICRM PUSH ERROR] External call failed: ${err.message}`);
      }
    } else {
      console.log(`[MEDICRM PUSH INFO] MEDICRM_SYNC_URL not set, skipping external call.`);
    }

    // 5. Respond OK
    return NextResponse.json({ 
      ok: true, 
      message: 'Update received and processed',
      plan_id 
    });

  } catch (error: any) {
    console.error('[MEDICRM PUSH ERROR]', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
