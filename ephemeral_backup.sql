--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: User; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL
);


ALTER TABLE public."User" OWNER TO san;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO san;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: san
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO san;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.comments (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.comments OWNER TO san;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO san;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: san
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: likes; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.likes (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.likes OWNER TO san;

--
-- Name: likes_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.likes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.likes_id_seq OWNER TO san;

--
-- Name: likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: san
--

ALTER SEQUENCE public.likes_id_seq OWNED BY public.likes.id;


--
-- Name: perpetuates; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.perpetuates (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    value numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    trust_value numeric DEFAULT 0 NOT NULL
);


ALTER TABLE public.perpetuates OWNER TO san;

--
-- Name: perpetuates_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.perpetuates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.perpetuates_id_seq OWNER TO san;

--
-- Name: perpetuates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: san
--

ALTER SEQUENCE public.perpetuates_id_seq OWNED BY public.perpetuates.id;


--
-- Name: post_tags; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.post_tags (
    post_id bigint NOT NULL,
    tag_id bigint NOT NULL
);


ALTER TABLE public.post_tags OWNER TO san;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    content text NOT NULL,
    media_url text,
    perpetuate_boost numeric DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.posts OWNER TO san;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO san;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: san
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.sessions (
    session_key text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    ip_address inet,
    user_agent text,
    username text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sessions OWNER TO san;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.tags (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.tags OWNER TO san;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO san;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: san
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(256) NOT NULL,
    password text NOT NULL,
    handle character varying(256) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_used timestamp with time zone DEFAULT now(),
    bio text DEFAULT ''::text,
    avatar_url text DEFAULT ''::text
);


ALTER TABLE public.users OWNER TO san;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO san;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: san
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: san
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: likes id; Type: DEFAULT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.likes ALTER COLUMN id SET DEFAULT nextval('public.likes_id_seq'::regclass);


--
-- Name: perpetuates id; Type: DEFAULT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.perpetuates ALTER COLUMN id SET DEFAULT nextval('public.perpetuates_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public."User" (id, username, password_hash) FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d6247b07-62af-457f-ac8d-104c1ab19612	78ae009b4f7b785d31c93cc38809867d69064bde45236a14b6eeadba03626535	2025-08-06 15:02:21.352509+03	20250806120221_init	\N	\N	2025-08-06 15:02:21.311069+03	1
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.comments (id, post_id, user_id, content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.likes (id, post_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: perpetuates; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.perpetuates (id, post_id, user_id, value, created_at, trust_value) FROM stdin;
\.


--
-- Data for Name: post_tags; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.post_tags (post_id, tag_id) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.posts (id, user_id, content, media_url, perpetuate_boost, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.sessions (session_key, created_at, expires_at, ip_address, user_agent, username, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.tags (id, name) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.users (id, username, password, handle, created_at, last_used, bio, avatar_url) FROM stdin;
\.


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public."User_id_seq"', 1, false);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.comments_id_seq', 1, false);


--
-- Name: likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.likes_id_seq', 1, false);


--
-- Name: perpetuates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.perpetuates_id_seq', 1, false);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.posts_id_seq', 1, false);


--
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.tags_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: likes likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: perpetuates perpetuates_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.perpetuates
    ADD CONSTRAINT perpetuates_pkey PRIMARY KEY (id);


--
-- Name: post_tags post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_pkey PRIMARY KEY (post_id, tag_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_key);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: users unique_handle; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_handle UNIQUE (handle);


--
-- Name: sessions unique_username; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT unique_username UNIQUE (username);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: san
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: san
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: idx_likes_post_id; Type: INDEX; Schema: public; Owner: san
--

CREATE INDEX idx_likes_post_id ON public.likes USING btree (post_id);


--
-- Name: idx_perpetuates_post_id; Type: INDEX; Schema: public; Owner: san
--

CREATE INDEX idx_perpetuates_post_id ON public.perpetuates USING btree (post_id);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: san
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- Name: perpetuates_unique_post_user; Type: INDEX; Schema: public; Owner: san
--

CREATE UNIQUE INDEX perpetuates_unique_post_user ON public.perpetuates USING btree (post_id, user_id);


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: likes likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: perpetuates perpetuates_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.perpetuates
    ADD CONSTRAINT perpetuates_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: perpetuates perpetuates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.perpetuates
    ADD CONSTRAINT perpetuates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_tags post_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: san
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO san;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO san;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO san;


--
-- PostgreSQL database dump complete
--

