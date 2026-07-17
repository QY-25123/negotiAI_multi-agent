-- ============================================================
-- NegotiAI Seed Data
-- Run in Supabase SQL Editor
-- All passwords: 1234
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- COMPANIES
-- ============================================================

INSERT INTO companies (id, name, type, industry, description, avatar_color, logo_initials, created_at) VALUES

-- Sellers
('co-001', 'The Daily Grind Café',  'seller', 'Food & Beverage',       'A cozy neighborhood café with high foot traffic. We offer premium advertising spaces including window displays and counter banners.',                           '#f59e0b', 'DG', NOW()),
('co-002', 'Urban Roast Coffee',    'seller', 'Food & Beverage',       'Artisan coffee roastery with 3 downtown locations. Monetize your brand through our in-store digital screens and loyalty app banners.',                         '#f97316', 'UR', NOW()),
('co-003', 'TempForce Staffing',    'seller', 'HR & Staffing',         'Premium event staffing agency providing trained professionals for conferences, product launches, and festivals.',                                               '#10b981', 'TF', NOW()),
('co-004', 'LocalBoost Fund',       'seller', 'Finance & Investment',  'Community investment fund offering sponsorship capital to local events and businesses in exchange for co-branding and promotional rights.',                      '#8b5cf6', 'LB', NOW()),

-- Buyers
('co-005', 'BrightReach Media',     'buyer',  'Marketing & Advertising', 'Full-service digital and physical advertising agency helping brands reach local audiences through targeted out-of-home placements.',                          '#6366f1', 'BR', NOW()),
('co-006', 'Momentum Agency',       'buyer',  'Marketing & Advertising', 'Growth marketing agency specialising in experiential and out-of-home advertising campaigns for consumer brands.',                                             '#06b6d4', 'MA', NOW()),
('co-007', 'TechVenture Summit',    'buyer',  'Events & Conferences',  'Annual technology conference connecting 500+ startup founders with investors. We hire event staff and seek sponsorship partners every year.',                    '#3b82f6', 'TV', NOW()),
('co-008', 'Saveur Food Festival',  'buyer',  'Events & Entertainment', 'Award-winning 3-day outdoor food and wine festival attracting 10,000+ attendees annually. We seek sponsorship and event staffing partners.',                  '#ef4444', 'SF', NOW());


-- ============================================================
-- USERS  (password: 1234)
-- ============================================================

INSERT INTO users (id, email, hashed_password, company_id, created_at) VALUES
(gen_random_uuid(), 'dailygrind@negotiai.com',  crypt('1234', gen_salt('bf', 12)), 'co-001', NOW()),
(gen_random_uuid(), 'urbanroast@negotiai.com',  crypt('1234', gen_salt('bf', 12)), 'co-002', NOW()),
(gen_random_uuid(), 'tempforce@negotiai.com',   crypt('1234', gen_salt('bf', 12)), 'co-003', NOW()),
(gen_random_uuid(), 'localboost@negotiai.com',  crypt('1234', gen_salt('bf', 12)), 'co-004', NOW()),
(gen_random_uuid(), 'brightreach@negotiai.com', crypt('1234', gen_salt('bf', 12)), 'co-005', NOW()),
(gen_random_uuid(), 'momentum@negotiai.com',    crypt('1234', gen_salt('bf', 12)), 'co-006', NOW()),
(gen_random_uuid(), 'techventure@negotiai.com', crypt('1234', gen_salt('bf', 12)), 'co-007', NOW()),
(gen_random_uuid(), 'saveur@negotiai.com',      crypt('1234', gen_salt('bf', 12)), 'co-008', NOW());


-- ============================================================
-- SERVICE LISTINGS
-- ============================================================

-- The Daily Grind Café — Advertising
INSERT INTO service_listings (id, company_id, service_type, title, description, terms_json, min_price, max_price, location, status, created_at) VALUES
(
  'lst-001', 'co-001', 'advertising',
  'Window Display — Prime Corner Spot',
  'Our most visible location: a large front window facing a busy intersection. Seen by 500+ daily passersby. Perfect for digital screens or backlit posters.',
  '{"available_formats": ["static_poster", "digital_screen"], "min_price_per_day": 45.0, "max_price_per_day": 72.0, "min_duration_days": 7, "max_duration_days": 90, "available_from": "2026-07-07", "notes": "Content must be family-friendly and locally relevant"}',
  45.0, 72.0, '123 Main St, Front Window', 'active', NOW()
),
(
  'lst-002', 'co-001', 'advertising',
  'Counter Banner — Order Point',
  'Eye-level banner at the main ordering counter. Every customer reads it while waiting — guaranteed impressions with every coffee order.',
  '{"available_formats": ["static_poster"], "min_price_per_day": 20.0, "max_price_per_day": 32.0, "min_duration_days": 7, "max_duration_days": 60, "available_from": "2026-07-07", "notes": "Static posters only, no flashing imagery"}',
  20.0, 32.0, '123 Main St, Counter', 'active', NOW()
),

