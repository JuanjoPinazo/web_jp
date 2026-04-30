'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useContent } from '@/hooks/useContent';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();
  const { getContent } = useContent();

  const heroTitle = getContent('landing.hero.title', 'Recomendaciones Inteligentes & Perspectivas Personales');
  const heroSubtitle = getContent('landing.hero.subtitle', 'Decisiones prácticas, seleccionadas y guiadas por la tecnología para profesionales que valoran la precisión y el tiempo.');

  useEffect(() => {
    if (session.status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [session.status, router]);

  return (
    <main className="min-h-screen pt-32 pb-20">
      <Navbar />
      
      <Hero />

      <Features />
      
      
      <footer className="mt-40 py-10 border-t border-border">
        <Container className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-muted">
            © 2026 JP. Todos los derechos reservados.
          </div>
          <div className="flex gap-8 text-sm text-muted">
            <Link href="/about" className="hover:text-accent transition-colors">Sobre mí</Link>
            <Link href="/login" className="hover:text-accent transition-colors">Portal Privado</Link>
          </div>
        </Container>
      </footer>
    </main>
  );
}
