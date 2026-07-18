-- ============================================================
-- Agora — Event Sponsorship Marketplace Seed Data
-- Run in Supabase SQL Editor AFTER the cleanup command
-- All demo passwords: 1234
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- COMPANIES
-- ============================================================

INSERT INTO companies (id, name, type, industry, description, avatar_color, logo_initials, created_at) VALUES

-- Organizers (sellers) — event hosts seeking sponsorship
(
  'co-001', 'HackHub', 'seller', 'Events & Conferences',
  'Global hackathon series running 10+ events per year across major tech cities. We bring together 200–500 developers per event and offer sponsors direct access to top engineering talent through branded booths, prize pools, and keynote slots.',
  '#6366f1', 'HH', NOW()
),
(
  'co-002', 'DevConf Global', 'seller', 'Events & Conferences',
  'Annual developer conference attracting 1,200+ engineers, CTOs, and tech leads. Three days of talks, workshops, and networking. Sponsors gain category exclusivity, stage presence, and high-intent audience exposure.',
  '#3b82f6', 'DC', NOW()
),
(
  'co-003', 'Wavelength Music Festival', 'seller', 'Events & Entertainment',
  'Three-day outdoor music and arts festival with 15,000+ attendees each year. Featuring 3 stages, curated food villages, and an artist market. We offer stage naming rights, hospitality sponsorships, and brand activations across the festival grounds.',
  '#f59e0b', 'WF', NOW()
),
(
  'co-004', 'GreenSphere Summit', 'seller', 'Events & Conferences',
  'Annual sustainability and climate tech conference hosting 800 impact investors, founders, and policy makers. Sponsors receive eco-certification co-branding, keynote access, and visibility to the sustainability decision-maker community.',
  '#10b981', 'GS', NOW()
),

-- Sponsors (buyers) — companies providing sponsorship money for event exposure
(
  'co-005', 'Nexus Technologies', 'buyer', 'Technology',
  'Enterprise SaaS company building developer infrastructure tools. We sponsor hackathons and tech conferences to build brand awareness, recruit top engineering talent, and engage with our core technical audience.',
  '#8b5cf6', 'NT', NOW()
),
(
  'co-006', 'Peak Energy', 'buyer', 'Food & Beverage',
  'Fast-growing energy drink brand targeting 18–35 year olds. We sponsor music festivals, sports events, and gaming tournaments to build brand affinity through live experiences and on-site activation.',
  '#ef4444', 'PE', NOW()
),
(
  'co-007', 'Frontier Capital', 'buyer', 'Finance & Investment',
  'Early-stage venture capital firm with a $200M fund focused on B2B SaaS and deep tech. We sponsor startup and innovation events to build deal flow, meet founders early, and signal our brand to the ecosystem.',
  '#06b6d4', 'FC', NOW()
),
(
  'co-008', 'ByteForge Labs', 'buyer', 'Technology',
  'Independent game studio and developer tools company. We sponsor hackathons and developer conferences to recruit software engineers, showcase our SDKs, and build community among indie developers and game creators.',
  '#ec4899', 'BF', NOW()
);


-- ============================================================
-- USERS  (password: 1234)
-- ============================================================

INSERT INTO users (id, email, hashed_password, company_id, created_at) VALUES
(gen_random_uuid(), 'organizer@hackhub.com',      crypt('1234', gen_salt('bf', 12)), 'co-001', NOW()),
(gen_random_uuid(), 'organizer@devconf.com',       crypt('1234', gen_salt('bf', 12)), 'co-002', NOW()),
(gen_random_uuid(), 'organizer@wavelength.com',    crypt('1234', gen_salt('bf', 12)), 'co-003', NOW()),
(gen_random_uuid(), 'organizer@greensphere.com',   crypt('1234', gen_salt('bf', 12)), 'co-004', NOW()),
(gen_random_uuid(), 'sponsor@nexustech.com',       crypt('1234', gen_salt('bf', 12)), 'co-005', NOW()),
(gen_random_uuid(), 'sponsor@peakenergy.com',      crypt('1234', gen_salt('bf', 12)), 'co-006', NOW()),
(gen_random_uuid(), 'sponsor@frontiercap.com',     crypt('1234', gen_salt('bf', 12)), 'co-007', NOW()),
(gen_random_uuid(), 'sponsor@byteforgelabs.com',   crypt('1234', gen_salt('bf', 12)), 'co-008', NOW());


