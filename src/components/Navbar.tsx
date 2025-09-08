import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
    path: string;
    label: string;
    icon: string;
}

function EnhancedNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.pathname);
    const [isScrolled, setIsScrolled] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const navItems: NavItem[] = [
        { path: '/', label: 'Accueil', icon: '🏠' },
        { path: '/leaderboard', label: 'Classement', icon: '🏆' },
        { path: '/events', label: 'Événements', icon: '🎮' },
        { path: '/suggestions', label: 'Suggestions', icon: '💡' },
        { path: '/about', label: 'À propos', icon: '📖' }
    ];

    // Update active tab when location changes
    useEffect(() => {
        setActiveTab(location.pathname);
    }, [location.pathname]);

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const formatDate = (date: Date) => {
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatTime = (date: Date) => {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const today = formatDate(currentTime);
    const time = formatTime(currentTime);

    const navbarStyle: React.CSSProperties = {
        width: '100%',
        padding: isScrolled ? '0.8rem 2rem' : '1.2rem 2rem',
        margin: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: isScrolled
            ? '1px solid rgba(255, 215, 0, 0.5)'
            : '1px solid rgba(255, 215, 0, 0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.3)' : 'none',
        backgroundColor: isScrolled ? 'rgba(26, 26, 26, 0.95)' : '#1a1a1a',
        backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        transition: 'all 0.3s ease'
    };

    return (
        <>
            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideInRight {
                    from { 
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes float {
                    0% { transform: translateX(-100px) translateY(0px); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateX(100vw) translateY(0px); opacity: 0; }
                }
            `}</style>

            <nav style={navbarStyle}>
                {/* Logo/Brand section */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                    }}
                    onClick={() => navigate('/')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                        animation: 'pulse 2s infinite'
                    }}>
                        ⚡
                    </div>
                    <span style={{
                        color: '#ffd700',
                        fontSize: '1.4rem',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        ChallengeHub
                    </span>
                </div>

                {/* Navigation Links */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    background: 'rgba(42, 42, 42, 0.6)',
                    padding: '0.8rem 1.5rem',
                    borderRadius: '25px',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    {navItems.map(({ path, label, icon }) => {
                        const isActive = activeTab === path;

                        return (
                            <div
                                key={path}
                                onClick={() => {
                                    setActiveTab(path);
                                    navigate(path);
                                }}
                                style={{
                                    position: 'relative',
                                    color: isActive ? '#000' : '#fff',
                                    fontSize: '1rem',
                                    fontWeight: isActive ? 'bold' : '500',
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '20px',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: isActive
                                        ? 'linear-gradient(135deg, #ffd700, #ffed4e)'
                                        : 'transparent',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = '#ffd700';
                                        e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = '#fff';
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                                {label}

                                {isActive && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: '0.3rem',
                                            top: '0.3rem',
                                            width: '8px',
                                            height: '8px',
                                            backgroundColor: '#000',
                                            borderRadius: '50%',
                                            animation: 'fadeIn 0.3s ease'
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Date and Time section */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.2rem',
                        opacity: 1,
                        animation: 'slideInRight 0.5s ease'
                    }}
                >
                    <div style={{
                        color: '#ffd700',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🕒 {time}
                    </div>
                    <div style={{
                        color: '#ccc',
                        fontSize: '0.8rem',
                        fontWeight: '400',
                        letterSpacing: '0.05em'
                    }}>
                        📅 {today}
                    </div>
                </div>

                {/* Animated background particles */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -1
                }}>
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: `${i * 30}%`,
                                width: '2px',
                                height: '2px',
                                backgroundColor: '#ffd700',
                                borderRadius: '50%',
                                boxShadow: '0 0 10px #ffd700',
                                animation: `float ${8 + i * 2}s infinite linear`
                            }}
                        />
                    ))}
                </div>
            </nav>
        </>
    );
}

export default EnhancedNavbar;