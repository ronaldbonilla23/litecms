import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';

const CORE_URL = 'http://localhost:3000/api';

interface PostMetadata {
    id: number;
    title: string;
    slug: string;
    content: string;
    featured_image: string | null;
    published_at: string;
    author_name: string;
    categories: { id: number; name: string; slug: string }[];
    tags: { id: number; name: string; slug: string; color: string }[];
    meta_title: string | null;
    meta_description: string | null;
    canonical_url: string | null;
}

interface RenderedPost {
    html: string;
    css: string;
    metadata: PostMetadata;
    structured_data: Record<string, any> | null;
}

export default function SinglePost() {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<RenderedPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        const fetchPost = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`${CORE_URL}/posts/slug/${slug}`);

                // Cargamos el CSS maestro como enlace de datos (URL Data)
                // Esto cumple el requisito de ser un <link> pero es instantáneo al no requerir fetch de red
                if (data.css) {
                    // Limpieza de CSS anteriores de posts
                    document.querySelectorAll('link[data-post-css]').forEach(el => el.remove());

                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    // Convertimos el CSS a Base64 para inyectarlo como URL Data
                    const blob = new Blob([data.css], { type: 'text/css' });
                    const url = URL.createObjectURL(blob);

                    link.href = url;
                    link.setAttribute('data-post-css', 'true');

                    // PROMESA: Esperamos que el navegador procese el Blob
                    const cssReady = new Promise((resolve) => {
                        link.onload = () => resolve(true);
                        link.onerror = () => resolve(false);
                    });

                    document.head.appendChild(link);
                    await cssReady;
                }

                // Ahora establecemos el post una vez que el CSS (Blob) está procesado
                setPost(data);
            } catch (err: any) {
                console.error('Error fetching post rendering:', err);
                setError(err.response?.data?.error || 'Error de conexión con el motor de renderizado');
            } finally {
                setLoading(false);
            }
        };

        fetchPost();

        return () => {
            document.querySelectorAll('link[data-post-css]').forEach(el => el.remove());
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <i className="fi fi-rr-spinner animate-spin text-4xl text-primary"></i>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Renderizando Post...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
                <div className="text-center space-y-6">
                    <i className="fi fi-rr-exclamation text-6xl text-red-500/20"></i>
                    <h2 className="text-white text-2xl font-bold tracking-tight">{error || 'Post no encontrado'}</h2>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-white/5 text-white border border-white/10 px-8 py-3 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    // Preparar datos SEO
    const currentUrl = window.location.href;
    const seoTitle = post.metadata.meta_title || post.metadata.title;
    const seoDescription = post.metadata.meta_description || post.metadata.excerpt || post.metadata.title;
    const featuredImageUrl = post.metadata.featured_image
        ? (post.metadata.featured_image.startsWith('http')
            ? post.metadata.featured_image
            : `http://localhost:3000/uploads/${post.metadata.featured_image}`)
        : null;

    // Renderizado del HTML ensamblado (Header + Post Layout + Footer)
    return (
        <>
            {/* SEO Helmet */}
            <Helmet>
                {/* Basic SEO */}
                <title>{seoTitle}</title>
                <meta name="description" content={seoDescription} />
                <link rel="canonical" href={post.metadata.canonical_url || currentUrl} />

                {/* Open Graph */}
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDescription} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={currentUrl} />
                {featuredImageUrl && (
                    <meta property="og:image" content={featuredImageUrl} />
                )}
                {post.metadata.author_name && (
                    <meta property="article:author" content={post.metadata.author_name} />
                )}
                {post.metadata.published_at && (
                    <meta property="article:published_time" content={post.metadata.published_at} />
                )}
                {post.metadata.categories.map(cat => (
                    <meta property="article:section" content={cat.name} key={cat.id} />
                ))}
                {post.metadata.tags.map(tag => (
                    <meta property="article:tag" content={tag.name} key={tag.id} />
                ))}

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={seoTitle} />
                <meta name="twitter:description" content={seoDescription} />
                {featuredImageUrl && (
                    <meta name="twitter:image" content={featuredImageUrl} />
                )}
            </Helmet>

            {/* JSON-LD Structured Data */}
            {post.structured_data && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(post.structured_data)
                    }}
                />
            )}

            <div
                className="post-rendered-view"
                dangerouslySetInnerHTML={{ __html: post.html }}
            />
        </>
    );
}