-- ============================================================
-- SPONSORSHIP PACKAGES (listed by organizers)
-- price_per_day = package value ÷ event duration
-- ============================================================

-- HackHub — 2-day hackathon events
INSERT INTO service_listings (id, company_id, service_type, title, description, terms_json, min_price, max_price, location, status, created_at) VALUES
(
  'lst-001', 'co-001', 'sponsorship',
  'HackHub 2026 — Title Sponsor Package',
  'Be the presenting sponsor of HackHub''s flagship 48-hour hackathon. Your brand leads all event materials, communications, and stage presence. Includes a dedicated recruiting booth, 2 judges seats, a 10-min keynote opening slot, and top billing on all digital and print assets reaching 400+ developers.',
  '{"event_duration_days": 2, "audience_size": 400, "perks": ["keynote_slot", "recruiting_booth_x2", "top_logo_placement", "social_media_feature", "judge_seats_x2"], "min_price_per_day": 4000.0, "max_price_per_day": 10000.0, "min_duration_days": 2, "max_duration_days": 2, "available_from": "2026-09-01", "notes": "Category exclusivity guaranteed — no competing developer tools sponsors"}',
  8000.0, 20000.0, 'San Francisco, CA', 'active', NOW()
),
(
  'lst-002', 'co-001', 'sponsorship',
  'HackHub 2026 — Meal & Refreshment Sponsor',
  'Feed the hackers and own the moment. Your brand is on every meal station, snack table, and coffee station across both days. Includes branded signage, cup/napkin printing, a shoutout at each meal announcement, and a product sampling table.',
  '{"event_duration_days": 2, "audience_size": 400, "perks": ["branded_food_stations", "cup_napkin_printing", "product_sampling_table", "meal_announcements"], "min_price_per_day": 750.0, "max_price_per_day": 2000.0, "min_duration_days": 2, "max_duration_days": 2, "available_from": "2026-09-01", "notes": "Food preferences: vegetarian and vegan options required"}',
  1500.0, 4000.0, 'San Francisco, CA', 'active', NOW()
),

-- DevConf Global — 3-day developer conference
(
  'lst-003', 'co-002', 'sponsorship',
  'DevConf Global — Gold Track Sponsor',
  'Own a full conference track for all three days. Your company names the track, opens and closes each day with a branded segment, and hosts a 45-min workshop session. Includes a 12sqm expo booth, logo on main stage display, and full attendee contact list (opt-in).',
  '{"event_duration_days": 3, "audience_size": 1200, "perks": ["track_naming_rights", "45min_workshop", "expo_booth_12sqm", "main_stage_logo", "attendee_contact_list_optins", "opening_closing_segments"], "min_price_per_day": 1667.0, "max_price_per_day": 5000.0, "min_duration_days": 3, "max_duration_days": 3, "available_from": "2026-10-15", "notes": "One Gold sponsor per track. Four tracks available: Backend, Frontend, DevOps, AI/ML"}',
  5000.0, 15000.0, 'Austin, TX', 'active', NOW()
),
(
  'lst-004', 'co-002', 'advertising',
  'DevConf Global — Networking Lounge Naming Rights',
  'The DevConf networking lounge is the highest-traffic area of the conference — where deals get made and careers pivot. Your brand names the space, owns the signage, and hosts a 30-min fireside chat with a speaker of your choice. Includes branded furniture wrap and barista service under your name.',
  '{"event_duration_days": 3, "audience_size": 1200, "perks": ["lounge_naming_rights", "30min_fireside_chat", "branded_signage", "furniture_wrap", "barista_service"], "min_price_per_day": 667.0, "max_price_per_day": 2000.0, "min_duration_days": 3, "max_duration_days": 3, "available_from": "2026-10-15", "notes": "Lounge is open all 3 days. Maximum 1 sponsor for exclusivity"}',
  2000.0, 6000.0, 'Austin, TX', 'active', NOW()
),

