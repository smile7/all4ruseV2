-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.event_tags (
  event_id integer NOT NULL,
  tag_id integer NOT NULL,
  CONSTRAINT event_tags_pkey PRIMARY KEY (event_id, tag_id),
  CONSTRAINT event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text NOT NULL,
  createdBy uuid,
  startDate date NOT NULL,
  endDate date NOT NULL,
  image text,
  startTime time with time zone NOT NULL,
  endTime time with time zone,
  address text NOT NULL,
  town text NOT NULL,
  slug text UNIQUE,
  ticketsLink text,
  price text,
  phoneNumber text,
  place text,
  organizers jsonb DEFAULT '[]'::jsonb,
  images jsonb,
  fbLink text,
  isEventActive boolean NOT NULL,
  email text,
  isEventPremium boolean,
  isEventCancelled boolean,
  isSoldOut boolean,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_createdBy_fkey FOREIGN KEY (createdBy) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  username text UNIQUE CHECK (char_length(username) >= 3),
  full_name text,
  avatar_url text,
  bio text,
  header_url text,
  profile_gallery jsonb,
  show_saved_events boolean,
  reminder_time text NOT NULL,
  color text,
  website text,
  email text UNIQUE,
  is_confirmed boolean,
  fb text UNIQUE,
  instagram text UNIQUE,
  tiktok text UNIQUE,
  place text,
  address_physical text,
  phone text,
  email_to_show text,
  name_to_show text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.tags (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text,
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);