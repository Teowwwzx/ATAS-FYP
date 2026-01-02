"use client"
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export function PublicNavbar() {
    const navbarRef = useRef<HTMLElement>(null)

    useEffect(() => {
        const handleScroll = () => {
            if (navbarRef.current) {
                if (window.scrollY > 50) navbarRef.current.classList.add('scrolled')
                else navbarRef.current.classList.remove('scrolled')
            }
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <nav className="experts-navbar" ref={navbarRef} style={{ position: 'fixed', width: '100%', zIndex: 100, transition: '0.3s' }}>
            <style jsx>{`
                .experts-navbar.scrolled {
                    background: rgba(5, 5, 5, 0.8);
                    backdrop-filter: blur(12px);
                    padding: 1rem 3rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08); /* glass-border */
                }
                /* Mobile Padding Override if needed, though experts.css usually handles it */
            `}</style>

            <Link href="/" className="brand font-display" style={{ textDecoration: 'none', color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>
                ATAS<span style={{ color: '#FFD700' }}>.</span>
            </Link>

            <div className="nav-links hidden md:flex" style={{ gap: '2rem' }}>
                <Link href="/" className="nav-link text-gray-400 hover:text-white transition-colors font-medium">Home</Link>
                <Link href="/experts" className="nav-link text-gray-400 hover:text-white transition-colors font-medium">Experts</Link>
                <Link href="/events" className="nav-link text-gray-400 hover:text-white transition-colors font-medium">Events</Link>
                <Link href="/about" className="nav-link text-gray-400 hover:text-white transition-colors font-medium">About</Link>
            </div>

            <div className="flex gap-4">
                <Link href="/login" style={{ fontWeight: 700, color: '#FFD700', textDecoration: 'none' }}>
                    Login
                </Link>
            </div>
        </nav>
    )
}
