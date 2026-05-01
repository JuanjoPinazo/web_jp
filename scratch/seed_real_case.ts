import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedRealCase() {
  console.log('🚀 Iniciando creación de caso real end-to-end...');

  // 1. Crear Hospital
  const { data: hospital } = await supabase
    .from('hospitals')
    .upsert({ name: 'HMD General Albacete', location: 'Albacete, España' }, { onConflict: 'name' })
    .select()
    .single();
  console.log('✔ Hospital creado:', hospital?.name);

  // 2. Crear Cliente
  const { data: client } = await supabase
    .from('clients')
    .upsert({ name: 'HMD General Albacete', hospital_id: hospital?.id }, { onConflict: 'name' })
    .select()
    .single();
  console.log('✔ Cliente asociado:', client?.name);

  // 3. Crear Evento (EuroPCR 2026)
  const { data: context } = await supabase
    .from('contexts')
    .upsert({ 
      name: 'EuroPCR 2026', 
      type: 'PCL', 
      location: 'Paris, Palais des Congrès',
      start_date: '2026-05-19',
      end_date: '2026-05-22',
      description: 'The world leading course in interventional cardiovascular medicine.'
    }, { onConflict: 'name' })
    .select()
    .single();
  console.log('✔ Evento creado:', context?.name);

  // 4. Vincular Cliente al Evento
  await supabase.from('context_clients').upsert({ context_id: context?.id, client_id: client?.id });
  console.log('✔ Cliente vinculado al evento.');

  // 5. Vincular Usuario al Evento
  const userId = '4d4061f8-baee-4547-8002-bc4b945c1aae'; // juanjopinazo2@gmail.com
  await supabase.from('context_users').upsert({ context_id: context?.id, user_id: userId });
  console.log('✔ Usuario vinculado al evento.');

  // 6. Crear Plan Logístico
  const { data: plan } = await supabase
    .from('contact_travel_plans')
    .upsert({ 
      user_id: userId, 
      context_id: context?.id,
      status: 'confirmed'
    })
    .select()
    .single();
  console.log('✔ Plan logístico base creado.');

  // 7. Añadir Hotel
  await supabase.from('travel_accommodation').upsert({
    plan_id: plan?.id,
    hotel_name: 'Hotel Napoleon Paris',
    address: '40 Av. de Friedland, 75008 Paris',
    check_in: '2026-05-19',
    check_out: '2026-05-22',
    confirmation_code: 'NP-2026-PCR',
    notes: 'Habitación Executive con vistas al Arco del Triunfo.'
  });
  console.log('✔ Hotel Napoleon asignado.');

  // 8. Añadir Transfer
  await supabase.from('travel_transfers').upsert({
    plan_id: plan?.id,
    type: 'pickup',
    pickup_location: 'Charles de Gaulle Airport (CDG)',
    dropoff_location: 'Hotel Napoleon Paris',
    pickup_time: '2026-05-19 14:30:00',
    driver_name: 'Jean-Pierre',
    driver_phone: '+33 1 23 45 67 89',
    notes: 'El chófer esperará con cartel de JP Intelligence.'
  });
  console.log('✔ Transfer Aeropuerto -> Hotel configurado.');

  console.log('\n✨ CASO REAL COMPLETADO CON ÉXITO ✨');
  console.log('Ya puedes entrar al Dashboard con juanjopinazo2@gmail.com para validar.');
}

seedRealCase();
