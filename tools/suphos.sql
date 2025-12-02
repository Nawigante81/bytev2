-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_emails (
  email USER-DEFINED NOT NULL,
  CONSTRAINT admin_emails_pkey PRIMARY KEY (email)
);
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid,
  product_id uuid,
  qty integer NOT NULL CHECK (qty > 0),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id)
);
CREATE TABLE public.carts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.diagnosis_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  device text,
  status text DEFAULT 'new'::text,
  user_id uuid,
  priority smallint DEFAULT 3,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  phone text,
  consent boolean DEFAULT false,
  source_url text,
  ip inet,
  user_agent text,
  CONSTRAINT diagnosis_requests_pkey PRIMARY KEY (id),
  CONSTRAINT diagnosis_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.forms_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  form_slug text NOT NULL CHECK (length(form_slug) >= 2 AND length(form_slug) <= 64),
  email text,
  payload jsonb NOT NULL,
  ip inet,
  ua text,
  CONSTRAINT forms_submissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  qty integer NOT NULL CHECK (qty > 0),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service text,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  description text NOT NULL,
  contact_method text,
  file_url text,
  status text NOT NULL DEFAULT 'new'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  provider text,
  provider_ref text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status text DEFAULT 'PENDING'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.product_categories (
  product_id uuid NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT product_categories_pkey PRIMARY KEY (product_id, category_id),
  CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text DEFAULT 'PLN'::text,
  stock integer DEFAULT 0 CHECK (stock >= 0),
  published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  message text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source_url text,
  ip inet,
  user_agent text,
  status text DEFAULT 'new'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.service_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'basic'::text CHECK (kind = ANY (ARRAY['basic'::text, 'advanced'::text])),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_cents integer,
  currency text DEFAULT 'PLN'::text,
  published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_catalog_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid,
  user_id uuid,
  name text,
  email text,
  phone text,
  message text,
  status text DEFAULT 'new'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  consent boolean DEFAULT false,
  source_url text,
  ip inet,
  user_agent text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_orders_pkey PRIMARY KEY (id),
  CONSTRAINT service_orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_catalog(id),
  CONSTRAINT service_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);