-- Wavelength Music Festival — 3-day outdoor festival
(
  'lst-005', 'co-003', 'sponsorship',
  'Wavelength Festival — Main Stage "Presented By"',
  'The highest-visibility sponsorship at Wavelength. Your brand name is in every artist introduction, every PA announcement, and all main stage video content streamed to 50,000+ online viewers. Includes on-site brand activation zone (10x10m), 2 VIP passes per night, and integration into all festival advertising.',
  '{"event_duration_days": 3, "audience_size": 15000, "online_viewers": 50000, "perks": ["stage_naming", "pa_announcements", "live_stream_integration", "brand_activation_zone_10x10m", "vip_passes_x6", "festival_advertising_integration"], "min_price_per_day": 8333.0, "max_price_per_day": 20000.0, "min_duration_days": 3, "max_duration_days": 3, "available_from": "2026-07-18", "notes": "Non-alcoholic beverage brands preferred for main stage. Alcoholic brands must provide proof of permits"}',
  25000.0, 60000.0, 'Vancouver, BC', 'active', NOW()
),
(
  'lst-006', 'co-003', 'sponsorship',
  'Wavelength Festival — Artist Hospitality Sponsor',
  'Exclusive branding inside the artist backstage and VIP hospitality suites. Your products are in every artist gift bag, your logo lives in the spaces where artists spend their off-stage time. Includes 10 VIP wristbands, custom product placement, and an artist social media post per day.',
  '{"event_duration_days": 3, "audience_size": 15000, "perks": ["backstage_branding", "artist_gift_bags", "vip_wristbands_x10", "product_placement", "artist_social_posts_x3"], "min_price_per_day": 2667.0, "max_price_per_day": 6667.0, "min_duration_days": 3, "max_duration_days": 3, "available_from": "2026-07-18", "notes": "Consumer product brands only. Content approval required before artist posts"}',
  8000.0, 20000.0, 'Vancouver, BC', 'active', NOW()
),

-- GreenSphere Summit — 2-day sustainability conference
(
  'lst-007', 'co-004', 'sponsorship',
  'GreenSphere Summit — Platinum Eco Sponsor',
  'The signature partnership tier at GreenSphere Summit. Co-brand the entire event alongside our name on all materials. Includes a 20-min keynote slot, a 6sqm exhibition booth, co-authored sustainability report inclusion, and a dedicated social campaign featuring your brand before, during, and after the event.',
  '{"event_duration_days": 2, "audience_size": 800, "perks": ["event_co_branding", "20min_keynote", "expo_booth_6sqm", "sustainability_report_feature", "social_campaign_3_weeks", "press_release_mention"], "min_price_per_day": 5000.0, "max_price_per_day": 15000.0, "min_duration_days": 2, "max_duration_days": 2, "available_from": "2026-11-05", "notes": "Sponsors must meet ESG baseline criteria. Category exclusivity included"}',
  10000.0, 30000.0, 'Toronto, ON', 'active', NOW()
),
(
  'lst-008', 'co-004', 'advertising',
  'GreenSphere Summit — Conference Swag & Bag Sponsor',
  'Every attendee carries your brand home. Your logo is on all conference bags, lanyards, water bottles, and notebook covers distributed to 800+ delegates. Includes a branded product insert in each bag and a thank-you mention during opening remarks.',
  '{"event_duration_days": 2, "audience_size": 800, "perks": ["conference_bag_branding", "lanyard_logo", "water_bottle_logo", "notebook_cover_logo", "product_insert", "opening_remarks_mention"], "min_price_per_day": 1500.0, "max_price_per_day": 4000.0, "min_duration_days": 2, "max_duration_days": 2, "available_from": "2026-11-05", "notes": "Product inserts must be eco-friendly materials only. No single-use plastics"}',
  3000.0, 8000.0, 'Toronto, ON', 'active', NOW()
);