-- Urban Roast Coffee — Advertising
(
  'lst-003', 'co-002', 'advertising',
  'Loyalty App Banner — 8,000 Active Members',
  'Prime placement in our loyalty app home screen and order confirmation page. Reaches 8,000 engaged daily users.',
  '{"available_formats": ["digital_banner"], "min_price_per_day": 35.0, "max_price_per_day": 56.0, "min_duration_days": 14, "max_duration_days": 60, "available_from": "2026-07-07", "notes": "Digital banner ads only, 300x250px format"}',
  35.0, 56.0, 'Urban Roast Mobile App', 'active', NOW()
),
(
  'lst-004', 'co-002', 'advertising',
  'In-Store Digital Screen Network — 3 Locations',
  'Rotating ads on 6 screens across 3 downtown locations. 15-second slots in a 5-ad rotation targeting high-income urban professionals.',
  '{"available_formats": ["digital_screen"], "min_price_per_day": 55.0, "max_price_per_day": 88.0, "min_duration_days": 14, "max_duration_days": 90, "available_from": "2026-07-07", "notes": "15-second video or static ads, 1920x1080px"}',
  55.0, 88.0, '3 Downtown Locations', 'active', NOW()
),

-- TempForce Staffing — Staffing
(
  'lst-005', 'co-003', 'staffing',
  'Conference & Event Staff Package',
  'Trained event professionals: registration hosts, floor assistants, A/V support, and brand ambassadors. Available for multi-day engagements with full briefing included.',
  '{"staff_roles": ["registration_host", "floor_assistant", "av_support", "brand_ambassador"], "min_price_per_day": 150.0, "max_price_per_day": 220.0, "min_duration_days": 1, "max_duration_days": 7, "available_from": "2026-07-07", "notes": "Minimum 5 staff per booking, 14-day advance notice required"}',
  750.0, 7500.0, 'On-site (your venue)', 'active', NOW()
),
(
  'lst-006', 'co-003', 'staffing',
  'Festival Ground Crew',
  'Energetic trained ground crew for outdoor festivals: setup teams, crowd management, vendor liaison, and information staff for large-scale events.',
  '{"staff_roles": ["setup_crew", "crowd_management", "vendor_liaison", "info_staff"], "min_price_per_day": 120.0, "max_price_per_day": 180.0, "min_duration_days": 2, "max_duration_days": 5, "available_from": "2026-07-07", "notes": "Minimum 10 staff per booking"}',
  1200.0, 9000.0, 'On-site (your venue)', 'active', NOW()
),

-- LocalBoost Fund — Sponsorship
(
  'lst-007', 'co-004', 'sponsorship',
  'Community Event Sponsorship Fund',
  'Investment capital for local community events. Co-branding opportunities, promotional rights, and social media exposure in exchange for event support.',
  '{"min_price_per_day": 5000.0, "max_price_per_day": 25000.0, "min_duration_days": 1, "max_duration_days": 7, "available_from": "2026-07-07", "notes": "Deliverables include logo placement, social media posts, stage mention, and banner rights"}',
  5000.0, 25000.0, 'Any local event', 'active', NOW()
),
(
  'lst-008', 'co-004', 'sponsorship',
  'Startup Pitch Night Sponsorship',
  'Sponsorship for tech meetups and startup pitch nights. Brand visibility with the local tech and innovation community — logo on all materials and optional speaking slot.',
  '{"min_price_per_day": 2000.0, "max_price_per_day": 10000.0, "min_duration_days": 1, "max_duration_days": 3, "available_from": "2026-07-07", "notes": "Deliverables include banner placement, logo on materials, and optional 5-min speaking slot"}',
  2000.0, 10000.0, 'Downtown tech hubs', 'active', NOW()
);
