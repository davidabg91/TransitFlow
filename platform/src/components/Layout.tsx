import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo_main.png';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, Shield, Menu, X } from 'lucide-react';
import InstallPWA from './InstallPWA';
import CompanySuspended from './CompanySuspended';
import { useCompanyStatus } from '../tenant/modules';
import { getDoc, tenantDoc } from '../tenant/db';
import { db } from '../firebase';


const Layout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // The card page paints its own full-bleed background, so it must not sit in
    // the centred content column. Matches both address forms: the current one
    // carries the company, the bare one is what earlier cards were written with.
    const isClientProfilePath = /^\/(t\/[^/]+\/)?client\//.test(location.pathname);
    const isAdminPath = location.pathname === '/admin' || location.pathname === '/system-admin' || location.pathname === '/inspections';
    const isFullScreen = isClientProfilePath || isAdminPath;
    const { currentUser, logout, tenantId, isPlatformAdmin } = useAuth();
    const [companyName, setCompanyName] = useState<string>('');
    const companyStatus = useCompanyStatus();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    

    // The operator's own name, so staff can see at a glance whose system this is.
    useEffect(() => {
        if (!tenantId) { setCompanyName(''); return; }
        getDoc(tenantDoc(db, tenantId))
            .then(snap => setCompanyName(String(snap.data()?.name || '')))
            .catch(() => setCompanyName(''));
    }, [tenantId]);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setIsMenuOpen(false);
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    const handleGuardedNavigation = (e: React.MouseEvent, targetPath: string) => {
        const win = window as unknown as { 
            __moderatorGuardActive?: boolean; 
            __triggerModeratorGuard?: (onConfirmProceed?: () => void) => void; 
        };
        if (win.__moderatorGuardActive && typeof win.__triggerModeratorGuard === 'function') {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
            win.__triggerModeratorGuard(() => {
                navigate(targetPath);
            });
            return;
        }
        closeMenu();
    };

    const navLinks = (
        <>


            {currentUser && (
                <>
                    {!isPlatformAdmin && (<>
                    {currentUser.role !== 'inspector' && (
                    <Link
                        to="/admin"
                        onClick={(e) => handleGuardedNavigation(e, '/admin')}
                        style={{
                            color: isAdminPath && location.pathname === '/admin' ? '#ff5252' : '#fff',
                            fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.2s',
                            borderBottom: isAdminPath && location.pathname === '/admin' ? '2px solid #ff5252' : '2px solid transparent',
                            paddingBottom: '2px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        Мениджър
                    </Link>
                    )}

                        {(currentUser.role === 'admin' || currentUser.role === 'inspector') && (
                            <Link
                                to="/inspections"
                                onClick={(e) => handleGuardedNavigation(e, '/inspections')}
                                style={{
                                    color: location.pathname === '/inspections' ? '#ffab00' : '#fff',
                                    fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.2s',
                                    borderBottom: location.pathname === '/inspections' ? '2px solid #ffab00' : '2px solid transparent',
                                    paddingBottom: '2px',
                                }}
                            >Проверки</Link>
                        )}

                        {currentUser.role === 'admin' && (
                            <Link
                                to="/system-admin"
                                onClick={(e) => handleGuardedNavigation(e, '/system-admin')}
                                style={{
                                    color: location.pathname === '/system-admin' ? '#ff5252' : '#fff',
                                    fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.2s',
                                    borderBottom: location.pathname === '/system-admin' ? '2px solid #ff5252' : '2px solid transparent',
                                    paddingBottom: '2px',
                                }}
                            >Админ Панел</Link>
                        )}

                    {currentUser.role === 'admin' && (
                    <Link
                        to="/settings"
                        onClick={(e) => handleGuardedNavigation(e, '/settings')}
                        style={{
                            color: location.pathname === '/settings' ? '#ff5252' : '#fff',
                            fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.2s',
                            borderBottom: location.pathname === '/settings' ? '2px solid #ff5252' : '2px solid transparent',
                            paddingBottom: '2px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >Настройки</Link>
                    )}
                    <Link
                        to="/help"
                        onClick={(e) => handleGuardedNavigation(e, '/help')}
                        style={{
                            color: location.pathname === '/help' ? '#ff5252' : '#fff',
                            fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.2s',
                            borderBottom: location.pathname === '/help' ? '2px solid #ff5252' : '2px solid transparent',
                            paddingBottom: '2px',
                        }}
                    >Помощ</Link>
                    </>)}

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.8rem', borderRadius: '50px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--surface-border)',
                        fontSize: '0.85rem',
                    }}>
                        {currentUser.role === 'admin'
                            ? <ShieldCheck size={16} color="#ff5252" />
                            : <Shield size={16} color="var(--primary-color)" />}
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{currentUser.username}</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        title="Изход"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', borderRadius: '10px',
                            background: 'rgba(229,57,53,0.12)', color: '#ff5252',
                            border: '1px solid rgba(229,57,53,0.3)', fontWeight: 600,
                            fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s',
                            width: 'fit-content'
                        }}
                    >
                        <LogOut size={16} /> Изход
                    </button>
                </>
            )}

            {!currentUser && (
                <Link
                    to="/login"
                    onClick={(e) => handleGuardedNavigation(e, '/login')}
                    style={{
                        padding: '0.5rem 1.5rem', borderRadius: '10px',
                        background: '#e53935', color: '#fff',
                        fontWeight: 700, fontSize: '0.9rem',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(229,57,53,0.3)'
                    }}
                >Вход</Link>
            )}
        </>
    );

    const mobileNavLinks = (
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(!currentUser || currentUser.role === 'admin') && (
                <>
                </>
            )}
            {currentUser && (
                <>
                    {currentUser.role !== 'inspector' && (
                    <Link to="/admin" onClick={(e) => handleGuardedNavigation(e, '/admin')} className="mobile-nav-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Мениджър
                    </Link>
                    )}
                    {(currentUser.role === 'admin' || currentUser.role === 'inspector') && (
                        <Link to="/inspections" onClick={(e) => handleGuardedNavigation(e, '/inspections')} className="mobile-nav-link">Проверки</Link>
                    )}
                    {currentUser.role === 'admin' && (
                        <Link to="/system-admin" onClick={(e) => handleGuardedNavigation(e, '/system-admin')} className="mobile-nav-link">Админ Панел</Link>
                    )}
                    {currentUser.role === 'admin' && (<Link to="/settings" onClick={(e) => handleGuardedNavigation(e, '/settings')} className="mobile-nav-link">Настройки</Link>)}
                    <Link to="/help" onClick={(e) => handleGuardedNavigation(e, '/help')} className="mobile-nav-link">Помощ</Link>
                    <div style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {currentUser.role === 'admin' ? <ShieldCheck size={18} color="#ff5252" /> : <Shield size={18} color="var(--primary-color)" />}
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentUser.username}</span>
                    </div>
                    <button onClick={handleLogout} className="mobile-nav-link" style={{ color: '#ff5252', background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.2)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <LogOut size={18} /> Изход
                    </button>
                </>
            )}
            {!currentUser && (
                <Link to="/login" onClick={(e) => handleGuardedNavigation(e, '/login')} className="mobile-nav-link" style={{ background: '#e53935', color: '#fff', textAlign: 'center', marginTop: '1rem', border: 'none' }}>Вход</Link>
            )}
        </nav>
    );

    // An unpaid company sees this instead of the system. The rules block its
    // writes regardless; this is so staff are told why, rather than meeting
    // permission errors they cannot interpret.
    if (currentUser && !companyStatus.pending && !companyStatus.active) {
        return <CompanySuspended companyName={companyStatus.name} reason={companyStatus.suspendedReason} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
            <header className="main-header" style={{
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                background: 'rgba(26, 26, 26, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: isMobile ? '0 0.75rem' : '0 1.5rem',
                minHeight: isMobile ? '34px' : '46px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                width: '100%',
            }}>
                <Link to="/" onClick={(e) => handleGuardedNavigation(e, '/')} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '0', userSelect: 'none' }}>
                    <div style={{
                        padding: '0',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        <img
                            src={logo}
                            alt="TransitFlow"
                            style={{
                                height: isMobile ? '32px' : '43px',
                                width: 'auto',
                                objectFit: 'contain',
                                display: 'block'
                            }}
                        />
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        marginLeft: isMobile ? '8px' : '15px',
                        alignSelf: 'center',
                        borderLeft: '2px solid #e53935',
                        paddingLeft: isMobile ? '6px' : '8px',
                        lineHeight: 1.1,
                        marginTop: '-3px'
                    }}>
                        <span style={{
                            fontSize: isMobile ? '0.85rem' : '1.1rem',
                            fontWeight: 900,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: location.pathname === '/' ? 'var(--primary-color)' : '#ff5252',
                        }}>{companyName || 'TRANSIT'}</span>
                        <span style={{
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: '#fff',
                            opacity: 0.8
                        }}>SYSTEM</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <nav className="desktop-nav" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    {navLinks}
                </nav>

                {/* Mobile Menu Toggle */}
                <button 
                    className="mobile-toggle"
                    onClick={toggleMenu}
                    style={{
                        padding: '8px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        display: 'none', // Hidden by default, shown via CSS media query
                    }}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu Overlay */}
                <div 
                    className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}
                    style={{
                        position: 'fixed',
                        top: '64px',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 'calc(100dvh - 64px)',
                        background: 'rgba(26, 26, 26, 0.99)',
                        backdropFilter: 'blur(15px)',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 999,
                        transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isMenuOpen ? 1 : 0,
                        visibility: isMenuOpen ? 'visible' : 'hidden',
                        overflowY: 'auto'
                    }}
                >
                    {mobileNavLinks}
                </div>
            </header>

            <main 
                className={isFullScreen ? 'full-screen-main' : ''}
                style={{ 
                    flex: 1, 
                    padding: isFullScreen ? '0' : (isMobile ? '0.75rem' : '2rem'), 
                    maxWidth: isFullScreen ? 'none' : '1400px',
                    margin: isFullScreen ? '0' : '0 auto',
                    width: '100%',
                    background: isAdminPath ? 'rgba(26, 26, 26, 0.95)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'fadeIn 0.4s ease'
                }}
            >
                <Outlet />
            </main>

            <footer style={{
                padding: '0.75rem 1.5rem',
                color: 'rgba(255,255,255,0.4)',
                borderTop: isClientProfilePath ? '1px solid rgba(255,255,255,0.08)' : (location.pathname === '/' ? 'none' : '1px solid var(--surface-border)'),
                fontSize: '0.8rem',
                background: isClientProfilePath ? 'rgba(26, 26, 26, 0.85)' : 'transparent',
                backdropFilter: isClientProfilePath ? 'blur(12px)' : 'none',
                WebkitBackdropFilter: isClientProfilePath ? 'blur(12px)' : 'none',
                boxShadow: isClientProfilePath ? '0 -4px 20px rgba(0,0,0,0.4)' : 'none',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
            }}>
                {/* Left Side: Copyright & Legal */}
                <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    alignItems: 'center', 
                    justifyContent: isMobile ? 'center' : 'flex-start',
                    gap: '0.75rem',
                    textAlign: 'center'
                }}>
                    <span>© {new Date().getFullYear()} TransitFlow</span>
                    <span style={{ opacity: 0.3 }}>•</span>
                    <Link to="/legal" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}>Правна информация</Link>
                    <span style={{ opacity: 0.3 }}>•</span>
                    <Link to="/legal" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}>Лични данни</Link>
                </div>

                {/* Right Side: Install PWA & Developer Credit */}
                <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    alignItems: 'center', 
                    justifyContent: isMobile ? 'center' : 'flex-end',
                    gap: '1rem' 
                }}>
                    <InstallPWA compact={true} />
                    {(!isMobile || isClientProfilePath) && <span style={{ opacity: 0.3 }}>•</span>}
                    <a 
                        href="https://transitflow.org/"
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                            textDecoration: 'none', 
                            color: 'inherit', 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#ff5252'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
                    >
                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Powered by</span>
                        <span style={{
                            fontWeight: 800,
                            backgroundImage: 'linear-gradient(90deg, #7dd3fc 0%, #2563eb 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            color: 'transparent'
                        }}>TransitFlow</span>
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
