-- 1. Create main travel plan table
CREATE TABLE IF NOT EXISTS public.contact_travel_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    context_id uuid REFERENCES public.contexts(id) NOT NULL,
    support_phone text,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, context_id)
);

-- Enable RLS
ALTER TABLE public.contact_travel_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reading own travel plan" ON public.contact_travel_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow all for admins on travel plans" ON public.contact_travel_plans FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Flights
CREATE TABLE IF NOT EXISTS public.travel_flights (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE NOT NULL,
    type text, -- 'salida' or 'regreso'
    departure_time timestamp with time zone NOT NULL,
    arrival_time timestamp with time zone NOT NULL,
    departure_location text NOT NULL,
    arrival_location text NOT NULL,
    flight_number text,
    airline text,
    booking_reference text,
    seat text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.travel_flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reading own flights" ON public.travel_flights FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contact_travel_plans WHERE id = travel_flights.plan_id AND user_id = auth.uid())
);
CREATE POLICY "Allow all for admins on flights" ON public.travel_flights FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Hotels
CREATE TABLE IF NOT EXISTS public.travel_hotels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE NOT NULL,
    check_in timestamp with time zone NOT NULL,
    check_out timestamp with time zone NOT NULL,
    hotel_name text NOT NULL,
    address text,
    booking_reference text,
    room_type text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.travel_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reading own hotels" ON public.travel_hotels FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contact_travel_plans WHERE id = travel_hotels.plan_id AND user_id = auth.uid())
);
CREATE POLICY "Allow all for admins on hotels" ON public.travel_hotels FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Transfers
CREATE TABLE IF NOT EXISTS public.travel_transfers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE NOT NULL,
    pickup_time timestamp with time zone NOT NULL,
    pickup_location text NOT NULL,
    dropoff_location text NOT NULL,
    driver_name text,
    driver_phone text,
    vehicle_info text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.travel_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reading own transfers" ON public.travel_transfers FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contact_travel_plans WHERE id = travel_transfers.plan_id AND user_id = auth.uid())
);
CREATE POLICY "Allow all for admins on transfers" ON public.travel_transfers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Restaurants
CREATE TABLE IF NOT EXISTS public.travel_restaurants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE NOT NULL,
    reservation_time timestamp with time zone NOT NULL,
    restaurant_name text NOT NULL,
    address text,
    reservation_name text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.travel_restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reading own restaurants" ON public.travel_restaurants FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contact_travel_plans WHERE id = travel_restaurants.plan_id AND user_id = auth.uid())
);
CREATE POLICY "Allow all for admins on restaurants" ON public.travel_restaurants FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Documents
CREATE TABLE IF NOT EXISTS public.travel_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.contact_travel_plans(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    file_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.travel_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow reading own documents" ON public.travel_documents FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contact_travel_plans WHERE id = travel_documents.plan_id AND user_id = auth.uid())
);
CREATE POLICY "Allow all for admins on documents" ON public.travel_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
