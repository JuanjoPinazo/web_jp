import { POST as syncLogistics } from '../sync-logistics/route';

/**
 * LEGACY INTEGRATION ENDPOINT: MediCRM -> JP Intelligence Travel Plan
 * Now redirects to the new unified sync-logistics endpoint.
 */
export async function POST(request: Request) {
  console.log('--- MediCRM Travel Plan (Legacy) -> Redirecting to Sync Logistics ---');
  return syncLogistics(request);
}

