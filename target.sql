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


ALTER TABLE public."User" OWNER TO mrking;

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


ALTER SEQUENCE public."User_id_seq" OWNER TO mrking;

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


ALTER TABLE public._prisma_migrations OWNER TO mrking;

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


ALTER TABLE public.comments OWNER TO mrking;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO mrking;

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


ALTER TABLE public.likes OWNER TO mrking;

--
-- Name: likes_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.likes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.likes_id_seq OWNER TO mrking;

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


ALTER TABLE public.perpetuates OWNER TO mrking;

--
-- Name: perpetuates_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.perpetuates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.perpetuates_id_seq OWNER TO mrking;

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


ALTER TABLE public.post_tags OWNER TO mrking;

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


ALTER TABLE public.posts OWNER TO mrking;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO mrking;

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


ALTER TABLE public.sessions OWNER TO mrking;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: san
--

CREATE TABLE public.tags (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.tags OWNER TO mrking;

--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: san
--

CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO mrking;

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


ALTER TABLE public.users OWNER TO mrking;

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


ALTER SEQUENCE public.users_id_seq OWNER TO mrking;

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
1	20	13	hey man	2025-08-17 19:27:18.982726	2025-08-17 19:27:18.982726
2	20	12	kys	2025-08-17 20:18:04.778812	2025-08-17 20:18:04.778812
3	20	14	hi	2025-08-17 20:18:54.574343	2025-08-17 20:18:54.574343
4	20	13	TIP	2025-08-17 20:50:53.026401	2025-08-17 20:50:53.026401
\.


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.likes (id, post_id, user_id, created_at) FROM stdin;
10	20	13	2025-08-17 19:27:11.504052
12	20	14	2025-08-17 20:18:49.927777
13	24	13	2025-08-17 20:52:33.883956
14	23	13	2025-08-17 20:52:34.714756
\.


--
-- Data for Name: perpetuates; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.perpetuates (id, post_id, user_id, value, created_at, trust_value) FROM stdin;
1	20	14	100	2025-08-17 20:19:34.153408	0
2	20	13	1	2025-08-17 20:28:26.248047	0
\.


--
-- Data for Name: post_tags; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.post_tags (post_id, tag_id) FROM stdin;
20	48
21	49
22	49
23	49
24	49
25	49
26	54
27	54
28	54
29	54
30	54
31	54
32	54
33	54
34	54
35	54
36	54
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.posts (id, user_id, content, media_url, perpetuate_boost, created_at, updated_at) FROM stdin;
20	13	Who am I?	/uploads/posts/1755444456531-ee859ab2a126aea4.webp	0	2025-08-17 18:27:37.263308	2025-08-17 18:27:37.263308
21	13	1	\N	0	2025-08-17 20:51:01.878904	2025-08-17 20:51:01.878904
22	13	`	\N	0	2025-08-17 20:51:07.608663	2025-08-17 20:51:07.608663
23	13	1	\N	0	2025-08-17 20:51:11.604435	2025-08-17 20:51:11.604435
24	13	1	\N	0	2025-08-17 20:51:14.95356	2025-08-17 20:51:14.95356
25	13	1	\N	0	2025-08-17 20:51:19.072241	2025-08-17 20:51:19.072241
26	13	w	\N	0	2025-08-17 20:51:52.665694	2025-08-17 20:51:52.665694
27	13	w	\N	0	2025-08-17 20:51:57.952697	2025-08-17 20:51:57.952697
28	13	w	\N	0	2025-08-17 20:52:03.663423	2025-08-17 20:52:03.663423
29	13	w	\N	0	2025-08-17 20:52:06.346563	2025-08-17 20:52:06.346563
30	13	w	\N	0	2025-08-17 20:52:09.829864	2025-08-17 20:52:09.829864
31	13	w	\N	0	2025-08-17 20:52:11.910637	2025-08-17 20:52:11.910637
32	13	w	\N	0	2025-08-17 20:52:15.623317	2025-08-17 20:52:15.623317
33	13	w	\N	0	2025-08-17 20:52:18.695105	2025-08-17 20:52:18.695105
34	13	w	\N	0	2025-08-17 20:52:21.809925	2025-08-17 20:52:21.809925
35	13	w	\N	0	2025-08-17 20:52:24.368151	2025-08-17 20:52:24.368151
36	13	w	\N	0	2025-08-17 20:52:26.3516	2025-08-17 20:52:26.3516
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.sessions (session_key, created_at, expires_at, ip_address, user_agent, username, updated_at) FROM stdin;
f707fa9d956bbf45766117801927010d4e4cfa600c30719d824b665d8da61911	2025-08-17 20:18:42.013374	2025-08-28 20:54:43.545767	::ffff:127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	d601d9582adc9ee1c54f5fb8c8e4e1671d6b10005cc8cc9728a7e485fce81b0f	2025-08-21 20:54:43.545767
5d132c1a7be9fcc282bb1990e0e395a0813a885765fdeb10e762fb91b0ebfa9f	2025-08-17 18:25:32.332226	2025-08-24 20:52:39.670376	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	b1a96dd646bccaa24cef7a3db22a6f995f05658f4f1c3272913e258c03e6fb24	2025-08-17 20:52:39.670376
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.tags (id, name) FROM stdin;
1	king
2	cool
3	legal
4	fuckoff
8	i don't want to give a fuck!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
9	fakenews
10	bbc200k!
11	i am just a freak!
12	child
13	deadkids
14	kingofclappingkids
15	art
16	fart
17	mart
18	bart
19	cart
21	cake
22	kids
23	rape
24	little
28	women
29	ai
33	arr
34	qq
35	win
36	bitch
37	karen
39	news
41	bitchs
43	community
44	kys
46	fuckkids
47	quoteme
48	aura
49	1
54	w
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: san
--

COPY public.users (id, username, password, handle, created_at, last_used, bio, avatar_url) FROM stdin;
11	4b68ab3847feda7d6c62c1fbcbeebfa35eab7351ed5e78f4ddadea5df64b8015	$2b$10$k.DAaPRTA1OXm1tMBhYKru0c36M5QTTxzsGUhJQt0qM8YtSZC3s1m	4b68ab3847feda7d6c62c1fbcbeebfa35eab7351ed5e78f4ddadea5df64b8015	2025-08-13 22:56:49.733751+03	2025-08-15 23:21:47.018224+03	CHAT GPT IS CRACKED	/uploads/avatars/5a008c95925c71f09fef1766d329b58d.webp
12	b5fad44b65c4e5732ee9a22d456fc6a6978130e6fa91555702544ad00a9ea386	$2b$10$OpOqkZwvtYX.K7z0zoGZaerdvQS/n4qToDV1HIw/OhHMCnl8bOFJW	81029c082513addeac45fe4302541f714692ddad3782a6b4cfd551a64eb630ff	2025-08-13 23:01:12.128225+03	2025-08-17 15:02:47.603659+03		
10	40a108810c791276c6e16763156b85242be71393fa065a21b3d5c7e69c972944	$2b$10$FB6pwUMkwkr0FOWWhfcrLuhsGvmf8yxA5PWjtBJZX9qO3r84S6OJO	e81dfe69841ad2f7b5790b63e998f0febaf3b29acd732881975130761b98e2c7	2025-08-12 15:13:16.427498+03	2025-08-13 18:08:50.642607+03		/uploads/avatars/67b69c9e7b32de2d3b7efd9aba229189.png
14	d601d9582adc9ee1c54f5fb8c8e4e1671d6b10005cc8cc9728a7e485fce81b0f	$2b$10$Q86iQn6J/g6Q03vdEAmeK.l7mEiPb2g9xreHaQsB3Aei8KB3G3Bdq	mrKiller	2025-08-17 20:18:42.008776+03	2025-08-17 20:18:42.110576+03		
13	b1a96dd646bccaa24cef7a3db22a6f995f05658f4f1c3272913e258c03e6fb24	$2b$10$ShsZcoo7ZERLC1cSx6VMTOyJdhpFGZ2wF0HWVUgdpi7EUSKngiCym	Omega	2025-08-17 18:25:32.322764+03	2025-08-17 20:28:26.248047+03		
\.


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public."User_id_seq"', 1, false);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.comments_id_seq', 4, true);


--
-- Name: likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.likes_id_seq', 14, true);


--
-- Name: perpetuates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.perpetuates_id_seq', 5, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.posts_id_seq', 36, true);


--
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.tags_id_seq', 64, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: san
--

SELECT pg_catalog.setval('public.users_id_seq', 14, true);


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

